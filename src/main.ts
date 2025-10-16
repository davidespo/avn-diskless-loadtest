import express from "express";
import cors from "cors";
import { KConsumer, KConsumerConfig, KProducer, KProducerConfig } from "./kafka";
import { latencyService, LatencyTestConfig, StatStorageServiceListOptions, throughputService } from "./observability";
import { getSSESink } from "./observability/Sink";

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get("/ping", (_req, res) => {
  res.send("pong");
});

app.get("/sse-test", async (_req, res) => {
  console.log("Starting SSE Test");
  const sink = getSSESink(res);
  for (let i = 0; i < 10; i++) {
    console.log(`Sending Test Message #${i}`);
    sink(`Test Message #${i}`);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  console.log("Sending Test Message #10");
  sink("Test Message #10");
  console.log("Ending SSE Test");
  res.end();
  console.log("SSE Test Ended");
});

app.post("/produce", async (req, res) => {
  const config = KProducerConfig.parse(req.body);
  try {
    const sink = getSSESink(res);
    await new KProducer(config).start(sink, sink);
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: "Producer failure", error, config });
  }
  res.json({ success: true, message: "Messages produced", config });
});

app.post("/consume", async (req, res) => {
  const config = KConsumerConfig.parse(req.body);
  try {
    const sink = getSSESink(res);
    const count = await new KConsumer(config).start(sink, sink);
    res.json({ success: true, message: "Messages consumed", config, count });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: "Consumer failure", error, config });
  }
});

app.post("/latency", async (req, res) => {
  try {
    const config = LatencyTestConfig.parse(req.body);
    const sink = getSSESink(res);

    await latencyService.startTest(config, sink);

    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Latency test failed" });
  }
});

const safeJsonQueryParse = (query: any, key: string): any => {
  if (query[key]) {
    return JSON.parse(query[key] as string);
  }
  return undefined;
};

app.get("/latency", async (req, res) => {
  try {
    const filter = safeJsonQueryParse(req.query, "filter");
    let options: StatStorageServiceListOptions;
    try {
      options = StatStorageServiceListOptions.parse({
        ...req.query,
        filter: {
          ...filter,
          scope: "latency",
        },
      });
    } catch (parseError) {
      console.error(parseError);
      res.status(400).json({ error: "Invalid filter", parseError });
      return;
    }
    const data = await latencyService.list(options);
    res.json({ data, options });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Invalid query parameters" });
  }
});

app.get("/throughput", async (req, res) => {
  try {
    const filter = safeJsonQueryParse(req.query, "filter");
    let options: StatStorageServiceListOptions;
    try {
      options = StatStorageServiceListOptions.parse({
        ...req.query,
        filter: {
          ...filter,
          scope: "throughput",
        },
      });
    } catch (parseError) {
      console.error(parseError);
      res.status(400).json({ error: "Invalid filter", parseError });
      return;
    }
    const data = await throughputService.list(options);
    res.json({ data, options });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Invalid query parameters" });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
