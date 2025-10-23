import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import type { LatencyObserverResult } from "../../types";
import type { ThroughputObserverResult } from "../../types/ThroughputStat";
import _ from "lodash";
import { getThroughputUnit } from "../../services";

type MetricsLineChartProps = {
  producerLatency: LatencyObserverResult | null;
  producerThroughput: ThroughputObserverResult | null;
  consumerThroughput: ThroughputObserverResult | null;
};
export const MetricsLineChart = ({
  producerLatency,
  producerThroughput,
  consumerThroughput,
}: MetricsLineChartProps) => {
  if (!producerLatency && !producerThroughput && !consumerThroughput) {
    return null;
  }
  const data = [];
  const pLatEntries = producerLatency?.aggregates.seconds ?? [];
  const pThruEnties = producerThroughput?.aggregates.seconds ?? {
    buckets: [],
    unit: "B/s",
    unitDivisor: 1,
  };
  const cThruEnties = consumerThroughput?.aggregates.seconds ?? {
    buckets: [],
    unit: "B/s",
    unitDivisor: 1,
  };
  const uniqueTimestamps = _.uniq([
    ...pLatEntries.map((entry) => entry.ts),
    ...pThruEnties.buckets.map((entry) => entry.ts),
    ...cThruEnties.buckets.map((entry) => entry.ts),
  ]).sort((a, b) => a - b);

  for (const ts of uniqueTimestamps) {
    data.push({
      ts: new Date(ts).toLocaleTimeString(),
      pLat: pLatEntries.find((entry) => ts === entry.ts)?.avg ?? null,
      pThru:
        pThruEnties.buckets.find((entry) => ts === entry.ts)?.rateBytes ?? null,
      cThru:
        cThruEnties.buckets.find((entry) => ts === entry.ts)?.rateBytes ?? null,
    });
  }
  const minThroughput = Math.min(
    ...data
      .map((d) => [d.pThru, d.cThru])
      .flat()
      .filter((v): v is number => v !== null)
  );
  const { unit, unitDivisor } = getThroughputUnit(minThroughput);

  data.forEach((d) => {
    if (d.pThru !== null) {
      d.pThru = d.pThru / unitDivisor;
    }
    if (d.cThru !== null) {
      d.cThru = d.cThru / unitDivisor;
    }
  });
  return (
    <div className="border-1" style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer>
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="ts" />
          <YAxis yAxisId="throughput" unit={unit} width={80} />
          <YAxis yAxisId="latency" orientation="right" unit="ms" width={80} />
          <Legend />
          <Line
            yAxisId="latency"
            type="monotone"
            dataKey="pLat"
            stroke="#8884d8"
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
          <Line
            yAxisId="throughput"
            type="monotone"
            dataKey="pThru"
            stroke="#82ca9d"
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
          <Line
            yAxisId="throughput"
            type="monotone"
            dataKey="cThru"
            stroke="#ff9100ff"
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
