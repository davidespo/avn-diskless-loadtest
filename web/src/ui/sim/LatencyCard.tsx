import { Card } from "primereact/card";
import type { LatencyStat } from "../../types";
import _ from "lodash";

type LatencyCardProps = {
  stat: LatencyStat;
};
export const LatencyCard = ({ stat }: LatencyCardProps) => {
  const { key, avg, median, p90, p99, std } = stat;
  return (
    <Card title={_.startCase(key)} className="m-2 w-20rem">
      <div className="flex flex-column gap-2">
        <div className="text-lg">Median: {median.toFixed(1)} ms</div>
        <div>p99: {p99.toFixed(1)} ms</div>
        <div>Mean: {avg.toFixed(1)} ms</div>
        <div>p90: {p90.toFixed(1)} ms</div>
        <div>Std. Dev.: +/-{std.toFixed(1)} ms</div>
      </div>
    </Card>
  );
};
