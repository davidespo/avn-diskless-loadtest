import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type UseLoadtestApiState = {
  endpoints: string[];
  activeEndpoint: string;
  setActiveEndpoint: (uri: string) => void;
  addEndpoint: (uri: string) => void;
  removeEndpoint: (id: string) => void;
};

export const useLoadtestApi = create<UseLoadtestApiState>()(
  persist(
    (set) => ({
      endpoints: ["http://localhost:3000", "https://avn-kafka-loadtest-api-751701266973.us-central1.run.app"],
      activeEndpoint: "http://localhost:3000",
      setActiveEndpoint: (uri) => set((state) => {
        if (!state.endpoints.includes(uri)) {
          return {
            endpoints: [...state.endpoints, uri],
            activeEndpoint: uri,
          };
        }
        return { activeEndpoint: uri };
      }),
      addEndpoint: (uri) =>
        set((state) => ({
          endpoints: [...state.endpoints, uri],
        })),
      removeEndpoint: (uri) =>
        set((state) => ({
          endpoints: state.endpoints.filter((endpoint) => endpoint !== uri),
          active:
            state.activeEndpoint === uri && state.endpoints.length > 1
              ? state.endpoints.find((endpoint) => endpoint !== uri) || ""
              : state.activeEndpoint === uri
              ? ""
              : state.activeEndpoint,
        })),
    }),
    {
      name: "clusters-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
