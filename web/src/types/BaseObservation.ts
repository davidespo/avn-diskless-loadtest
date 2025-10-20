import { z } from "zod";

export const BaseObservation = z.object({
  kind: z.enum(["latency", "throughput"]),
  ts: z.coerce.number().default(Date.now()),
  client: z.enum(["producer", "consumer", "admin"]),
  topic: z.string(),
  partition: z.number().optional(),
});
export type BaseObservation = z.infer<typeof BaseObservation>;

export const LatencyObservation = BaseObservation.extend({
  kind: z.literal("latency"),
  valueMs: z.number(),
});
export type LatencyObservation = z.infer<typeof LatencyObservation>;

export const ThroughputObservation = BaseObservation.extend({
  kind: z.literal("throughput"),
  valueBytes: z.number(),
  duration: z.number(),
});
export type ThroughputObservation = z.infer<typeof ThroughputObservation>;

export const SseObservation = z.union([LatencyObservation, ThroughputObservation]);
export type SseObservation = z.infer<typeof SseObservation>;
