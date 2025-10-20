import type { LatencyStat } from "./LatencyStat";
import type { ThroughputStat } from "./ThroughputStat";

export type ClientConnectionState = {
  id: string;
  cluster: { id: string; title: string };
  kind: "latency" | "producer_load" | "consumer_load";
  isRunning: boolean;
  isConnected: boolean;
  stop: () => Promise<void>;
  latencyStats: LatencyStat[];
  throughputStats: ThroughputStat[];
};