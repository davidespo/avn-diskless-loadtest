import { useClientConnections } from "../../hooks";
import { LatencyCard } from "./LatencyCard";
import { ThroughputCard } from "./ThroughputCard";
import { MetricsLineChart } from "./GlobalMetricsLineChart";

export const GlobalMetricsDisplay = () => {
  const { globalLatencyResults, globalThroughputResults } =
    useClientConnections();
  const producerLatencyStat = globalLatencyResults["latency-producer"];
  const producerThroughputStat = globalThroughputResults["throughput-producer"];
  const consumerThroughputStat = globalThroughputResults["throughput-consumer"];
  return (
    <div className="flex">
      <div className="flex flex-column gap-2">
        <LatencyCard result={producerLatencyStat ?? null} />
        <ThroughputCard result={producerThroughputStat ?? null} />
        <ThroughputCard result={consumerThroughputStat ?? null} />
      </div>
      <div className="flex-grow-1">
        <MetricsLineChart
          producerLatency={producerLatencyStat ?? null}
          producerThroughput={producerThroughputStat ?? null}
          consumerThroughput={consumerThroughputStat ?? null}
        />
      </div>
    </div>
  );
};
