import { KConsumer, KProducer } from "../kafka";
import { getNoopSink, Sink } from "./Sink";
import { BaseObservation, StatStorageService } from "./StatStorageService";
import { z } from "zod";

export type LatencyObservation = BaseObservation;

export const LatencyTestConfig = z.object({
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

  startTest = async (config: LatencyTestConfig, sink: Sink<LatencyObservation>) => {
    const { az, session, duration, topic } = config;
    const producerProcess = new KProducer({
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
    }).start(sink, getNoopSink());
    const consumerProcess = new KConsumer({
      az,
      session,
      topic,
      mode: "latency",
      consumerGroup: `latency-test-${session}`,
      duration,
      configuration: {},
    }).start(sink, getNoopSink());
    const [producerCount, consumerCount] = await Promise.all([producerProcess, consumerProcess]);
    return { producerCount, consumerCount };
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
