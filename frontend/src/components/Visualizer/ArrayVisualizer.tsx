import React from "react";
import { ArrayBase } from "./GlassMonolith";

export interface ArrayVisualizerProps {
  name?: string;
  blocks?: any[];
  pointers?: any[];
  [key: string]: any;
}

export const ArrayVisualizer: React.FC<ArrayVisualizerProps> = ({
  blocks = [],
}) => {
  const count = blocks && blocks.length > 0 ? blocks.length : 4;

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-[#040507] w-full min-h-[160px]">
      <ArrayBase count={count} />
    </div>
  );
};