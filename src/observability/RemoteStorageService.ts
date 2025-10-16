import { Stat } from "./Stats";

export abstract class RemoteStorageService {
  constructor() {
    // TODO: connect to remote storage
  }

  abstract write(key: string, entry: Stat): Promise<void>;
  abstract listKeys(): Promise<string[]>;
  abstract get(key: string): Promise<Stat | undefined>;
  abstract getAll(keys: string[]): Promise<Record<string, Stat | undefined>>;
}

export class InMemoryRemoteStorageService extends RemoteStorageService {
  private data: Record<string, Stat> = {};

  constructor() {
    super();
  }

  write = async (key: string, entry: Stat) => {
    this.data[key] = entry;
  };

  listKeys = async () => {
    console.log(`Listing keys from in-memory remote storage`, Object.keys(this.data));
    return Object.keys(this.data);
  };

  get = async (key: string) => {
    return this.data[key];
  };

  getAll = async (keys: string[]) => {
    console.log(`Getting all data from in-memory remote storage`, keys);
    const data: Record<string, Stat | undefined> = {};
    for (const key of keys) {
      data[key] = this.data[key];
    }
    return data;
  };
}

export const inMemoryRemoteStorageService = new InMemoryRemoteStorageService();
