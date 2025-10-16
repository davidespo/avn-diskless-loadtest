import { Button } from "primereact/button";
import { useClientConnections } from "../../hooks";

export const ProducerForm = () => {
  const { createProducerLatencyConnection } = useClientConnections();
  return (
    <div className="flex flex-wrap justify-content-around">
      <Button label="Add Latency Producer" icon="pi pi-stopwatch" onClick={createProducerLatencyConnection} />
      <Button label="Add Throughput Producer" icon="pi pi-truck" severity="success" />
    </div>
  );
};
