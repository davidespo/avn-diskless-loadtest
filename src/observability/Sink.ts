import { Response, Request } from "express";

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
