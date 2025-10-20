export type ThroughputStat = {
  key: string;
lastUpdated: number;
totalBytes: number;
totalDurationMs: number;
totalRate: number;
recentBytes: number;
recentDurationMs: number;
recentRate: number;
latestPerSecondValues: number[];
};
