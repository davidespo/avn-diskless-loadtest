import _ from "lodash";
import {
  SseObservation,
  type ClientConnectionState,
  type KCluster,
  type LatencyObserverResult,
  type ThroughputObserverResult,
} from "../types";
import { nanoid } from "nanoid";
import { create } from "zustand";
import { LatencyObserver, ThroughputObserver } from "../services";
import { useLoadtestApi } from "./useLoadtestApi";

// https://avn-kafka-loadtest-api-751701266973.us-central1.run.app

const safeExec = async (fn: () => Promise<void>) => {
  try {
    await fn();
  } catch (error) {
    console.error("Error executing function:", error);
  }
};

type ClientConnectionUpdater = (
  id: string,
  state: Partial<ClientConnectionState>
) => Promise<void>;

type OnSseStatObserver = (
  clientId: string,
  observation: SseObservation
) => Promise<void>;

type ClientConnectionOptions = {
  uri: string;
  init: RequestInit;
  onUpdate: ClientConnectionUpdater;
  statObserver: OnSseStatObserver;
};

class ClientConnectionController {
  readonly id: string = nanoid(12);
  private uri: string;
  private init: RequestInit;
  private onUpdate: ClientConnectionUpdater;
  private statObserver: OnSseStatObserver;
  private abortController: AbortController = new AbortController();
  constructor(options: ClientConnectionOptions) {
    this.uri = options.uri;
    this.init = options.init;
    this.onUpdate = options.onUpdate;
    this.statObserver = options.statObserver;
  }

  start = async () => {
    console.debug("[startTest] Starting Latency Test SSE Connection");
    try {
      await this.onUpdate(this.id, { isRunning: true });
      console.log("[startTest] isRunning set to true");
      console.log("[startTest] AbortController created and set");
      const response = await fetch(this.uri, {
        ...this.init,
        signal: this.abortController.signal,
      });
      console.log("[startTest] Fetch response received");
      // Set up a reader for the response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");

      if (!reader) {
        throw new Error("Reader not found");
      }

      console.log(
        "[startTest] Reader initialized, setting isConnected to true"
      );
      await this.onUpdate(this.id, { isConnected: true });

      // Process the SSE stream
      console.log("[startTest] Beginning to read SSE stream");
      try {
        while (true) {
          const { done, value } = await reader.read();
          // console.log("[startTest] Read chunk from SSE stream");

          if (done) {
            console.log("[startTest] SSE stream closed by server");
            break;
          }

          const chunk = decoder.decode(value);
          const messages = chunk.split("\n\n").filter(Boolean);

          for (const message of messages) {
            // console.log("[startTest] Processing SSE message:", message);
            if (message.startsWith("data: ")) {
              try {
                const payload = message.substring(6);
                const eventData = SseObservation.parse(JSON.parse(payload));

                this.statObserver(this.id, eventData);
              } catch (e) {
                console.error("[startTest] Failed to parse SSE data:", e);
              }
            }
          }
        }
      } catch (readerError) {
        console.error(
          "[startTest] Error processing SSE messages:",
          readerError
        );
        throw readerError;
      } finally {
        // Important: cleanup in this order
        safeExec(async () => reader.cancel());
        safeExec(async () => reader.releaseLock());
        safeExec(async () => response.body?.cancel());
      }
    } catch (error) {
      console.error("[startTest] Error in latency test SSE processing:", error);
    } finally {
      await this.onUpdate(this.id, { isConnected: false, isRunning: false });
    }
  };

  stop = async () => {
    this.abortController.abort();
    await this.onUpdate(this.id, { isRunning: false });
  };
}

type ClientConnectionStarter = (
  cluster: KCluster,
  apiEndpoint: string,
  onUpdate: ClientConnectionUpdater,
  statObserver: OnSseStatObserver,
  az?: string
) => Promise<ClientConnectionController>;
const startLatencyClientConnection: ClientConnectionStarter = async (
  cluster: KCluster,
  apiEndpoint: string,
  onUpdate: ClientConnectionUpdater,
  statObserver: OnSseStatObserver,
  az = "random_az_assignment"
): Promise<ClientConnectionController> => {
  return new ClientConnectionController({
    uri: `${apiEndpoint}/latency`,
    init: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        connectionConfig: cluster,
        az,
        session: "latenctSession_" + nanoid(6),
        duration: "10m",
        topic: "latencytest", // TODO: make configurable
      }),
    },
    onUpdate,
    statObserver,
  });
};

