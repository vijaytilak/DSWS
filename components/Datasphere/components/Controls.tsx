'use client';

import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface ControlsProps {
  threshold: number;
  setThreshold: (value: number) => void;
  className?: string;
}

export function Controls({
  threshold,
  setThreshold,
  className
}: ControlsProps) {
  return (
    <div className={cn("flex items-center gap-4", className)}>
      <div className="flex items-center gap-3 min-w-[200px]">
        <span className="text-sm font-medium">Filter:</span>
        <div className="flex items-center gap-2 flex-1">
          <Slider
            value={[threshold]}
            onValueChange={([value]: number[]) => setThreshold(value)}
            min={0}
            max={100}
            step={1}
            className="w-[140px]"
          />
          <span className="text-sm text-muted-foreground min-w-[32px]">{threshold}%</span>
        </div>
      </div>
    </div>
  );
}
