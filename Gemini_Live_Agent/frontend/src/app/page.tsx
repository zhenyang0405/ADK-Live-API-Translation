"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { WebSocketProvider } from "@/components/WebSocketManager";
import { ScreenSharePanel } from "@/components/ScreenSharePanel";
import { AnnotationPanel } from "@/components/AnnotationPanel";
import { AudioManager } from "@/components/AudioManager";
import { TranscriptDisplay } from "@/components/TranscriptDisplay";
import { DocumentUploadPanel, type UploadedDoc } from "@/components/DocumentUploadPanel";
import { DocumentViewerPanel } from "@/components/DocumentViewerPanel";

export default function Home() {
  const { uid, loading, getIdToken } = useAuth();
  const [token, setToken] = useState<string | null>(null);

  // Fetch Firebase context token
  useEffect(() => {
    if (uid && !loading) {
      getIdToken().then(setToken).catch(console.error);
    }
  }, [uid, loading, getIdToken]);

  if (loading || !token) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50 text-gray-800">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 font-medium text-gray-500">Authenticating...</p>
      </main>
    );
  }

  return (
    <WebSocketProvider token={token}>
      <main className="flex flex-col h-screen bg-[#F8FAFC] overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 shrink-0 flex items-center justify-between z-10 shadow-sm">
           <div className="flex items-center gap-2">
             <div className="bg-blue-600 text-white rounded w-8 h-8 flex items-center justify-center font-bold text-lg">
               L
             </div>
             <h1 className="text-xl font-bold tracking-tight text-gray-900">Dr. Lingua <span className="text-gray-400 font-normal">| Research Translation Agent</span></h1>
           </div>
           
           {/* Global status indicator */}
           <div className="flex items-center gap-2 pr-2">
             <ConnectionStatus />
           </div>
        </header>

        {/* Main Content Area */}
        <MainContent />
      </main>
    </WebSocketProvider>
  );
}

// Extracted so we can use hooks inside WebSocketProvider context
function MainContent() {
  const [leftPanelMode, setLeftPanelMode] = React.useState<"screenshare" | "document">("screenshare");
  const [docs, setDocs] = React.useState<UploadedDoc[]>([]);
  const [activeDoc, setActiveDoc] = React.useState<UploadedDoc | null>(null);

  const handleDocAdded = (doc: UploadedDoc) => {
    // Upsert: replace existing entry with same id (e.g., when pages are lazily loaded)
    setDocs((prev) => {
      const idx = prev.findIndex((d) => d.id === doc.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = doc;
        return next;
      }
      return [...prev, doc];
    });
  };

  const handleDocsLoaded = (loaded: UploadedDoc[]) => {
    setDocs(loaded);
  };

  const handleDocClick = (doc: UploadedDoc) => {
    setActiveDoc(doc);
    setLeftPanelMode("document");
  };

  const handleCloseDoc = () => {
    setLeftPanelMode("screenshare");
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row p-4 gap-4 overflow-hidden relative">
       
       {/* Left side: Screen Capture or Document Viewer (60%) */}
       <div className="w-full md:w-[60%] flex flex-col h-full overflow-hidden gap-3">

          {/* Document upload bar - always visible */}
          <div className="shrink-0 bg-white rounded-lg border border-gray-200 shadow-sm px-3 py-2">
            <DocumentUploadPanel
              docs={docs}
              activeDocId={activeDoc?.id ?? null}
              onDocAdded={handleDocAdded}
              onDocClick={handleDocClick}
              onDocsLoaded={handleDocsLoaded}
            />
          </div>

          {/* Main left panel - screen share OR document viewer */}
          <div className="flex-1 overflow-hidden">
            {leftPanelMode === "screenshare" ? (
              <ScreenSharePanel />
            ) : (
              activeDoc && (
                <DocumentViewerPanel doc={activeDoc} onClose={handleCloseDoc} />
              )
            )}
          </div>

          <div className="shrink-0">
            <AudioManager />
          </div>
       </div>

       {/* Right side: Annotations (40%) */}
       <div className="w-full md:w-[40%] h-full overflow-hidden">
          <AnnotationPanel />
       </div>

       {/* Overlay transcript display pinned to bottom */}
       <TranscriptDisplay />

    </div>
  );
}

// Simple internal component to grab connection state
function ConnectionStatus() {
  const { isConnected, isAuthenticated } = require("@/components/WebSocketManager").useWebSocketContext();
  
  if (!isConnected) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
        <span className="relative flex h-3 w-3">
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </span>
        Disconnected
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-2 text-sm text-amber-600 font-medium">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
        </span>
        Authenticating...
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
      <span className="relative flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
      </span>
      Live Session Active
    </div>
  );
}
