import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

export const config = z
  .object({
    KAFKA_BROKER_HOST: z.string(),
    KAFKA_BROKER_PORT: z.coerce.number(),
    KAFKA_ACCESS_KEY: z.string(),
    KAFKA_ACCESS_CERT: z.string(),
    KAFKA_CA_CERT: z.string(),
  })
  .parse(process.env);
