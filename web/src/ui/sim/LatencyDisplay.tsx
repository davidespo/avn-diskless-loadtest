import { z } from "zod";
import { Button } from "primereact/button";
import { useCallback, useState } from "react";
import { StatObserver, type Stat } from "../../services/Stat";

const BaseObservation = z.object({
  value: z.number(),
  client: z.enum(["producer", "consumer", "admin"]),
  scope: z.enum(["clientLatency", "e2eLatency", "throughput"]),
  topic: z.string(),
  partition: z.number().optional(),
});
type BaseObservation = z.infer<typeof BaseObservation>;

type LatencyStatsObservers = {
  clientLatency_producer: StatObserver;
  e2eLatency_consumer: StatObserver;
};

type LatencyStats = {
  producer: Stat;
  consumer: Stat;
};

export const LatencyDisplay = () => {
  const [enabled, setEnabled] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [latencyStatsObservers, setLatencyStatsObservers] = useState<LatencyStatsObservers>({
    clientLatency_producer: new StatObserver("clientLatency_producer"),
    e2eLatency_consumer: new StatObserver("e2eLatency_consumer"),
  });
  const resetLatencyStatsObservers = useCallback(() => {
    setLatencyStatsObservers({
      clientLatency_producer: new StatObserver("Publish Latency"),
      e2eLatency_consumer: new StatObserver("E2E Latency"),
    });
  }, []);
  const [latencyStats, setLatencyStats] = useState<LatencyStats>({
    producer: latencyStatsObservers.clientLatency_producer.get(),
    consumer: latencyStatsObservers.e2eLatency_consumer.get(),
  });
  const startTest = useCallback(async () => {
    const response = await fetch("http://localhost:3000/latency", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        az: "random_az_assignment",
        session: "defaultSession",
        duration: "60s",
        topic: "test",
      }),
    });
    // Set up a reader for the response
    const reader = response.body?.getReader();
    const decoder = new TextDecoder("utf-8");

    if (!reader) {
      throw new Error("Reader not found");
    }

    setIsConnected(true);

    // Process the SSE stream
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      const chunk = decoder.decode(value);
      const messages = chunk.split("\n\n").filter(Boolean);

      for (const message of messages) {
        if (message.startsWith("data: ")) {
          try {
            const payload = message.substring(6);
            const eventData = BaseObservation.parse(JSON.parse(payload));
            switch (eventData.scope) {
              case "clientLatency":
                latencyStatsObservers.clientLatency_producer.observe(eventData.value);
                break;
              case "e2eLatency":
                latencyStatsObservers.e2eLatency_consumer.observe(eventData.value);
                break;
            }
            setLatencyStats({
              producer: latencyStatsObservers.clientLatency_producer.get(),
              consumer: latencyStatsObservers.e2eLatency_consumer.get(),
            });
          } catch (e) {
            console.error("Failed to parse SSE data:", e);
          }
        }
      }
      setIsConnected(false);
    }
  }, []);
  return (
    <div>
      <Button
        label={enabled ? "Stop Latency Test" : "Start Latency Test"}
        icon={enabled ? "pi pi-stop-circle" : "pi pi-play-circle"}
        severity={enabled ? "danger" : "success"}
        onClick={() => {
          console.log("onClick", { enabled });
          if (!enabled) {
            console.log("startTest");
            console.log("resetLatencyStatsObservers");
            resetLatencyStatsObservers();
            startTest();
          } else {
            console.log("stopTest");
            // stopTest();
          }
          setEnabled(!enabled);
        }}
      />
      {isConnected && (
        <div>
          <p>Connected to latency test</p>
        </div>
      )}
      <div className="flex">
        <div>
          <pre>{JSON.stringify(latencyStats.producer, null, 2)}</pre>
        </div>
        <div>
          <pre>{JSON.stringify(latencyStats.consumer, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
};
