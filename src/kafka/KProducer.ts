import { z } from "zod";
import { Producer } from "kafkajs";
import { buildKafkaClient, buildTraditionalKafkaClient } from "./kafka";
import ms, { StringValue } from "ms";
import { Sink } from "../observability/Sink";
import { LatencyObservation, ThroughputObservation } from "../observability";
import prettyBytes from "pretty-bytes";

export const KProducerConfig = z.object({
  inkless: z.boolean().default(false),
  session: z.string(),
  az: z.string(),
  topic: z.string(),
  rate: z.object({
    count: z.number(),
    delay: z.string().or(z.null()).default(null),
    size: z.number(),
    duration: z.string(),
  }),
  configuration: z.any(),
});

export type KProducerConfig = z.infer<typeof KProducerConfig>;

export class KProducer {
  private producer: Producer;
  private isRunning: boolean = false;
  private isConnected: boolean = false;
  constructor(readonly config: KProducerConfig) {
    this.producer = buildKafkaClient(config.az, config.inkless).producer({
      ...config.configuration,
      allowAutoTopicCreation: false,
    });
  }

  private async sendBatch(throughputSink: Sink<ThroughputObservation>) {
    const messages = this.buildBatch();
    await this._sendBatch(messages, throughputSink);
  }

  private buildBatch() {
    const {
      rate: { count, size },
    } = this.config;
    return Array.from({ length: count }, () => ({
      key: Buffer.from(`${this.config.session}::${Date.now()}`),
      value: Buffer.alloc(size, "a".repeat(size)),
    }));
  }

  private async _sendBatch(
    messages: { key: Buffer; value: Buffer }[],
    throughputSink: Sink<ThroughputObservation>
  ) {
    const {
      rate: { count, size },
      topic,
    } = this.config;
    if (!this.isConnected || !this.isRunning) return;
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

  async start(
    latencySink: Sink<LatencyObservation>,
    throughputSink: Sink<ThroughputObservation>
  ) {
    console.trace("[PRODUCER.start] Starting Producer...");
    this.isRunning = true;
    const {
      rate: { delay, duration },
    } = this.config;
    const durationMs = ms(duration as StringValue);
    const delayMs = delay ? ms(delay as StringValue) : -1;
    const endTime = Date.now() + durationMs;
    let count = 0;
    try {
      await this.producer.connect();
      this.isConnected = true;
      console.trace("[PRODUCER.start] Producer connected");
      const batch = this.buildBatch();
      while (Date.now() < endTime && this.isRunning) {
        const startTime = Date.now();
        await this._sendBatch(batch, throughputSink);
        count++;
        if (!this.isRunning) break;
        latencySink({
          topic: this.config.topic,
          client: "producer",
          scope: "clientLatency",
          value: Date.now() - startTime,
        });
        if (delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
      const totalMessages = count * this.config.rate.count;
      const totalBytes = totalMessages * this.config.rate.size;
      const prettyTotalBytes = prettyBytes(totalBytes);
      const bytesPerSec = totalBytes / (durationMs / 1000);
      const prettyRate = prettyBytes(bytesPerSec) + "/s";
      console.trace("[PRODUCER.start] Producer finished sending messages.", {
        totalBatches: count,
        totalMessages,
        totalBytes,
        prettyTotalBytes,
        prettyRate,
        config: this.config,
      });
      await this.stop();
      console.trace("[PRODUCER.start] Producer disconnected");
    } catch (error) {
      console.error("Producer connection error", error);
      throw error;
    }
  }

  async stop() {
    this.isRunning = false;
    await this.producer.disconnect();
    this.isConnected = false;
    console.trace("[PRODUCER.stop] Producer Stopped");
  }
}
