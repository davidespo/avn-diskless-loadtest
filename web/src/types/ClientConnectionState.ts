import type { LatencyObserverResult } from "./LatencyStat";
import type { ThroughputObserverResult } from "./ThroughputStat";

export type ClientConnectionState = {
  id: string;
  cluster: { id: string; title: string };
  kind: "latency" | "producer_load" | "consumer_load";
  isRunning: boolean;
  isConnected: boolean;
  stop: () => Promise<void>;
  latencyStats: LatencyObserverResult[];
  throughputStats: ThroughputObserverResult[];
};