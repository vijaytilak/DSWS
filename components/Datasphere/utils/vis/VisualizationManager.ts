import * as d3 from 'd3';
import { createTooltip, updateTooltipTheme } from '../tooltip';
import type { Bubble, Flow } from '../types';

class VisualizationManager {
  private static instance: VisualizationManager;
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;
  private bubbles: Bubble[] = [];
  private themeObserver: MutationObserver;
  private isMarketView: boolean = true;

  private constructor() {
    this.themeObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class' && this.svg) {
          const isDarkTheme = document.documentElement.classList.contains('dark');
          updateTooltipTheme(isDarkTheme);

          const svgSelection = this.svg;
          const centerFlowColor = isDarkTheme ? '#ffffff' : '#000000';
          const centerBubbleId = this.bubbles.length - 1;

          this.svg.selectAll<SVGElement, Flow>('path.flow-line, line.flow-line')
            .each(function() {
              const element = d3.select(this);
              const fromId = element.attr('data-from-id');
              const toId = element.attr('data-to-id');
              const flowDirection = element.attr('data-flow-direction');

              if (fromId === centerBubbleId.toString()) {
                element.attr('stroke', centerFlowColor);

                svgSelection?.selectAll<SVGTextElement, unknown>('text.flow-label')
                  .filter(function() {
                    const label = d3.select(this);
                    return label.attr('data-from-id') === fromId;
                  })
                  .attr('fill', centerFlowColor);
              }

              const lineColor = element.attr('stroke');

              if (fromId && toId && flowDirection) {
                const markerId = `${flowDirection}-${fromId}-${toId}`;
                svgSelection?.selectAll(`#${markerId} path`)
                  .attr('fill', lineColor);

                svgSelection?.selectAll<SVGTextElement, unknown>('text.flow-label')
                  .filter(function() {
                    const label = d3.select(this);
                    return label.attr('data-from-id') === fromId &&
                           label.attr('data-to-id') === toId;
                  })
                  .attr('fill', lineColor);
              }
            });

          this.svg.selectAll<SVGCircleElement, Bubble>('circle')
            .filter((d) => d && d.id === this.bubbles.length - 1)
            .each(function() {
              const circle = d3.select<SVGCircleElement, Bubble>(this);
              const isOuterRing = parseFloat(circle.attr('r') || '0') === circle.datum().outerRingRadius;

              if (isOuterRing) {
                circle
                  .attr('fill', 'none')
                  .attr('stroke', centerFlowColor)
                  .attr('stroke-width', '1.5')
                  .attr('stroke-dasharray', '5,5');
              } else {
                circle
                  .attr('fill', isDarkTheme ? '#1a1a1a' : '#ffffff')
                  .attr('stroke', centerFlowColor)
                  .attr('stroke-width', '2');
              }
            });

          this.svg.selectAll<SVGTextElement, Bubble>('text.bubble-label')
            .filter((d) => d && d.id === this.bubbles.length - 1)
            .attr('fill', this.isMarketView ? (isDarkTheme ? '#ffffff' : '#000000') : 'transparent');

          this.svg.selectAll<SVGMarkerElement, unknown>('marker')
            .each(function() {
              const marker = d3.select(this);
              const id = marker.attr('id');
              if (!id) return;

              const lines = svgSelection?.selectAll<SVGElement, unknown>('path.flow-line, line.flow-line');
              if (!lines) return;

              const parentLine = lines.filter(function() {
                const line = d3.select(this);
                const fromId = line.attr('data-from-id') || '';
                const toId = line.attr('data-to-id') || '';
                const flowDirection = line.attr('data-flow-direction') || '';
                const expectedId = `${flowDirection}-${fromId}-${toId}`;
                return expectedId === id;
              });

              if (!parentLine.empty()) {
                const lineColor = parentLine.attr('stroke');
                if (lineColor) {
                  marker.select('path')
                    .attr('fill', lineColor);
                }
              }
            });
        }
      });
    });

    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
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

const isDarkTheme = typeof window !== 'undefined' && document.documentElement.classList.contains('dark');
createTooltip(isDarkTheme);

export function updateTooltipWithTheme(isDark: boolean): void {
  createTooltip(isDark);
}

export default VisualizationManager;
