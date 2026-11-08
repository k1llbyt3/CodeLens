"use client";

import React from "react";

interface FinalArrayTableProps {
  arrayName: string;
  data: any; // 1D array (any[]) or 2D array (any[][])
  executionStep?: number;
}

export const FinalArrayTable: React.FC<FinalArrayTableProps> = ({
  arrayName,
  data,
}) => {
  if (!Array.isArray(data) || data.length === 0) return null;

  const is2D = Array.isArray(data[0]);

  return (
    <div className="w-full max-w-2xl mx-auto rounded-lg border border-neutral-800 bg-[#0f0f11] p-3 mb-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800/80">
        <span className="font-mono text-xs font-semibold text-neutral-300">
          Final Array: <span className="text-white font-bold">{arrayName}</span>
        </span>
      </div>

      {/* Array Elements */}
      {is2D ? (
        <Render2DSimple matrix={data} />
      ) : (
        <Render1DSimple array={data} />
      )}
    </div>
  );
};

// 1D Array: Value on top, index below, no table borders or labels
const Render1DSimple: React.FC<{ array: any[] }> = ({ array }) => {
  return (
    <div className="overflow-x-auto py-2">
      <div className="flex items-center gap-2 min-w-max justify-center">
        {array.map((val, idx) => (
          <div
            key={idx}
            className="flex flex-col items-center justify-center font-mono"
          >
            {/* Value block */}
            <div className="w-12 h-12 rounded-lg bg-neutral-900 border border-neutral-700/80 flex items-center justify-center text-sm font-bold text-white shadow-sm">
              {String(val)}
            </div>
            {/* Index label below */}
            <span className="text-[11px] text-neutral-500 font-medium mt-1">
              {idx}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// 2D Matrix: Clean cells with row/col coordinates
const Render2DSimple: React.FC<{ matrix: any[][] }> = ({ matrix }) => {
  const cols = matrix[0]?.length ?? 0;

  return (
    <div className="overflow-x-auto py-2">
      <div className="flex flex-col gap-1.5 min-w-max items-center">
        {/* Column indices */}
        <div className="flex items-center gap-1.5 pl-7">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="w-11 text-center font-mono text-[10px] text-neutral-500">
              {c}
            </div>
          ))}
        </div>

        {/* Rows */}
        {matrix.map((row, r) => (
          <div key={r} className="flex items-center gap-1.5 font-mono">
            <span className="w-5 text-right text-[10px] text-neutral-500 pr-1">
              {r}
            </span>
            {Array.isArray(row) &&
              row.map((val, c) => (
                <div
                  key={c}
                  className="w-11 h-11 rounded-lg bg-neutral-900 border border-neutral-700/80 flex items-center justify-center text-xs font-bold text-white shadow-sm"
                >
                  {String(val)}
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
};
