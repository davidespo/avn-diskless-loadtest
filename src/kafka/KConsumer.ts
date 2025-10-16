import { z } from "zod";
import { buildKafkaClient } from "./kafka";
import { Consumer, EachBatchPayload, Message } from "kafkajs";
import ms, { StringValue } from "ms";
import { LatencyObservation, ThroughputObservation } from "../observability";
import { Sink } from "../observability/Sink";

export const KConsumerConfig = z.object({
  session: z.string(),
  mode: z.enum(["latency", "throughput"]),
  az: z.string(),
  topic: z.string(),
  consumerGroup: z.string(),
  duration: z.string(),
  configuration: z.any(),
});

export type KConsumerConfig = z.infer<typeof KConsumerConfig>;

export class KConsumer {
  private consumer: Consumer;
  private count = 0;
  constructor(readonly config: KConsumerConfig) {
    this.consumer = buildKafkaClient(config.az).consumer({
      ...config.configuration,
      groupId: config.consumerGroup,
    });
  }

  private recordLatency = (topic: string, partition: number, message: Message, sink: Sink<LatencyObservation>) => {
    const ts = new Number(message.timestamp).valueOf();
    const now = Date.now();
    const latency = now - ts;
    sink({
      client: "consumer",
      scope: "e2eLatency",
      topic,
      partition,
      value: latency,
    });
  };

  private buildMessageHandler =
    (latencySink: Sink<LatencyObservation>, throughputSink: Sink<ThroughputObservation>) =>
    async (payload: EachBatchPayload) => {
      const { topic, partition, messages } = payload.batch;
      this.count += messages.length;
      switch (this.config.mode) {
        case "latency":
          for (const message of messages) {
            if (message.key?.toString().startsWith(this.config.session)) {
              this.recordLatency(topic, partition, message, latencySink);
            }
          }
          break;
        case "throughput":
          const batchSize = messages.reduce(
            (acc, message) => acc + (message.value?.length ?? 0) + (message.key?.length ?? 0),
            0
          );
          throughputSink({
            client: "consumer",
            scope: "throughput",
            topic,
            partition,
            value: batchSize,
          });
          break;
      }
    };

  async start(latencySink: Sink<LatencyObservation>, throughputSink: Sink<ThroughputObservation>) {
    const { duration } = this.config;
    const durationMs = ms(duration as StringValue);
    const endTime = Date.now() + durationMs;
    try {
      await this.consumer.connect();
      await this.consumer.subscribe({ topic: this.config.topic, fromBeginning: false });
      this.consumer.run({
        eachBatch: this.buildMessageHandler(latencySink, throughputSink),
      });
      while (Date.now() < endTime) {
        await new Promise((resolve) => setTimeout(resolve, Math.min(5000, endTime - Date.now())));
      }
      await this.consumer.disconnect();
    } catch (error) {
      console.error("Consumer connection error", error);
      throw error;
    }
    console.log(`Consumer consumed ${this.count} messages`);
    return this.count;
  }
}
