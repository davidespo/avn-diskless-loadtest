import { z } from "zod";
import { Stat, Stats } from "./Stats";
import { inMemoryRemoteStorageService, RemoteStorageService } from "./RemoteStorageService";

export const BaseObservation = z.object({
  value: z.number(),
  client: z.enum(["producer", "consumer", "admin"]),
  scope: z.enum(["clientLatency", "e2eLatency", "throughput"]),
  topic: z.string(),
  partition: z.number().optional(),
});

export type BaseObservation = z.infer<typeof BaseObservation>;

export const StatStorageServiceListOptions = z.object({
  limit: z.coerce.number().default(50),
  offset: z.coerce.number().default(0),
  sort: z.enum(["asc", "desc"]).default("desc"),
  sortBy: z.enum(["sum", "count", "max", "min", "avg", "median", "p90", "p99", "std", "ts"]).default("ts"),
  filter: BaseObservation.partial().omit({ value: true }).default({}),
});

export type StatStorageServiceListOptions = z.infer<typeof StatStorageServiceListOptions>;

export abstract class StatStorageService<T extends BaseObservation> {
  private lastSaveTime = 0;
  private statsRegistry: Record<string, Stats> = {};
  constructor(private remoteStorageService: RemoteStorageService = inMemoryRemoteStorageService) {
    // TODO: connect to valkey
  }

  private write = async (key: string, stats: Stats) => {
    const stat = stats.get();
    await this.remoteStorageService.write(`${key};${stat.ts}`, stat);
    console.log(`Wrote stats to remote storage: ${key} ${JSON.stringify(stat)}`);
  };

  private getKey(obs: Omit<T, "value">): string {
    return `${obs.scope};${obs.client};${obs.topic};${obs.partition !== undefined ? `${obs.partition}` : ""}`;
  }

  private getStats(obs: T): [Stats, string] {
    // TODO figure out how I am going to flush stats to valkey
    const key = this.getKey(obs);
    let stats = this.statsRegistry[key];
    if (!stats) {
      stats = new Stats(key);
      this.statsRegistry[key] = stats;
    }
    return [stats, key];
  }

  save = async (observation: T) => {
    const [stats, key] = this.getStats(observation);
    stats.observe(observation.value);
    if (Date.now() - this.lastSaveTime > 150) {
      this.lastSaveTime = Date.now();
      await this.write(key, stats);
      delete this.statsRegistry[key];
    }
  };

  private listLocal = async (options: StatStorageServiceListOptions): Promise<Stat[]> => {
    console.log(`Listing stats from local storage`, this.statsRegistry);
    const { filter, limit, offset, sort, sortBy } = options;
    let { client = "[^;]+", partition = "\\d*", scope = "[^;]+", topic = "[^;]+" } = filter;
    while (topic.includes("*")) {
      topic = topic.replace("*", "[^-]+");
    }
    const keyPattern = this.getKey({ client, partition, scope, topic } as Omit<T, "value">);
    console.log(`Local key pattern`, keyPattern);
    const pattern = new RegExp(keyPattern);
    const keys = Object.keys(this.statsRegistry).filter((k) => k.match(pattern));
    const statEntries = keys
      .map((k) => this.statsRegistry[k])
      .filter((s) => s !== undefined)
      .map((s) => s.get());

    if (sortBy) {
      statEntries.sort((a, b) => a[sortBy] - b[sortBy]);
    }
    if (sort === "desc") {
      statEntries.reverse();
    }
    return statEntries.slice(offset, offset + limit);
  };

  private listRemote = async (options: StatStorageServiceListOptions): Promise<Stat[]> => {
    console.log(`Listing stats from remote storage`);
    const { filter, limit, offset, sort, sortBy } = options;
    let { client = "[^-]+", partition = "\\d*", scope = "[^-]+", topic = "[^-]+" } = filter;
    while (topic.includes("*")) {
      topic = topic.replace("*", "[^-]+");
    }
    const keyPattern = this.getKey({ client, partition, scope, topic } as Omit<T, "value">);
    const pattern = new RegExp(keyPattern);
    const remoteKeys = await this.remoteStorageService.listKeys();
    const keys = remoteKeys.filter((k) => k.match(pattern));

    const statEntries = await this.remoteStorageService
      .getAll(keys)
      .then((data) => Object.values(data).filter((s) => s !== undefined));

    if (sortBy) {
      statEntries.sort((a, b) => a[sortBy] - b[sortBy]);
    }
    if (sort === "desc") {
      statEntries.reverse();
    }
    return statEntries.slice(offset, offset + limit);
  };

  list = async (options: StatStorageServiceListOptions): Promise<Stat[]> => {
    console.log(`Listing stats from local and remote storage`);
    const localEntries = await this.listLocal(options);
    const remoteEntries = await this.listRemote(options);
    const { limit, offset, sort, sortBy } = options;
    const allEntries = [...localEntries, ...remoteEntries];

    if (sortBy) {
      allEntries.sort((a, b) => a[sortBy] - b[sortBy]);
    }
    if (sort === "desc") {
      allEntries.reverse();
    }
    return allEntries.slice(offset, offset + limit);
  };
}
