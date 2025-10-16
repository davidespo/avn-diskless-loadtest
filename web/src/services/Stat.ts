export type Stat = {
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

export class StatObserver {
  private recentValues: number[] = [];
  private lastUpdated: number = Date.now();
  private key: string;
  private maxValues: number;

  constructor(key: string, maxValues: number = 100) {
    this.key = key;
    this.maxValues = maxValues;
  }

  observe(value: number) {
    this.recentValues.push(value);
    this.recentValues = this.recentValues.slice(-this.maxValues);
    this.lastUpdated = Date.now();
  }

  get(): Stat {
    if (this.recentValues.length === 0) {
      return {
        key: this.key,
        lastUpdated: this.lastUpdated,
        sum: 0,
        count: 0,
        avg: 0,
        median: 0,
        p90: 0,
        p99: 0,
        std: 0,
        latestValues: [],
      };
    }
    const sum = this.recentValues.reduce((a, b) => a + b, 0);
    const count = this.recentValues.length;
    const avg = sum / count;
    const std = Math.sqrt(this.recentValues.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / count);
    const sortedValues = [...this.recentValues].sort((a, b) => a - b);
    const median = sortedValues[Math.floor(count / 2)];
    const p90 = sortedValues[Math.floor(count * 0.9)];
    const p99 = sortedValues[Math.floor(count * 0.99)];
    return {
      key: this.key,
      lastUpdated: this.lastUpdated,
      sum,
      count,
      avg,
      median,
      p90,
      p99,
      std,
      latestValues: this.recentValues.slice(-10),
    };
  }
}
