import * as d3 from 'd3';
import { CONFIG } from '../../constants/config';
import type { FlowData, Bubble } from '../../types';
import { createTooltip, showTooltip, hideTooltip, getBubbleTooltip } from '../tooltip';
import { prepareBubbleData, calculateBubbleLayout } from '../bubble';
import VisualizationManager from './VisualizationManager';
import ViewManager from '../../services/ViewManager';

export function initializeBubbleVisualization(
  data: FlowData,
  width: number,
  height: number,
  noOfBubbles: number,
  centerX: number,
  centerY: number
): { bubbles: Bubble[]; maxBubbleRadius: number; minBubbleRadius: number } {
  const baseTextSize = Math.max(
    Math.min(centerX, centerY) * 0.035,
    CONFIG.bubble.minFontSize
  );

  const positionCircleRadius = Math.min(width, height) / 2;

  const bubbleData = prepareBubbleData(data, positionCircleRadius, noOfBubbles);

  const bubbles = calculateBubbleLayout(
    bubbleData.bubbles,
    centerX,
    centerY,
    positionCircleRadius,
    baseTextSize
  );

  return {
    bubbles,
    maxBubbleRadius: bubbleData.maxBubbleRadius,
    minBubbleRadius: bubbleData.minBubbleRadius,
  };
}

export function drawBubbles(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  bubbles: Bubble[],
  isDark: boolean,
  isMarketView: boolean, // Parameter kept for backward compatibility
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
  const visualizationManager = VisualizationManager.getInstance();
  visualizationManager.updateReferences(svg, bubbles, isMarketView);

  if (outerRingConfig) {
    CONFIG.bubble.outerRing = {
      ...CONFIG.bubble.outerRing,
      ...outerRingConfig,
    };
  }

  createTooltip(isDark);

  const bubbleGroups = svg
    .selectAll<SVGGElement, Bubble>('g.bubble')
    .data(bubbles)
    .join('g')
    .attr('class', 'bubble')
    .attr('transform', (d) => `translate(${d.x},${d.y})`);

  if (CONFIG.bubble.outerRing.show) {
    bubbleGroups
      .append('circle')
      .attr('class', 'outer-ring')
      .attr('r', (d) => d.outerRingRadius)
      .attr('fill', 'none')
      .attr('stroke', (d) => d.color)
      .attr('stroke-width', CONFIG.bubble.outerRing.strokeWidth)
      .attr('stroke-dasharray', CONFIG.bubble.outerRing.strokeDasharray)
      .attr('opacity', (d) => {
        if (d.id === bubbles.length - 1 && !isMarketView) {
          return 0;
        }
        return CONFIG.bubble.outerRing.opacity;
      });
  }

  bubbleGroups
    .append('circle')
    .attr('class', 'bubble-circle')
    .attr('r', (d) => d.radius)
    .attr('fill', (d) => {
      if (d.id === bubbles.length - 1) {
        return isDark ? '#1a1a1a' : '#ffffff';
      }
      return d.color;
    })
    .attr('stroke', (d) => {
      if (d.id === bubbles.length - 1) return isDark ? '#ffffff' : '#000000';
      if (focusedBubbleId === d.id) return isDark ? '#ffffff' : '#000000';
      return 'none';
    })
    .attr('stroke-width', (d) => {
      if (d.id === bubbles.length - 1) return isMarketView ? 2 : 0;
      if (focusedBubbleId === d.id) return 4;
      return 0;
    })
    .attr('opacity', (d) => {
      if (d.id === bubbles.length - 1) return isMarketView ? 1 : 0;
      return 1;
    })
    .attr('cursor', (d) => (d.id === bubbles.length - 1 ? 'default' : 'pointer'))
    .on('click', (event: MouseEvent, d: Bubble) => {
      if (d.id !== bubbles.length - 1) {
        onClick(d);
      }
    })
    .on('mouseover', (event: MouseEvent, d: Bubble) => {
      if (d.id !== bubbles.length - 1 && d.id !== focusedBubbleId) {
        const target = event.currentTarget as SVGCircleElement;
        d3.select<SVGCircleElement, Bubble>(target)
          .attr('stroke', isDark ? '#ffffff' : '#000000')
          .attr('stroke-width', 2)
          .raise();
        showTooltip(event, getBubbleTooltip(d));
      }
    })
    .on('mouseout', (event: MouseEvent, d: Bubble) => {
      if (d.id !== bubbles.length - 1 && d.id !== focusedBubbleId) {
        const target = event.currentTarget as SVGCircleElement;
        d3.select<SVGCircleElement, Bubble>(target)
          .attr('stroke', 'none')
          .attr('stroke-width', 0);
      }
      hideTooltip();
    });

  svg
    .selectAll('text.bubble-label')
    .data(bubbles)
    .join('text')
    .attr('pointer-events', 'none')
    .attr('class', 'bubble-label')
    .attr('x', (d) => d.textX)
    .attr('y', (d) => d.textY)
    .attr('text-anchor', (d) => {
      if (d.id === bubbles.length - 1) return 'middle';
      const angle = Math.atan2(d.y - centerY, d.x - centerX);
      const degrees = (angle * 180) / Math.PI;
      if (degrees > -45 && degrees <= 45) return 'start';
      if (degrees > 135 || degrees <= -135) return 'end';
      return 'middle';
    })
    .attr('dominant-baseline', 'middle')
    .attr('fill', (d) => {
      if (d.id === bubbles.length - 1 && !isMarketView) {
        return 'transparent';
      }
      return d.color;
    })
    .attr('font-size', (d) => d.fontSize)
    .attr('font-weight', 'bold')
    .each(function (d) {
      const lines = d.label.split('\n');
      const text = d3.select(this);
      const lineHeight = d.fontSize * 1.2;
      text.selectAll('*').remove();
      lines.forEach((line, i) => {
        text
          .append('tspan')
          .attr('x', d.textX)
          .attr('dy', i === 0 ? -((lines.length - 1) * lineHeight) / 2 : lineHeight)
          .text(line);
      });
    });
}
