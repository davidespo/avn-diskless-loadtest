import { z } from "zod";
import { Producer } from "kafkajs";
import { buildKafkaClient } from "./kafka";
import ms, { StringValue } from "ms";
import { Sink } from "../observability/Sink";
import { LatencyObservation, ThroughputObservation } from "../observability";

export const KProducerConfig = z.object({
  session: z.string(),
  az: z.string(),
  topic: z.string(),
  rate: z.object({
    count: z.number(),
    delay: z.string(),
    size: z.number(),
    duration: z.string(),
  }),
  configuration: z.any(),
});

export type KProducerConfig = z.infer<typeof KProducerConfig>;

export class KProducer {
  private producer: Producer;
  constructor(readonly config: KProducerConfig) {
    this.producer = buildKafkaClient(config.az).producer({
      ...config.configuration,
      allowAutoTopicCreation: false,
    });
  }

  private async sendBatch(throughputSink: Sink<ThroughputObservation>) {
    const {
      rate: { count, size },
      topic,
    } = this.config;
    const messages = Array.from({ length: count }, () => ({
      key: Buffer.from(`${this.config.session}::${Date.now()}`),
      value: Buffer.alloc(size, "a".repeat(size)),
    }));
    await this.producer.send({
      topic,
      messages,
    });
    throughputSink({
      client: "producer",
      scope: "throughput",
      topic,
      value: size * count,
    });
  }

  async start(latencySink: Sink<LatencyObservation>, throughputSink: Sink<ThroughputObservation>) {
    const {
      rate: { delay, duration },
    } = this.config;
    const durationMs = ms(duration as StringValue);
    const delayMs = ms(delay as StringValue);
    const endTime = Date.now() + durationMs;
    try {
      await this.producer.connect();
      while (Date.now() < endTime) {
        const startTime = Date.now();
        await this.sendBatch(throughputSink);
        latencySink({
          topic: this.config.topic,
          client: "producer",
          scope: "clientLatency",
          value: Date.now() - startTime,
        });
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
      await this.producer.disconnect();
    } catch (error) {
      console.error("Producer connection error", error);
      throw error;
    }
  }
}
