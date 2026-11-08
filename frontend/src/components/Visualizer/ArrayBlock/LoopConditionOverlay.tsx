"use client";
import React from "react";
import { BlockData, LoopInfo } from "./types";

interface LoopConditionOverlayProps {
  loopInfo: LoopInfo;
  currentStep: number;
  blockData: BlockData[];
  count: number;
  itemWidth: number;
  gap: number;
  minHeight: number;
  totalWidth: number;
  sceneHeight: number;
  baselineY: number;
  rhsStartPos: { x: number; y: number } | null;
  currentFrame?: any;
}

export const LoopConditionOverlay: React.FC<LoopConditionOverlayProps> = ({
  loopInfo,
  currentStep,
  blockData,
  count,
  itemWidth,
  gap,
  totalWidth,
  sceneHeight,
  rhsStartPos,
  currentFrame,
}) => {
  const [isPointerReady, setIsPointerReady] = React.useState(false);

  React.useEffect(() => {
    setIsPointerReady(false);
    const timer = setTimeout(() => {
      setIsPointerReady(true);
    }, 380);
    return () => clearTimeout(timer);
  }, [currentStep, loopInfo.isLoopLine]);

  if (!loopInfo.isLoopLine || !isPointerReady) return null;

  const isPass = loopInfo.isPass;
  const evalColor = isPass ? "#22c55e" : "#ef4444";
  const evalGlow = isPass ? "rgba(34, 197, 94, 0.95)" : "rgba(239, 68, 68, 0.95)";

  const paddingX = Math.max(0, (totalWidth - (count * itemWidth + Math.max(0, count - 1) * gap)) / 2);
  const baseY = sceneHeight - 43;

  // 1. Source position for Left operand (Array index at base)
  const leftIdx = loopInfo.varVal;
  const isLeftOOB = leftIdx < 0 || leftIdx >= count;
  const ptrBlockLeft = !isLeftOOB ? (blockData[leftIdx] || blockData[0]) : null;
  const startX_left = ptrBlockLeft?.centerX ?? (paddingX + leftIdx * (itemWidth + gap) + itemWidth / 2);

  const isTwoPointers =
    loopInfo.rhsVarName === "right" ||
    loopInfo.rhsExpr === "right" ||
    loopInfo.isRhsArrayIndex ||
    (typeof loopInfo.rhsLimit === "number" &&
      !loopInfo.rhsExpr?.includes("-") &&
      !loopInfo.rhsExpr?.includes("+") &&
      loopInfo.rhsVarName !== "n");

  let startX_right: number;
  let rightIdx: number = 0;
  let isRightOOB = false;

  if (isTwoPointers) {
    const rawRightIdx = typeof loopInfo.rhsLimit === "number" ? loopInfo.rhsLimit : Number(loopInfo.rhsLimit);
    rightIdx = isNaN(rawRightIdx) ? count - 1 : rawRightIdx;
    isRightOOB = rightIdx < 0 || rightIdx >= count;
    const ptrBlockRight = !isRightOOB ? (blockData[rightIdx] || blockData[count - 1]) : null;
    startX_right = ptrBlockRight?.centerX ?? (paddingX + rightIdx * (itemWidth + gap) + itemWidth / 2);
  } else {
    startX_right = rhsStartPos?.x ?? Math.min(totalWidth - 40, totalWidth * 0.72);
  }

  // 2. Source position for n variable (in MemoryTable)
  const originX_n = rhsStartPos?.x ?? Math.min(totalWidth - 40, totalWidth * 0.72);
  const originY_n = rhsStartPos?.y ?? -88;

  // 3. Source position for i variable (Array index at base)
  const locals = currentFrame?.locals || {};
  const iIdx = typeof locals.i === "number" ? locals.i : (typeof locals.j === "number" ? locals.j : 0);
  const isIOOB = iIdx < 0 || iIdx >= count;
  const ptrBlockI = !isIOOB ? (blockData[iIdx] || blockData[0]) : null;
  const startX_i = ptrBlockI?.centerX ?? (paddingX + iIdx * (itemWidth + gap) + itemWidth / 2);

  // 4. Position condition checking equation dynamically on whichever side of the canvas has open space away from pointers
  const ptrXs = [startX_left, startX_right, startX_i].filter((x) => typeof x === "number" && !isNaN(x));
  let compCenterX = totalWidth / 2;
  if (ptrXs.length > 0) {
    const minX = Math.min(...ptrXs);
    const maxX = Math.max(...ptrXs);

    const rightSpaceAvailable = totalWidth - maxX;
    const leftSpaceAvailable = minX;

    if (rightSpaceAvailable >= 180) {
      compCenterX = Math.min(totalWidth - 100, Math.max(maxX + 90, totalWidth * 0.75));
    } else if (leftSpaceAvailable >= 180) {
      compCenterX = Math.max(90, Math.min(minX - 90, totalWidth * 0.25));
    }
  }

  const conditionY = 26;

  const hasSubstExpr = Boolean(loopInfo.rhsSubstituted && loopInfo.rhsSubstituted !== String(loopInfo.rhsLimit));

  const match3 = hasSubstExpr ? loopInfo.rhsSubstituted?.match(/^(\d+)\s*([+\-*/])\s*(\d+)\s*([+\-*/])\s*(\d+)$/) : null;
  const match2 = hasSubstExpr && !match3 ? loopInfo.rhsSubstituted?.match(/^(\d+)\s*([+\-*/])\s*(\d+)$/) : null;

  // Destination coordinates for tokens with generous non-overlapping spacing
  let destX_left = compCenterX - 56;
  let destX_op = compCenterX;
  let destX_right = compCenterX + 56;

  let slotX_n = compCenterX;
  let slotX_minus1 = compCenterX + 32;
  let slotX_i = compCenterX + 64;
  let slotX_minus2 = compCenterX + 96;
  let slotX_const = compCenterX + 128;
  let slotX_resolved = compCenterX + 32;

  if (hasSubstExpr) {
    if (match3) {
      destX_left = compCenterX - 110;
      destX_op = compCenterX - 68;
      slotX_n = compCenterX - 26;
      slotX_minus1 = compCenterX + 6;
      slotX_i = compCenterX + 38;
      slotX_minus2 = compCenterX + 70;
      slotX_const = compCenterX + 102;
      slotX_resolved = compCenterX + 38;
    } else if (match2) {
      destX_left = compCenterX - 85;
      destX_op = compCenterX - 45;
      slotX_n = compCenterX - 5;
      slotX_minus1 = compCenterX + 30;
      slotX_const = compCenterX + 65;
      slotX_resolved = compCenterX + 30;
    } else {
      destX_left = compCenterX - 65;
      destX_op = compCenterX - 20;
      destX_right = compCenterX + 45;
      slotX_resolved = compCenterX + 45;
    }
  }

  return (
    <div
      key={`loop-condition-eval-${currentStep}`}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 48,
        overflow: "visible",
      }}
    >
      <style>{`
        /* Left index token: flies from array base index to equation, holds for > 2s, then flies back to base index */
        @keyframes flyLeftExact_${currentStep} {
          0% {
            left: ${startX_left}px;
            top: ${baseY}px;
            transform: translate(-50%, -50%) scale(0.9);
            opacity: 1;
            filter: drop-shadow(0 0 16px rgba(56, 189, 248, 1));
          }
          18%, 90% {
            left: ${destX_left}px;
            top: ${conditionY}px;
            transform: translate(-50%, -50%) scale(1.0);
            opacity: 1;
            filter: drop-shadow(0 0 14px rgba(56, 189, 248, 0.95));
          }
          97% {
            left: ${startX_left}px;
            top: ${baseY}px;
            transform: translate(-50%, -50%) scale(0.95);
            opacity: 1;
            filter: drop-shadow(0 0 16px rgba(56, 189, 248, 1));
          }
          100% {
            left: ${startX_left}px;
            top: ${baseY}px;
            transform: translate(-50%, -50%) scale(0.9);
            opacity: 0;
          }
        }

        /* Operator scales in cleanly between operands */
        @keyframes opFadeExact_${currentStep} {
          0%, 10% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
          18%, 90% { opacity: 1; transform: translate(-50%, -50%) scale(1.0); filter: drop-shadow(0 0 14px rgba(255, 255, 255, 0.9)); }
          98%, 100% { opacity: 0; transform: translate(-50%, -50%) scale(0.85); }
        }

        /* Right pointer token: flies from array base index to equation, holds for > 2s, then flies back to base index */
        @keyframes flyRightPtrExact_${currentStep} {
          0% {
            left: ${startX_right}px;
            top: ${baseY}px;
            transform: translate(-50%, -50%) scale(0.9);
            opacity: 1;
            filter: drop-shadow(0 0 16px rgba(245, 158, 11, 1));
          }
          18%, 90% {
            left: ${destX_right}px;
            top: ${conditionY}px;
            transform: translate(-50%, -50%) scale(1.0);
            opacity: 1;
            filter: drop-shadow(0 0 14px rgba(245, 158, 11, 0.95));
          }
          97% {
            left: ${startX_right}px;
            top: ${baseY}px;
            transform: translate(-50%, -50%) scale(0.95);
            opacity: 1;
            filter: drop-shadow(0 0 16px rgba(245, 158, 11, 1));
          }
          100% {
            left: ${startX_right}px;
            top: ${baseY}px;
            transform: translate(-50%, -50%) scale(0.9);
            opacity: 0;
          }
        }

        /* Scalar variable n: flies down from MemoryTable, holds for > 2s, then flies back up to MemoryTable */
        @keyframes flyNExact_${currentStep} {
          0% {
            left: ${originX_n}px;
            top: ${originY_n}px;
            transform: translate(-50%, -50%) scale(0.9);
            opacity: 1;
            filter: drop-shadow(0 0 16px rgba(245, 158, 11, 1));
          }
          18%, 90% {
            left: ${destX_right}px;
            top: ${conditionY}px;
            transform: translate(-50%, -50%) scale(1.0);
            opacity: 1;
            filter: drop-shadow(0 0 14px rgba(245, 158, 11, 0.95));
          }
          97% {
            left: ${originX_n}px;
            top: ${originY_n}px;
            transform: translate(-50%, -50%) scale(0.95);
            opacity: 1;
            filter: drop-shadow(0 0 16px rgba(245, 158, 11, 1));
          }
          100% {
            left: ${originX_n}px;
            top: ${originY_n}px;
            transform: translate(-50%, -50%) scale(0.9);
            opacity: 0;
          }
        }

        /* Multi-token: n token flies down from MemoryTable into expression slot */
        @keyframes exprNFlyExact_${currentStep} {
          0% {
            left: ${originX_n}px;
            top: ${originY_n}px;
            transform: translate(-50%, -50%) scale(0.9);
            opacity: 1;
            filter: drop-shadow(0 0 16px rgba(245, 158, 11, 1));
          }
          18%, 45% {
            left: ${slotX_n}px;
            top: ${conditionY}px;
            transform: translate(-50%, -50%) scale(1.0);
            opacity: 1;
          }
          55%, 100% {
            left: ${slotX_n}px;
            top: ${conditionY}px;
            transform: translate(-50%, -50%) scale(0.7);
            opacity: 0;
          }
        }

        /* Multi-token: i token flies up from array base index into expression slot */
        @keyframes exprIFlyExact_${currentStep} {
          0% {
            left: ${startX_i}px;
            top: ${baseY}px;
            transform: translate(-50%, -50%) scale(0.9);
            opacity: 1;
            filter: drop-shadow(0 0 16px rgba(56, 189, 248, 1));
          }
          18%, 45% {
            left: ${slotX_i}px;
            top: ${conditionY}px;
            transform: translate(-50%, -50%) scale(1.0);
            opacity: 1;
          }
          55%, 100% {
            left: ${slotX_i}px;
            top: ${conditionY}px;
            transform: translate(-50%, -50%) scale(0.7);
            opacity: 0;
          }
        }

        /* Multi-token operators and constants */
        @keyframes exprPartFade_${currentStep} {
          0%, 12% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
          18%, 45% { opacity: 1; transform: translate(-50%, -50%) scale(1.0); }
          55%, 100% { opacity: 0; transform: translate(-50%, -50%) scale(0.7); }
        }

        /* Final resolved number appears strictly once expression resolves and holds */
        @keyframes resolvedLimitFade_${currentStep} {
          0%, 48% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.5);
          }
          55%, 90% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.05);
            filter: drop-shadow(0 0 16px rgba(245, 158, 11, 1));
          }
          97%, 100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.85);
          }
        }

        /* TRUE / FALSE appears strictly AFTER condition has evaluated and stays on screen */
        @keyframes boolResultAnim_${currentStep} {
          0%, ${hasSubstExpr ? "54%" : "35%"} {
            opacity: 0;
            transform: translate(-50%, 0) scale(0.4);
          }
          ${hasSubstExpr ? "60%" : "42%"} {
            opacity: 1;
            transform: translate(-50%, 0) scale(1.15);
            filter: drop-shadow(0 0 20px ${evalGlow});
          }
          ${hasSubstExpr ? "66%" : "48%"}, 90% {
            opacity: 1;
            transform: translate(-50%, 0) scale(1.0);
            filter: drop-shadow(0 0 16px ${evalGlow});
          }
          98%, 100% {
            opacity: 0;
            transform: translate(-50%, 0) scale(0.85);
          }
        }
      `}</style>

      {/* ═══ 1. LEFT OPERAND: Index value flying from array base index ═══ */}
      <div
        style={{
          position: "absolute",
          fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
          fontSize: "22px",
          fontWeight: 900,
          color: "#38bdf8",
          textShadow: "0 0 14px rgba(56, 189, 248, 0.95)",
          animation: `flyLeftExact_${currentStep} 3.2s cubic-bezier(0.25, 1, 0.5, 1) forwards`,
        }}
      >
        {leftIdx}
      </div>

      {/* ═══ 2. OPERATOR: Centered in header zone ═══ */}
      <div
        style={{
          position: "absolute",
          left: `${destX_op}px`,
          top: `${conditionY}px`,
          fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
          fontSize: "22px",
          fontWeight: 900,
          color: "#ffffff",
          textShadow: "0 0 14px rgba(255, 255, 255, 1), 0 0 24px rgba(250, 204, 21, 0.85)",
          animation: `opFadeExact_${currentStep} 3.2s cubic-bezier(0.25, 1, 0.5, 1) forwards`,
        }}
      >
        {loopInfo.op}
      </div>

      {/* ═══ 3. RIGHT OPERAND: Exact flight based on type ═══ */}
      {isTwoPointers ? (
        <div
          style={{
            position: "absolute",
            fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
            fontSize: "22px",
            fontWeight: 900,
            color: "#f59e0b",
            textShadow: "0 0 14px rgba(245, 158, 11, 0.95)",
            animation: `flyRightPtrExact_${currentStep} 3.2s cubic-bezier(0.25, 1, 0.5, 1) forwards`,
          }}
        >
          {rightIdx}
        </div>
      ) : hasSubstExpr ? (
        <React.Fragment>
          {match3 ? (
            <React.Fragment>
              {/* n value flying down from MemoryTable */}
              <div
                style={{
                  position: "absolute",
                  zIndex: 99,
                  fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
                  fontSize: "20px",
                  fontWeight: 900,
                  color: "#f59e0b",
                  textShadow: "0 0 14px rgba(245, 158, 11, 1)",
                  animation: `exprNFlyExact_${currentStep} 3.2s cubic-bezier(0.25, 1, 0.5, 1) forwards`,
                }}
              >
                {match3[1]}
              </div>

              {/* - operator */}
              <div
                style={{
                  position: "absolute",
                  left: `${slotX_minus1}px`,
                  top: `${conditionY}px`,
                  fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
                  fontSize: "20px",
                  fontWeight: 900,
                  color: "#f59e0b",
                  textShadow: "0 0 14px rgba(245, 158, 11, 1)",
                  animation: `exprPartFade_${currentStep} 3.2s cubic-bezier(0.25, 1, 0.5, 1) forwards`,
                }}
              >
                {match3[2]}
              </div>

              {/* i value flying up from array index */}
              <div
                style={{
                  position: "absolute",
                  fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
                  fontSize: "20px",
                  fontWeight: 900,
                  color: "#38bdf8",
                  textShadow: "0 0 14px rgba(56, 189, 248, 1)",
                  animation: `exprIFlyExact_${currentStep} 3.2s cubic-bezier(0.25, 1, 0.5, 1) forwards`,
                }}
              >
                {match3[3]}
              </div>

              {/* - operator */}
              <div
                style={{
                  position: "absolute",
                  left: `${slotX_minus2}px`,
                  top: `${conditionY}px`,
                  fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
                  fontSize: "20px",
                  fontWeight: 900,
                  color: "#f59e0b",
                  textShadow: "0 0 14px rgba(245, 158, 11, 1)",
                  animation: `exprPartFade_${currentStep} 3.2s cubic-bezier(0.25, 1, 0.5, 1) forwards`,
                }}
              >
                {match3[4]}
              </div>

              {/* 1 constant */}
              <div
                style={{
                  position: "absolute",
                  left: `${slotX_const}px`,
                  top: `${conditionY}px`,
                  fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
                  fontSize: "20px",
                  fontWeight: 900,
                  color: "#f59e0b",
                  textShadow: "0 0 14px rgba(245, 158, 11, 1)",
                  animation: `exprPartFade_${currentStep} 3.2s cubic-bezier(0.25, 1, 0.5, 1) forwards`,
                }}
              >
                {match3[5]}
              </div>
            </React.Fragment>
          ) : match2 ? (
            <React.Fragment>
              {/* n value flying down from MemoryTable */}
              <div
                style={{
                  position: "absolute",
                  zIndex: 99,
                  fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
                  fontSize: "20px",
                  fontWeight: 900,
                  color: "#f59e0b",
                  textShadow: "0 0 14px rgba(245, 158, 11, 1)",
                  animation: `exprNFlyExact_${currentStep} 3.2s cubic-bezier(0.25, 1, 0.5, 1) forwards`,
                }}
              >
                {match2[1]}
              </div>

              {/* - operator */}
              <div
                style={{
                  position: "absolute",
                  zIndex: 99,
                  left: `${(slotX_n + slotX_const) / 2}px`,
                  top: `${conditionY}px`,
                  fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
                  fontSize: "20px",
                  fontWeight: 900,
                  color: "#f59e0b",
                  textShadow: "0 0 14px rgba(245, 158, 11, 1)",
                  animation: `exprPartFade_${currentStep} 3.2s cubic-bezier(0.25, 1, 0.5, 1) forwards`,
                }}
              >
                {match2[2]}
              </div>

              {/* constant */}
              <div
                style={{
                  position: "absolute",
                  zIndex: 99,
                  left: `${slotX_const}px`,
                  top: `${conditionY}px`,
                  fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
                  fontSize: "20px",
                  fontWeight: 900,
                  color: "#f59e0b",
                  textShadow: "0 0 14px rgba(245, 158, 11, 1)",
                  animation: `exprPartFade_${currentStep} 3.2s cubic-bezier(0.25, 1, 0.5, 1) forwards`,
                }}
              >
                {match2[3]}
              </div>
            </React.Fragment>
          ) : null}

          {/* Resolved limit value taking over expression */}
          <div
            style={{
              position: "absolute",
              zIndex: 99,
              left: `${slotX_resolved}px`,
              top: `${conditionY}px`,
              fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
              fontSize: "22px",
              fontWeight: 900,
              color: "#f59e0b",
              textShadow: "0 0 18px rgba(245, 158, 11, 1)",
              animation: `resolvedLimitFade_${currentStep} 3.2s cubic-bezier(0.25, 1, 0.5, 1) forwards`,
            }}
          >
            {loopInfo.rhsLimit}
          </div>
        </React.Fragment>
      ) : (
        <div
          style={{
            position: "absolute",
            zIndex: 99,
            fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
            fontSize: "22px",
            fontWeight: 900,
            color: "#f59e0b",
            textShadow: "0 0 16px rgba(245, 158, 11, 1)",
            animation: `flyNExact_${currentStep} 3.2s cubic-bezier(0.25, 1, 0.5, 1) forwards`,
          }}
        >
          {loopInfo.rhsLimit}
        </div>
      )}

      {/* ═══ 4. TRUE / FALSE RESULT LABEL: Pure glowing text without pill containers ═══ */}
      <div
        style={{
          position: "absolute",
          left: `${compCenterX}px`,
          top: `${conditionY + 30}px`,
          transform: "translateX(-50%)",
          fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
          fontSize: "18px",
          fontWeight: 900,
          color: evalColor,
          textShadow: `0 0 16px ${evalGlow}, 0 0 28px ${evalGlow}`,
          letterSpacing: "0.18em",
          animation: `boolResultAnim_${currentStep} 3.2s cubic-bezier(0.25, 1, 0.5, 1) forwards`,
        }}
      >
        {isPass ? "TRUE" : "FALSE"}
      </div>
    </div>
  );
};
