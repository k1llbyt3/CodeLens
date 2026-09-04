"use client";
import React, { useEffect, useRef, useMemo } from "react";
import * as THREE from "three";

export type ArrayBlockState = "default" | "active" | "comparing" | "swapping" | "sorted" | "amber" | "green" | "blue";

export interface ArrayBlockItem {
  val: number;
  state?: ArrayBlockState | string;
}

export interface ThreeArraySceneProps {
  currentArray: ArrayBlockItem[];
  computedMax?: number;
  totalWidth?: number;
  itemWidth?: number;
  gap?: number;
  paddingX?: number;
  sceneHeight?: number;
  activeIndices?: Set<number>;
  pointerIndex?: number | null;
  pointerLabel?: string;
  pointers?: Array<{ index: number; label: string }>;
  onBlockClick?: (index: number) => void;
  className?: string;
}

// Extruded rounded footprint for thick beveled frosted glass monolith
function createBeveledBlockGeometry(width: number, height: number, depth: number, radius = 2.5) {
  const shape = new THREE.Shape();
  const w2 = width / 2 - radius;
  const d2 = depth / 2 - radius;

  shape.moveTo(-w2, -d2 - radius);
  shape.lineTo(w2, -d2 - radius);
  shape.quadraticCurveTo(w2 + radius, -d2 - radius, w2 + radius, -d2);
  shape.lineTo(w2 + radius, d2);
  shape.quadraticCurveTo(w2 + radius, d2 + radius, w2, d2 + radius);
  shape.lineTo(-w2, d2 + radius);
  shape.quadraticCurveTo(-w2 - radius, d2 + radius, -w2 - radius, d2);
  shape.lineTo(-w2 - radius, -d2);
  shape.quadraticCurveTo(-w2 - radius, -d2 - radius, -w2, -d2 - radius);

  const extrudeSettings = {
    steps: 1,
    depth: height,
    bevelEnabled: true,
    bevelThickness: 1.8,
    bevelSize: 1.8,
    bevelOffset: -0.5,
    bevelSegments: 4,
  };

  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geo.rotateX(-Math.PI / 2);
  return geo;
}

