import {FlowLogger} from "@de44/console-flow"
import express from "express";
import cors from "cors";
import { KConsumer, KConsumerConfig, KProducer, KProducerConfig } from "./kafka";
import { latencyService, LatencyTestConfig, StatStorageServiceListOptions, throughputService } from "./observability";
import { getSSESink, SSESinkOptions } from "./observability/Sink";

FlowLogger.configureConsole({
  format: "cli"
});

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get("/ping", (_req, res) => {
  res.send("pong");
});

app.get("/sse-test", async (req, res) => {
  console.debug("Starting SSE Test");
  const sink = getSSESink(res, req, { key: "sse-test" });
  for (let i = 0; i < 10; i++) {
    console.debug(`Sending Test Message #${i}`);
    sink(`Test Message #${i}`);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  console.debug("Sending Test Message #10");
  sink("Test Message #10");
  console.debug("Ending SSE Test");
  res.end();
  console.debug("SSE Test Ended");
});

app.post("/produce", async (req, res) => {
  const config = KProducerConfig.parse(req.body);
  try {
    const sinkOptions: SSESinkOptions = {
      key: "/produce",
    };
    const sink = getSSESink(res, req, sinkOptions);
    const producer = new KProducer(config);
    sinkOptions.stop = () => producer.stop();
    const producerProcess = producer.start(sink, sink);

    await producerProcess;

    res.end();
  } catch (error) {
    console.error(error);
    res.end();
  }
});

app.post("/consume", async (req, res) => {
  const config = KConsumerConfig.parse(req.body);
  try {
    const sinkOptions: SSESinkOptions = {
      key: "/consume",
    };
    const sink = getSSESink(res, req);
    const consumer = new KConsumer(config);
    sinkOptions.stop = () => consumer.stop();
    const count = await consumer.start(sink, sink);
    res.json({ success: true, message: "Messages consumed", config, count });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: "Consumer failure", error, config });
  }
});

app.post("/latency", async (req, res) => {
  try {
    const config = LatencyTestConfig.parse(req.body);
    const sinkOptions: SSESinkOptions = { key: "/latency" };
    const sink = getSSESink(res, req, sinkOptions);

    console.trace("[/latency] Starting Latency Test with config:", config);
    const {promise, stop} = latencyService.startTest(config, sink);
    sinkOptions.stop = stop;
    console.trace("[/latency] Latency Test started");

    await promise;
    console.trace("[/latency] Latency Test completed");

    res.end();
    console.trace("[/latency] Response ended");
  } catch (error) {
    console.error(error);
    res.end();
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
