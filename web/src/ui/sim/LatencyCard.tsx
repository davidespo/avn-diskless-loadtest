import type { LatencyObserverResult } from "../../types";
import _ from "lodash";
import ms from "ms";

type LatencyCardProps = {
  result: LatencyObserverResult | null;
};
export const LatencyCard = ({ result }: LatencyCardProps) => {
  if (!result) {
    return null;
  }
  const { key, instantaneous, shortTerm, fullHistory } = result;
  const { avg, median, p90, p99, std } = shortTerm;
  const {min, max} = fullHistory
  if (!median) {
    return null;
  }
  return (
    <div className="border-round-md shadow-1 p-2 w-20rem flex flex-column gap-1">
      <div className="font-bold">{_.startCase(key)}</div>
      <div className="text-xs pl-2">Current: {ms(Math.round(instantaneous))}</div>
      <div className="text-xs pl-2">Median: {ms(Math.round(median))}</div>
      <div className="text-xs pl-2">p99: {ms(Math.round(p99))}</div>
      <div className="text-xs pl-2">Mean: {ms(Math.round(avg))}</div>
      <div className="text-xs pl-2">p90: {ms(Math.round(p90))}</div>
      <div className="text-xs pl-2">Std. Dev.: +/-{ms(Math.round(std))}</div>
      <div className="text-xs pl-2">Range: {ms(Math.round(min))}-{ms(Math.round(max))}</div>
    </div>
  );
};
