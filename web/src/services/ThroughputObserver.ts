import type {
  ThroughputObserverResult,
  ThroughputStat,
} from "../types/ThroughputStat.js";
import type {
  ThroughputAggregate,
  ThroughputAggregateResult,
} from "../types/ThroughputStat.js";

export class ThroughputObserver {
  private key: string;
  private recentStatObserver: ThroughputStatObserver;
  private shortTermStatObserver: ThroughputStatObserver;
  private fullHistoryStatObserver: OnlineThroughputStatObserver;
  private aggregateObserver: ThroughputAggregateObserver;

  constructor(key: string) {
    this.key = key;
    this.recentStatObserver = new ThroughputStatObserver(10);
    this.shortTermStatObserver = new ThroughputStatObserver(100);
    this.fullHistoryStatObserver = new OnlineThroughputStatObserver();
    this.aggregateObserver = new ThroughputAggregateObserver(
      600, // Store up to 10 minutes of second-level data
      60, // Store up to 1 hour of 1-minute-level data
      144 // Store up to 24 hours of 10-minute-level data
    );
  }

  observe(valueMs: number, ts: number) {
    this.recentStatObserver.observe(valueMs, ts);
    this.shortTermStatObserver.observe(valueMs, ts);
    this.fullHistoryStatObserver.observe(valueMs, ts);
    this.aggregateObserver.observe(valueMs, ts);
  }

  get(): ThroughputObserverResult {
    const aggregates = this.aggregateObserver.get();
    const rateBytes =
      aggregates.seconds.buckets.length > 0
        ? aggregates.seconds.buckets[aggregates.seconds.buckets.length - 1]
            .rateBytes
        : 0;
    const { unit, unitDivisor } = getThroughputUnit(rateBytes);
    const instantaneous = {
      rateBytes,
      unit,
      unitDivisor,
    };
    return {
      key: this.key,
      instantaneous,
      recent: this.recentStatObserver.get(),
      shortTerm: this.shortTermStatObserver.get(),
      fullHistory: this.fullHistoryStatObserver.get(),
      aggregates,
    };
  }
}

export const getThroughputUnit = (minThroughput: number) => {
  const unit =
    minThroughput >= 1_000_000_000
      ? "GB/s"
      : minThroughput >= 1_000_000
      ? "MB/s"
      : minThroughput >= 1_000
      ? "kB/s"
      : "B/s";
  const unitDivisor = unit === "MB/s" ? 1_000_000 : unit === "kB/s" ? 1_000 : 1;
  return { unit, unitDivisor };
};

class OnlineThroughputStatObserver {
  private count: number = 0;
  private sum: number = 0;
  private firstTs: number | null = null;

  observe(value: number, ts: number) {
    this.count++;
    this.sum += value;
    this.firstTs = this.firstTs ? Math.min(this.firstTs, ts) : ts;
  }

  get(): ThroughputStat {
    const { sum, count, firstTs } = this;
    const durationMs = firstTs ? Date.now() - firstTs : 0;
    const rateBytes = durationMs > 0 ? sum / (durationMs / 1000) : 0;
    const { unit, unitDivisor } = getThroughputUnit(rateBytes);
    return {
      count,
      totalBytes: sum,
      durationMs,
      rateBytes,
      unit,
      unitDivisor,
    };
  }
}

class ThroughputStatObserver {
  private recentEntries: { value: number; ts: number }[] = [];
  private maxEntries: number;

  constructor(maxEntries: number) {
    this.maxEntries = maxEntries;
  }

  observe(valueBytes: number, ts: number) {
    this.recentEntries.push({ value: valueBytes, ts });
    if (this.recentEntries.length > this.maxEntries) {
      this.recentEntries.shift();
    }
  }

  get(): ThroughputStat {
    if (this.recentEntries.length === 0) {
      return {
        totalBytes: 0,
        durationMs: 0,
        count: 0,
        rateBytes: 0,
        unit: "B/s",
        unitDivisor: 1,
      };
    }
    const totalBytes = this.recentEntries.reduce((a, b) => a + b.value, 0);
    const firstTs = Math.min(...this.recentEntries.map((entry) => entry.ts));
    const durationMs = Date.now() - firstTs;
    const rateBytes = durationMs > 0 ? totalBytes / (durationMs / 1000) : 0;
    const { unit, unitDivisor } = getThroughputUnit(rateBytes);
    return {
      totalBytes,
      durationMs,
      count: this.recentEntries.length,
      rateBytes,
      unit,
      unitDivisor,
    };
  }
}

