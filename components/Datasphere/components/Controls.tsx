'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { flowTypeOptions } from "@/components/Datasphere/constants/flowTypes";

interface ControlsProps {
  threshold: number;
  setThreshold: (value: number) => void;
  flowType: string;
  setFlowType: (value: string) => void;
  centreFlow: boolean;
  setCentreFlow: (value: boolean) => void;
  className?: string;
}

export function Controls({
  threshold,
  setThreshold,
  flowType,
  setFlowType,
  centreFlow,
  setCentreFlow,
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
      
      <Select defaultValue={flowType} onValueChange={setFlowType}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Flow Type" />
        </SelectTrigger>
        <SelectContent>
          {flowTypeOptions.map(option => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2">
        <Checkbox
          id="centre-flow"
          checked={centreFlow}
          onCheckedChange={(checked: boolean) => setCentreFlow(checked)}
          data-centre-flow-checkbox
        />
        <label
          htmlFor="centre-flow"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Centre Flow
        </label>
      </div>
    </div>
  );
}
