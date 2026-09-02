"use client";

import React, { useRef, useEffect } from "react";
import { Terminal, Trash2 } from "lucide-react";

interface ConsoleOutputProps {
  stdout?: string;
  onClear?: () => void;
}

export const ConsoleOutput: React.FC<ConsoleOutputProps> = ({ stdout = "", onClear }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const lines = stdout ? stdout.split("\n") : [];

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [stdout]);

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a] border-t border-white/[0.06] select-none">
      <div className="flex items-center justify-between px-4 py-1.5 bg-[#0a0a0a] border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-neutral-400" />
          <span className="font-mono text-xs font-semibold text-neutral-300">
            Console Output
          </span>
          <span className="px-1.5 py-0.2 text-[9px] font-mono text-neutral-500 bg-white/[0.03] border border-white/[0.05] rounded-sm">
            stdout
          </span>
        </div>

        {onClear && (
          <button
            onClick={onClear}
            className="p-1 text-neutral-500 hover:text-neutral-300 rounded transition-all"
            title="Clear Console"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-1 bg-[#050505]"
      >
        {lines.length === 0 ? (
          <span className="text-neutral-600 italic text-[11px]">
            Standard output stream is empty. Use System.out.println() in Java.
          </span>
        ) : (
          lines.map((line, idx) => (
            <div key={idx} className="flex items-start gap-2 text-neutral-200">
              <span className="text-neutral-600 text-[10px] select-none min-w-[20px]">
                {idx + 1}
              </span>
              <span className="whitespace-pre-wrap">{line}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
