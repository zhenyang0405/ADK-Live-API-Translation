"use client";

import React from "react";
import { useWebSocketContext } from "@/components/VisualNounWebSocketProvider";
import EmptyState from "@/components/EmptyState";
import MicBar from "@/components/MicBar";
import TwoColumnTranscript from "@/components/TwoColumnTranscript";

export default function ConversationContent() {
  const { transcripts, agentStatus } = useWebSocketContext();

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {transcripts.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <EmptyState />
        </div>
      ) : (
        <TwoColumnTranscript transcripts={transcripts} agentStatus={agentStatus} />
      )}
      <MicBar />
    </div>
  );
}
