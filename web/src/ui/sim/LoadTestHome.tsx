import { Fieldset } from "primereact/fieldset";
import { ConsumerList } from "./ConsumerList";
import { LatencyDisplay } from "./LatencyDisplay";
import { ProducerForm } from "./ProducerForm";
import { ProducerList } from "./ProducerList";
import { useState } from "react";
import { useClusters } from "../../hooks/useClusters";
import { Dropdown } from "primereact/dropdown";
import type { KCluster } from "../../types";

export const LoadTestHome = () => {
  const [activeCluster, setActiveCluster] = useState<KCluster | null>(null);
  const { clusters } = useClusters();
  return (
    <div className="py-5">
      <Fieldset
        legend={
          activeCluster
            ? `Active Cluster - ${activeCluster.title}`
            : "Active Cluster"
        }
        className="mb-5"
        toggleable
      >
        <Dropdown
          value={activeCluster}
          options={clusters}
          optionLabel="title"
          onChange={(e) => setActiveCluster(e.value)}
          placeholder="Select a Cluster"
          className="w-full"
        />
      </Fieldset>
      {activeCluster && (
        <>
          <Fieldset legend="Latency" className="mb-5" toggleable>
            <LatencyDisplay cluster={activeCluster} />
          </Fieldset>
          <Fieldset legend="Load Test" className="mb-5" toggleable>
            
          <h2>Producers</h2>
          <ProducerForm cluster={activeCluster} />
          <ProducerList />
          <h2>Consumers</h2>
          <ConsumerList />
          </Fieldset>
        </>
      )}
    </div>
  );
};
