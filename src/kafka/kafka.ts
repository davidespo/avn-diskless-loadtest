import { Kafka, logLevel } from "kafkajs";
import { config } from "../config";

const brokers = `${config.KAFKA_BROKER_HOST}:${config.KAFKA_BROKER_PORT}`;

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

export const buildKafkaClient = (az: string, inkless: boolean) =>
  inkless ? buildInklessKafkaClient(az): buildTraditionalKafkaClient(az);

export const buildTraditionalKafkaClient = (az: string) =>
  new Kafka({
    clientId: `loadtest;inkless_az=${az}`,
    brokers: [brokers],
    ssl: {
      rejectUnauthorized: false,
      key: config.KAFKA_ACCESS_KEY,
      cert: config.KAFKA_ACCESS_CERT,
      ca: config.KAFKA_CA_CERT,
    },
    logCreator: MyLogCreator,
  });

export const buildInklessKafkaClient = (az: string) =>
  new Kafka({
    clientId: `loadtest;inkless_az=${az}`,
    brokers: [brokers],
    ssl: {
      rejectUnauthorized: false,
      key: config.KAFKA_ACCESS_KEY,
      cert: config.KAFKA_ACCESS_CERT,
      ca: config.KAFKA_CA_CERT,
    },
    logCreator: MyLogCreator,
  });
