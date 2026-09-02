"use client";

import React from "react";
import { motion } from "framer-motion";
import { Layers } from "lucide-react";

interface CallStackVisualizerProps {
  callStack: string[];
}

export const CallStackVisualizer: React.FC<CallStackVisualizerProps> = ({ callStack }) => {
  const stack = callStack.length > 0 ? callStack : ["Solution.main"];

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl bg-neutral-900 border border-neutral-800">
      <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span className="font-mono text-xs font-semibold text-neutral-200">
            Call Stack Inspector
          </span>
        </div>
        <span className="px-2 py-0.5 text-[10px] font-mono text-neutral-400 bg-neutral-800 border border-neutral-700 rounded">
          {stack.length} Active {stack.length === 1 ? "Frame" : "Frames"}
        </span>
      </div>

      <div className="flex flex-col-reverse gap-2 mt-1">
        {stack.map((frame, index) => {
          const isTop = index === stack.length - 1;
          return (
            <motion.div
              key={`${frame}-${index}`}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.15 }}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg font-mono text-xs border transition-colors ${
                isTop
                  ? "bg-neutral-900 border-amber-500/40 text-amber-200 font-semibold shadow-sm"
                  : "bg-neutral-950/60 border-neutral-800 text-neutral-400"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className={isTop ? "text-neutral-100" : "text-neutral-400"}>
                  {frame}
                </span>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                  isTop
                    ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                    : "bg-neutral-800/60 text-neutral-500 border-neutral-700/50"
                }`}
              >
                Frame #{index}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
