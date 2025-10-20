import { Card } from "primereact/card";
import { useClientConnections } from "../../hooks";
import type { ClientConnectionState, LatencyStat } from "../../types";
import { useMemo } from "react";
import _ from "lodash";
import { Button } from "primereact/button";
import type { ThroughputStat } from "../../types/ThroughputStat";
import prettyBytes from "pretty-bytes";

export const ProducerList = () => {
  const { connections, stopConnection } = useClientConnections();
  const producers = useMemo(() => {
    return connections.filter((conn) => conn.kind === "producer_load");
  }, [connections])
  if (producers.length === 0) {
    return (
      <div>
        <em>No producers</em>
      </div>
    );
  }
  return (
    <div className="flex flex-column gap-2">
      {producers.map((connection) => (
        <ProducerCard key={connection.id} connection={connection} stopConnection={stopConnection} />
      ))}
    </div>
  );
};

type ProducerCardProps = {
  connection: ClientConnectionState;
  stopConnection: (id: string) => Promise<void>;
};
const ProducerCard = ({ connection, stopConnection }: ProducerCardProps) => {
  return (
    <Card title={`Producer: ${connection.id}`}>
      <div>Cluster: {`${connection.cluster.title}`}</div>
      <div>Connected: {`${connection.isConnected}`}</div>
      <div>Running: {`${connection.isRunning}`}</div>
      {connection.latencyStats.map((stat) => (
        <LatencyStat key={stat.key} stat={stat} />
      ))}
      {connection.latencyStats.map((stat) => (
        <LatencyStat key={stat.key} stat={stat} />
      ))}
      {connection.throughputStats.map((stat) => (
        <ThroughputStat key={stat.key} stat={stat} />
      ))}
      <div className="flex justify-content-end">
        <Button severity="danger" label="Stop" icon="pi pi-stop" onClick={async () => {
          await stopConnection(connection.id);
        }} />
      </div>
    </Card>
  );
};

const LatencyStat = ({ stat }: { stat: LatencyStat }) => {
  return <div className="flex gap-2">
    <div>{_.startCase(stat.key)}:</div>
    <div>Count: {stat.count.toLocaleString()}</div>
    <div>Avg: {stat.avg.toFixed(1)}</div>
    <div>Median: {stat.median.toFixed(1)}</div>
    <div>p90: {stat.p90.toFixed(1)}</div>
    <div>p99: {stat.p99.toFixed(1)}</div>
    <div>StdDev: {stat.std.toFixed(1)}</div>
  </div>;
}

const ThroughputStat = ({ stat }: { stat: ThroughputStat }) => {
  // TODO: split latency and throughput stats
  return <div className="flex gap-2">
    <div>{_.startCase(stat.key)}:</div>
    <div>Recent Rate: {prettyBytes(stat.recentRate)}/sec</div>
    <div>Total Rate: {prettyBytes(stat.totalRate)}/sec</div>
  </div>;
}