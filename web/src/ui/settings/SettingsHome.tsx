import { ClusterForm } from "./ClusterForm";
import { ClusterList } from "./ClusterList";
import { Fieldset } from "primereact/fieldset";

export const SettingsHome = () => {
  return (
    <div className="mt-3">
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
