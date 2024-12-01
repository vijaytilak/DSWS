"use client";

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useDatasphere } from './useDatasphere';
import { DatasphereConfig, Flow } from './DatasphereTypes';
import { calculateOuterRingPoints, calculateLineThickness, formatNumber } from './DatasphereUtils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const config: DatasphereConfig = {
  canvasWidth: 1500,
  canvasHeight: 1550,
  outerRingVisibility: false,
  positionCircleVisibility: false,
  maxOuterRingRadius: 100,
  minFlowLineThickness: 2,
  maxFlowLineThickness: 15,
  minMarkerSize: 10,
  maxMarkerSize: 35,
  parallelOffsetBtwFlowLines: 10,
  marginForPositionCircle: 140,
  minDistanceBetweenRings: 80,
  minDistanceBetweenBubbleAndRing: 20,
  minBubbleRadiusPercentage: 0.2,
  labelOffset: 20,
  highContrastColors: [
    "#FF5733", "#03a9f4", "#5733FF", "#FF33A6", "#33FF00",
    "#FF0033", "#FFE701", "#33C866", "#d289ff", "#009688",
    "#ff98a1", "#FF3366", "#3382FF", "#A633FF", "#FF33F0",
    "#9DFF33", "#FF4033", "#335DFF", "#E733FF", "#FF338C"
  ],
};

