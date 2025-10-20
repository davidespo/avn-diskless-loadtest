import { z } from "zod";
import { buildKafkaClient, KafkaConnectionConfig } from "./kafka";
import { Consumer, EachBatchPayload, Message } from "kafkajs";
import ms, { StringValue } from "ms";
import { LatencyObservation, ThroughputObservation } from "../observability";
import { Sink } from "../observability/Sink";

export const KConsumerConfig = z.object({
  connectionConfig: KafkaConnectionConfig,
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
  private isListening = false;
  constructor(readonly config: KConsumerConfig) {
    this.consumer = buildKafkaClient(config.connectionConfig).consumer({
      ...config.configuration,
      groupId: config.consumerGroup,
    });
  }

  async subscribe(latencySink: Sink<LatencyObservation>, throughputSink: Sink<ThroughputObservation>) {
    console.trace(`[CONSUMER.subscribe] Subscribing Consumer`, { topic: this.config.topic, groupId: this.config.consumerGroup, isListening: this.isListening });
    if (this.isListening) return;
    await this.consumer.connect();
    console.trace('[CONSUMER.subscribe] Connected');
    await this.consumer.subscribe({ topic: this.config.topic, fromBeginning: false });
    console.trace('[CONSUMER.subscribe] Subscribed to topic:', this.config.topic);
    const lastDataTimeHolder = { lastDataTime: Date.now() };
    const batchHandler = this.buildMessageHandler(latencySink, throughputSink);
    await this.consumer.run({
      eachBatch: async (batchPayload) => {
        batchHandler(batchPayload, lastDataTimeHolder.lastDataTime);
        lastDataTimeHolder.lastDataTime = Date.now();
      },
    });
    console.trace('[CONSUMER.subscribe] Consumer is listening for messages...');
    this.isListening = true;
  }

  private recordLatency = (topic: string, partition: number, message: Message, sink: Sink<LatencyObservation>) => {
    const ts = new Number(message.timestamp).valueOf();
    const now = Date.now();
    const latency = now - ts;
    sink({
      kind: "latency",
      ts: Date.now(),
      client: "consumer",
      scope: "latency",
      topic,
      partition,
      valueMs: latency,
    });
  };

  private buildMessageHandler =
    (latencySink: Sink<LatencyObservation>, throughputSink: Sink<ThroughputObservation>) =>
    async (payload: EachBatchPayload, lastFetchTime: number) => {
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
            kind: "throughput",
            ts: Date.now(),
            client: "consumer",
            scope: "throughput",
            topic,
            partition,
            valueBytes: batchSize,
            duration: 0, // Duration is not calculated here
          });
          break;
      }
    };

  async start(latencySink: Sink<LatencyObservation>, throughputSink: Sink<ThroughputObservation>) {
    console.trace('[CONSUMER.start] Starting Consumer...');
    const { duration } = this.config;
    const durationMs = ms(duration as StringValue);
    const endTime = Date.now() + durationMs;
    try {
      await this.subscribe(latencySink, throughputSink);
      console.trace('[CONSUMER.start] Consumer Subscribed, running...');
      console.trace('[CONSUMER.start] Waiting for duration to elapse...');
      while (Date.now() < endTime && this.isListening) {
        await new Promise((resolve) => setTimeout(resolve, Math.min(5000, endTime - Date.now())));
      }
      console.trace('[CONSUMER.start] Duration elapsed, stopping consumer...');
      await this.stop();
      console.trace('[CONSUMER.start] Consumer Stopped');
    } catch (error) {
      console.error("[CONSUMER.start] Consumer connection error", error);
      throw error;
    }
    console.trace(`[CONSUMER.start] Consumer consumed ${this.count} messages`);
    return this.count;
  }

  async stop() {
    console.trace('[CONSUMER.stop] Disconnecting Consumer...');
    await this.consumer.stop();
    console.trace('[CONSUMER.stop] Consumer Stopped, disconnecting...');
    await this.consumer.disconnect();
    console.trace('[CONSUMER.stop] Consumer Disconnected');
    this.isListening = false;
  }
}
