import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Message } from "primereact/message";
import { useCallback, useState } from "react";
import { useClusters } from "../../hooks/useClusters";

const ACCESS_KEY = `-----BEGIN PRIVATE KEY-----
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
YGMut70w9vR6gskTnKjSWA==
-----END PRIVATE KEY-----
`;
const ACCESS_CERT = `-----BEGIN CERTIFICATE-----
MIIEcTCCAtmgAwIBAgIUdUMOhFdbRKTf6+9lmmvnyvXL7ZowDQYJKoZIhvcNAQEM
BQAwQDE+MDwGA1UEAww1NzIyYzBmNzItNTRmYS00NzQ4LWJlZTMtYTc0MjQwNTNh
ZDYxIEdFTiAxIFByb2plY3QgQ0EwHhcNMjUxMDExMDkzNjQwWhcNMjgwMTA5MDkz
NjQwWjBJMSEwHwYDVQQKDBhrYWZrYS1kYXZpZGVzcG8tbG9hZHRlc3QxETAPBgNV
BAsMCHU3azF5M2QyMREwDwYDVQQDDAhhdm5hZG1pbjCCAaIwDQYJKoZIhvcNAQEB
BQADggGPADCCAYoCggGBANTz/7EufTrChzhCDRaZwdYDc8BG4GZqEZv/s7LAdxWk
PLaqKGYQL0enuqu7pTGvyBqG7LtLH1p7SBQRTf8EsMg9/DZ9yhZA9+p4/FLG2xRa
dHdViKXPRXtydS40DAs67iL6/oNZFo6Vx00V4LxwpSWe+b8dOt5xBkZ2h5N8yrhI
T5DFCrEbe146bICmZT9elH1+6UDv2S0ZIrSEUEocFX8Np4q3kJdKK9zC3iVzkK5Y
Ku0RRShow8w2VnTiyATQvkELYWls2fwBc907HdOPiEYdo1P2zcURdoH+3XKSKNPN
xGSdJhhCuMDqP1lns8qIcX/dgccKqxzdii+IeVFlyh5sif+Lr0P9ulgykaxLGYhq
GryoJ01f3fxy9iv0YQGEWuFkAySb+LGHBBS218EAxpDQPhTiqAO0GDdWjvj08L8b
pU2HvhfPNlDioVc1FUXiL1IJSyI29ujn3SFV3f4ADEGo5fNU1Yk5QYxWbUHXao9/
lpNpaDPMlHL8edL7cVWigwIDAQABo1owWDAdBgNVHQ4EFgQUedpVhpEteh3RPL7z
jlTI8MHb7awwCQYDVR0TBAIwADALBgNVHQ8EBAMCBaAwHwYDVR0jBBgwFoAUA44x
mO0Y6mO9nWXy2aBdyWwxveMwDQYJKoZIhvcNAQEMBQADggGBAMBqzZ10w88x9dRM
CX06GydwxK6jSQnZJ1a75GVdYIEEIrXNufQpxQVl2SnfhBwNFeodgW6qJPuu1cVD
SkI46uJFnJTL7laZAaMpMX9FbQqYxw8MaFgGitIts2o5j1Tp61W5AXeDMbTzio6c
yT4cuk348obhi5ORKdeTQCHlD1xZW5bHyaAd8EoyssceAqbSZBROvL4XbYYghLge
R9Cr1WZ5MjGydVLs6642zLGfCAPkPUhN0vwkHuYviRqjTzlGRxkDvPojw/yEaiwj
ZzHMYyF5Iq/iscJqNfVAKl6Y8C76RU5JExV7TIL+ZoUXlL4DRSqFhHL6aamyF0dh
m+lw1/IXhWkX489TWjXsRDpBB7XLywj3ZLQJ+Jwu4MVsecJk87M5yfT01fzH6ooj
4O53JH8wYlKzWrMgU6CYrRFKgzM/xiJXCF0TILFDcWBXlGVNhfTzFHSCdUTdSvs/
sMpf19d5Y5MUbr0Skiee52jCKA18iDc7v860glAhTu811VyPQg==
-----END CERTIFICATE-----
`;
const CA_CERT = `-----BEGIN CERTIFICATE-----
MIIETTCCArWgAwIBAgIUbHgiSwGvWXkL6pWFC4mhmTv4ZukwDQYJKoZIhvcNAQEM
BQAwQDE+MDwGA1UEAww1NzIyYzBmNzItNTRmYS00NzQ4LWJlZTMtYTc0MjQwNTNh
ZDYxIEdFTiAxIFByb2plY3QgQ0EwHhcNMjUwNTA1MTIwNzQwWhcNMzUwNTAzMTIw
NzQwWjBAMT4wPAYDVQQDDDU3MjJjMGY3Mi01NGZhLTQ3NDgtYmVlMy1hNzQyNDA1
M2FkNjEgR0VOIDEgUHJvamVjdCBDQTCCAaIwDQYJKoZIhvcNAQEBBQADggGPADCC
AYoCggGBAMLQoU6zQyhQLjaUSGRTILSdd2GRkXuQAzKr7mLieaIuH0rxWeHiBK78
5Rb5uRRa3RKncUwPwzv8iF0r7FAr2ijdofLPiEnJjVGQWVOZ09Z+sUpPGnVU4u9/
XmVoAVkUKrLEKhHZpx0i7SyLqb3u4VdC3Y6EBuUbAdZXdSOLT/b/L9HsQ56u/Pvk
BPknNsQtMIlxoz4TrDTsH+YUJ2n5ZoG8shEkHvDvQ1iUVflpAJ4ZF1UzxOiK+7xQ
a6FPLsxojuzQeHP9A8XngS+i1utUqUUkqFRm4y7K/jmd+XbBIu8SgH9wM42T2Bkn
0N1y9GmYHvh/sTe98Y+4zwnZjrjbo5vXg/wrCedfEitE4IHzQzaiitzdjvERgCvx
K4vP6rBVz7zZxYPBwaDXDaivcI6c1ZL+1DZ+fAuWiBL98gVsyCmpptALEAa7R+dM
MJaWHFv7LoEnu3IyGj6+aKziDJJD2iDISoaMum77Sr5F6q7BUIRAawuaukz3b+yH
+Yq+joHn0wIDAQABoz8wPTAdBgNVHQ4EFgQUA44xmO0Y6mO9nWXy2aBdyWwxveMw
DwYDVR0TBAgwBgEB/wIBADALBgNVHQ8EBAMCAQYwDQYJKoZIhvcNAQEMBQADggGB
ALax5kILgvj694t296pwmUNknYCV+sh4QFM5vUY0Dz5uWNKLHT//Tv2/8IClCL+N
m7Cyj0dCmuXf8i2m0qTWy+qLK89flIX1P/QZ2yEwcTFd2WkZfds+rEnsF2ieFl7m
nxeYbDeWDIZg5ydt0C/TVn78z9Yjq8u9D0lzoUiEnZ2GxjF4L6p++XL9ew0LqQKJ
sWpAqtIJ99LS7KIPPxXkBJZCEg6mBWxR6Rv/u6Z3YiJ1FJgFP7fNd++9SrPVKP8R
CerjwnJp5wlLBjasanqLkyCkZJr1mKPwTe9LfC8YaUb+mP/OI/5r8K3Y2sSEvpHu
wIWrgO8zUtdvJYyPnLzwyI4KCxoqfb720gVakXd8pMCxt3tnIiTbOXG9U7NWIelZ
Kjp0MX7Axy15+25vfvU8M02W9RKHK7YJgCOrJRKyxrXgGAushDrySUwgZgHK+YDK
EIzqUTgXH7hh41TY6S3xhLWZNtiaimIVhUDWOXYiY9NimH9na65DzywVNwhGrgbX
Ow==
-----END CERTIFICATE-----
`;

export const ClusterForm = () => {
    const {addCluster} = useClusters();
  const [title, setTitle] = useState<string>("Test Cluster");
  const [host, setHost] = useState<string>(
    "kafka-davidespo-loadtest-demo-inkless.h.aivencloud.com"
  );
  const [port, setPort] = useState<string>("20635");
  const [accessKey, setAccessKey] = useState<string>(ACCESS_KEY);
  const [accessCert, setAccessCert] = useState<string>(ACCESS_CERT);
  const [caCert, setCaCert] = useState<string>(CA_CERT);
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
      <form onSubmit={e => {
        e.preventDefault();
        if (isValid) {
            addCluster({
                title,
                host,
                port,
                accessKey,
                accessCert,
                caCert
            })
            resetForm();
        }
      }}>
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