const Datasphere: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltipContent, setTooltipContent] = useState<string>('');
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const {
    bubbles,
    flows,
    flowType,
    setFlowType,
    centreFlow,
    setCentreFlow,
    netFlowFilterThreshold,
    setNetFlowFilterThreshold,
    error,
    loading,
  } = useDatasphere(config);
  const [sliderValue, setSliderValue] = useState(0);

  useEffect(() => {
    if (svgRef.current && !loading) {
      const svg = d3.select(svgRef.current)
        .attr("width", config.canvasWidth)
        .attr("height", config.canvasHeight)
        .attr("viewBox", `0 0 ${config.canvasWidth} ${config.canvasHeight}`);

      drawBubbles(svg);
      drawFlows(svg);
    }
  }, [bubbles, flows, loading]);

  const drawBubbles = (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>) => {
    // Drawing the positioning circle if visibility is set to true
    if (config.positionCircleVisibility) {
      svg.append("circle")
        .attr("cx", config.canvasWidth / 2)
        .attr("cy", config.canvasHeight / 2)
        .attr("r", Math.min(config.canvasWidth, config.canvasHeight) / 2 - config.marginForPositionCircle)
        .attr("fill", "none")
        .attr("stroke", "#999")
        .attr("stroke-width", "1");
    }

    // Create a group for each bubble
    const bubbleGroups = svg.selectAll("g.bubble")
      .data(bubbles)
      .enter()
      .append("g")
      .attr('data-id', d => d.id)
      .attr('class', 'bubble')
      .attr("opacity", 1)
      .on('click', (event, clickedBubble) => {
        // ... (keep the existing click handler logic)
      });

    // Append the main circle for each bubble
    bubbleGroups.append("circle")
      .attr("id", d => d.id)
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", d => d.radius)
      .attr("data-value", d => d.itemSizeAbsolute)
      .attr("title", d => `${formatNumber(d.itemSizeAbsolute)} people visited ${d.label}.`)
      .attr("fill", d => d.color);

    // Append the outer ring for each bubble if visibility is set to true
    if (config.outerRingVisibility) {
      bubbleGroups.append("circle")
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .attr("r", config.maxOuterRingRadius)
        .attr("fill", "none")
        .attr("stroke", d => d.color)
        .attr("stroke-dasharray", "5,5");
    }

    // Append the text/label for each bubble
    bubbleGroups.append("text")
      .attr("x", d => d.x + (Math.cos(d.angle) * (d.radius + (config.maxOuterRingRadius - config.labelOffset))))
      .attr("y", d => d.y + (Math.sin(d.angle) * (d.radius + (config.maxOuterRingRadius - config.labelOffset))))
      .attr("text-anchor", "middle")
      .attr("fill", d => d.color)
      .attr("font-size", "32px")
      .attr("font-weight", "bold")
      .text(d => d.label);

    // Update tooltip functionality
    bubbleGroups.on("mouseover", (event, d) => {
      setTooltipContent(`${formatNumber(d.itemSizeAbsolute)} people visited ${d.label}`);
      setTooltipPosition({ x: event.pageX, y: event.pageY });
    });
  };

  const drawFlows = (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>) => {
    const flowLines = svg.selectAll("line.flow")
      .data(flows, (d: any) => `${d.from}-${d.to}`);

    // Remove old flow lines
    flowLines.exit().remove();

    // Add new flow lines
    const newFlowLines = flowLines.enter()
      .append("line")
      .attr("class", "flow");

    // Update all flow lines
    newFlowLines.merge(flowLines as any)
      .each((flow: Flow) => {
        const fromBubble = bubbles.find(b => b.id === flow.from);
        const toBubble = bubbles.find(b => b.id === flow.to);

        if (!fromBubble || !toBubble) return;

        const linePoints = calculateOuterRingPoints(fromBubble, toBubble, config.maxOuterRingRadius, config.parallelOffsetBtwFlowLines);
        const lineThickness = calculateLineThickness(
          Number(flow[`sizePercent_absolute_${flowType}`]),
          config.minFlowLineThickness,
          config.maxFlowLineThickness
        );

        const lineColor = fromBubble.color;
        let tooltipText = '';

        switch (flowType) {
          case "inFlow only":
            tooltipText = `${formatNumber(flow.absolute_inFlow)} people came to ${toBubble.label} from ${fromBubble.label}.`;
            drawFlowLine(svg, linePoints.inFlow, lineColor, lineThickness, tooltipText, "inFlow");
            break;
          case "outFlow only":
            tooltipText = `${formatNumber(flow.absolute_outFlow)} people went to ${toBubble.label} from ${fromBubble.label}.`;
            drawFlowLine(svg, linePoints.outFlow, lineColor, lineThickness, tooltipText, "outFlow");
            break;
          case "netFlow":
            tooltipText = `${formatNumber(flow.absolute_netFlow)} people ${flow.absolute_netFlowDirection === "inFlow" ? "came to" : "went from"} ${flow.absolute_netFlowDirection === "inFlow" ? toBubble.label : fromBubble.label}.`;
            drawFlowLine(svg, linePoints.netFlow, lineColor, lineThickness, tooltipText, "netFlow");
            break;
          case "interaction":
            tooltipText = `${formatNumber(flow.absolute_netFlow)} people interacted between ${fromBubble.label} and ${toBubble.label}.`;
            drawFlowLine(svg, linePoints.interaction, lineColor, lineThickness, tooltipText, "interaction");
            break;
          case "bidirectional":
            if (flow.absolute_inFlow > 0) {
              tooltipText = `${formatNumber(flow.absolute_inFlow)} people came to ${toBubble.label} from ${fromBubble.label}.`;
              drawFlowLine(svg, linePoints.inFlow, lineColor, lineThickness, tooltipText, "inFlow");
            }
            if (flow.absolute_outFlow > 0) {
              tooltipText = `${formatNumber(flow.absolute_outFlow)} people went to ${toBubble.label} from ${fromBubble.label}.`;
              drawFlowLine(svg, linePoints.outFlow, lineColor, lineThickness, tooltipText, "outFlow");
            }
            break;
        }
      });
  };

  const drawFlowLine = (
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    points: { start: { x: number; y: number }; end: { x: number; y: number } },
    color: string,
    thickness: number,
    tooltipText: string,
    flowDirection: string
  ) => {
    svg.append("line")
      .attr("x1", points.start.x)
      .attr("y1", points.start.y)
      .attr("x2", points.end.x)
      .attr("y2", points.end.y)
      .attr("stroke", color)
      .attr("stroke-width", thickness)
      .attr("marker-end", `url(#arrow-${flowDirection})`)
      .on("mouseover", (event) => {
        setTooltipContent(tooltipText);
        setTooltipPosition({ x: event.pageX, y: event.pageY });
      });
  };

  const handleFlowTypeChange = (value: string) => {
    setFlowType(value);
    // Additional logic from datasphere.js if needed
  };

  const handleCentreFlowChange = (checked: boolean) => {
    setCentreFlow(checked);
    // Additional logic from datasphere.js if needed
  };

  const handleSliderChange = (value: number[]) => {
    setSliderValue(value[0]);
    setNetFlowFilterThreshold(value[0]);
    // Additional logic from datasphere.js if needed
  };

  return (
    <TooltipProvider>
      <div className="relative w-full h-screen">
        {error && (
          <div className="absolute top-0 left-0 right-0 bg-red-500 text-white p-4 text-center">
            {error}
          </div>
        )}
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <>
            <svg ref={svgRef} className="w-full h-full" />
            
            <div className="absolute top-4 right-4 space-y-4">
              <Select onValueChange={handleFlowTypeChange} value={flowType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select flow type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="netFlow">Net Flow</SelectItem>
                  <SelectItem value="bidirectional">Two-way Flows</SelectItem>
                  <SelectItem value="interaction">Interaction</SelectItem>
                  <SelectItem value="outFlow only">Out-Flow Only</SelectItem>
                  <SelectItem value="inFlow only">In-Flow Only</SelectItem>
                </SelectContent>
              </Select>
　
　
　
              <div className="flex items-center space-x-2">
                <Switch
                  id="centreFlowSwitch"
                  checked={centreFlow}
                  onCheckedChange={handleCentreFlowChange}
                />
                <Label htmlFor="centreFlowSwitch">Centre Flow</Label>
              </div>
            </div>
            
            <div className="absolute top-4 left-4 w-64">
              <Label htmlFor="thresholdSlider">Filter Threshold: {sliderValue}</Label>
              <Slider
                id="thresholdSlider"
                min={0}
                max={100}
                step={1}
                value={[sliderValue]}
                onValueChange={handleSliderChange}
              />
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                  style={{ 
                    position: 'absolute', 
                    left: tooltipPosition.x, 
                    top: tooltipPosition.y, 
                    width: 1, 
                    height: 1 
                  }} 
                />
              </TooltipTrigger>
              <TooltipContent>{tooltipContent}</TooltipContent>
            </Tooltip>
          </>
        )}
      </div>
    </TooltipProvider>
  );
};

export default Datasphere;