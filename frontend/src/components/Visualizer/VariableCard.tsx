"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface VariableCardProps {
  name: string;
  value: any;
  prevValue?: any;
  isMutated?: boolean;
  isActiveLine?: boolean;
}

export const VariableCard: React.FC<VariableCardProps> = ({
  name,
  value,
  prevValue,
  isMutated = false,
  isActiveLine = true
}) => {
  const [mathDelta, setMathDelta] = useState<{ text: string; color: string; id: number } | null>(null);
  const [displayVal, setDisplayVal] = useState(value);

  useEffect(() => {
    if (name === "n" && typeof value === "number" && value > 0) {
      let current = 0;
      setDisplayVal(0);
      const stepTime = 160;
      const interval = setInterval(() => {
        current += 1;
        setDisplayVal(current);
        if (current >= value) {
          clearInterval(interval);
        }
      }, stepTime);
      return () => clearInterval(interval);
    } else {
      setDisplayVal(value);
    }
  }, [name, value]);

  const getType = (val: any): string => {
    if (typeof val === "number") return Number.isInteger(val) ? "int" : "double";
    if (typeof val === "boolean") return "boolean";
    if (typeof val === "string") return "String";
    return "var";
  };

  const getCardStyles = () => {
    if (["i", "j", "k", "left", "right", "mid", "low", "high", "ptr"].includes(name)) {
      return {
        border: "border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.15)]",
        badge: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
        value: "text-cyan-200"
      };
    }

    if (name === "n") {
      return {
        border: "border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.15)]",
        badge: "bg-amber-500/10 text-amber-300 border-amber-500/30",
        value: "text-amber-200"
      };
    }

    if (typeof value === "boolean" || name.toLowerCase().includes("found")) {
      return {
        border: "border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.2)]",
        badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
        value: "text-emerald-200"
      };
    }

    if (name === "temp" || name === "tmp") {
      return {
        border: "border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.2)]",
        badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
        value: "text-amber-200"
      };
    }

    if (value === -1) {
      return {
        border: "border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.2)]",
        badge: "bg-rose-500/20 text-rose-300 border-rose-500/30",
        value: "text-rose-200"
      };
    }

    return {
      border: "border-slate-600/40 shadow-sm",
      badge: "bg-slate-700/30 text-slate-300 border-slate-600/40",
      value: "text-slate-100"
    };
  };

  const themeStyle = getCardStyles();

  return (
    <motion.div
      layout
      animate={{ opacity: isActiveLine ? 1 : 0.4, scale: isActiveLine ? 1.02 : 1 }}
      transition={{ duration: 0.3 }}
      className={`relative flex items-center justify-between p-4 rounded-xl border bg-black/40 backdrop-blur-xl transition-all duration-300 ${themeStyle.border}`}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold text-neutral-100">
            {name}
          </span>
          <span className={`px-2 py-0.5 text-[9px] font-mono rounded-md border ${themeStyle.badge}`}>
            {getType(value)}
          </span>
          {name === "n" && (
            <span className="px-1.5 py-0.2 text-[9px] font-mono rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold">
              arr.length
            </span>
          )}
        </div>
      </div>

      <div className="relative overflow-hidden h-8 min-w-[42px] flex items-center justify-end">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={String(displayVal)}
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -15, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`font-mono text-sm font-bold px-3 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] ${themeStyle.value}`}
          >
            {String(displayVal)}
          </motion.span>
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
