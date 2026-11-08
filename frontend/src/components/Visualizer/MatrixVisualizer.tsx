"use client";

import React from "react";

interface MatrixVisualizerProps {
  name: string;
  matrix: any[][];
  rowPointer?: { name: string; index: number } | null;
  colPointer?: { name: string; index: number } | null;
  activeCell?: [number, number] | null;
  highlightedCells?: [number, number][];
  currentStep?: number;
  activeLineCode?: string;
}

export const MatrixVisualizer: React.FC<MatrixVisualizerProps> = ({
  name,
  matrix = [],
  rowPointer,
  colPointer,
  activeCell,
}) => {
  const numRows = matrix.length;
  const numCols = numRows > 0 && Array.isArray(matrix[0]) ? matrix[0].length : 0;

  if (numRows === 0 || numCols === 0) return null;

  return (
    <div className="w-full flex flex-col items-center select-none py-4 px-3">
      {/* Header card with glass styling and pointers display */}
      <div className="w-full max-w-2xl mb-4 flex items-center justify-between px-4 py-2.5 rounded-xl bg-neutral-900/90 border border-neutral-800 shadow-md backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
          <span className="font-mono text-xs font-semibold text-neutral-300">
            2D Matrix: <span className="text-white font-bold">{name}</span>
          </span>
          <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-neutral-800 border border-neutral-700/60 text-neutral-400">
            {numRows} &times; {numCols}
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          {rowPointer && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-950/70 border border-sky-800/80 text-sky-400 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-sky-500">Row</span>
              <span className="font-bold">{rowPointer.name} = {rowPointer.index}</span>
            </div>
          )}
          {colPointer && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/70 border border-emerald-800/80 text-emerald-400 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-emerald-500">Col</span>
              <span className="font-bold">{colPointer.name} = {colPointer.index}</span>
            </div>
          )}
        </div>
      </div>

      {/* Grid container with subtle crosshair beams & refined cells */}
      <div className="relative overflow-x-auto max-w-full p-6 rounded-2xl bg-neutral-950/90 border border-neutral-800/90 shadow-xl backdrop-blur-md">
        <div className="flex flex-col gap-2.5 min-w-max items-center">
          {/* Column headers with subtle beam highlight */}
          <div className="flex items-center gap-2.5 pl-12">
            {Array.from({ length: numCols }).map((_, cIdx) => {
              const isColActive = colPointer && colPointer.index === cIdx;
              return (
                <div
                  key={`col-idx-${cIdx}`}
                  className="w-14 flex flex-col items-center justify-center font-mono"
                >
                  <span
                    className={`text-[10px] font-bold tracking-wider uppercase transition-colors ${
                      isColActive ? "text-emerald-400" : "text-neutral-500"
                    }`}
                  >
                    c{cIdx}
                  </span>
                  <div
                    className={`w-1.5 h-1.5 rounded-full mt-0.5 transition-colors ${
                      isColActive ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-neutral-800"
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* Rows */}
          {matrix.map((row, rIdx) => {
            const isRowActive = rowPointer && rowPointer.index === rIdx;

            return (
              <div key={`row-${rIdx}`} className="flex items-center gap-2.5 font-mono">
                {/* Row Header with indicator */}
                <div className="w-10 flex items-center justify-end gap-1.5 pr-1">
                  <div
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      isRowActive ? "bg-sky-400 shadow-[0_0_8px_#38bdf8]" : "bg-neutral-800"
                    }`}
                  />
                  <span
                    className={`text-[10px] font-bold uppercase transition-colors ${
                      isRowActive ? "text-sky-400 font-bold" : "text-neutral-500"
                    }`}
                  >
                    r{rIdx}
                  </span>
                </div>

                {/* Row Cells */}
                <div className="flex items-center gap-2.5">
                  {Array.isArray(row) &&
                    row.map((val, cIdx) => {
                      const isColActive = colPointer && colPointer.index === cIdx;
                      const isCrosshair = isRowActive || isColActive;
                      const isFocused =
                        (activeCell && activeCell[0] === rIdx && activeCell[1] === cIdx) ||
                        (isRowActive && isColActive);

                      return (
                        <div
                          key={`cell-${rIdx}-${cIdx}`}
                          className={`relative w-14 h-14 rounded-xl flex flex-col items-center justify-center transition-all duration-200 border ${
                            isFocused
                              ? "bg-neutral-800/90 border-sky-400 text-sky-200 shadow-[0_0_16px_rgba(56,189,248,0.25)] ring-1 ring-sky-400/50 scale-[1.03] z-10"
                              : isCrosshair
                              ? "bg-neutral-900/90 border-neutral-700/80 text-neutral-200"
                              : "bg-neutral-900/50 border-neutral-800/70 text-neutral-400 hover:border-neutral-700"
                          }`}
                        >
                          {/* Coordinate subtitle tag */}
                          <span
                            className={`absolute top-1 left-1.5 text-[9px] font-mono leading-none ${
                              isFocused ? "text-sky-400 font-bold" : "text-neutral-500"
                            }`}
                          >
                            [{rIdx},{cIdx}]
                          </span>

                          {/* Cell Value */}
                          <span
                            className={`text-base font-bold font-mono tracking-tight mt-2 ${
                              isFocused ? "text-white" : "text-neutral-200"
                            }`}
                          >
                            {val !== undefined ? String(val) : "0"}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
