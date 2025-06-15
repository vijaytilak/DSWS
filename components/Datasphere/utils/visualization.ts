import * as d3 from 'd3';
import { CONFIG } from '../constants/config';
import type { FlowData, Bubble, Flow } from '../types';
import { createTooltip, showTooltip, hideTooltip, getBubbleTooltip, getFlowTooltip, updateTooltipTheme } from './tooltip';
import { prepareBubbleData, calculateBubbleLayout } from './bubble';
import { calculateFlowMetrics } from './flowUtils';
import {
  drawInflowOnlyTypeFlows,
  drawOutflowOnlyTypeFlows,
  drawNetFlowTypeFlows,
  drawInteractionTypeFlows,
  drawTwoWayTypeFlows,
  drawBiDirectionalTypeFlows,
  // Bubble drawing helpers
  createBubbleGroups,
  drawOuterRings,
  drawMainBubbleCircles,
  attachBubbleEventHandlers,
  drawBubbleLabels,
} from './drawingUtils';

// Create VisualizationManager to handle theme changes
class VisualizationManager {
  private static instance: VisualizationManager;
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;
  private bubbles: Bubble[] = [];
  private themeObserver: MutationObserver;
  private isMarketView: boolean = true;  // Set to true to match app's default state

  private constructor() {
    this.themeObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class' && this.svg) { // Ensure this.svg is checked
          const isDarkTheme = document.documentElement.classList.contains('dark');
          
          updateTooltipTheme(isDarkTheme); // Global function call
          
          this._applyThemeToCenterElements(isDarkTheme);
          this._synchronizeAllFlowMarkerColors();
        }
      });
    });

    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
  }

  private _applyThemeToCenterElements(isDarkTheme: boolean): void {
    if (!this.svg) return;

    const centerFlowColor = isDarkTheme ? CONFIG.colors.dark.centerFlow : CONFIG.colors.light.centerFlow;
    const centerBubbleId = this.bubbles.length - 1;

    // Center Flow Lines and Their Labels
    this.svg.selectAll<SVGElement, Flow>("path.flow-line, line.flow-line")
      .filter(function(d: Flow | undefined) {
        if (!d) {
            // Use function() syntax to ensure 'this' refers to the DOM element
            const element = d3.select(this);
            return element.attr("data-from-id") === centerBubbleId.toString();
        }
        // Check if 'from' property exists before accessing it
        return 'from' in d && d.from === centerBubbleId;
      })
      .attr("stroke", centerFlowColor);

    this.svg.selectAll<SVGTextElement, unknown>("text.flow-label")
      .filter(function() {
        const label = d3.select(this);
        return label.attr("data-from-id") === centerBubbleId.toString();
      })
      .attr("fill", centerFlowColor);

    // Center Bubble Circles
    this.svg.selectAll<SVGCircleElement, Bubble>("circle.bubble-circle") // More specific selector
      .filter((d) => d && d.id === centerBubbleId)
      .each(function(datum) {
        const circle = d3.select<SVGCircleElement, Bubble>(this);
        if (!datum) return;

        // Check if it's an outer ring based on class instead of radius, if possible, or ensure radius is reliable.
        // Assuming the selection is only for 'bubble-circle', not 'outer-ring' here.
        // The original logic for outer ring was separate.
        // This part is for the main center bubble circle.
         circle
            .attr("fill", isDarkTheme ? CONFIG.colors.dark.centerBubbleFill : CONFIG.colors.light.centerBubbleFill)
            .attr("stroke", centerFlowColor)
            .attr("stroke-width", "2"); // CONFIG.bubble.centerStrokeWidth
      });

    // Update outer ring for center bubble specifically if it exists and is distinct
     this.svg.selectAll<SVGCircleElement, Bubble>("circle.outer-ring")
      .filter((d) => d && d.id === centerBubbleId)
      .attr("stroke", centerFlowColor)
      .attr("stroke-dasharray", "5,5")
      .attr("stroke-width", "1.5");


    // Center Bubble Label
    this.svg.selectAll<SVGTextElement, Bubble>("text.bubble-label")
      .filter((d) => d && d.id === centerBubbleId)
      .attr("fill", this.isMarketView ? (isDarkTheme ? CONFIG.colors.dark.text : CONFIG.colors.light.text) : "transparent");
  }

  private _synchronizeAllFlowMarkerColors(): void {
    if (!this.svg) return;
    const svgSelection = this.svg;

    this.svg.selectAll<SVGMarkerElement, unknown>("marker")
      .each(function() {
        const marker = d3.select(this as SVGMarkerElement);
        const id = marker.attr("id");
        if (!id) return;

        const parentLine = svgSelection.selectAll<SVGElement, Flow>("path.flow-line, line.flow-line")
          .filter(function() {
            const line = d3.select(this as SVGElement);
            const fromId = line.attr("data-from-id");
            const toId = line.attr("data-to-id");
            const flowDirection = line.attr("data-flow-direction");
            const expectedMarkerId = `${flowDirection}-${fromId}-${toId}`;
            return expectedMarkerId === id;
          });

        if (!parentLine.empty()) {
          const lineColor = parentLine.attr("stroke");
          if (lineColor) {
            marker.select("path").attr("fill", lineColor);
          }
        }
      });
  }

  public static getInstance(): VisualizationManager {
    if (!VisualizationManager.instance) {
      VisualizationManager.instance = new VisualizationManager();
    }
    return VisualizationManager.instance;
  }

  public updateReferences(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    bubbles: Bubble[],
    isMarketView: boolean
  ): void {
    this.svg = svg;
    this.bubbles = bubbles;
    this.isMarketView = isMarketView;
  }

  public dispose(): void {
    this.themeObserver.disconnect();
    this.svg = null;
    this.bubbles = [];
  }
}

