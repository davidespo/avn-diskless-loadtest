import { Response } from "express";

export type Sink<T> = (value: T) => void;

export const getConsoleSink = <T>(): Sink<T> => {
  return (value: T) => {
    console.log(value);
  };
};

export const getSSESink = <T>(res: Response): Sink<T> => {
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders(); // flush the headers to establish SSE with client
  return (value: T) => {
    const serialized = typeof value === "string" ? value : JSON.stringify(value);
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
