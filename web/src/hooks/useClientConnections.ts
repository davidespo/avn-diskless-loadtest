import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import { nanoid } from "nanoid";
import { create } from "zustand";

export type ClientConnection = {
  id: string;
  req: AxiosRequestConfig;
  controller: AbortController;
  state: "ACTIVE" | "CANCELED" | "ERROR" | "PAUSED";
  error: string | null;
  response: { data: unknown; status: number } | null;
};

type SetStateCallback = (state: UseClientConnectionsState) => Partial<UseClientConnectionsState>;
type SetState = (callback: SetStateCallback) => void;

const createClientConnection = (reqInput: AxiosRequestConfig, set: SetState): ClientConnection => {
  const id = nanoid();
  const controller = new AbortController();
  const req = {
    ...reqInput,
    signal: controller.signal,
  };
  // .finally(() => this.renewClientConnection(id));
  const clientConn: ClientConnection = {
    id,
    req,
    controller,
    state: "ACTIVE",
    error: null,
    response: null,
  };
  console.log("created clientConn state", clientConn);
  const renewClientConnection = () => {
    switch (clientConn.state) {
      case "ACTIVE": {
        axios(clientConn.req)
          .then((response) => {
            console.log("responded to request", { clientConn, response });
            console.log("updating zustand state", { clientConn });
            set((state: UseClientConnectionsState) => ({
              connections: state.connections.map((conn) => {
                if (conn.id === clientConn.id) {
                  const { data, status } = response;
                  const updatedConn: ClientConnection = { ...clientConn, state: "ACTIVE", response: { data, status } };
                  console.log("updated conn", updatedConn);
                  return updatedConn;
                }
                return conn;
              }),
            }));
            console.log("renewing clientConn connection", clientConn);
            renewClientConnection();
            return response;
          })
          .catch((error) => {
            console.log("error in request", { clientConn, error });
            let errorMessage = "Unknown error";
            if (error instanceof AxiosError || error instanceof Error) {
              errorMessage = error.message;
            }
            console.error("ERROR MESSAGE", errorMessage);
            console.log("updating zustand state", { clientConn });
            set((state: UseClientConnectionsState) => ({
              connections: state.connections.map((conn) => {
                if (conn.id === id) {
                  const updatedConn: ClientConnection = { ...conn, error: errorMessage, state: "ERROR" };
                  console.log("updated conn", updatedConn);
                  return updatedConn;
                }
                return conn;
              }),
            }));
          });
        break;
      }
      case "ERROR":
      case "CANCELED":
      case "PAUSED":
        // do nothing
        break;
    }
  };
  console.log("renewing clientConn connection (initial request)", clientConn);
  renewClientConnection();
  return clientConn;
};

type UseClientConnectionsState = {
  connections: ClientConnection[];
  createProducerLatencyConnection: () => void;
};

export const useClientConnections = create<UseClientConnectionsState>((set) => ({
  connections: [] as ClientConnection[],
  //   increasePopulation: () => set((state) => ({ bears: state.bears + 1 })),
  //   removeAllBears: () => set({ bears: 0 }),
  //   updateBears: (newBears) => set({ bears: newBears }),
  createProducerLatencyConnection: (sessionId: string = "defaultSession", az: string = "random_az_assignment") =>
    set((state: UseClientConnectionsState) => {
      const clientConn = createClientConnection(
        {
          method: "POST",
          url: "http://localhost:3000/produce",
          data: {
            az,
            session: sessionId,
            topic: "test",
            rate: {
              count: 1,
              delay: "1s",
              size: 10,
              duration: "5s",
            },
          },
        },
        set
      );
      return {
        connections: [...state.connections, clientConn],
      };
    }),
}));
