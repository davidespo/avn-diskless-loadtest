import type { ThroughputStat } from "../types/ThroughputStat.js";

export class ThroughputStatObserver {
  private recentPerSecondEntries: { valueBytes: number; durationMs: number }[] =
    [];
  private lastUpdated: number = Date.now();
  private key: string;
  private maxValues: number;
  private totalBytes: number = 0;
  private totalDurationMs: number = 0;

  constructor(key: string, maxValues: number = 25) {
    this.key = key;
    this.maxValues = maxValues;
  }

  observe(valueBytes: number, durationMs: number) {
    this.totalBytes += valueBytes;
    this.totalDurationMs += durationMs;
    this.recentPerSecondEntries.push({ valueBytes, durationMs }); // bytes per second
    this.recentPerSecondEntries = this.recentPerSecondEntries.slice(
      -this.maxValues
    );
    this.lastUpdated = Date.now();
  }

  get(): ThroughputStat {
    if (this.recentPerSecondEntries.length === 0) {
      return {
        key: this.key,
        lastUpdated: this.lastUpdated,
        totalBytes: 0,
        totalDurationMs: 0,
        totalRate: 0,
        recentBytes: 0,
        recentDurationMs: 0,
        recentRate: 0,
        latestPerSecondValues: [],
      };
    }
    const { totalBytes, totalDurationMs, recentPerSecondEntries, lastUpdated } =
      this;
    const totalRate = totalBytes / (totalDurationMs / 1000); // bytes per second
    const recentBytes = recentPerSecondEntries.reduce(
      (a, b) => a + b.valueBytes,
      0
    );
    const recentDurationMs = recentPerSecondEntries.reduce(
      (a, b) => a + b.durationMs,
      0
    );
    const recentRate = recentBytes / (recentDurationMs / 1000);
    return {
      key: this.key,
      lastUpdated,
      totalBytes,
      totalDurationMs,
      totalRate,
      recentBytes,
      recentDurationMs,
      recentRate,
      latestPerSecondValues: recentPerSecondEntries.map(
        (entry) => entry.valueBytes / (entry.durationMs / 1000)
      ),
    };
  }
}
