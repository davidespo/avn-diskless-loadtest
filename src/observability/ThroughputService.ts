import { BaseObservation, StatStorageService } from "./StatStorageService";

export type ThroughputObservation = BaseObservation;

export class ThroughputService extends StatStorageService<ThroughputObservation> {
  constructor() {
    super();
  }
}

export const throughputService = new ThroughputService();
