import { nanoid } from "nanoid";
import { create } from "zustand";
import { type KCluster } from "../types";
import { persist, createJSONStorage } from "zustand/middleware";

export type UseClustersState = {
  clusters: KCluster[];
  addCluster: (cluster: Omit<KCluster, "id">) => void;
  removeCluster: (id: string) => void;
};

export const useClusters = create<UseClustersState>()(
  persist(
    (set) => ({
      clusters: [],
      addCluster: (cluster) =>
        set((state) => ({
          clusters: [...state.clusters, { id: nanoid(12), ...cluster }],
        })),
      removeCluster: (id) =>
        set((state) => ({
          clusters: state.clusters.filter((cluster) => cluster.id !== id),
        })),
    }),
    {
      name: "clusters-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
