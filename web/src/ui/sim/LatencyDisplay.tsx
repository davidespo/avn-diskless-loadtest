import { z } from "zod";
import { Button } from "primereact/button";
import { useCallback, useState } from "react";
import { StatObserver, type Stat } from "../../services/Stat";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";

const BaseObservation = z.object({
  value: z.number(),
  client: z.enum(["producer", "consumer", "admin"]),
  scope: z.enum(["clientLatency", "e2eLatency", "throughput"]),
  topic: z.string(),
  partition: z.number().optional(),
});
type BaseObservation = z.infer<typeof BaseObservation>;

type LatencyStatsObservers = {
  producer: StatObserver;
  consumer: StatObserver;
};

type LatencyStats = {
  producer: Stat;
  consumer: Stat;
};

export const LatencyDisplay = () => {
  const [signal] = useState<{ shouldKill: boolean }>({ shouldKill: false });
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);
  const [latencyStatsObservers, setLatencyStatsObservers] =
    useState<LatencyStatsObservers>({
      producer: new StatObserver("Publish Latency"),
      consumer: new StatObserver("E2E Latency"),
    });
  const resetLatencyStatsObservers = useCallback(async () => {
    await setLatencyStatsObservers({
      producer: new StatObserver("Publish Latency"),
      consumer: new StatObserver("E2E Latency"),
    });
  }, []);
  const [latencyStats, setLatencyStats] = useState<LatencyStats>({
    producer: latencyStatsObservers.producer.get(),
    consumer: latencyStatsObservers.consumer.get(),
  });
  const startTest = useCallback(
    async (signal: { shouldKill: boolean }) => {
      console.debug("[startTest] Starting Latency Test SSE Connection");
      signal.shouldKill = false;
      try {
        await setIsRunning(true);
        console.log("[startTest] isRunning set to true");
        const abortController = new AbortController();
        await setAbortController(abortController);
        console.log("[startTest] AbortController created and set");
        const response = await fetch("http://localhost:3000/latency", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify({
            az: "random_az_assignment",
            session: "defaultSession",
            duration: "10m",
            topic: "test",
          }),
          signal: abortController.signal,
        });
        console.log("[startTest] Fetch response received");
        // Set up a reader for the response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder("utf-8");

        if (!reader) {
          await setIsConnected(false);
          await setIsRunning(false);
          throw new Error("Reader not found");
        }
        console.log(
          "[startTest] Reader initialized, setting isConnected to true"
        );
        await setIsConnected(true);

        // Process the SSE stream
        console.log("[startTest] Beginning to read SSE stream");
        try {
        while (true) {
          const { done, value } = await reader.read();
          console.log("[startTest] Read chunk from SSE stream");

          if (done) {
            console.log("[startTest] SSE stream closed by server");
            break;
          }

          const chunk = decoder.decode(value);
          const messages = chunk.split("\n\n").filter(Boolean);

            for (const message of messages) {
              console.log("[startTest] Processing SSE message:", message);
              if (message.startsWith("data: ")) {
                try {
                  const payload = message.substring(6);
                  const eventData = BaseObservation.parse(JSON.parse(payload));
                  switch (eventData.scope) {
                    case "clientLatency":
                      latencyStatsObservers.producer.observe(eventData.value);
                      break;
                    case "e2eLatency":
                      latencyStatsObservers.consumer.observe(eventData.value);
                      break;
                  }
                  setLatencyStats({
                    producer: latencyStatsObservers.producer.get(),
                    consumer: latencyStatsObservers.consumer.get(),
                  });
                } catch (e) {
                  console.error("[startTest] Failed to parse SSE data:", e);
                }
              }
            }
            if (signal.shouldKill) {
              console.log(
                "[startTest] Signal to kill received, breaking SSE read loop"
              );
              break;
            }
          }
        } catch (error) {
          console.error("[startTest] Error processing SSE messages:", error);
          throw error;
        } finally {
          // Important: cleanup in this order
          try {
            await reader.cancel();
          } catch {
            /* noop */
          }
          try {
            reader.releaseLock();
          } catch {
            /* noop */
          }
          try {
            await response.body?.cancel();
          } catch {
            /* noop */
          }
        }
        setIsRunning(false);
        setIsConnected(false);
        console.log("[startTest] Exiting SSE read loop");
      } catch (error) {
        console.error("[startTest] Error in latency test SSE processing:", error);
        setIsConnected(false);
        setIsRunning(false);
      }
      console.log("[startTest] Latency Test SSE run complete");
    },
    [latencyStatsObservers.consumer, latencyStatsObservers.producer]
  );
  return (
    <div>
      <Button
        label={isRunning ? "Stop Latency Test" : "Start Latency Test"}
        icon={isRunning ? "pi pi-stop-circle" : "pi pi-play-circle"}
        severity={isRunning ? (isConnected ? "danger" : "warning") : "success"}
        onClick={() => {
          if (!isRunning) {
            resetLatencyStatsObservers().then(() => {
              startTest(signal);
            });
          } else {
            console.log("stopTest");
            abortController?.abort();
            signal.shouldKill = true;
          }
        }}
      />
      {isConnected && (
        <div>
          <p>Connected to latency test</p>
        </div>
      )}
      <div className="flex">
        <div className="px-5 mx-5 border-1 border-400">
          <LatencySourceDisplay stat={latencyStats.producer} />
        </div>
        <div className="px-5 mx-5 border-1 border-400">
          <LatencySourceDisplay stat={latencyStats.consumer} />
        </div>
      </div>
      <LatencyLineChart
        consumer={latencyStats.consumer}
        producer={latencyStats.producer}
      />
    </div>
  );
};

type LatencySourceDisplayProps = {
  stat: Stat;
};
const LatencySourceDisplay = ({ stat }: LatencySourceDisplayProps) => {
  const { key, count, avg, median, p90, p99, std } = stat;
  return (
    <div>
      <h5>{key}</h5>
      <div>Test Points: {count.toLocaleString()}</div>
      <div>Mean: {avg.toFixed(1)}</div>
      <div>Median: {median.toFixed(1)}</div>
      <div>p90: {p90.toFixed(1)}</div>
      <div>p99: {p99.toFixed(1)}</div>
      <div>Std. Dev.: +/-{std.toFixed(1)}ms</div>
    </div>
  );
};

type LatencyLineChartProps = {
  producer: Stat;
  consumer: Stat;
};
const LatencyLineChart = ({ consumer, producer }: LatencyLineChartProps) => {
  const data = [];
  for (
    let i = 0;
    i < Math.max(consumer.latestValues.length, producer.latestValues.length);
    i++
  ) {
    data.push({
      name: `#${i + 1}`,
      producer: producer.latestValues[i] || 0,
      consumer: consumer.latestValues[i] || 0,
    });
  }
  return (
    <div className="card" style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer>
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Legend />
          <Line
            type="monotone"
            dataKey="producer"
            stroke="#8884d8"
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="consumer"
            stroke="#82ca9d"
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
