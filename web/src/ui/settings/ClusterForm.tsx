import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Message } from "primereact/message";
import { useCallback, useState } from "react";
import { useClusters } from "../../hooks/useClusters";

export const ClusterForm = () => {
  const { addCluster } = useClusters();
  const [title, setTitle] = useState<string>("Test Cluster");
  const [host, setHost] = useState<string>("");
  const [port, setPort] = useState<string>("");
  const [accessKey, setAccessKey] = useState<string>("");
  const [accessCert, setAccessCert] = useState<string>("");
  const [caCert, setCaCert] = useState<string>("");
  const [isValid, setIsValid] = useState<boolean>(true);
  const [connectionTestError, setConnectionTestError] = useState<string | null>(
    null
  );
  const resetForm = useCallback(() => {
    setTitle("");
    setHost("");
    setPort("");
    setAccessKey("");
    setAccessCert("");
    setCaCert("");
    setIsValid(false);
    setConnectionTestError(null);
  }, []);
  const testConnection = useCallback(async () => {
    // Implement connection testing logic here
    console.log("Testing connection...");
    try {
      // Simulate connection test
      const response = await fetch(
        "http://localhost:3000/kafka/connection/test",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            clientId: "conenction-test-client",
            host,
            port,
            accessKey,
            accessCert,
            caCert,
          }),
        }
      );
      console.log({ response });
      const data = (await response.json()) as {
        success: boolean;
        message: string;
        error?: string;
      };
      if (response.ok && data.success) {
        console.log("Connection successful");
        setConnectionTestError(null);
        setIsValid(true);
      } else if (data?.error) {
        const errorMessage = `${data.message} - ${data.error}`;
        setConnectionTestError(errorMessage);
        setIsValid(false);
        console.error("Connection failed", errorMessage);
      } else {
        setConnectionTestError(data.message || "Connection failed");
        setIsValid(false);
        console.error("Connection failed", data.message);
      }
    } catch (error) {
      setConnectionTestError("Connection failed: " + (error as Error).message);
      setIsValid(false);
      console.error("Connection failed", error);
    }
  }, [host, port, accessKey, accessCert, caCert]);
  const canTest = host && port && accessKey && accessCert && caCert;
  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (isValid) {
            addCluster({
              title,
              host,
              port,
              accessKey,
              accessCert,
              caCert,
            });
            resetForm();
          }
        }}
      >
        <div className="my-2">
          <InputText
            placeholder="Cluster Name"
            className="w-full p-inputtext-lg"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="flex my-2">
          <InputText
            placeholder="Hostname"
            className="mr-2 flex-grow-1"
            value={host}
            onChange={(e) => setHost(e.target.value)}
          />
          <InputText
            placeholder="port"
            value={port}
            onChange={(e) => setPort(e.target.value)}
          />
        </div>
        <div className="my-2 flex">
          <div className="w-full flex-grow-1 pr-1">
            <InputTextarea
              placeholder="Access Key"
              className="w-full flex-grow-1"
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value)}
            />
          </div>
          <div className="w-full flex-grow-1 px-1">
            <InputTextarea
              placeholder="Access Certificate"
              className="w-full flex-grow-1"
              value={accessCert}
              onChange={(e) => setAccessCert(e.target.value)}
            />
          </div>
          <div className="w-full flex-grow-1 pl-1">
            <InputTextarea
              placeholder="CA Certificate"
              className="w-full flex-grow-1"
              value={caCert}
              onChange={(e) => setCaCert(e.target.value)}
            />
          </div>
        </div>
        {connectionTestError && (
          <div className="my-2">
            <Message
              severity="error"
              text={connectionTestError}
              className="w-full"
            />
          </div>
        )}
        <div className="my-2">
          <Button
            type="button"
            className="mr-2"
            severity="info"
            icon="pi pi-cloud-upload"
            label="Test Connection"
            disabled={!canTest}
            onClick={testConnection}
          />
          <Button
            type="submit"
            className="mr-2"
            severity="success"
            icon="pi pi-save"
            label="Save Cluster"
            disabled={!isValid || connectionTestError !== null}
          />
          <Button
            type="button"
            className="mr-2"
            severity="secondary"
            icon="pi pi-trash"
            label="Clear Form"
            onClick={resetForm}
          />
        </div>
      </form>
    </div>
  );
};
