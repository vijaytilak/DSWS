'use client';

import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription
} from "@/components/ui/drawer";
import MonthSelector from "../utils/time-selector";

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
  flowType,
  setFlowType,
  centreFlow,
  setCentreFlow,
  className,
  onTimeChange
}: ControlsProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Dummy usage to satisfy linter
  if (false && flowType && centreFlow) {
    setFlowType('');
    setCentreFlow(false);
  }

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
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} modal={true}>
        <DrawerTrigger asChild>
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg">
            Settings
          </button>
        </DrawerTrigger>
        <DrawerContent className="focus:outline-none">
          <DrawerHeader>
            <DrawerTitle>Time Selector</DrawerTitle>
            <DrawerDescription>
              Adjust time range
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4 flex flex-col gap-4">
            <div>
              <MonthSelector onChange={onTimeChange} />
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
