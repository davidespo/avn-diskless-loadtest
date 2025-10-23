import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

export const config = z
  .object({
    PORT: z.coerce.number().default(3000),
    // KAFKA_BROKER_HOST: z.string(),
    // KAFKA_BROKER_PORT: z.coerce.number(),
    // KAFKA_ACCESS_KEY: z.string(),
    // KAFKA_ACCESS_CERT: z.string(),
    // KAFKA_CA_CERT: z.string(),
    // INKLESS_BROKER_HOST: z.string(),
    // INKLESS_BROKER_PORT: z.coerce.number(),
    // INKLESS_ACCESS_KEY: z.string(),
    // INKLESS_ACCESS_CERT: z.string(),
    // INKLESS_CA_CERT: z.string(),
  })
  .parse(process.env);
