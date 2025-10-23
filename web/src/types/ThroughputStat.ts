export type ThroughputAggregate = {
  ts: number;
  count: number;
  totalBytes: number;
  rateBytes: number;
};

export type ThroughputAggregateResult = {
  buckets: ThroughputAggregate[];
  unit: string;
  unitDivisor: number;
};

export type ThroughputStat = {
  count: number;
  totalBytes: number;
  durationMs: number;
  rateBytes: number;
  unit: string;
  unitDivisor: number;
};

export type ThroughputObserverResult = {
  key: string;
  instantaneous: {
    rateBytes: number;
    unit: string;
    unitDivisor: number;
  };
  recent: ThroughputStat;
  shortTerm: ThroughputStat;
  fullHistory: ThroughputStat;
  aggregates: {
    seconds: ThroughputAggregateResult;
    minutes1: ThroughputAggregateResult;
    minutes10: ThroughputAggregateResult;
  };
};
