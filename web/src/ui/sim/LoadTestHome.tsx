import { Fieldset } from "primereact/fieldset";
import { useState } from "react";
import { useClusters } from "../../hooks/useClusters";
import { Dropdown } from "primereact/dropdown";
import type { KCluster } from "../../types";
import { ClientConnectionList } from "./ClientConnectionList";
import { GlobalMetricsDisplay } from "./GlobalMetricsDisplay";
import { ClientConnectionForm } from "./ClientConnectionForm";

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
          <Fieldset legend="Load Test Controller + Metrics" className="mb-5" toggleable>
            <div className="flex flex-column gap-2">
                <ClientConnectionForm cluster={activeCluster} />
                <div className="pb-3 px-3 mx-4">
                    <hr />
                </div>
                <GlobalMetricsDisplay />
            </div>
          </Fieldset>
          <Fieldset legend="Load Test Clients" className="mb-5" toggleable>
            <ClientConnectionList />
          </Fieldset>
        </>
      )}
    </div>
  );
};
