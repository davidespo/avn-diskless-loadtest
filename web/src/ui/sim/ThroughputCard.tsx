import _ from "lodash";
import ms from "ms";
import prettyBytes from "pretty-bytes";
import type { ThroughputObserverResult } from "../../types/ThroughputStat.js";

type ThroughputCardProps = {
  result: ThroughputObserverResult | null;
};
export const ThroughputCard = ({ result }: ThroughputCardProps) => {
  if (!result) {
    return null;
  }
  const { key, recent, instantaneous, fullHistory } = result;
  const { rateBytes: recentRateBytes, durationMs: recentDurationMs } = recent;
  const totalRate = fullHistory.rateBytes;
  return (
    <div className="border-round-md shadow-1 p-2 w-20rem flex flex-column gap-1">
      <div className="font-bold">{_.startCase(key)}</div>
      <div className="text-xs">Current Rate: {prettyBytes(instantaneous.rateBytes)}/sec</div>
      <div className="text-xs">Recent Rate: {prettyBytes(recentRateBytes)}/sec</div>
      <div className="text-xs">Mean Rate: {prettyBytes(totalRate)}/sec</div>
      <div>recent Cutoff: {ms(recentDurationMs)}</div>
    </div>
  );
};
