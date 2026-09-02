"use client";
import React from "react";

export interface ArrayBaseProps {
  count?: number;          // Number of elements (e.g. 1, 2, 4, 10...)
  itemWidth?: number;      // Width of each future block (default 56px)
  gap?: number;            // Gap between block centers (default 28px)
  paddingX?: number;       // Side deck extension beyond outer blocks (default 36px)
  className?: string;
}

/**
 * Precision Industrial Array Base Platform
 * 
 * - Supports any number of array elements dynamically (count = 1, 2, 4, 8, 10...)
 * - Compact clean vertical ends (no sci-fi triangular wedges)
 * - Layered metallic gunmetal material with brushed top surface, specular highlights, and contact shadow
 * - Evenly spaced mounting sockets centered on each column's X coordinate
 * - Reserved breathing space below base for future index labels: [0], [1]...
 */
export const ArrayBase: React.FC<ArrayBaseProps> = ({
  count = 4,
  itemWidth = 56,
  gap = 28,
  paddingX = 36,
  className = "",
}) => {
  const safeCount = Math.max(1, count);
  // Total responsive platform width = 2 * paddingX + count * itemWidth + (count - 1) * gap
  const contentWidth = safeCount * itemWidth + (safeCount - 1) * gap;
  const totalWidth = 2 * paddingX + contentWidth;

  const baseHeight = 36; // Base platform height
  const labelReservedHeight = 26; // Reserved empty breathing space below for future index labels

  // Compute exact center X for each socket position
  const socketCenters = Array.from({ length: safeCount }, (_, i) => {
    return paddingX + i * (itemWidth + gap) + itemWidth / 2;
  });

  const socketWidth = 58;
  const socketHeight = 18;

  return (
    <div
      className={`inline-flex flex-col items-center select-none ${className}`}
      style={{
        position: "relative",
        width: `${totalWidth}px`,
        // Includes base platform height + reserved gap for index labels
        height: `${baseHeight + labelReservedHeight}px`,
      }}
    >
      <svg
        width={totalWidth}
        height={baseHeight}
        viewBox={`0 0 ${totalWidth} ${baseHeight}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: "block", overflow: "visible" }}
      >
        <defs>
          {/* Deck Top Brushed Gunmetal Gradient */}
          <linearGradient id="deckTopGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#525C6D" />
            <stop offset="30%" stopColor="#3A4250" />
            <stop offset="70%" stopColor="#252B34" />
            <stop offset="100%" stopColor="#1B2027" />
          </linearGradient>

          {/* Deck Front Vertical Face Gradient */}
          <linearGradient id="deckFrontGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#222832" />
            <stop offset="25%" stopColor="#171C23" />
            <stop offset="70%" stopColor="#11141A" />
            <stop offset="100%" stopColor="#080A0D" />
          </linearGradient>

          {/* Left Vertical Endcap (Subtle 3D edge) */}
          <linearGradient id="endcapLeft" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#151A22" />
            <stop offset="100%" stopColor="#2E3744" />
          </linearGradient>

          {/* Right Vertical Endcap (Subtle 3D edge) */}
          <linearGradient id="endcapRight" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#2E3744" />
            <stop offset="100%" stopColor="#151A22" />
          </linearGradient>

          {/* Socket Outer Chamfer Collar */}
          <linearGradient id="socketCollarGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6C7788" />
            <stop offset="25%" stopColor="#4A5362" />
            <stop offset="75%" stopColor="#282F3A" />
            <stop offset="100%" stopColor="#181D24" />
          </linearGradient>

          {/* Socket Top Rim Specular Reflection */}
          <linearGradient id="socketRimGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#4E5766" />
            <stop offset="50%" stopColor="#8E9BB0" />
            <stop offset="100%" stopColor="#434B58" />
          </linearGradient>

          {/* Socket Inner Recessed Well / Mounting Slot */}
          <linearGradient id="socketWellGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#050709" />
            <stop offset="45%" stopColor="#0A0D12" />
            <stop offset="100%" stopColor="#141820" />
          </linearGradient>

          {/* Lower Lip Step */}
          <linearGradient id="deckLipGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#181D24" />
            <stop offset="100%" stopColor="#050608" />
          </linearGradient>

          {/* Contact Drop Shadow */}
          <filter id="deckShadow" x="-3%" y="0%" width="106%" height="200%">
            <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#000000" floodOpacity="0.85" />
          </filter>
        </defs>

        {/* ═══ 1. GROUND DROP SHADOW ═══ */}
        <rect
          x="3"
          y="4"
          width={totalWidth - 6}
          height={baseHeight - 4}
          rx="3"
          fill="#050709"
          filter="url(#deckShadow)"
        />

        {/* ═══ 2. COMPACT CLEAN VERTICAL ENDS & CONTINUOUS PLATFORM DECK ═══ */}
        {/* Left Endcap (3px bevel step) */}
        <polygon
          points={`2,7 5,4 5,${baseHeight - 4} 2,${baseHeight - 7}`}
          fill="url(#endcapLeft)"
        />

        {/* Right Endcap (3px bevel step) */}
        <polygon
          points={`${totalWidth - 2},7 ${totalWidth - 5},4 ${totalWidth - 5},${baseHeight - 4} ${totalWidth - 2},${baseHeight - 7}`}
          fill="url(#endcapRight)"
        />

        {/* Upper Deck Surface: y=4 to y=12 */}
        <polygon
          points={`5,4 ${totalWidth - 5},4 ${totalWidth - 5},12 5,12`}
          fill="url(#deckTopGrad)"
        />

        {/* Rear Upper Deck Specular Highlight Line */}
        <line
          x1="5"
          y1="4.5"
          x2={totalWidth - 5}
          y2="4.5"
          stroke="#8A96A8"
          strokeWidth="0.9"
        />

        {/* Front Face Vertical Graphite Panel: y=12 to y=baseHeight-4 */}
        <rect
          x="5"
          y="12"
          width={totalWidth - 10}
          height={baseHeight - 16}
          fill="url(#deckFrontGrad)"
        />

        {/* Front Face Upper Highlight Seam */}
        <line
          x1="5"
          y1="12.5"
          x2={totalWidth - 5}
          y2="12.5"
          stroke="#687282"
          strokeWidth="0.9"
        />

        {/* Lower Stepped Lip */}
        <rect
          x="4"
          y={baseHeight - 4}
          width={totalWidth - 8}
          height="4"
          fill="url(#deckLipGrad)"
        />
        <line
          x1="4"
          y1={baseHeight - 4.5}
          x2={totalWidth - 4}
          y2={baseHeight - 4.5}
          stroke="#38404C"
          strokeWidth="0.75"
        />
        <line
          x1="2"
          y1={baseHeight - 0.5}
          x2={totalWidth - 2}
          y2={baseHeight - 0.5}
          stroke="#000000"
          strokeWidth="1.5"
        />

        {/* ═══ 3. DYNAMICALLY GENERATED RECESSED MOUNTING SOCKETS ═══ */}
        {socketCenters.map((centerX, i) => {
          const sockLeft = centerX - socketWidth / 2;
          const sockTop = 5;

          return (
            <g key={`mount-pos-${i}`}>
              {/* Drop shadow onto deck */}
              <rect
                x={sockLeft - 1}
                y={sockTop + 1}
                width={socketWidth + 2}
                height={socketHeight}
                rx="4"
                fill="rgba(0,0,0,0.6)"
              />

              {/* Chamfered Metallic Collar Body */}
              <rect
                x={sockLeft}
                y={sockTop}
                width={socketWidth}
                height={socketHeight}
                rx="3.5"
                fill="url(#socketCollarGrad)"
                stroke="#12151B"
                strokeWidth="0.8"
              />

              {/* Chamfered Top Bevel Rim Highlight */}
              <rect
                x={sockLeft + 1}
                y={sockTop + 1}
                width={socketWidth - 2}
                height="3"
                rx="2.5"
                fill="url(#socketRimGrad)"
              />

              {/* Recessed Dark Mounting Cavity / Slot */}
              <rect
                x={sockLeft + 5}
                y={sockTop + 3}
                width={socketWidth - 10}
                height="7"
                rx="2"
                fill="url(#socketWellGrad)"
                stroke="#040608"
                strokeWidth="0.8"
              />

              {/* Well Overhang Shadow */}
              <line
                x1={sockLeft + 6}
                y1={sockTop + 3.5}
                x2={sockLeft + socketWidth - 6}
                y2={sockTop + 3.5}
                stroke="#000000"
                strokeWidth="1"
              />

              {/* Front Accent Bracket Notch */}
              <rect
                x={centerX - 9}
                y={sockTop + socketHeight - 3.5}
                width="18"
                height="2.5"
                rx="0.75"
                fill="#0D1014"
                stroke="#323843"
                strokeWidth="0.6"
              />

              {/* Collar Lower Edge Highlight */}
              <line
                x1={sockLeft + 3}
                y1={sockTop + socketHeight - 0.5}
                x2={sockLeft + socketWidth - 3}
                y2={sockTop + socketHeight - 0.5}
                stroke="rgba(255, 255, 255, 0.12)"
                strokeWidth="0.7"
              />
            </g>
          );
        })}
      </svg>

      {/* ═══ 4. ARRAY INDEX LABELS: [0], [1], [2]... ALIGNED TO EACH SOCKET ═══ */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: `${labelReservedHeight}px`,
          marginTop: "6px",
        }}
      >
        {socketCenters.map((centerX, i) => {
          // Color coding accent from reference: [0] cyan, [1] amber/orange, [2] green, [3] cyan...
          const labelColors = [
            { text: "#38bdf8", glow: "rgba(56, 189, 248, 0.45)" }, // cyan [0]
            { text: "#fbbf24", glow: "rgba(251, 191, 36, 0.45)" }, // amber [1]
            { text: "#34d399", glow: "rgba(52, 211, 153, 0.45)" }, // green [2]
            { text: "#38bdf8", glow: "rgba(56, 189, 248, 0.45)" }, // cyan [3]
          ];
          const color = labelColors[i % labelColors.length];

          return (
            <div
              key={`label-${i}`}
              style={{
                position: "absolute",
                left: `${centerX}px`,
                transform: "translateX(-50%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
                  fontSize: "12px",
                  fontWeight: 600,
                  letterSpacing: "0.03em",
                  color: color.text,
                  textShadow: `0 0 8px ${color.glow}`,
                  userSelect: "none",
                }}
              >
                [{i}]
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Aliases for compatibility
export const GlassMonolith = ArrayBase as any;
export const ArrayBlock = ArrayBase as any;



