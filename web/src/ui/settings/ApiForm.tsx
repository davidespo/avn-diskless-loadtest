import { Card } from "primereact/card";
import { useLoadtestApi } from "../../hooks/useLoadtestApi";
import { useState } from "react";

export const ApiForm = () => {
  const [newEndpoint, setNewEndpoint] = useState("");
  const {
    activeEndpoint,
    endpoints,
    addEndpoint,
    removeEndpoint,
    setActiveEndpoint,
  } = useLoadtestApi();
  const submitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (newEndpoint) {
      addEndpoint(newEndpoint);
      setNewEndpoint("");
    }
  };
  return (
    <div>
      <h2 className="text-2xl mb-4 font-semibold">New API Endpoint</h2>
      <form className="flex gap-2" onSubmit={submitForm}>
        <div className="p-field p-mb-3 flex-grow-1">
          <input
            id="api-endpoint"
            type="text"
            className="p-inputtext p-component p-d-block p-mb-2 w-full"
            placeholder="e.g., http://localhost:3000"
            value={newEndpoint}
            onChange={(e) => setNewEndpoint(e.target.value)}
          />
        </div>
        <button type="submit" className="p-button p-component">
          Add Endpoint
        </button>
      </form>
      <h2 className="text-2xl mb-4 font-semibold">API Endpoints</h2>
      {endpoints.map((endpoint) => (
        <Card key={endpoint} className="mb-3">
          <div className="flex justify-content-between align-items-center">
            <div>
              <span className="font-mono">{endpoint}</span>
              {endpoint === activeEndpoint && (
                <span className="ml-2 text-green-600 font-semibold">
                  (Active)
                </span>
              )}
            </div>
            <div>
              {endpoint !== activeEndpoint && (
                <button
                  className="p-button p-component p-button-text mr-2"
                  onClick={() => setActiveEndpoint(endpoint)}
                >
                  Set Active
                </button>
              )}
              <button
                className="p-button p-component p-button-text p-button-danger"
                onClick={() => removeEndpoint(endpoint)}
                disabled={endpoint === activeEndpoint}
              >
                Remove
              </button>
            </div>
          </div>
        </Card>
      ))}
      <div className="mt-4">
        <button
          className="p-button p-component p-button-outlined"
          onClick={() => {
            const url = prompt("Enter API Endpoint URL:");
            if (url) {
              addEndpoint(url);
            }
          }}
        >
          Add API Endpoint
        </button>
      </div>
    </div>
  );
};