const toSecondBucket = (timestamp: number) =>
  Math.floor(timestamp / 1000) * 1000;
const toMinuteBucket1 = (timestamp: number) =>
  Math.floor(timestamp / 60000) * 60000;
const toMinuteBucket10 = (timestamp: number) =>
  Math.floor(timestamp / 600000) * 600000;

type RawThroughputAggregate = {
  bucketKey: number;
  count: number;
  sum: number;
};

class ThroughputAggregateObserver {
  private secondBuckets: RawThroughputAggregate[] = [];
  private minuteBuckets1: RawThroughputAggregate[] = [];
  private minuteBuckets10: RawThroughputAggregate[] = [];

  private maxSecondsStored;
  private maxMinutes1Stored;
  private maxMinutes10Stored;

  constructor(
    maxSecondsStored = 600, // Store up to 10 minutes of second-level data
    maxMinutes1Stored = 60, // Store up to 1 hour of 1-minute-level data
    maxMinutes10Stored = 144 // Store up to 24 hours of 10-minute-level data
  ) {
    this.maxSecondsStored = maxSecondsStored;
    this.maxMinutes1Stored = maxMinutes1Stored;
    this.maxMinutes10Stored = maxMinutes10Stored;
  }

  private _observe(
    buckets: RawThroughputAggregate[],
    bucketKey: number,
    valueBytes: number,
    maxEntries: number
  ): void {
    let bucket = buckets.find((b) => b.bucketKey === bucketKey);
    if (!bucket) {
      bucket = {
        bucketKey,
        count: 0,
        sum: 0,
      };
      buckets.push(bucket);
      buckets.sort((a, b) => a.bucketKey - b.bucketKey);
      while (buckets.length > maxEntries) {
        buckets.shift();
      }
    }
    bucket.count++;
    bucket.sum += valueBytes;
  }

  observe(valueBytes: number, ts: number): void {
    this._observe(
      this.secondBuckets,
      toSecondBucket(ts),
      valueBytes,
      this.maxSecondsStored
    );
    this._observe(
      this.minuteBuckets1,
      toMinuteBucket1(ts),
      valueBytes,
      this.maxMinutes1Stored
    );
    this._observe(
      this.minuteBuckets10,
      toMinuteBucket10(ts),
      valueBytes,
      this.maxMinutes10Stored
    );
  }

  private _get(
    rawBuckets: RawThroughputAggregate[],
    bucketDurationMs: number
  ): ThroughputAggregateResult {
    if (rawBuckets.length === 0) {
      return {
        buckets: [],
        unit: "B/s",
        unitDivisor: 1,
      };
    }
    const buckets = rawBuckets
      .map(
        (b): ThroughputAggregate => ({
          ts: b.bucketKey,
          count: b.count,
          totalBytes: b.sum,
          rateBytes: b.count > 0 ? (b.sum * 1000) / bucketDurationMs : 0,
        })
      )
      .sort((a, b) => a.ts - b.ts)
      .slice(1, -1); // drop first and last buckets to reduce noise
    const minThroughput = Math.min(...buckets.map((b) => b.rateBytes));
    const unit =
      minThroughput >= 1_000_000_000
        ? "GB/s"
        : minThroughput >= 1_000_000
        ? "MB/s"
        : minThroughput >= 1_000
        ? "kB/s"
        : "B/s";
    const unitDivisor =
      unit === "MB/s" ? 1_000_000 : unit === "kB/s" ? 1_000 : 1;
    return { buckets, unit, unitDivisor };
  }

  get() {
    return {
      seconds: this._get(this.secondBuckets, 1000),
      minutes1: this._get(this.minuteBuckets1, 60000),
      minutes10: this._get(this.minuteBuckets10, 600000),
    };
  }
}
