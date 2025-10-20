import { Card } from "primereact/card";
import { useClusters } from "../../hooks/useClusters";
import { Button } from "primereact/button";
import type { KCluster } from "../../types";

export const ClusterList = () => {
  const { clusters } = useClusters();
  return (
    <div>
      {clusters.map((cluster) => (
        <ClusterCard key={cluster.id} {...cluster} />
      ))}
    </div>
  );
};

const ClusterCard = (cluster: KCluster) => {
  const { removeCluster } = useClusters();
  const onDelete = () => {
    if (
      confirm(`Are you sure you want to delete cluster "${cluster.title}"?`)
    ) {
      removeCluster(cluster.id);
    }
  };
  return (
    <Card title={cluster.title} className="mb-2">
      <div className="flex justify-content-between align-content-center">
        <div>
          Host: <span className="mono">{cluster.host}</span>
        </div>
        <div>
          <Button
            icon="pi pi-trash"
            severity="danger"
            size="small"
            onClick={onDelete}
          />
        </div>
      </div>
    </Card>
  );
};
