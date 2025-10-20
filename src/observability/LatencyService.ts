import { KConsumer, KProducer } from "../kafka";
import { KafkaConnectionConfig } from "../kafka/kafka";
import { getNoopSink, Sink } from "./Sink";
import { LatencyObservation } from "./types";
import { z } from "zod";

export const LatencyTestConfig = z.object({
  connectionConfig: KafkaConnectionConfig,
  az: z.string(),
  session: z.string(),
  duration: z.string(),
  topic: z.string(),
});
export type LatencyTestConfig = z.infer<typeof LatencyTestConfig>;

export class LatencyService {
  constructor() {
  }

  startTest = (config: LatencyTestConfig, sink: Sink<LatencyObservation>) => {
    const { az, session, duration, topic, connectionConfig } = config;
    const producer = new KProducer({
      connectionConfig,
      az,
      session,
      topic,
      rate: {
        count: 1,
        delay: "500ms",
        size: 10,
        duration,
      },
      configuration: {},
    });
    const consumer = new KConsumer({
      connectionConfig,
      az,
      session,
      topic,
      mode: "latency",
      consumerGroup: `latency-test-${session}`,
      duration,
      configuration: {},
    });
    const promise = new Promise<void>(async (resolve, reject) => {
      try {
        console.trace('[LATENCY_TEST] Starting Latency Test');
        const noopSink = getNoopSink();
        await consumer.subscribe(sink, noopSink);
        console.trace('[LATENCY_TEST] Consumer Subscribed... starting both producer and consumer');
        await Promise.all([
          producer.start(sink, noopSink), 
          consumer.start(sink, noopSink)
        ]);
        console.trace('[LATENCY_TEST] Latency Test Completed');
        resolve();
      } catch (error) {
        reject(error);
      }
    });
    const stop = async () => {
      console.trace('[LATENCY_TEST] Stopping Latency Test');
      await producer.stop();
      await consumer.stop();
      console.trace('[LATENCY_TEST] Latency Test Stopped');
    }
    return { promise, stop };
  };

  getTimer(observation: Omit<LatencyObservation, "value">) {
    const startTime = Date.now();
    return {
      stop: (): LatencyObservation => ({ ...observation, valueMs: Date.now() - startTime }),
    };
  }
}

export const latencyService = new LatencyService();
