import { Kafka, logLevel } from "kafkajs";
import z from "zod";

const MyLogCreator =
  (_logLevel: logLevel) =>
  ({ namespace, level, label, log }: { namespace: string; level: logLevel; label: string; log: any }) => {
    // Example:
    const { timestamp, logger, message, ...others } = log;
    const logMessage = `${label} [${namespace}] ${message} ${JSON.stringify(others)}`;
    switch (level) {
      case logLevel.NOTHING:
      case logLevel.ERROR:
        console.error(logMessage);
        break;
      case logLevel.WARN:
        console.warn(logMessage);
        break;
      case logLevel.DEBUG:
        console.debug(logMessage);
        break;
      default:
      case logLevel.INFO:
        console.log(logMessage);
        break;
    }
  };

export const KafkaConnectionConfig = z.object({
  az: z.string().default("random-az-assignment"),
  clientId: z.string().default("loadtest-client"),
  host: z.string(),
  port: z.coerce.number(),
  accessKey: z.string(),
  accessCert: z.string(),
  caCert: z.string(),
});
export type KafkaConnectionConfig = z.infer<typeof KafkaConnectionConfig>;

export const buildKafkaClient = (config: KafkaConnectionConfig) =>
  new Kafka({
    clientId: `${config.clientId};inkless_az=${config.az}`,
    brokers: [`${config.host}:${config.port}`],
    ssl: {
      rejectUnauthorized: false,
      key: config.accessKey,
      cert: config.accessCert,
      ca: config.caCert,
    },
    logCreator: MyLogCreator,
  });
