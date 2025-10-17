import { KConsumer, KProducer } from "../kafka";
import { getNoopSink, Sink } from "./Sink";
import { BaseObservation, StatStorageService } from "./StatStorageService";
import { z } from "zod";

export type LatencyObservation = BaseObservation;

export const LatencyTestConfig = z.object({
  inkless: z.boolean().default(false),
  az: z.string(),
  session: z.string(),
  duration: z.string(),
  topic: z.string(),
});
export type LatencyTestConfig = z.infer<typeof LatencyTestConfig>;

export class LatencyService extends StatStorageService<LatencyObservation> {
  constructor() {
    super();
  }

  startTest = (config: LatencyTestConfig, sink: Sink<LatencyObservation>) => {
    const { az, session, duration, topic, inkless } = config;
    const producer = new KProducer({
      inkless,
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
      inkless,
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
    const obs = this.save;
    const startTime = Date.now();
    return {
      stop: () => obs({ ...observation, value: Date.now() - startTime }),
    };
  }
}

export const latencyService = new LatencyService();
