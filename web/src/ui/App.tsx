import "./App.css";
import { ConsumerList } from "./sim/ConsumerList";
import { LatencyDisplay } from "./sim/LatencyDisplay";
import { ProducerForm } from "./sim/ProducerForm";
import { ProducerList } from "./sim/ProducerList";

export const App = () => {
  return (
    <div className="container">
      <h2>Latency</h2>
      <LatencyDisplay />
      <h2>Producers</h2>
      <ProducerForm />
      <ProducerList />
      <h2>Consumers</h2>
      <ConsumerList />
    </div>
  );
};
