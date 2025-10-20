import { buildKafkaClient, KafkaConnectionConfig } from "./kafka";

export class KafkaService {
    testConnectionConfig = async (config: KafkaConnectionConfig): Promise<boolean> => {
        const client = buildKafkaClient(config);
        try {
            const admin = client.admin();
            await admin.connect();
            await admin.listTopics();
            await client.admin().disconnect();
            return true;
        } catch (error) {
            console.error("Kafka connection test failed:", error);
            return false;
        }
    }
}

export const kafkaService = new KafkaService();