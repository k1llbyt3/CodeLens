"use client";

import React, { useState } from "react";
import { ArrayHistoryRecord, ArraySnapshot } from "@/lib/arrayHistory";
import { Eye, EyeOff, GitCompare, History, ArrowRight } from "lucide-react";

interface ArrayHistoryViewProps {
  arrayHistories: Record<string, ArrayHistoryRecord>;
  currentStep?: number;
}

export const ArrayHistoryView: React.FC<ArrayHistoryViewProps> = ({
  arrayHistories,
}) => {
  const [showIntermediate, setShowIntermediate] = useState<boolean>(true);

  const historyEntries = Object.values(arrayHistories);

  if (historyEntries.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-neutral-500 font-mono text-xs">
        <History className="w-8 h-8 mb-2 text-neutral-600" />
        <p>No active arrays detected in the current execution trace.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6 font-mono text-xs scrollbar-thin scrollbar-thumb-white/10 bg-[#0a0a0a]">
      {historyEntries.map((record) => {
        const { arrayName, initial, final, intermediateSnapshots, totalChanges, is2D } = record;

        return (
          <div
            key={arrayName}
            className="rounded-xl border border-white/[0.08] bg-[#0e0e0e] p-4 space-y-5 shadow-lg"
          >
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/[0.06]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-bold text-xs">
                  {arrayName}
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono text-[11px] font-semibold">
                  {record.dataType || (is2D ? "int[][]" : "int[]")}
                </span>
                <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-neutral-300 font-mono text-[11px]">
                  {record.sizeDescription || `${initial?.arrayState?.length ?? 0} elements`}
                </span>
                <span className="text-neutral-400 text-[11px]">
                  &bull; {totalChanges} modification{totalChanges === 1 ? "" : "s"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-neutral-500">
                  {totalChanges === 0 ? "Read-only" : `${totalChanges} change step${totalChanges === 1 ? "" : "s"}`}
                </span>
              </div>
            </div>

            {/* ═══ SECTION 1: INITIAL VS FINAL COMPARISON ═══ */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-neutral-300 font-semibold text-xs">
                <GitCompare className="w-4 h-4 text-cyan-400" />
                <span>Initial vs Final Array Comparison</span>
              </div>

              {(() => {
                const elemCount = initial?.arrayState?.length ?? 0;
                const isLarge = is2D ? elemCount > 3 || (initial?.arrayState?.[0]?.length ?? 0) > 4 : elemCount > 7;

                return (
                  <div className={`grid gap-4 ${isLarge ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}>
                    {/* Initial Array Card */}
                    <div className="rounded-lg border border-white/[0.06] bg-[#121212] p-3 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-neutral-400">
                        <span className="font-semibold text-neutral-200">Initial State</span>
                        <span className="text-neutral-500">
                          Step {initial ? initial.executionStep : "--"}
                        </span>
                      </div>

                      {initial && (
                        <div className="overflow-x-auto">
                          {is2D ? (
                            <Render2DTable matrix={initial.arrayState} />
                          ) : (
                            <Render1DTable array={initial.arrayState} />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Final Array Card */}
                    <div className="rounded-lg border border-white/[0.06] bg-[#121212] p-3 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-neutral-400">
                        <span className="font-semibold text-emerald-300">Final State</span>
                        <span className="text-neutral-500">
                          Step {final ? final.executionStep : "--"}
                        </span>
                      </div>

                      {final && (
                        <div className="overflow-x-auto">
                          {is2D ? (
                            <Render2DTable
                              matrix={final.arrayState}
                              compareMatrix={initial?.arrayState}
                            />
                          ) : (
                            <Render1DTable
                              array={final.arrayState}
                              compareArray={initial?.arrayState}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* ═══ SECTION 2: INTERMEDIATE ARRAY CHANGES ═══ */}
            <div className="space-y-3 pt-2 border-t border-white/[0.06]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-neutral-300 font-semibold text-xs">
                  <History className="w-4 h-4 text-amber-400" />
                  <span>Intermediate Array Changes</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-white/[0.06] text-neutral-400 text-[10px]">
                    {intermediateSnapshots.length} changes
                  </span>
                </div>

                <button
                  onClick={() => setShowIntermediate((prev) => !prev)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-neutral-300 text-[11px] transition-all cursor-pointer"
                >
                  {showIntermediate ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Hide Intermediate</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5 text-amber-400" />
                      <span>Show Intermediate</span>
                    </>
                  )}
                </button>
              </div>

              {showIntermediate && (
                <div className="space-y-2">
                  {intermediateSnapshots.length === 0 ? (
                    <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04] text-center text-neutral-500 text-xs">
                      No intermediate modifications occurred. The array values remained static throughout execution.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-white/[0.06] bg-[#121212]">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="border-b border-white/[0.06] bg-white/[0.02] text-neutral-400">
                            <th className="py-2 px-3 font-semibold w-24">Change</th>
                            <th className="py-2 px-3 font-semibold w-28 text-center">Execution Step</th>
                            <th className="py-2 px-3 font-semibold">Array State</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                          {/* Initial Row */}
                          {initial && (
                            <tr className="hover:bg-white/[0.02] transition-colors bg-white/[0.01]">
                              <td className="py-2.5 px-3 font-semibold">
                                <span className="px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-bold">
                                  Initial
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center text-neutral-400 font-bold">
                                Step {initial.executionStep}
                              </td>
                              <td className="py-2.5 px-3">
                                {is2D ? (
                                  <Render2DCompact matrix={initial.arrayState} />
                                ) : (
                                  <Render1DCompact array={initial.arrayState} />
                                )}
                              </td>
                            </tr>
                          )}

                          {/* Intermediate Change Rows */}
                          {intermediateSnapshots.map((snap, idx) => {
                            const prevArray =
                              idx === 0
                                ? initial?.arrayState
                                : intermediateSnapshots[idx - 1]?.arrayState;

                            return (
                              <tr
                                key={`snap-${snap.changeIndex}-${snap.executionStep}`}
                                className="hover:bg-white/[0.02] transition-colors"
                              >
                                <td className="py-2.5 px-3 font-semibold">
                                  <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold">
                                    {snap.label}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-center text-neutral-300 font-mono">
                                  Step {snap.executionStep}
                                </td>
                                <td className="py-2.5 px-3">
                                  {is2D ? (
                                    <Render2DCompact
                                      matrix={snap.arrayState}
                                      compareMatrix={prevArray}
                                    />
                                  ) : (
                                    <Render1DCompact
                                      array={snap.arrayState}
                                      compareArray={prevArray}
                                    />
                                  )}
                                </td>
                              </tr>
                            );
                          })}

                          {/* Final Row */}
                          {final && (
                            <tr className="hover:bg-white/[0.02] transition-colors bg-emerald-500/[0.03]">
                              <td className="py-2.5 px-3 font-semibold">
                                <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold">
                                  Final
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center text-neutral-400 font-bold">
                                Step {final.executionStep}
                              </td>
                              <td className="py-2.5 px-3">
                                {is2D ? (
                                  <Render2DCompact
                                    matrix={final.arrayState}
                                    compareMatrix={
                                      intermediateSnapshots.length > 0
                                        ? intermediateSnapshots[intermediateSnapshots.length - 1]?.arrayState
                                        : initial?.arrayState
                                    }
                                  />
                                ) : (
                                  <Render1DCompact
                                    array={final.arrayState}
                                    compareArray={
                                      intermediateSnapshots.length > 0
                                        ? intermediateSnapshots[intermediateSnapshots.length - 1]?.arrayState
                                        : initial?.arrayState
                                    }
                                  />
                                )}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ═══ 1D ARRAY CLEAN ROW VIEW (VALUE ABOVE, INDEX BELOW, NO TABLE BORDERS) ═══
const Render1DTable: React.FC<{ array: any[]; compareArray?: any[] }> = ({
  array,
  compareArray,
}) => {
  if (!Array.isArray(array) || array.length === 0) return null;

  return (
    <div className="overflow-x-auto py-1">
      <div className="flex items-center gap-1.5 min-w-max justify-center">
        {array.map((val, idx) => {
          const isChanged = compareArray && compareArray[idx] !== val;
          return (
            <div key={idx} className="flex flex-col items-center justify-center font-mono">
              <div
                className={`w-10 h-10 rounded-md flex items-center justify-center text-xs font-bold border transition-colors ${
                  isChanged
                    ? "bg-emerald-950/80 border-emerald-500/80 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                    : "bg-neutral-900 border-neutral-800 text-neutral-200"
                }`}
              >
                {String(val)}
              </div>
              <span className="text-[10px] text-neutral-500 mt-1">
                {idx}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ═══ 2D ARRAY CLEAN TABLE ═══
const Render2DTable: React.FC<{ matrix: any[][]; compareMatrix?: any[][] }> = ({
  matrix,
  compareMatrix,
}) => {
  if (!Array.isArray(matrix) || matrix.length === 0) return null;
  const cols = Array.isArray(matrix[0]) ? matrix[0].length : 0;

  return (
    <table className="w-full border-collapse border border-white/[0.1] text-center font-mono text-xs">
      <thead>
        <tr className="bg-white/[0.04] text-neutral-400 border-b border-white/[0.1]">
          <th className="py-1 px-2 border-r border-white/[0.1] text-[10px] text-neutral-500 uppercase font-bold w-14">
            Row \ Col
          </th>
          {Array.from({ length: cols }, (_, c) => (
            <th key={c} className="py-1 px-2.5 border-r last:border-r-0 border-white/[0.1] text-neutral-400 font-semibold">
              [{c}]
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {matrix.map((row, r) => (
          <tr key={r} className="border-b last:border-b-0 border-white/[0.06]">
            <td className="py-1.5 px-2 border-r border-white/[0.1] text-[10px] text-neutral-400 font-semibold bg-white/[0.02]">
              [{r}]
            </td>
            {Array.isArray(row) &&
              row.map((val, c) => {
                const isChanged = compareMatrix && compareMatrix[r]?.[c] !== val;
                return (
                  <td
                    key={c}
                    className={`py-1.5 px-2.5 border-r last:border-r-0 border-white/[0.06] font-bold ${
                      isChanged
                        ? "bg-emerald-500/20 text-emerald-300 font-extrabold shadow-[inset_0_0_8px_rgba(52,211,153,0.3)]"
                        : "text-neutral-200"
                    }`}
                  >
                    {String(val)}
                  </td>
                );
              })}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// ═══ COMPACT 1D FOR INTERMEDIATE LIST ═══
const Render1DCompact: React.FC<{ array: any[]; compareArray?: any[] }> = ({
  array,
  compareArray,
}) => {
  if (!Array.isArray(array)) return null;

  return (
    <div className="flex items-center gap-1 font-mono text-[11px] flex-wrap">
      <span className="text-neutral-500">[</span>
      {array.map((val, idx) => {
        const isChanged = compareArray && compareArray[idx] !== val;
        return (
          <React.Fragment key={idx}>
            <span
              className={`px-1.5 py-0.2 rounded ${
                isChanged
                  ? "bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-500/40"
                  : "text-neutral-200"
              }`}
            >
              {String(val)}
            </span>
            {idx < array.length - 1 && <span className="text-neutral-600">,</span>}
          </React.Fragment>
        );
      })}
      <span className="text-neutral-500">]</span>
    </div>
  );
};

// ═══ COMPACT 2D FOR INTERMEDIATE LIST ═══
const Render2DCompact: React.FC<{ matrix: any[][]; compareMatrix?: any[][] }> = ({
  matrix,
  compareMatrix,
}) => {
  if (!Array.isArray(matrix)) return null;

  return (
    <div className="flex items-center gap-2 font-mono text-[11px] flex-wrap">
      <span className="text-neutral-500">[</span>
      {matrix.map((row, r) => (
        <span key={r} className="inline-flex items-center">
          <Render1DCompact
            array={row}
            compareArray={compareMatrix ? compareMatrix[r] : undefined}
          />
          {r < matrix.length - 1 && <span className="text-neutral-600 mr-1.5">,</span>}
        </span>
      ))}
      <span className="text-neutral-500">]</span>
    </div>
  );
};

