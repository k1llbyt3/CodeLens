"use client";

import React from "react";
import { ArrowRight } from "lucide-react";

export interface LinkedListNodeData {
  id: string;
  val: any;
  nextId: string | null;
  isHead?: boolean;
  isTail?: boolean;
}

interface LinkedListVisualizerProps {
  name?: string;
  nodes: LinkedListNodeData[];
  pointers?: Array<{ name: string; targetIndex: number; color?: string }>;
  currentStep?: number;
  activeLineCode?: string;
}

export const LinkedListVisualizer: React.FC<LinkedListVisualizerProps> = ({
  name = "head",
  nodes = [],
  pointers = [],
}) => {
  if (!nodes || nodes.length === 0) return null;

  return (
    <div className="w-full flex flex-col items-center select-none py-3 px-2">
      {/* Header Panel */}
      <div className="w-full max-w-xl mb-4 flex items-center justify-between px-3.5 py-2 rounded-lg bg-neutral-900 border border-neutral-800">
        <span className="font-mono text-xs font-semibold text-neutral-300">
          Linked List: <span className="text-white font-bold">{name}</span>
        </span>

        {/* Pointers Legend */}
        <div className="flex items-center gap-2.5 font-mono text-[11px]">
          {pointers.map((ptr) => (
            <span
              key={`ptr-legend-${ptr.name}`}
              className="text-cyan-400 font-medium"
            >
              {ptr.name} &rarr; Node [{ptr.targetIndex}]
            </span>
          ))}
        </div>
      </div>

      {/* Linked List Chain: Standard Node Boxes [ val | next ] -> [ val | next ] -> null */}
      <div className="w-full max-w-3xl overflow-x-auto pb-4 pt-7 px-4 flex justify-start md:justify-center items-center">
        <div className="flex items-center min-w-max gap-3 relative py-2">
          {nodes.map((node, idx) => {
            const attachedPointers = pointers.filter((p) => p.targetIndex === idx);

            return (
              <React.Fragment key={`ll-node-frag-${node.id || idx}`}>
                <div className="relative flex flex-col items-center">
                  {/* Pointers above node */}
                  {attachedPointers.length > 0 && (
                    <div className="absolute -top-7 flex flex-col items-center">
                      <span className="text-[11px] font-mono font-bold text-sky-400">
                        {attachedPointers.map((p) => p.name).join(", ")}
                      </span>
                      <span className="text-sky-400 text-xs leading-none">&darr;</span>
                    </div>
                  )}

                  {/* Standard Node Box: [ val | next ] */}
                  <div className="flex items-center rounded-lg border border-neutral-700 bg-neutral-900 overflow-hidden font-mono shadow-sm">
                    {/* Value cell */}
                    <div className="w-12 h-12 flex items-center justify-center text-sm font-bold text-white border-r border-neutral-800 bg-neutral-950/60">
                      {node.val !== undefined ? String(node.val) : "0"}
                    </div>
                    {/* Next reference cell */}
                    <div className="w-8 h-12 flex items-center justify-center bg-neutral-900 text-neutral-500">
                      <div className="w-2.5 h-2.5 rounded-full bg-neutral-600" />
                    </div>
                  </div>

                  {/* Node index below */}
                  <span className="text-[10px] font-mono text-neutral-500 mt-1.5">
                    [{idx}]
                  </span>
                </div>

                {/* Arrow connecting to next node */}
                <div className="flex items-center text-neutral-400 px-1">
                  <div className="w-6 h-[1.5px] bg-neutral-600" />
                  <ArrowRight className="w-4 h-4 text-neutral-400 -ml-1 shrink-0" />
                </div>
              </React.Fragment>
            );
          })}

          {/* Terminal null */}
          <div className="flex flex-col items-center">
            <div className="w-14 h-12 rounded-lg border border-dashed border-neutral-700 bg-neutral-950/40 flex items-center justify-center font-mono text-xs text-neutral-400 font-semibold">
              null
            </div>
            <span className="text-[10px] font-mono text-neutral-600 mt-1.5">
              end
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