// Crisp 3D canvas texture for enlarged index labels directly applied onto base front face
function createIndexTexture(text: string, color: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.font = "bold 72px 'JetBrains Mono', 'SF Mono', Consolas, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.fillStyle = color;
    ctx.fillText(text, 128, 64);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

export const ThreeArrayScene: React.FC<ThreeArraySceneProps> = ({
  currentArray,
  computedMax,
  totalWidth: propTotalWidth,
  itemWidth = 84,
  gap = 26,
  paddingX = 36,
  sceneHeight = 255,
  pointerIndex = null,
  pointerLabel = "j",
  pointers = [],
  onBlockClick,
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const count = Math.max(1, currentArray.length);
  const contentWidth = count * itemWidth + (count - 1) * gap;
  const totalWidth = propTotalWidth || (2 * paddingX + contentWidth);

  // Expanded dimensions matching reference: wider front face and deeper back side
  const blockWidth = 62;
  const blockDepth = 52;
  const minHeight = 52;
  const maxHeight = 146;

  const baseDeckHeight = 44;
  const collarHeight = 8;
  const baselineY = baseDeckHeight + 2;

  // Clean uniform rotation angle revealing front face, broad top surface, and narrow right face
  const blockRotY = -0.10;

  // Frosted-glass themes matching reference (contained internal glow, no spreading)
  const getColorTheme = (index: number, state?: string) => {
    if (state === "active" || state === "writing" || state === "green") {
      // Soft mint/green frosted glass (Block 7)
      return {
        name: "green",
        outerGlass: 0xf0fdf4,
        attenuationColor: 0x86efac,
        topGlass: 0xdcfce7,
        innerColor: 0x22c55e,
        glowColor: 0x34d399,
        emissive: 0x059669,
        emissiveIntensity: 0.35,
        pointLightColor: 0x34d399,
        labelColor: "#34d399",
        textShadow: "0 0 10px rgba(52, 211, 153, 0.8)",
      };
    }
    if (state === "comparing" || state === "reading" || state === "swapping" || state === "amber") {
      // Warm champagne/amber frosted glass (Block 4)
      return {
        name: "amber",
        outerGlass: 0xfffbeb,
        attenuationColor: 0xfde68a,
        topGlass: 0xfef3c7,
        innerColor: 0xf59e0b,
        glowColor: 0xfbbf24,
        emissive: 0xd97706,
        emissiveIntensity: 0.35,
        pointLightColor: 0xfbbf24,
        labelColor: "#fbbf24",
        textShadow: "0 0 10px rgba(251, 191, 36, 0.8)",
      };
    }
    // Neutral icy-white frosted glass (Blocks 15 & 8 - NOT BLUE)
    return {
      name: "neutral",
      outerGlass: 0xf8fafc,
      attenuationColor: 0xe2e8f0,
      topGlass: 0xffffff,
      innerColor: 0xcfd8e3,
      glowColor: 0xffffff,
      emissive: 0x64748b,
      emissiveIntensity: 0.28,
      pointLightColor: 0xffffff,
      labelColor: "#38bdf8",
      textShadow: "0 0 10px rgba(255, 255, 255, 0.85), 0 0 16px rgba(56, 189, 248, 0.35)",
    };
  };

  const calculatedMax = useMemo(() => {
    if (computedMax && computedMax > 0) return computedMax;
    return Math.max(...currentArray.map((b) => b.val), 1);
  }, [currentArray, computedMax]);

  const blockData = useMemo(() => {
    return currentArray.map((item, i) => {
      const safeMax = Math.max(1, calculatedMax);
      const clampedVal = Math.max(0, Math.min(safeMax, item.val));
      const h = Math.round(minHeight + (clampedVal / safeMax) * (maxHeight - minHeight));
      const centerX = paddingX + i * (itemWidth + gap) + itemWidth / 2;
      const theme = getColorTheme(i, item.state);
      return {
        index: i,
        val: item.val,
        h,
        centerX,
        theme,
      };
    });
  }, [currentArray, calculatedMax, totalWidth]);

  const serializedData = useMemo(() => {
    return JSON.stringify(currentArray.map((x) => ({ v: x.val, s: x.state })));
  }, [currentArray]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animId: number;
    const scene = new THREE.Scene();

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(totalWidth, sceneHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const targetX = totalWidth / 2;
    const targetY = 104;

    // Preserved exact original camera setup
    const camera = new THREE.OrthographicCamera(
      -totalWidth / 2,
      totalWidth / 2,
      sceneHeight / 2,
      -sceneHeight / 2,
      1,
      2500
    );
    camera.position.set(targetX, targetY + 105, 480);
    camera.lookAt(targetX, targetY, 0);

    // Natural lighting: strong key illumination on top-left creates soft shadow gradient on right
    const ambientLight = new THREE.AmbientLight(0xf1f5f9, 0.9);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.6);
    keyLight.position.set(targetX - 200, targetY + 320, 380);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xcfd8e3, 0.7);
    fillLight.position.set(targetX + 220, targetY + 140, 220);
    scene.add(fillLight);

    const topLight = new THREE.DirectionalLight(0xffffff, 1.6);
    topLight.position.set(targetX, targetY + 420, 30);
    scene.add(topLight);

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // ═══ 1. BASE DECK PLATFORM ═══
    const deckWidth = totalWidth - 6;
    const deckDepth = 86;

    const deckGeo = new THREE.BoxGeometry(deckWidth, baseDeckHeight, deckDepth);
    const deckMatTop = new THREE.MeshStandardMaterial({
      color: 0x36404d,
      metalness: 0.65,
      roughness: 0.38,
    });
    const deckMatFront = new THREE.MeshStandardMaterial({
      color: 0x0f131a,
      metalness: 0.8,
      roughness: 0.45,
    });
    const deckMatSide = new THREE.MeshStandardMaterial({
      color: 0x1a212b,
      metalness: 0.72,
      roughness: 0.42,
    });
    const deckMatDark = new THREE.MeshBasicMaterial({ color: 0x05070a });

    const deckMesh = new THREE.Mesh(deckGeo, [
      deckMatSide,
      deckMatSide,
      deckMatTop,
      deckMatDark,
      deckMatFront,
      deckMatDark,
    ]);
    deckMesh.position.set(targetX, baseDeckHeight / 2, 0);
    rootGroup.add(deckMesh);

    const deckEdges = new THREE.EdgesGeometry(deckGeo);
    const deckLine = new THREE.LineSegments(
      deckEdges,
      new THREE.LineBasicMaterial({ color: 0x5a6778, transparent: true, opacity: 0.45 })
    );
    deckLine.position.copy(deckMesh.position);
    rootGroup.add(deckLine);

    // ═══ 2. SOCKET COLLARS, MONOLITHS & INTEGRATED BASE INDEX LABELS ═══
    const socketWidth = 76;
    const socketDepth = 66;

    blockData.forEach((block) => {
      const { h, centerX, theme } = block;

      // Socket Collar Tray
      const collarGeo = new THREE.BoxGeometry(socketWidth, collarHeight, socketDepth);
      const collarMat = new THREE.MeshStandardMaterial({
        color: 0x475567,
        metalness: 0.8,
        roughness: 0.26,
      });
      const collarMesh = new THREE.Mesh(collarGeo, collarMat);
      collarMesh.rotation.y = blockRotY;
      collarMesh.position.set(centerX, baseDeckHeight + collarHeight / 2 - 1, 0);
      rootGroup.add(collarMesh);

      const collarEdges = new THREE.EdgesGeometry(collarGeo);
      const collarLine = new THREE.LineSegments(
        collarEdges,
        new THREE.LineBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.7 })
      );
      collarLine.rotation.y = blockRotY;
      collarLine.position.copy(collarMesh.position);
      rootGroup.add(collarLine);

      // Front Accent Bracket Notch
      const notchGeo = new THREE.BoxGeometry(30, 3.5, 3.5);
      const notchMesh = new THREE.Mesh(
        notchGeo,
        new THREE.MeshStandardMaterial({ color: 0x19212c, metalness: 0.85, roughness: 0.25 })
      );
      notchMesh.rotation.y = blockRotY;
      notchMesh.position.set(centerX, baseDeckHeight + collarHeight / 2 - 1, socketDepth / 2 + 1.2);
      rootGroup.add(notchMesh);

      // Recessed Cavity Slot
      const cavityGeo = new THREE.BoxGeometry(blockWidth + 4, 3, blockDepth + 4);
      const cavityMat = new THREE.MeshStandardMaterial({
        color: 0x06090c,
        emissive: theme.innerColor,
        emissiveIntensity: 0.3,
      });
      const cavityMesh = new THREE.Mesh(cavityGeo, cavityMat);
      cavityMesh.rotation.y = blockRotY;
      cavityMesh.position.set(centerX, baseDeckHeight + collarHeight - 1, 0);
      rootGroup.add(cavityMesh);

      // ═══ 3. ARRAY INDEX LABELS PLACED DIRECTLY ON BASE FRONT FACE ═══
      const indexTexture = createIndexTexture(`[${block.index}]`, theme.labelColor);
      const indexPlaneGeo = new THREE.PlaneGeometry(60, 30);
      const indexPlaneMat = new THREE.MeshBasicMaterial({
        map: indexTexture,
        transparent: true,
        opacity: 0.95,
      });
      const indexMesh = new THREE.Mesh(indexPlaneGeo, indexPlaneMat);
      indexMesh.position.set(centerX, 20, deckDepth / 2 + 2);
      rootGroup.add(indexMesh);

      // ═══ 4. INTERNAL VOLUMETRIC LIGHTING & SLIGHT CORE GLOW ═══
      const innerPointLight = new THREE.PointLight(theme.pointLightColor, 2.5, 110);
      innerPointLight.position.set(centerX, baselineY + h / 2, 0);
      rootGroup.add(innerPointLight);

      const baseGlowLight = new THREE.PointLight(theme.pointLightColor, 2.0, 55);
      baseGlowLight.position.set(centerX, baselineY + 4, 0);
      rootGroup.add(baseGlowLight);

      // Subtle additive core glow mesh strictly contained inside the block boundaries
      const coreGlowGeo = new THREE.PlaneGeometry(blockWidth - 12, h - 8);
      const coreGlowMat = new THREE.MeshBasicMaterial({
        color: theme.glowColor,
        transparent: true,
        opacity: 0.18,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const coreGlowMesh = new THREE.Mesh(coreGlowGeo, coreGlowMat);
      coreGlowMesh.position.set(centerX, baselineY + h / 2, 0);
      coreGlowMesh.rotation.y = blockRotY;
      rootGroup.add(coreGlowMesh);

      // Subtle base socket glow plane
      const socketGlowGeo = new THREE.PlaneGeometry(blockWidth - 6, blockDepth - 6);
      socketGlowGeo.rotateX(-Math.PI / 2);
      const socketGlowMat = new THREE.MeshBasicMaterial({
        color: theme.glowColor,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const socketGlowMesh = new THREE.Mesh(socketGlowGeo, socketGlowMat);
      socketGlowMesh.position.set(centerX, baselineY + 1.2, 0);
      socketGlowMesh.rotation.y = blockRotY;
      rootGroup.add(socketGlowMesh);

      // ═══ 5. HIDDEN BACK-LEFT EDGE (SINGLE NON-GLOWING DIFFUSED EDGE THROUGH FROSTED GLASS) ═══
      const hiddenEdgeGroup = new THREE.Group();
      hiddenEdgeGroup.rotation.y = blockRotY;
      hiddenEdgeGroup.position.set(centerX, baselineY, 0);

      const hiddenEdgeMat = new THREE.MeshStandardMaterial({
        color: 0x475569,
        roughness: 0.75,
        metalness: 0.15,
        transparent: true,
        opacity: 0.35,
        depthWrite: true,
      });

      const w2 = blockWidth / 2 - 2;
      const d2 = blockDepth / 2 - 2;

      // Only single Back-Left Vertical Edge (connecting back-left-bottom to back-left-top)
      const vEdgeGeo = new THREE.CylinderGeometry(0.7, 0.7, h - 2, 8);
      const backLeftEdge = new THREE.Mesh(vEdgeGeo, hiddenEdgeMat);
      backLeftEdge.position.set(-w2, h / 2, -d2);
      hiddenEdgeGroup.add(backLeftEdge);

      rootGroup.add(hiddenEdgeGroup);

      // ═══ 6. ENTIRE BLOCK FROSTED GLASS MONOLITH WITH NATURAL MATERIAL GLOW ═══
      const outerGlassGeo = createBeveledBlockGeometry(blockWidth, h, blockDepth, 2.5);

      const outerGlassMat = new THREE.MeshPhysicalMaterial({
        color: theme.outerGlass,
        transmission: 0.86,
        roughness: 0.26,
        thickness: 30,
        ior: 1.48,
        reflectivity: 0.65,
        clearcoat: 1.0,
        clearcoatRoughness: 0.06,
        attenuationColor: new THREE.Color(theme.attenuationColor),
        attenuationDistance: 40,
        transparent: true,
        opacity: 0.94,
        emissive: theme.emissive,
        emissiveIntensity: 0.45,
      });

      const outerGlassMesh = new THREE.Mesh(outerGlassGeo, outerGlassMat);
      outerGlassMesh.rotation.y = blockRotY;
      outerGlassMesh.position.set(centerX, baselineY, 0);
      rootGroup.add(outerGlassMesh);

      // ═══ 7. TOP SURFACE SPECULAR PLANE ═══
      const topCapGeo = new THREE.PlaneGeometry(blockWidth - 4, blockDepth - 4);
      topCapGeo.rotateX(-Math.PI / 2);
      const topCapMat = new THREE.MeshStandardMaterial({
        color: theme.topGlass,
        roughness: 0.16,
        metalness: 0.2,
        transparent: true,
        opacity: 0.65,
        emissive: theme.emissive,
        emissiveIntensity: 0.35,
      });
      const topCapMesh = new THREE.Mesh(topCapGeo, topCapMat);
      topCapMesh.rotation.y = blockRotY;
      topCapMesh.position.set(centerX, baselineY + h - 0.3, 0);
      rootGroup.add(topCapMesh);
    });

    const render = () => {
      renderer.render(scene, camera);
    };
    render();
    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
      rootGroup.clear();
    };
  }, [serializedData, totalWidth, sceneHeight, pointerIndex]);

  const pointerMap = useMemo(() => {
    const map = new Map<number, string[]>();
    if (pointers && pointers.length > 0) {
      pointers.forEach((p) => {
        if (p.index >= 0 && p.index < blockData.length) {
          const arr = map.get(p.index) || [];
          arr.push(p.label);
          map.set(p.index, arr);
        }
      });
    } else {
      const activeIdx = pointerIndex !== null ? pointerIndex : blockData.findIndex(b => b.theme.name !== "neutral");
      if (activeIdx >= 0 && activeIdx < blockData.length) {
        map.set(activeIdx, [pointerLabel || "j"]);
      }
    }
    return map;
  }, [pointers, pointerIndex, pointerLabel, blockData]);

  return (
    <div
      className={`relative select-none flex flex-col items-center ${className}`}
      style={{ width: `${totalWidth}px`, height: `${sceneHeight}px` }}
    >
      <canvas
        ref={canvasRef}
        width={totalWidth}
        height={sceneHeight}
        style={{
          width: `${totalWidth}px`,
          height: `${sceneHeight}px`,
          display: "block",
        }}
      />

      {/* ═══ NEON POINTER TEXT & DOWNWARD ARROW INDICATORS (ANY POINTERS) ═══ */}
      {Array.from(pointerMap.entries()).map(([targetIdx, labels]) => {
        const activeBlock = blockData[targetIdx];
        if (!activeBlock) return null;
        const blockTopPx = sceneHeight / 2 - (baselineY + activeBlock.h - 104);
        const pointerTopPx = blockTopPx - 48;

        return (
          <div
            key={`neon-pointer-${targetIdx}`}
            style={{
              position: "absolute",
              left: `${activeBlock.centerX}px`,
              top: `${pointerTopPx}px`,
              transform: "translate(-50%, -100%)",
              zIndex: 30,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              pointerEvents: "none",
            }}
          >
            {/* Neon Character Label */}
            <span
              style={{
                fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
                fontSize: "17px",
                fontWeight: 800,
                color: "#00ff7a",
                textShadow: "0 0 8px rgba(0, 255, 122, 0.95), 0 0 20px rgba(0, 255, 122, 0.65)",
                letterSpacing: "0.05em",
                lineHeight: 1,
              }}
            >
              {labels.join(", ")}
            </span>
            {/* Neon Downward Arrow */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#00ff7a"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                filter: "drop-shadow(0 0 6px #00ff7a) drop-shadow(0 0 14px rgba(0,255,122,0.8))",
                marginTop: "2px",
              }}
            >
              <path d="M12 4v15M19 12l-7 7-7-7" />
            </svg>
          </div>
        );
      })}

      {/* Numeric value centered inside upper illuminated glass */}
      {blockData.map((b) => {
        const valueY = baselineY + b.h * 0.52;
        const topPx = sceneHeight / 2 - (valueY - 104);
        return (
          <div
            key={`block-text-${b.index}`}
            onClick={() => onBlockClick?.(b.index)}
            className="cursor-pointer transition-transform hover:scale-105 active:scale-95"
            style={{
              position: "absolute",
              left: `${b.centerX}px`,
              top: `${topPx}px`,
              transform: "translate(-50%, -50%)",
              zIndex: 25,
              fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, -apple-system, sans-serif",
              fontSize: b.h >= 80 ? "20px" : b.h >= 55 ? "17px" : "15px",
              fontWeight: 700,
              color: "#ffffff",
              textShadow: b.theme.textShadow,
              userSelect: "none",
              letterSpacing: "-0.02em",
            }}
            title={`[${b.index}]: ${b.val}`}
          >
            {b.val}
          </div>
        );
      })}
    </div>
  );
};

export const ThreeArrayBlocks = ThreeArrayScene;
export const ArrayBlock = ThreeArrayScene as any;
