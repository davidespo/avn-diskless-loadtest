export type LatencyAggregate = {
  ts: number;
  count: number;
  min: number;
  max: number;
  avg: number;
};

export type LatencyStat = {
  sum: number;
  count: number;
  avg: number;
  median: number;
  p90: number;
  p99: number;
  std: number;
};

export type OnlineLatencyStat = {
  sum: number;
  count: number;
  avg: number;
  std: number;
  min: number;
  max: number;
};

export type LatencyObserverResult = {
  key: string;
  instantaneous: number;
  recent: LatencyStat;
  shortTerm: LatencyStat;
  fullHistory: OnlineLatencyStat;
  aggregates: {
    seconds: LatencyAggregate[];
    minutes1: LatencyAggregate[];
    minutes10: LatencyAggregate[];
  };
};
