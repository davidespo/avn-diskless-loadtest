import _ from "lodash";
import { LatencyStatObserver } from "../services";
import {
  SseObservation,
  type ClientConnectionState,
  type KCluster,
  type LatencyStat,
} from "../types";
import { nanoid } from "nanoid";
import { create } from "zustand";
import { ThroughputStatObserver } from "../services/ThroughputStatObserver";
import type { ThroughputStat } from "../types/ThroughputStat";

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
  onUpdate: ClientConnectionUpdater,
  statObserver: OnSseStatObserver,
  az?: string
) => Promise<ClientConnectionController>;
const startLatencyClientConnection: ClientConnectionStarter = async (
  cluster: KCluster,
  onUpdate: ClientConnectionUpdater,
  statObserver: OnSseStatObserver,
  az = "random_az_assignment"
): Promise<ClientConnectionController> => {
  return new ClientConnectionController({
    uri: `http://localhost:3000/latency`,
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
  onUpdate: ClientConnectionUpdater,
  statObserver: OnSseStatObserver,
  az = "random_az_assignment"
): Promise<ClientConnectionController> => {
  return new ClientConnectionController({
    uri: `http://localhost:3000/produce`,
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
          delay: "1s",
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
  onUpdate: ClientConnectionUpdater,
  statObserver: OnSseStatObserver,
  az = "random_az_assignment"
): Promise<ClientConnectionController> => {
  return new ClientConnectionController({
    uri: `http://localhost:3000/consume`,
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
        configuration: {},
      }),
    },
    onUpdate,
    statObserver,
  });
};

type UseClientConnectionsState = {
  connections: ClientConnectionState[];
  clientLatencyStatObservers: Record<string, LatencyStatObserver>;
  clientThroughputStatObservers: Record<string, ThroughputStatObserver>;
  globalLatencyStatObservers: Record<string, LatencyStatObserver>;
  globalThroughputStatObservers: Record<string, ThroughputStatObserver>;
  startConnection: (
    cluster: KCluster,
    starterFunc: ClientConnectionStarter,
    kind: ClientConnectionState["kind"]
  ) => Promise<void>;
  resetStatsObservers: () => Promise<void>;
  stopConnection: (id: string) => Promise<void>;
};
const useClientConnectionsState = create<UseClientConnectionsState>((set) => {
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
    updates: Partial<ClientConnectionState>
  ) => {
    set(({ connections: prevConnections }) => ({
      connections: prevConnections.map((conn) =>
        conn.id === id ? _.merge({}, conn, { state: updates }) : conn
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
          let clientObservers = state.clientLatencyStatObservers;
          let clientObserver = clientObservers[clientKey];
          if (!clientObserver) {
            clientObserver = new LatencyStatObserver(
              `${observation.client} ${observation.kind}`
            );
            clientObservers = {
              ...clientObservers,
              [clientKey]: clientObserver,
            };
          }
          clientObserver.observe(observation.valueMs);

          let globalObservers = state.globalLatencyStatObservers;
          let globalObserver = globalObservers[globalKey];
          if (!globalObserver) {
            globalObserver = new LatencyStatObserver(
              `${observation.client} ${observation.kind}`
            );
            globalObservers = {
              ...globalObservers,
              [globalKey]: globalObserver,
            };
          }
          globalObserver.observe(observation.valueMs);

          return {
            clientLatencyStatObservers: clientObservers,
            globalLatencyStatObservers: globalObservers,
          };
        }
        case "throughput": {
          let clientObservers = state.clientThroughputStatObservers;
          let clientObserver = clientObservers[clientKey];
          if (!clientObserver) {
            clientObserver = new ThroughputStatObserver(
              `${observation.client} ${observation.kind}`
            );
            clientObservers = {
              ...clientObservers,
              [clientKey]: clientObserver,
            };
          }
          clientObserver.observe(observation.valueBytes, observation.duration);

          let globalObservers = state.globalThroughputStatObservers;
          let globalObserver = globalObservers[globalKey];
          if (!globalObserver) {
            globalObserver = new ThroughputStatObserver(
              `${observation.client} ${observation.kind}`
            );
            globalObservers = {
              ...globalObservers,
              [globalKey]: globalObserver,
            };
          }
          clientObserver.observe(observation.valueBytes, observation.duration);

          return {
            clientThroughputStatObservers: clientObservers,
            globalThroughputStatObservers: globalObservers,
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
    clientLatencyStatObservers: {},
    clientThroughputStatObservers: {},
    globalLatencyStatObservers: {},
    globalThroughputStatObservers: {},
    startConnection: async (
      cluster: KCluster,
      starterFunc: ClientConnectionStarter,
      kind: ClientConnectionState["kind"]
    ) => {
      const connection = await starterFunc(
        cluster,
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
        isRunning: false,
        isConnected: false,
        stop: () => connection.stop(),
        latencyStats: [],
        throughputStats: [],
      });
    },
    stopConnection: async (id: string) => await removeConnection(id),
    resetStatsObservers: async () =>
      set({
        clientLatencyStatObservers: {},
        clientThroughputStatObservers: {},
        globalLatencyStatObservers: {},
        globalThroughputStatObservers: {},
      }),
  };
});

export const useClientConnections = () => {
  const {
    connections,
    clientLatencyStatObservers,
    clientThroughputStatObservers,
    globalLatencyStatObservers,
    globalThroughputStatObservers,
    resetStatsObservers,
    startConnection,
    stopConnection,
  } = useClientConnectionsState();

  const clientLatencyStats: Record<string, LatencyStat> = {};
  for (const key of Object.keys(clientLatencyStatObservers)) {
    const observer = clientLatencyStatObservers[key];
    clientLatencyStats[key] = observer.get();
  }
  const clientThroughputStats: Record<string, ThroughputStat> = {};
  for (const key of Object.keys(clientThroughputStatObservers)) {
    const observer = clientThroughputStatObservers[key];
    clientThroughputStats[key] = observer.get();
  }
  return {
    connections: connections.map((conn) => ({
      ...conn,
      latencyStats: Object.keys(clientLatencyStats)
        .filter((key) => key.startsWith(conn.id))
        .map((key) => clientLatencyStats[key])
        .filter(Boolean),
      throughputStats: Object.keys(clientThroughputStats)
        .filter((key) => key.startsWith(conn.id))
        .map((key) => clientThroughputStats[key])
        .filter(Boolean),
    })),
    clientLatencyStats,
    clientThroughputStats,
    globalLatencyStats: _.mapValues(globalLatencyStatObservers, (observer) => observer.get()),
    globalThroughputStats: _.mapValues(globalThroughputStatObservers, (observer) => observer.get()),
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
  };
};
