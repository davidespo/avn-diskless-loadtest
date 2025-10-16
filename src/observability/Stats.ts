export type Stat = {
  key: string;
  ts: number;
  sum: number;
  count: number;
  max: number;
  min: number;
  avg: number;
  median: number;
  p90: number;
  p99: number;
  std: number;
};

export class Stats {
  private values: number[] = [];
  private ts = Date.now();
  constructor(readonly key: string) {}

  observe = (value: number) => {
    this.values.push(value);
    this.ts = Date.now();
  };

  get(): Stat {
    const { ts, values } = this;
    const sum = values.reduce((a, b) => a + b, 0);
    const count = values.length;
    const sortedValues = values.sort((a, b) => a - b);
    const avg = sum / values.length;
    return {
      key: this.key,
      ts: ts,
      sum,
      count,
      max: Math.max(...values),
      min: Math.min(...values),
      avg,
      median: sortedValues[Math.floor(count / 2)] ?? 0,
      p90: sortedValues[Math.floor(count * 0.9)] ?? 0,
      p99: sortedValues[Math.floor(count * 0.99)] ?? 0,
      std: Math.sqrt(sortedValues.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / count),
    };
  }
}
