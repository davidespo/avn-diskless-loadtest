import { z } from "zod";
import { Producer } from "kafkajs";
import { buildKafkaClient, KafkaConnectionConfig } from "./kafka";
import ms, { StringValue } from "ms";
import { Sink } from "../observability/Sink";
import { LatencyObservation, ThroughputObservation } from "../observability";
import prettyBytes from "pretty-bytes";
import { late } from "zod/v3";

export const KProducerConfig = z.object({
  connectionConfig: KafkaConnectionConfig,
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
    this.producer = buildKafkaClient(config.connectionConfig).producer({
      ...config.configuration,
      allowAutoTopicCreation: false,
    });
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

  private async _sendBatch(messages: { key: Buffer; value: Buffer }[]) {
    const { topic } = this.config;
    if (!this.isConnected || !this.isRunning) return;
    await this.producer.send({ topic, messages });
  }

  async start(
    latencySink: Sink<LatencyObservation>,
    throughputSink: Sink<ThroughputObservation>
  ) {
    console.trace("[PRODUCER.start] Starting Producer...");
    this.isRunning = true;
    const {
      rate: { size, delay, duration },
      topic,
    } = this.config;
    const startTime = Date.now();
    const durationMs = ms(duration as StringValue);
    const endTime = Date.now() + durationMs;
    const delayMs = delay ? ms(delay as StringValue) : -1;
    const flushDelayMs = Math.max(1000, delayMs - 1);
    let lastFlushTs = 0;
    let totalBatchCount = 0;
    let latencySum = 0;
    let flushBatchCount = 0;
    try {
      await this.producer.connect();
      this.isConnected = true;
      console.trace("[PRODUCER.start] Producer connected");
      const batch = this.buildBatch();
      while (Date.now() < endTime && this.isRunning) {
        const batchStartTime = Date.now();
        await this._sendBatch(batch);
        const batchDuration = Date.now() - batchStartTime;
        latencySum += batchDuration;
        flushBatchCount++;
        totalBatchCount++;
        if (Date.now() - lastFlushTs >= flushDelayMs) {
          throughputSink({
            kind: "throughput",
            ts: Date.now(),
            client: "producer",
            topic,
            valueBytes: size * batch.length * flushBatchCount,
            duration: Date.now() - lastFlushTs,
          });
          latencySink({
            kind: "latency",
            ts: Date.now(),
            topic: this.config.topic,
            client: "producer",
            valueMs: latencySum / flushBatchCount,
          });
          lastFlushTs = Date.now();
          latencySum = 0;
          flushBatchCount = 0;
        }
        if (!this.isRunning) break;
        if (delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
      const durationMsActual = Date.now() - startTime;
      const totalMessages = totalBatchCount * this.config.rate.count;
      const totalBytes = totalMessages * this.config.rate.size;
      const prettyTotalBytes = prettyBytes(totalBytes);
      const bytesPerSec = totalBytes / (durationMsActual / 1000);
      const prettyRate = prettyBytes(bytesPerSec) + "/s";
      console.trace("[PRODUCER.start] Producer finished sending messages.", {
        totalBatches: totalBatchCount,
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
