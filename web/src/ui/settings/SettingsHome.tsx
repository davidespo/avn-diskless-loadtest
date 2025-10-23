import { ApiForm } from "./ApiForm";
import { ClusterForm } from "./ClusterForm";
import { ClusterList } from "./ClusterList";
import { Fieldset } from "primereact/fieldset";

export const SettingsHome = () => {
  return (
    <div className="mt-3">
      <Fieldset legend="Load Test API Servers" className="mb-5">
        <p>
            Manage the API servers that will be used for load testing. You can add
            new servers and configure existing ones.
        </p>
        <ApiForm />
      </Fieldset>
      <Fieldset legend="Cluster Settings" className="mb-5">
        <p>
          Configure the clusters used for load testing. You can add new clusters
          and manage existing ones.
        </p>
        <ClusterForm />
      </Fieldset>
      <Fieldset legend="Manage Clusters" className="mb-5">
        <p>
          Below is a list of all configured clusters. You can edit or remove
          them as needed.
        </p>
        <ClusterList />
      </Fieldset>
    </div>
  );
};
