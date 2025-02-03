'use client';

import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface ControlsProps {
  threshold: number;
  setThreshold: (value: number) => void;
  flowType: string;
  setFlowType: (value: string) => void;
  centreFlow: boolean;
  setCentreFlow: (value: boolean) => void;
  className?: string;
  onTimeChange?: (selection: {
    firstYear: { start: Date; end: Date };
    secondYear: { start: Date; end: Date };
  }) => void;
}

export function Controls({
  threshold,
  setThreshold,
  className
}: ControlsProps) {
  return (
    <div className={cn("flex items-center", className)}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Filter:</span>
        <div className="flex items-center gap-2">
          <Slider
            value={[threshold]}
            onValueChange={([value]: number[]) => setThreshold(value)}
            min={0}
            max={100}
            step={1}
            className="w-[140px]"
          />
          <span className="text-sm text-muted-foreground">{threshold}%</span>
        </div>
      </div>
    </div>
  );
}
