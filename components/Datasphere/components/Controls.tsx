'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface ControlsProps {
  threshold: number;
  setThreshold: (value: number) => void;
  flowType: string;
  setFlowType: (value: string) => void;
  centreFlow: boolean;
  setCentreFlow: (value: boolean) => void;
  className?: string;
}

const flowTypeOptions = [
  { id: "bidirectional", label: "Two-way Flows" },
  { id: "netFlow", label: "Net Flow" },
  { id: "interaction", label: "Interaction" },
  { id: "outFlow only", label: "Out-Flow Only" },
  { id: "inFlow only", label: "In-Flow Only" }
];

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
            onValueChange={([value]) => setThreshold(value)}
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
          onCheckedChange={(checked) => setCentreFlow(checked as boolean)}
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