const startProducerLoadClientConnection: ClientConnectionStarter = async (
  cluster: KCluster,
  apiEndpoint: string,
  onUpdate: ClientConnectionUpdater,
  statObserver: OnSseStatObserver,
  az = "random_az_assignment"
): Promise<ClientConnectionController> => {
  return new ClientConnectionController({
    uri: `${apiEndpoint}/produce`,
    init: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        connectionConfig: cluster,
        session: "test0001",
        az,
        topic: "loadtest", // TODO: make configurable
        rate: {
          // TODO: make configurable
          count: 100,
          delay: null,
          size: 1024,
          duration: "10m",
        },
        configuration: {
          acks: "all",
        },
      }),
    },
    onUpdate,
    statObserver,
  });
};

const startConsumerLoadClientConnection: ClientConnectionStarter = async (
  cluster: KCluster,
  apiEndpoint: string,
  onUpdate: ClientConnectionUpdater,
  statObserver: OnSseStatObserver,
  az = "random_az_assignment"
): Promise<ClientConnectionController> => {
  return new ClientConnectionController({
    uri: `${apiEndpoint}/consume`,
    init: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        connectionConfig: cluster,
        session: "test0001",
        az,
        mode: "throughput",
        topic: "loadtest",
        consumerGroup: "cg-loadtest-" + nanoid(12),
        duration: "10m",
        startFromBeginning: false, // TODO: make configurable
        configuration: {},
      }),
    },
    onUpdate,
    statObserver,
  });
};

type UseClientConnectionsState = {
  connections: ClientConnectionState[];
  clientLatencyObservers: Record<string, LatencyObserver>;
  clientThroughputObservers: Record<string, ThroughputObserver>;
  globalLatencyObservers: Record<string, LatencyObserver>;
  globalThroughputObservers: Record<string, ThroughputObserver>;
  startConnection: (
    cluster: KCluster,
    starterFunc: ClientConnectionStarter,
    kind: ClientConnectionState["kind"]
  ) => Promise<string>;
  resetStatsObservers: () => Promise<void>;
  stopConnection: (id: string) => Promise<void>;
  removeConnection: (id: string) => Promise<void>;
};
const useClientConnectionsState = create<UseClientConnectionsState>((set) => {
  const { activeEndpoint } = useLoadtestApi.getState();
  const addConnection = async (state: ClientConnectionState) => {
    set(({ connections: prevConnections }) => {
      const nextConnections = [...prevConnections, state];
      console.log("[useClientConnections] Adding connection:", {
        state,
        prevConnections,
        nextConnections,
      });
      return { connections: nextConnections };
    });
  };
  const stopConnection = async (id: string) => {
    set(({ connections: prevConnections }) => {
      const connection = prevConnections.find((conn) => conn.id === id);
      if (connection) {
        connection.stop(); // TODO: handle errors?
      }
      return { connections: prevConnections.map((conn) => {
        if (conn.id === id) {
          return { ...conn, isRunning: false, isConnected: false };
        }
        return conn;
      }) };
    });
  };
  const removeConnection = async (id: string) => {
    set(({ connections: prevConnections }) => {
      const connection = prevConnections.find((conn) => conn.id === id);
      if (connection) {
        connection.stop(); // TODO: handle errors?
      }
      return { connections: prevConnections.filter((conn) => conn.id !== id) };
    });
  };
  const updateConnection = async (
    id: string,
    {isConnected, isRunning}: Partial<ClientConnectionState>
  ) => {
    set(({ connections: prevConnections }) => ({
      connections: prevConnections.map((conn) => {
        if (conn.id === id) {
          const updates = {};
          if (typeof isConnected === "boolean") {
            Object.assign(updates, { isConnected });
          }
          if (typeof isRunning === "boolean") {
            Object.assign(updates, { isRunning });
          }
          return _.merge({}, conn, updates);
        }
        return conn
      }
      ),
    }));
  };
  const onBaseStatObserver: OnSseStatObserver = async (
    clientId: string,
    observation: SseObservation
  ) => {
    const clientKey = `${clientId}-${observation.kind}-${observation.client}`;
    const globalKey = `${observation.kind}-${observation.client}`;
    set((state) => {
      switch (observation.kind) {
        case "latency": {
          let clientObservers = state.clientLatencyObservers;
          let clientObserver = clientObservers[clientKey];
          if (!clientObserver) {
            clientObserver = new LatencyObserver(
              `${observation.client} ${observation.kind}`
            );
            clientObservers = {
              ...clientObservers,
              [clientKey]: clientObserver,
            };
          }
          clientObserver.observe(observation.valueMs, observation.ts);

          let globalObservers = state.globalLatencyObservers;
          let globalObserver = globalObservers[globalKey];
          if (!globalObserver) {
            globalObserver = new LatencyObserver(
              `${observation.client} ${observation.kind}`
            );
            globalObservers = {
              ...globalObservers,
              [globalKey]: globalObserver,
            };
          }
          globalObserver.observe(observation.valueMs, observation.ts);

          return {
            clientLatencyObservers: clientObservers,
            globalLatencyObservers: globalObservers,
          };
        }
        case "throughput": {
          let clientObservers = state.clientThroughputObservers;
          let clientObserver = clientObservers[clientKey];
          if (!clientObserver) {
            clientObserver = new ThroughputObserver(
              `${observation.client} ${observation.kind}`
            );
            clientObservers = {
              ...clientObservers,
              [clientKey]: clientObserver,
            };
          }
          clientObserver.observe(observation.valueBytes, observation.ts);

          let globalObservers = state.globalThroughputObservers;
          let globalObserver = globalObservers[globalKey];
          if (!globalObserver) {
            globalObserver = new ThroughputObserver(
              `${observation.client} ${observation.kind}`
            );
            globalObservers = {
              ...globalObservers,
              [globalKey]: globalObserver,
            };
          }
          globalObserver.observe(observation.valueBytes, observation.ts);

          return {
            clientThroughputObservers: clientObservers,
            globalThroughputObservers: globalObservers,
          };
          break;
        }
        default:
          console.warn(
            `[useClientConnections] Unknown observation kind: ${JSON.stringify(
              observation
            )}`
          );
          return {};
      }
    });
  };
  return {
    connections: [],
    clientLatencyObservers: {},
    clientThroughputObservers: {},
    globalLatencyObservers: {},
    globalThroughputObservers: {},
    startConnection: async (
      cluster: KCluster,
      starterFunc: ClientConnectionStarter,
      kind: ClientConnectionState["kind"]
    ) => {
      const connection = await starterFunc(
        cluster,
        activeEndpoint,
        updateConnection,
        onBaseStatObserver
      );

      connection.start().finally(() => {
        console.log(
          `[useClientConnections] Connection ${connection.id} has stopped`
        );
        removeConnection(connection.id).catch((error) => {
          console.error(
            `[useClientConnections] Failed to remove connection ${connection.id} on stop:`,
            error
          );
        });
      });
      await addConnection({
        id: connection.id,
        cluster: { id: cluster.id, title: cluster.title },
        kind,
        isRunning: true,
        isConnected: false,
        stop: () => connection.stop(),
        latencyStats: [],
        throughputStats: [],
      });
      return connection.id;
    },
    stopConnection,
    removeConnection,
    resetStatsObservers: async () =>
      set({
        clientLatencyObservers: {},
        clientThroughputObservers: {},
        globalLatencyObservers: {},
        globalThroughputObservers: {},
      }),
  };
});

