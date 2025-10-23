import { type LatencyAggregate, type LatencyObserverResult, type LatencyStat } from "../types/index.js";

export class LatencyObserver {
  private key: string;
  private recentStatObserver: LatencyStatObserver;
  private shortTermStatObserver: LatencyStatObserver;
  private fullHistoryStatObserver: OnlineLatencyStatObserver;
  private aggregateObserver: LatencyAggregateObserver;

  constructor(key: string) {
    this.key = key;
    this.recentStatObserver = new LatencyStatObserver(10);
    this.shortTermStatObserver = new LatencyStatObserver(100);
    this.fullHistoryStatObserver = new OnlineLatencyStatObserver();
    this.aggregateObserver = new LatencyAggregateObserver(
      600, // Store up to 10 minutes of second-level data
      60, // Store up to 1 hour of 1-minute-level data
      144 // Store up to 24 hours of 10-minute-level data
    );
  }

  observe(valueMs: number, ts: number) {
    this.recentStatObserver.observe(valueMs);
    this.shortTermStatObserver.observe(valueMs);
    this.fullHistoryStatObserver.observe(valueMs);
    this.aggregateObserver.observe(valueMs, ts);
  }

  get(): LatencyObserverResult {
    const aggregates = this.aggregateObserver.get();
    const instantaneous = aggregates.seconds.length > 0
      ? aggregates.seconds[aggregates.seconds.length - 1].avg
      : 0;
    return {
      key: this.key,
      instantaneous,
      recent: this.recentStatObserver.get(),
      shortTerm: this.shortTermStatObserver.get(),
      fullHistory: this.fullHistoryStatObserver.get(),
      aggregates: aggregates,
    };
  }
}

class OnlineLatencyStatObserver {
  private count: number = 0;
  private sum: number = 0;
  private min: number = Number.MAX_SAFE_INTEGER;
  private max: number = Number.MIN_SAFE_INTEGER;
  private sum2: number = 0; // sum of squares for stddev calculation

  observe(value: number) {
    this.count++;
    this.sum += value;
    this.min = Math.min(this.min, value);
    this.max = Math.max(this.max, value);
    this.sum2 += value * value;
  }

  get() {
    const { sum, count, min, max } = this;
    const avg = count > 0 ? sum / count : 0;
    const variance = count > 0 ? this.sum2 / count - avg * avg : 0;
    const std = Math.sqrt(variance);
    return {
      sum,
      count,
      avg,
      min: min === Number.MAX_SAFE_INTEGER ? 0 : min,
      max: max === Number.MIN_SAFE_INTEGER ? 0 : max,
      std,
    };
  }
}

class LatencyStatObserver {
  private recentEnties: number[] = [];
  private maxEntries: number;

  constructor(maxEntries: number) {
    this.maxEntries = maxEntries;
  }

  observe(value: number) {
    this.recentEnties.push(value);
    while (this.recentEnties.length > this.maxEntries) {
      this.recentEnties.shift();
    }
  }

  get(): LatencyStat {
    if (this.recentEnties.length === 0) {
      return {
        sum: 0,
        count: 0,
        avg: 0,
        median: 0,
        p90: 0,
        p99: 0,
        std: 0,
      };
    }
    // drop first and last entries to reduce noise
    const recentValues = this.recentEnties.slice(1, -1);
    const sum = recentValues.reduce((a, b) => a + b, 0);
    const count = recentValues.length;
    const avg = sum / count;
    const std = Math.sqrt(
      recentValues.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / count
    );
    const sortedValues = [...recentValues].sort((a, b) => a - b);
    const median = sortedValues[Math.floor(count / 2)];
    const p90 = sortedValues[Math.floor(count * 0.9)];
    const p99 = sortedValues[Math.floor(count * 0.99)];
    return {
      sum,
      count,
      avg,
      median,
      p90,
      p99,
      std,
    };
  }
}

const toSecondBucket = (timestamp: number) =>
  Math.floor(timestamp / 1000) * 1000;
const toMinuteBucket1 = (timestamp: number) =>
  Math.floor(timestamp / 60000) * 60000;
const toMinuteBucket10 = (timestamp: number) =>
  Math.floor(timestamp / 600000) * 600000;

type RawLatencyAggregate = {
  bucketKey: number;
  count: number;
  min: number;
  max: number;
  sum: number;
};

class LatencyAggregateObserver {
  private secondBuckets: RawLatencyAggregate[] = [];
  private minuteBuckets1: RawLatencyAggregate[] = [];
  private minuteBuckets10: RawLatencyAggregate[] = [];

  private maxSecondsStored;
  private maxMinutes1Stored;
  private maxMinutes10Stored;

  constructor(
    maxSecondsStored = 600, // Store up to 10 minutes of second-level data
    maxMinutes1Stored = 60, // Store up to 1 hour of 1-minute-level data
    maxMinutes10Stored = 144, // Store up to 24 hours of 10-minute-level data
  ) {
    this.maxSecondsStored = maxSecondsStored;
    this.maxMinutes1Stored = maxMinutes1Stored;
    this.maxMinutes10Stored = maxMinutes10Stored;
  }

  private _observe(
    buckets: RawLatencyAggregate[],
    bucketKey: number,
    valueMs: number,
    maxEntries: number
  ): void {
    let bucket = buckets.find((b) => b.bucketKey === bucketKey);
    if (!bucket) {
      bucket = {
        bucketKey,
        count: 0,
        min: Number.MAX_SAFE_INTEGER,
        max: Number.MIN_SAFE_INTEGER,
        sum: 0,
      };
      buckets.push(bucket);
      buckets.sort((a, b) => a.bucketKey - b.bucketKey);
      while (buckets.length > maxEntries) {
        buckets.shift();
      }
    }
    bucket.count++;
    bucket.min = Math.min(bucket.min, valueMs);
    bucket.max = Math.max(bucket.max, valueMs);
    bucket.sum += valueMs;
  }

  observe(valueMs: number, ts: number): void {
    this._observe(
      this.secondBuckets,
      toSecondBucket(ts),
      valueMs,
      this.maxSecondsStored
    );
    this._observe(
      this.minuteBuckets1,
      toMinuteBucket1(ts),
      valueMs,
      this.maxMinutes1Stored
    );
    this._observe(
      this.minuteBuckets10,
      toMinuteBucket10(ts),
      valueMs,
      this.maxMinutes10Stored
    );
  }

  private _get(buckets: RawLatencyAggregate[]): LatencyAggregate[] {
    return buckets.map((b) => ({
      ts: b.bucketKey,
      count: b.count,
      min: b.min === Number.MAX_SAFE_INTEGER ? 0 : b.min,
      max: b.max === Number.MIN_SAFE_INTEGER ? 0 : b.max,
      avg: b.count > 0 ? b.sum / b.count : 0,
    }));
  }

  get() {
    return {
      seconds: this._get(this.secondBuckets),
      minutes1: this._get(this.minuteBuckets1),
      minutes10: this._get(this.minuteBuckets10),
    };
  }
}
