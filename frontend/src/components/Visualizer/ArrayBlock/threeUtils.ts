"use client";
import * as THREE from "three";

export function createBeveledBlockGeometry(width: number, height: number, depth: number, radius = 2.5) {
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

export function createIndexTexture(text: string, color: string) {
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
