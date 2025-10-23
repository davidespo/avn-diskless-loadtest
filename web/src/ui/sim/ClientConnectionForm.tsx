import { Button } from "primereact/button";
import type { KCluster } from "../../types/index.js";
import { useClientConnections } from "../../hooks/index.js";

export type ProducerClient = {
  id: string;
  clusterId: string;
};

type ClientConnectionFormProps = {
  cluster: KCluster;
};
export const ClientConnectionForm = ({ cluster }: ClientConnectionFormProps) => {
  const { connections, startProducerLoadConnection, startConsumerLoadConnection } = useClientConnections();
  const producerLoadClientCount = connections.filter(c => c.kind === 'producer_load').length;
  const consumerLoadClientCount = connections.filter(c => c.kind === 'consumer_load').length;
  return (
    <div className="flex flex-wrap justify-content-around">
      <Button
        label={`Add Throughput Producer (${producerLoadClientCount})`}
        icon="pi pi-truck"
        severity="success"
        onClick={() => {
          startProducerLoadConnection(cluster);
        }}
      />
      <Button
        label={`Add Throughput Consumer (${consumerLoadClientCount})`}
        icon="pi pi-truck"
        severity="info"
        onClick={() => {
          startConsumerLoadConnection(cluster);
        }}
      />
    </div>
  );
};
