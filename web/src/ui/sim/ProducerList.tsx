import { useClientConnections, type ClientConnection } from "../../hooks";

export const ProducerList = () => {
  const { connections } = useClientConnections();
  if (connections.length === 0) {
    return (
      <div>
        <em>No producers</em>
      </div>
    );
  }
  console.log(connections);
  return (
    <div className="flex flex-column gap-2">
      {connections.map((connection) => (
        <ProducerCard key={connection.id} connection={connection} />
      ))}
    </div>
  );
};

const ProducerCard = ({ connection }: { connection: ClientConnection }) => {
  return (
    <div className="border-1 border-round p-2">
      <h4>
        {connection.id} - {connection.state}
      </h4>
      {connection.error && <div className="text-danger">{connection.error}</div>}
      {connection.response && <div className="text-success">{connection.response.status}</div>}
      <pre>{JSON.stringify(connection, null, 2)}</pre>
    </div>
  );
};
