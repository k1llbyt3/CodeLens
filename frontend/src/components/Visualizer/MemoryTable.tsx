"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface MemoryTableProps {
  variables: Array<{
    name: string;
    value: any;
    prevValue?: any;
    isMutated?: boolean;
    isActive?: boolean;
  }>;
  activeLineCode?: string;
}

export const MemoryTable: React.FC<MemoryTableProps> = ({
  variables,
  activeLineCode = "",
}) => {
  if (!variables || variables.length === 0) return null;

  const isSumTargetComparison =
    (activeLineCode.includes("sum == target") || (activeLineCode.includes("sum") && activeLineCode.includes("target") && activeLineCode.includes("=="))) &&
    activeLineCode.includes("if");

  const sumVar = variables.find((v) => v.name === "sum");
  const targetVar = variables.find((v) => v.name === "target");
  const isSumTargetEqual = sumVar && targetVar && sumVar.value === targetVar.value;

  return (
    <div className="w-full flex flex-col items-center select-none my-1.5">
      {/* Unified Technical Memory Table - NO Background, Pure White Border, NO Heading */}
      <div className="w-full rounded-lg border border-white/20 bg-transparent overflow-hidden">
        <div className="flex flex-wrap divide-x divide-white/20">
          {variables.map((item) => {
            const isHighlighted = item.isActive;
            const isMutated = item.isMutated;

            return (
              <div
                key={item.name}
                className="flex flex-col justify-between px-3 py-1.5 min-w-[68px] flex-grow bg-transparent transition-all duration-200"
              >
                <span className="text-[11px] font-mono font-extrabold text-neutral-300 tracking-wider">
                  {item.name}
                </span>

                <div className="h-5 flex items-center mt-0.5">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={`${item.name}-${String(item.value)}`}
                      initial={{ y: 5, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -5, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className={`font-mono text-sm font-bold ${
                        isHighlighted
                          ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.85)]"
                          : isMutated
                          ? "text-white"
                          : "text-neutral-200"
                      }`}
                    >
                      {String(item.value)}
                    </motion.span>
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Visual Equality Arrows for sum == target: come down from cells and point towards centered '=' */}
      {isSumTargetComparison && sumVar && targetVar && (
        <div className="w-full flex flex-col items-center mt-1 animate-in fade-in duration-300">
          <svg className="w-full h-10 overflow-visible" viewBox="0 0 400 40">
            <defs>
              <marker id="eq-arrow-right" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill={isSumTargetEqual ? "#4ade80" : "#f87171"} />
              </marker>
              <marker id="eq-arrow-left" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill={isSumTargetEqual ? "#4ade80" : "#f87171"} />
              </marker>
            </defs>
            {/* Left arrow coming down and pointing right */}
            <path
              d="M 120 0 L 120 16 L 180 16"
              fill="none"
              stroke={isSumTargetEqual ? "#4ade80" : "#f87171"}
              strokeWidth="2"
              markerEnd="url(#eq-arrow-right)"
              strokeDasharray="4 2"
            />
            {/* Right arrow coming down and pointing left */}
            <path
              d="M 280 0 L 280 16 L 220 16"
              fill="none"
              stroke={isSumTargetEqual ? "#4ade80" : "#f87171"}
              strokeWidth="2"
              markerEnd="url(#eq-arrow-left)"
              strokeDasharray="4 2"
            />
            {/* Centered equality symbol */}
            <text
              x="200"
              y="20"
              textAnchor="middle"
              dominantBaseline="middle"
              fill={isSumTargetEqual ? "#4ade80" : "#f87171"}
              fontFamily="'JetBrains Mono', monospace"
              fontSize="16"
              fontWeight="900"
            >
              =
            </text>
            {/* TRUE / FALSE text */}
            <text
              x="200"
              y="34"
              textAnchor="middle"
              dominantBaseline="middle"
              fill={isSumTargetEqual ? "#4ade80" : "#f87171"}
              fontFamily="'JetBrains Mono', monospace"
              fontSize="11"
              fontWeight="900"
              letterSpacing="0.1em"
            >
              {isSumTargetEqual ? "TRUE" : "FALSE"}
            </text>
          </svg>
        </div>
      )}
    </div>
  );
};
