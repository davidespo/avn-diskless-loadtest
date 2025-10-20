import { Response, Request } from "express";
import { ThroughputObservation } from "./types";

export type Sink<T> = (value: T) => void;

export const getConsoleSink = <T>(): Sink<T> => {
  return (value: T) => {
    console.log(value);
  };
};

export type SSESinkOptions = {
  key?: string;
  stop?: () => Promise<void>;
};

export const getSSESink = <T>(
  res: Response,
  req: Request,
  options: SSESinkOptions = {}
): Sink<T> => {
  const { key = "sseSink" } = options;
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders(); // flush the headers to establish SSE with client

  req.on("aborted", async () => {
    console.trace(
      `[sseSink::${key}] Client aborted the connection, stopping ${key}`
    );
    if (options.stop) {
      await options.stop();
    }
    console.trace(`[sseSink::${key}] ${key} stopped due to client abort`);
    res.end();
    console.trace(`[sseSink::${key}] Response ended due to client abort`);
  });

  res.on("close", async () => {
    console.trace(`[sseSink::${key}] Response closed, stopping ${key}`);
    if (options.stop) {
      await options.stop();
    }
    console.trace(`[sseSink::${key}] Producer stopped due to response close`);
  });

  return (value: T) => {
    const serialized =
      typeof value === "string" ? value : JSON.stringify(value);
    res.write(`data: ${serialized}\n\n`);
  };
};

export const getCompositeSink = <T>(sinks: Sink<T>[]): Sink<T> => {
  return (value: T) => {
    sinks.forEach((sink) => sink(value));
  };
};

export const getNoopSink = <T>(): Sink<T> => {
  return () => {};
};

// export const aggregateThroughputSink = (
//   minDelayMs: number = 500,
//   emit: Sink<ThroughputObservation>
// ): Sink<ThroughputObservation> => {
//   const aggMap: Record<
//     string,
//     { firstTs: number; accumulatedValueBytes: number; lastEmit: number }
//   > = {};
//   const getKey = (value: ThroughputObservation) => {
//     return `${value.client}::${value.scope}::${value.topic}::${
//       value.partition ?? "nopartition"
//     }`;
//   };
//   return (value: ThroughputObservation) => {
//     const now = Date.now();
//     const key = getKey(value);
//     let entry = aggMap[key];
//     if (!entry) {
//       entry = {
//         firstTs: value.ts,
//         accumulatedValueBytes: 0,
//         lastEmit: now,
//       };
//       aggMap[key] = entry;
//     }
//     entry.accumulatedValueBytes += value.valueBytes;
//     if (now - entry.lastEmit >= minDelayMs) {
//       const aggregatedObservation: ThroughputObservation = {
//         ts: now,
//         client: value.client,
//         scope: value.scope,
//         topic: value.topic,
//         partition: value.partition,
//         valueBytes: entry.accumulatedValueBytes,
//         duration: now - entry.firstTs,
//       };
//       emit(aggregatedObservation);
//       delete aggMap[key];
//     }
//   };
// };