export const useClientConnections = () => {
  const {
    connections,
    clientLatencyObservers,
    clientThroughputObservers,
    globalLatencyObservers,
    globalThroughputObservers,
    resetStatsObservers,
    startConnection,
    stopConnection,
    removeConnection,
  } = useClientConnectionsState();

  const clientLatencyResults: Record<string, LatencyObserverResult> = {};
  for (const key of Object.keys(clientLatencyObservers)) {
    const observer = clientLatencyObservers[key];
    clientLatencyResults[key] = observer.get();
  }
  const clientThroughputResults: Record<string, ThroughputObserverResult> = {};
  for (const key of Object.keys(clientThroughputObservers)) {
    const observer = clientThroughputObservers[key];
    clientThroughputResults[key] = observer.get();
  }
  return {
    connections: connections.map((conn) => ({
      ...conn,
      latencyStats: Object.keys(clientLatencyResults)
        .filter((key) => key.startsWith(conn.id))
        .map((key) => clientLatencyResults[key])
        .filter(Boolean),
      throughputStats: Object.keys(clientThroughputResults)
        .filter((key) => key.startsWith(conn.id))
        .map((key) => clientThroughputResults[key])
        .filter(Boolean),
    })),
    clientLatencyResults,
    clientThroughputResults,
    globalLatencyResults: _.mapValues(globalLatencyObservers, (observer) => observer.get()),
    globalThroughputResults: _.mapValues(globalThroughputObservers, (observer) => observer.get()),
    startConsumerLoadConnection: (cluster: KCluster) =>
      startConnection(
        cluster,
        startConsumerLoadClientConnection,
        "consumer_load"
      ),
    startLatencyConnection: (cluster: KCluster) =>
      startConnection(cluster, startLatencyClientConnection, "latency"),
    startProducerLoadConnection: (cluster: KCluster) =>
      startConnection(
        cluster,
        startProducerLoadClientConnection,
        "producer_load"
      ),
    resetStatsObservers,
    stopConnection,
    removeConnection,
  };
};
