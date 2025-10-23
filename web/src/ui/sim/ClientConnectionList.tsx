import _ from "lodash";
import { useClientConnections } from "../../hooks";
import { Button } from "primereact/button";
import type {
  ClientConnectionState,
  LatencyObserverResult,
  ThroughputObserverResult,
} from "../../types";
import { useMemo, useState } from "react";
import { Badge } from "primereact/badge";
import { ThroughputCard } from "./ThroughputCard";
import { LatencyCard } from "./LatencyCard";
import { MetricsLineChart } from "./GlobalMetricsLineChart";

export const ClientConnectionList = () => {
  const { connections, stopConnection, removeConnection } =
    useClientConnections();
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(
    null
  );
  const activeConnection = useMemo(
    () => connections.find((c) => c.id === activeConnectionId) || null,
    [connections, activeConnectionId]
  );
  return (
    <>
      <div className="flex">
        <div className="w-3 border-right-1" style={{ minHeight: "10rem" }}>
          <h3 className="p-2">Active Connections</h3>
          {connections.map((conn) => (
            <div
              key={conn.id}
              className="p-2 border-1 flex justify-content-between align-items-center"
              style={{ cursor: "pointer" }}
              onClick={() => setActiveConnectionId(conn.id)}
            >
              <div>{_.startCase(conn.kind)}</div>
              <div>
                <Button
                  icon="pi pi-search"
                  rounded
                  text
                  severity="info"
                  onClick={() => setActiveConnectionId(conn.id)}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="flex-grow-1 p-2">
          {activeConnection ? (
            <ActiveConnectionDisplay
              connection={activeConnection}
              removeConnection={removeConnection}
              stopConnection={stopConnection}
            />
          ) : (
            <div>Select a connection to see details</div>
          )}
        </div>
      </div>
    </>
  );
};

type ActiveConnectionDisplayProps = {
  connection: ClientConnectionState;
  removeConnection: (id: string) => void;
  stopConnection: (id: string) => void;
};
const ActiveConnectionDisplay = ({
  connection,
  removeConnection,
  stopConnection,
}: ActiveConnectionDisplayProps) => {
  const { latencyStats, throughputStats } = connection;
  const producerLatencyStat =
    latencyStats.find((stat) => stat.key === "producer latency") ?? null;
  const producerThroughputStat =
    throughputStats.find((stat) => stat.key === "producer throughput") ?? null;
  const consumerThroughputStat =
    throughputStats.find((stat) => stat.key === "consumer throughput") ?? null;
  return (
    <>
      <div className="flex">
        <div className="flex-grow-1">
          <div className="font-size-lg font-bold">
            {_.startCase(connection.kind)} Connection (
            <span className="mono text-pink-600">{connection.id}</span>)
          </div>
          <div>
            Cluster: {connection.cluster.title} (
            <span className="mono text-pink-600">{connection.cluster.id}</span>)
          </div>
          <div>
            Connection: <IsConnectedBadge isActive={connection.isConnected} />{" "}
            &nbsp; <IsRunningBadge isActive={connection.isRunning} />
          </div>
        </div>
        <div className="flex flex-column">
          <Button
            label="Stop"
            icon="pi pi-stop-circle"
            size="small"
            severity="warning"
            className="mb-2"
            disabled={!connection.isRunning}
            onClick={() => stopConnection(connection.id)}
          />
          <Button
            label="Remove"
            icon="pi pi-trash"
            severity="danger"
            size="small"
            onClick={() => removeConnection(connection.id)}
            disabled={connection.isRunning}
          />
        </div>
      </div>
      <ClientMetricsDisplay
        pLat={producerLatencyStat}
        pThu={producerThroughputStat}
        cThu={consumerThroughputStat}
      />
    </>
  );
};

type ConnectionBadgeProps = {
  isActive: boolean;
  label: string;
};
const ConnectionBadge = ({ isActive, label }: ConnectionBadgeProps) => {
  return (
    <Badge
      value={_.upperCase(label)}
      severity={isActive ? "success" : "secondary"}
    />
  );
};

const IsConnectedBadge = ({ isActive }: { isActive: boolean }) => {
  return (
    <ConnectionBadge
      isActive={isActive}
      label={isActive ? "CONNECTED" : "CLOSED"}
    />
  );
};
const IsRunningBadge = ({ isActive }: { isActive: boolean }) => {
  return (
    <ConnectionBadge
      isActive={isActive}
      label={isActive ? "RUNNING" : "STOPPED"}
    />
  );
};

type ClientMetricsDisplayProps = {
  pLat: LatencyObserverResult | null;
  pThu: ThroughputObserverResult | null;
  cThu: ThroughputObserverResult | null;
};
const ClientMetricsDisplay = ({
  cThu,
  pLat,
  pThu,
}: ClientMetricsDisplayProps) => {
  if (!cThu && !pThu && !pLat) {
    return null;
  }
  return (
    <div>
      <div className="flex gap-2">
        <LatencyCard result={pLat} />
        <ThroughputCard result={pThu} />
        <ThroughputCard result={cThu} />
      </div>
      <div className="w-full" style={{ height: 300 }}>
        <MetricsLineChart consumerThroughput={cThu} producerLatency={pLat} producerThroughput={pThu} />
      </div>
    </div>
  );
};
