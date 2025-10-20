export type LatencyStat = {
  key: string;
  lastUpdated: number;
  sum: number;
  count: number;
  avg: number;
  median: number;
  p90: number;
  p99: number;
  std: number;
  latestValues: number[];
};