// Initialize tooltip with the current theme
// const initialIsDarkTheme = typeof window !== 'undefined' && document.documentElement.classList.contains('dark');
// createTooltip(initialIsDarkTheme);
// This global createTooltip call might be problematic if window/document are not available at import time (e.g. SSR)
// It's better to ensure createTooltip is called when the component mounts or is ready.
// For now, assuming it's handled or called again in drawBubbles.

export function updateTooltipWithTheme(isDark: boolean): void {
  createTooltip(isDark);
}

export function initializeBubbleVisualization(
  data: FlowData,
  width: number,
  height: number,
  noOfBubbles: number,
  centerX: number,
  centerY: number
): { bubbles: Bubble[], maxBubbleRadius: number, minBubbleRadius: number } {
  const baseTextSize = Math.max(
    Math.min(centerX, centerY) * CONFIG.bubble.minFontSizeFactor, // Using factor from CONFIG
    CONFIG.bubble.minFontSize
  );

  const positionCircleRadius = Math.min(width, height) / 2;
  const bubbleData = prepareBubbleData(data, positionCircleRadius, noOfBubbles);
  const bubbles = calculateBubbleLayout(bubbleData.bubbles, centerX, centerY, positionCircleRadius, baseTextSize);
  
  return {
    bubbles,
    maxBubbleRadius: bubbleData.maxBubbleRadius,
    minBubbleRadius: bubbleData.minBubbleRadius
  };
}

export function drawBubbles(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  bubbles: Bubble[],
  isDark: boolean,
  isMarketView: boolean,
  centerX: number,
  centerY: number,
  focusedBubbleId: number | null,
  onClick: (bubble: Bubble) => void,
  outerRingConfig?: {
    show?: boolean;
    strokeWidth?: number;
    strokeDasharray?: string;
    opacity?: number;
  }
) {
  // Create visualization manager instance
  const visualizationManager = VisualizationManager.getInstance();
  visualizationManager.updateReferences(svg, bubbles, isMarketView);

  // Update CONFIG with custom outer ring settings if provided
  if (outerRingConfig) {
    CONFIG.bubble.outerRing = {
      ...CONFIG.bubble.outerRing,
      ...outerRingConfig // Merging, not replacing, so only provided fields are updated
    };
  }

  // Ensure tooltip is created/updated with the current theme
  createTooltip(isDark);

  // Clear existing bubble elements before redrawing to prevent duplicates
  svg.selectAll("g.bubble").remove();
  svg.selectAll("text.bubble-label").remove();


  const bubbleGroups = createBubbleGroups(svg, bubbles);
  // Pass 'bubbles' array to drawOuterRings and drawMainBubbleCircles as they need it for center bubble check
  drawOuterRings(bubbleGroups, isMarketView, bubbles);
  const mainCircles = drawMainBubbleCircles(bubbleGroups, isDark, isMarketView, focusedBubbleId, bubbles);
  attachBubbleEventHandlers(mainCircles, isDark, focusedBubbleId, onClick, bubbles);
  drawBubbleLabels(svg, bubbles, centerY, centerX, isMarketView);
}

