"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";

interface PointerParticleBurstProps {
  x: number;
  y: number;
  color: string;
  label: string;
  delayMs?: number;
  onComplete?: () => void;
}

interface Particle {
  id: number;
  dx: number;
  dy: number;
  size: number;
  duration: number;
  delay: number;
}

export const PointerParticleBurst: React.FC<PointerParticleBurstProps> = ({
  x,
  y,
  color,
  label,
  delayMs = 2100,
  onComplete,
}) => {
  const [hasStarted, setHasStarted] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setHasStarted(true);
    }, delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  const particles: Particle[] = useMemo(() => {
    const count = 20;
    const list: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * 2 * Math.PI + (Math.random() - 0.5) * 0.4;
      const distance = 25 + Math.random() * 45;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;
      const size = 3 + Math.random() * 4;
      const duration = 0.55 + Math.random() * 0.25;
      const delay = Math.random() * 0.05;
      list.push({ id: i, dx, dy, size, duration, delay });
    }
    return list;
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        left: `${x}px`,
        top: `${y}px`,
        transform: "translate(-50%, -100%)",
        pointerEvents: "none",
        zIndex: 60,
      }}
    >
      {!hasStarted ? (
        /* While waiting for existing step animations to settle, keep pointer visible */
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <span
            style={{
              fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
              fontSize: "15px",
              fontWeight: 800,
              color,
              letterSpacing: "0.05em",
              lineHeight: 1,
            }}
          >
            {label}
          </span>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke={color}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ marginTop: "2px" }}
          >
            <path d="M12 4v15M19 12l-7 7-7-7" />
          </svg>
        </div>
      ) : (
        <>
          {/* Shattering Label */}
          <motion.div
            initial={{ opacity: 1, scale: 1 }}
            animate={{
              opacity: 0,
              scale: 1.5,
              filter: "blur(8px)",
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{
              fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
              fontSize: "15px",
              fontWeight: 800,
              color,
              textShadow: `0 0 12px ${color}, 0 0 24px ${color}`,
              textAlign: "center",
            }}
          >
            {label}
          </motion.div>

          {/* Outward Spreading Micro-Particles */}
          {particles.map((p) => (
            <motion.span
              key={p.id}
              initial={{
                opacity: 1,
                x: 0,
                y: 0,
                scale: 1,
              }}
              animate={{
                opacity: 0,
                x: p.dx,
                y: p.dy,
                scale: 0.1,
              }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                ease: "easeOut",
              }}
              onAnimationComplete={p.id === 0 ? onComplete : undefined}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: `${p.size}px`,
                height: `${p.size}px`,
                borderRadius: "50%",
                backgroundColor: color,
                boxShadow: `0 0 8px ${color}, 0 0 16px ${color}`,
                pointerEvents: "none",
              }}
            />
          ))}

          {/* Disappearing Shatter Wave Ring */}
          <motion.div
            initial={{ opacity: 0.9, scale: 0.3 }}
            animate={{ opacity: 0, scale: 2.2 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: "28px",
              height: "28px",
              marginLeft: "-14px",
              marginTop: "-14px",
              borderRadius: "50%",
              border: `2px solid ${color}`,
              boxShadow: `0 0 16px ${color}`,
              pointerEvents: "none",
            }}
          />
        </>
      )}
    </div>
  );
};

