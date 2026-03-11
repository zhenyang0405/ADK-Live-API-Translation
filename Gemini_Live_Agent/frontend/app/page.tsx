"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { config } from "@/lib/config";

export default function Home() {
  const { uid, loading, getIdToken } = useAuth();
  
  const [apiResponse, setApiResponse] = useState<string>("");
  const [wsStatus, setWsStatus] = useState<string>("");
  const [wsResponse, setWsResponse] = useState<string>("");

  const testApi = async () => {
    try {
      setApiResponse("Loading...");
      const token = await getIdToken();
      const res = await fetch(`${config.apiUrl}/api/test`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      setApiResponse(JSON.stringify(data, null, 2));
    } catch (e: any) {
      setApiResponse(`Error: ${e.message}`);
    }
  };

  const testWs = async () => {
    try {
      setWsStatus("Connecting...");
      setWsResponse("");
      
      const token = await getIdToken();
      const ws = new WebSocket(`${config.streamingUrl}/ws`);
      
      ws.onopen = () => {
        setWsStatus("Connected. Sending Auth...");
        ws.send(JSON.stringify({ type: "auth", token }));
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "auth_success") {
          setWsStatus("Authenticated. Sending Ping...");
          ws.send(JSON.stringify({ type: "ping" }));
        } else if (data.type === "pong") {
          setWsStatus("Success!");
          setWsResponse(JSON.stringify(data, null, 2));
          ws.close();
        } else {
          setWsResponse(prev => prev + "\n" + JSON.stringify(data, null, 2));
        }
      };
      
      ws.onerror = (e) => {
        setWsStatus("Error connecting to WebSocket");
      };
      
      ws.onclose = () => {
        if (wsStatus !== "Success!") {
          setWsStatus(prev => prev + " (Closed)");
        }
      };
    } catch (e: any) {
      setWsStatus(`Error: ${e.message}`);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-900 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        <p className="mt-4">Authenticating...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-24 bg-gray-900 text-gray-100">
      <h1 className="text-4xl font-bold mb-8 text-blue-400">Dr. Lingua Phase 0</h1>
      
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-2xl mb-8 border border-gray-700">
        <h2 className="text-2xl font-semibold mb-4 text-green-400">Auth Status</h2>
        <p className="font-mono bg-black p-3 rounded">{uid ? `Signed in as: ${uid}` : "Not signed in"}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl">
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
          <h2 className="text-2xl font-semibold mb-4 text-purple-400">REST API Test</h2>
          <button 
            onClick={testApi}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition duration-200"
          >
            Test REST API
          </button>
          
          {apiResponse && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Response:</h3>
              <pre className="bg-black p-3 rounded text-sm overflow-x-auto text-green-300">
                {apiResponse}
              </pre>
            </div>
          )}
        </div>

        <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
          <h2 className="text-2xl font-semibold mb-4 text-yellow-400">WebSocket Test</h2>
          <button 
            onClick={testWs}
            className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded transition duration-200"
          >
            Test WebSocket
          </button>
          
          {(wsStatus || wsResponse) && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Status:</h3>
              <p className="text-sm mb-2 text-blue-300">{wsStatus}</p>
              
              {wsResponse && (
                <>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Response:</h3>
                  <pre className="bg-black p-3 rounded text-sm overflow-x-auto text-green-300">
                    {wsResponse}
                  </pre>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