export function drawFlows(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  flows: Flow[], // This is the original, unfiltered flow data
  bubbles: Bubble[], // This is allBubbles
  flowType: string = 'netFlow', // This is the initial/selected flowType (currentFlowType)
  focusBubbleId: number | null = null,
  centreFlow: boolean = false,
  isMarketView: boolean = false,
  flowOption: 'churn' | 'switching' | 'affinity' = 'churn',
  onFlowClick?: (flow: Flow, source: Bubble, target: Bubble) => void,
  focusedFlow: { from: number, to: number } | null = null
) {
  let currentFlowType = flowType; // currentFlowType is the effective flowType after considering isBrandsChurnView
  const isBrandsChurnView = !isMarketView && flowOption === 'churn';
  if (isBrandsChurnView) {
    currentFlowType = 'bi-directional'; // Override for Brands Churn view
  }

  const filteredFlows = focusBubbleId !== null 
    ? flows.filter(flow => flow.from === focusBubbleId || flow.to === focusBubbleId)
    : flows;

  const isDarkTheme = document.documentElement.classList.contains('dark');

  svg.selectAll("line.flow-line").remove();
  svg.selectAll("path.flow-line").remove();
  svg.selectAll("marker").remove();
  svg.selectAll("text.flow-label").remove();

  // The calculateFlowMetrics in flowUtils expects (originalFlows, flowTypeInput, flowsToProcess)
  // Here, 'flows' is original, 'currentFlowType' is input, 'filteredFlows' is to process.
  const flowsWithMetrics = calculateFlowMetrics(flows, currentFlowType, filteredFlows);
  
  console.log('DEBUG - After Metrics Calculation (in drawFlows):', {
    flowType: currentFlowType,
    flows: flowsWithMetrics.map(f => ({
      from: f.from,
      to: f.to,
      // Use absolute_netFlow instead of value which doesn't exist on Flow type
      value: f.absolute_netFlow,
      percentRank: f.percentRank
    }))
  });

  const commonDrawParams = {
    svg,
    bubbles,
    flowOption,
    isMarketView,
    isDarkTheme,
    centreFlow,
    focusedFlow,
    onFlowClick,
  };

  // The drawing functions in drawingUtils expect (flowsWithMetrics, flowType, params)
  // And drawBiDirectionalTypeFlows expects (flowsWithMetrics, originalFlowType, params)
  // where params includes isBrandsChurnView
  switch (currentFlowType) {
    case 'inFlow only':
      drawInflowOnlyTypeFlows(flowsWithMetrics, currentFlowType, commonDrawParams);
      break;
    case 'outFlow only':
      drawOutflowOnlyTypeFlows(flowsWithMetrics, currentFlowType, commonDrawParams);
      break;
    case 'netFlow':
      drawNetFlowTypeFlows(flowsWithMetrics, currentFlowType, commonDrawParams);
      break;
    case 'interaction':
      drawInteractionTypeFlows(flowsWithMetrics, currentFlowType, commonDrawParams);
      break;
    case 'two-way flows':
      drawTwoWayTypeFlows(flowsWithMetrics, currentFlowType, commonDrawParams);
      break;
    case 'bi-directional':
      // Pass the original flowType if it's different from currentFlowType (which is 'bi-directional' here)
      // or just pass currentFlowType if that's what originalFlowType means in drawBiDirectionalTypeFlows
      // The drawBiDirectionalTypeFlows was designed to take 'originalFlowType' as the type that led to bi-directional.
      // If currentFlowType is 'bi-directional' due to isBrandsChurnView, then 'flowType' (the input to drawFlows) is the original.
      drawBiDirectionalTypeFlows(flowsWithMetrics, flowType, { ...commonDrawParams, isBrandsChurnView });
      break;
    default:
      console.warn(`Unknown flowType: ${currentFlowType} in drawFlows. No flows will be drawn.`);
      break;
  }
}


// All specific drawing logic previously in drawFlows' forEach/switch is now in drawingUtils.
// calculateFlowPoints, calculateLineThickness, calculateMarkerSize are in flowUtils.ts
// createFlowMarker, drawSingleFlowLine, drawSplitFlowLine etc. are in drawingUtils.ts