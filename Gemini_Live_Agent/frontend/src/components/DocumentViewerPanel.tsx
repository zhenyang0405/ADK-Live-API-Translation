"use client";
import React, { useEffect, useRef, useState } from "react";
import { useWebSocketContext } from "./WebSocketManager";
import { UploadedDoc } from "./DocumentUploadPanel";

interface DocumentViewerPanelProps {
  doc: UploadedDoc;
  onClose: () => void;
}

export const DocumentViewerPanel: React.FC<DocumentViewerPanelProps> = ({
  doc,
  onClose,
}) => {
  const { sendMessage, isConnected } = useWebSocketContext();
  const [currentPage, setCurrentPage] = useState(0);
  const [sending, setSending] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const totalPages = doc.pages.length;
  const currentBase64 = doc.pages[currentPage];

  // Send document frame to backend on interval
  useEffect(() => {
    if (!isConnected) return;

    const sendFrame = () => {
      if (!doc.pages[currentPage]) return;
      sendMessage({ type: "document_frame", data: doc.pages[currentPage] });
    };

    // Send immediately when page changes
    sendFrame();

    intervalRef.current = setInterval(sendFrame, 3000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isConnected, doc, currentPage, sendMessage]);

  const goToPrev = () => setCurrentPage((p) => Math.max(0, p - 1));
  const goToNext = () =>
    setCurrentPage((p) => Math.min(totalPages - 1, p + 1));

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex bg-gray-50 border-b border-gray-200 p-3 justify-between items-center gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base">📄</span>
          <h2
            className="font-semibold text-gray-700 truncate text-sm"
            title={doc.name}
          >
            {doc.name}
          </h2>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Page navigation */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={goToPrev}
                disabled={currentPage === 0}
                className="px-2 py-1 text-xs font-semibold bg-white border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ‹ Prev
              </button>
              <span className="text-xs text-gray-500 font-medium px-1">
                {currentPage + 1} / {totalPages}
              </span>
              <button
                onClick={goToNext}
                disabled={currentPage === totalPages - 1}
                className="px-2 py-1 text-xs font-semibold bg-white border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next ›
              </button>
            </div>
          )}

          {/* Live frame indicator */}
          {isConnected && (
            <div className="flex items-center gap-1 text-xs text-indigo-600 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
              </span>
              Sending
            </div>
          )}

          {/* Back button */}
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold bg-white border border-gray-300 rounded hover:bg-gray-50 text-gray-700 flex items-center gap-1"
          >
            📺 Screen Share
          </button>
        </div>
      </div>

      {/* Document preview */}
      <div className="flex-1 relative bg-slate-100 flex items-center justify-center overflow-auto p-4">
        {currentBase64 ? (
          <img
            src={`data:image/jpeg;base64,${currentBase64}`}
            alt={`Page ${currentPage + 1} of ${doc.name}`}
            className="max-w-full max-h-full object-contain rounded shadow-md"
          />
        ) : (
          <div className="text-gray-400 font-medium">
            No content to display
          </div>
        )}
      </div>
    </div>
  );
};
