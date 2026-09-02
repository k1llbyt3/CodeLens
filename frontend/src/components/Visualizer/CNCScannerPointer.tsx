"use client";
import React from "react";

export interface CNCScannerPointerProps {
  name?: string;
  names?: string[];
  indexInGroup?: number;
  isActive?: boolean;
  actionType?: "idle" | "reading" | "writing" | "swapping";
  targetVal?: any;
  targetIndex?: number;
  beamHeightPx?: number;
}

export const CNCScannerHead: React.FC<CNCScannerPointerProps> = () => null;
