import { Button } from "primereact/button";
import type { KCluster } from "../../types";
import { useClientConnections } from "../../hooks";

export type ProducerClient = {
  id: string;
  clusterId: string;
};

type ProducerFormProps = {
  cluster: KCluster;
};
export const ProducerForm = ({ cluster }: ProducerFormProps) => {
  const { startProducerLoadConnection } = useClientConnections();
  return (
    <div className="flex flex-wrap justify-content-around">
      <Button
        label="Add Throughput Producer"
        icon="pi pi-truck"
        severity="success"
        onClick={() => {
          startProducerLoadConnection(cluster);
        }}
      />
    </div>
  );
};
