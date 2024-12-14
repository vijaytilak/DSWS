'use client'

import React, { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { filterByPercentRanks, calculateRelativeSizePercent, formatNumber } from '@/utils/datasphereUtils'

// API Configuration
const apiUrl = "/api"
const bubblesApi = "bubbles"
const flowsApi = "flows"

// Canvas configuration
const canvasWidth = 1500
const canvasHeight = 1550

// Global Configuration
const outerRingVisibility = false
const positionCircleVisibility = false
const maxOuterRingRadius = 100
const minFlowLineThickness = 2
const maxFlowLineThickness = 15
const minMarkerSize = 10
const maxMarkerSize = 35
const parallelOffsetBtwFlowLines = 10

// Position Circle Configuration
const marginForPositionCircle = 140
const minDistanceBetweenRings = 80
const minDistanceBetweenBubbleAndRing = 20
const minBubbleRadiusPercentage = 0.2
const labelOffset = 20
const highContrastColors = [
  "#FF5733", "#03a9f4", "#5733FF", "#FF33A6", "#33FF00",
  "#FF0033", "#FFE701", "#33C866", "#d289ff", "#009688",
  "#ff98a1", "#FF3366", "#3382FF", "#A633FF", "#FF33F0",
  "#9DFF33", "#FF4033", "#335DFF", "#E733FF", "#FF338C"
]

type LinePointsType = {
  inFlow: { start: { x: number; y: number }; end: { x: number; y: number } };
  outFlow: { start: { x: number; y: number }; end: { x: number; y: number } };
  netFlow: { start: { x: number; y: number }; end: { x: number; y: number } };
  interaction: { start: { x: number; y: number }; end: { x: number; y: number } };
}

const Datasphere: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null)
  const [flowType, setFlowType] = useState<string>("bidirectional")
  const [centreFlow, setCentreFlow] = useState<boolean>(false)
  const [netFlowFilterThreshold, setNetFlowFilterThreshold] = useState<number>(0)
  const [positionCircleRadius, setPositionCircleRadius] = useState<number>(0)
  const [noOfBubbles, setNoOfBubbles] = useState<number | null>(null)
  const [bubbles, setBubbles] = useState<any[]>([])
  const [focusBubbleId, setFocusBubbleId] = useState<number | null>(null)
  const [flows, setFlows] = useState<any[]>([])
  const [loadedflowData, setLoadedFlowData] = useState<any>(null)
  const [outerRingRadius, setOuterRingRadius] = useState<number | null>(null)
  const [datasphereMode, setDatasphereMode] = useState<string>("Normal")

  useEffect(() => {
    if (svgRef.current) {
      const svg = d3.select(svgRef.current)
        .attr("width", canvasWidth)
        .attr("height", canvasHeight)
        .attr("viewBox", `0 0 ${canvasWidth} ${canvasHeight}`)

      // Create a tooltip
      d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)

      render()
    }
  }, [])

  useEffect(() => {
    if (flows.length > 0) {
      updateVisualization()
    }
  }, [flows, flowType, centreFlow, netFlowFilterThreshold])

  const updateVisualization = () => {
    const svg = d3.select(svgRef.current)
    const bubbleGroups = svg.selectAll("g")
    const isAnyBubbleFocused = bubbles.some(b => b.focus)

    bubbleGroups.each(function (d: any) {
      const bubble = d3.select(this)

      const hasSignificantFlow = flows.some(flow =>
        (flow.from === d.id || flow.to === d.id)
      )

      if (isAnyBubbleFocused) {
        const hasConnection = flows.some(flow =>
          (flow.from === d.id || flow.to === d.id) &&
          (flow.absolute_netFlow !== 0 || flow.absolute_inFlow !== 0 || flow.absolute_outFlow !== 0) &&
          (bubbles.some(b => (b.id === flow.to || b.id === flow.from) && b.focus))
        )

        if (d.focus || hasConnection) {
          bubble.classed("highlighted", true)
            .select("circle")
            .transition()
            .duration(200)
            .style("stroke", d.focus ? "#FFF" : "none")
            .style("stroke-width", d.focus ? "8px" : "0px")
          bubble.transition().duration(500).attr("opacity", 1)
        } else {
          bubble.classed("highlighted", false)
            .select("circle")
            .transition()
            .duration(200)
            .style("stroke", "none")
            .style("stroke-width", "0px")
          bubble.transition().duration(500).attr("opacity", 1)
        }
      } else {
        bubble.classed("highlighted", false)
          .select("circle")
          .transition()
          .duration(200)
          .style("stroke", "none")
          .style("stroke-width", "0px")
        bubble.transition().duration(500).attr("opacity", hasSignificantFlow ? 1 : 1)
      }
    })

    clearFlows()
    drawFlows()
  }

  const loadBubbleData = async () => {
    try {
      console.log('Fetching bubble data...');
      const postData = {
        "strVariableName": "HD_MERCHANT",
        "byAggregating": "IDs"
      }
      
      const response = await fetch(`${apiUrl}/${bubblesApi}?_=${new Date().getTime()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify(postData),
      });

      if (!response.ok) {
        throw new Error('Failed API request to load Bubble Data: ' + response.statusText);
      }

      const data = await response.json();
      console.log('Received bubble data:', data);

      if (!data || !Array.isArray(data)) {
        console.error('Invalid bubble data format:', data);
        return [];
      }

      const processedData = calculateRelativeSizePercent(data, 'itemSize_absolute');
      console.log('Processed bubble data:', processedData);

      setNoOfBubbles(processedData.length);
      const newPositionCircleRadius = Math.min(canvasWidth, canvasHeight) / 2 - marginForPositionCircle;
      setPositionCircleRadius(newPositionCircleRadius);
      const newOuterRingRadius = Math.min((2 * Math.PI * newPositionCircleRadius - (processedData.length - 1) * minDistanceBetweenRings) / (2 * processedData.length), maxOuterRingRadius);
      setOuterRingRadius(newOuterRingRadius);

      const maxBubbleRadius = newOuterRingRadius - minDistanceBetweenBubbleAndRing;
      const minBubbleRadius = minBubbleRadiusPercentage * maxBubbleRadius;

      const bubbleData = processedData.map((d: any, index: number) => {
        const rankPercentage = d.sizePercent_itemSize_absolute;
        const scaledRadius = minBubbleRadius + (maxBubbleRadius - minBubbleRadius) * (rankPercentage / 100);

        const angle = (2 * Math.PI * index) / processedData.length;
        const x = canvasWidth / 2 + newPositionCircleRadius * Math.cos(angle);
        const y = canvasHeight / 2 + newPositionCircleRadius * Math.sin(angle);

        return {
          id: d.itemID,
          label: d.itemLabel,
          radius: scaledRadius,
          x: x,
          y: y,
          angle: angle,
          itemSizeAbsolute: d.itemSize_absolute,
          sizeRankPercentage: rankPercentage,
          color: highContrastColors[index],
          focus: false
        };
      });

      console.log('Final bubble data:', bubbleData);
      return bubbleData;
    } catch (error) {
      console.error('Error loading bubble data:', error);
      return [];
    }
  }

  const drawBubbles = () => {
    console.log('Drawing bubbles with data:', bubbles);
    if (!svgRef.current || !bubbles.length) {
      console.error('SVG ref or bubbles not available:', { 
        svgRef: !!svgRef.current, 
        bubblesLength: bubbles.length 
      });
      return;
    }

    const svg = d3.select(svgRef.current);
    
    // Clear existing bubbles
    svg.selectAll("g.bubble").remove();
    
    const bubbleGroups = svg.selectAll("g.bubble")
      .data(bubbles)
      .join("g")
      .attr("class", "bubble")
      .attr("transform", (d: any) => `translate(${d.x},${d.y})`);

    bubbleGroups.on("mouseover", function (event, d) {
      if (d.id != noOfBubbles) {
        d3.select(".tooltip")
          .transition()
          .duration(200)
          .style("opacity", .9)
        d3.select(".tooltip").html(`${formatNumber(d.itemSizeAbsolute)} people visited ${d.label}`)
          .style("left", (event.pageX) + "px")
          .style("top", (event.pageY - 28) + "px")
      }
    })
      .on("mouseout", function () {
        d3.select(".tooltip")
          .transition()
          .duration(500)
          .style("opacity", 0)
      })

    bubbleGroups.selectAll("circle").remove()
    bubbleGroups.append("circle")
      .attr("id", d => d.id)
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", d => d.radius)
      .attr("data-value", d => d.itemSizeAbsolute)
      .attr("title", d => d.id == noOfBubbles ? "" : `${formatNumber(d.itemSizeAbsolute)} people visited ${d.label}.`)
      .attr("fill", d => d.id == noOfBubbles ? "" : d.color)

    if (outerRingVisibility) {
      bubbleGroups.selectAll("circle.outer-ring").remove()
      bubbleGroups.append("circle")
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .attr("r", outerRingRadius!)
        .attr("fill", "none")
        .attr("stroke", d => d.color)
        .attr("stroke-dasharray", "5,5")
        .attr("class", "outer-ring")
    }

    bubbleGroups.selectAll("text").remove()
    bubbleGroups.append("text")
      .attr("x", (d) => {
        return d.x + (Math.cos(d.angle) * (d.radius + (outerRingRadius! - 10)))
      })
      .attr("y", (d) => {
        return d.y + (Math.sin(d.angle) * (d.radius + (outerRingRadius! - labelOffset)))
      })
      .attr("text-anchor", "middle")
      .attr("fill", d => d.color)
      .attr("font-size", "32px")
      .attr("font-weight", "bold")
      .text(d => d.id == noOfBubbles ? "" : d.label)

    console.log('Finished drawing bubbles');
  }

  const loadFlowData = async () => {
    const postData = {
      "strVariableName": "HD_MERCHANT",
      "byAggregating": "IDs",
      "aggregateVariable": "SPEND",
      "aggregatingMethod": "sum"
    }

    let response = await fetch(`${apiUrl}/${flowsApi}?_=${new Date().getTime()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify(postData),
    })

    if (!response.ok) {
      throw new Error('Failed API request to load Flow Data :  ' + response.statusText)
    }

    let data = await response.json()
    const flowsData = data.flows_absolute

    setLoadedFlowData(flowsData)
    await prepareFlowData(flowsData)
  }

  const prepareFlowData = async (flowData: any = null) => {
    const filtered: { [key: string]: any } = {}
    const dataToProcess = flowData || loadedflowData

    if (!dataToProcess) {
      console.error('No flow data available to process')
      return
    }

    Object.keys(dataToProcess).forEach((key) => {
      const cleanedKey = key.replace(/'/g, '')
      const reversedKey = cleanedKey.split(",").reverse().join(",")
      if (!filtered[reversedKey]) {
        filtered[cleanedKey] = dataToProcess[key]
      }
    })

    const uniqueFlows: { [key: string]: any } = {}
    for (let key in filtered) {
      const flow = filtered[key]
      const adjustedKey = key.replace(/'/g, "")
      const nodes = adjustedKey.split(',').map(Number)
      let [from, to] = nodes

      if ((focusBubbleId || focusBubbleId === 0) && from !== focusBubbleId && to !== focusBubbleId) {
        continue
      }

      if ((focusBubbleId || focusBubbleId === 0) && to === focusBubbleId) {
        uniqueFlows[key] = {
          from: to,
          to: from,
          absolute_inFlow: flow.outFlow,
          absolute_outFlow: flow.inFlow,
          absolute_netFlowDirection: flow.inFlow >= flow.outFlow ? "inFlow" : "outFlow",
          absolute_netFlow: Math.abs(flow.inFlow - flow.outFlow)
        }
      } else {
        uniqueFlows[key] = {
          from: from,
          to: to,
          absolute_inFlow: flow.inFlow,
          absolute_outFlow: flow.outFlow,
          absolute_netFlowDirection: flow.inFlow >= flow.outFlow ? "inFlow" : "outFlow",
          absolute_netFlow: Math.abs(flow.inFlow - flow.outFlow)
        }
      }
    }

    let flowDataArray = Object.values(uniqueFlows)

    if (centreFlow) {
      flowDataArray = prepareCentreFlowData(flowDataArray)
    }

    if (flowType === 'bidirectional') {
      flowDataArray = filterByPercentRanks(flowDataArray, 'absolute_netFlow', netFlowFilterThreshold)
      flowDataArray = calculateRelativeSizePercent(flowDataArray, 'absolute_inFlow', 'absolute_outFlow')
    } else if (flowType === 'netFlow') {
      flowDataArray = filterByPercentRanks(flowDataArray, 'absolute_netFlow', netFlowFilterThreshold)
      flowDataArray = calculateRelativeSizePercent(flowDataArray, 'absolute_netFlow')
    } else if (flowType === 'inFlow only') {
      flowDataArray = filterByPercentRanks(flowDataArray, 'absolute_inFlow', netFlowFilterThreshold)
      flowDataArray = calculateRelativeSizePercent(flowDataArray, 'absolute_inFlow')
    } else if (flowType === 'outFlow only') {
      flowDataArray = filterByPercentRanks(flowDataArray, 'absolute_outFlow', netFlowFilterThreshold)
      flowDataArray = calculateRelativeSizePercent(flowDataArray, 'absolute_outFlow')
    } else if (flowType === 'interaction') {
      flowDataArray = filterByPercentRanks(flowDataArray, 'absolute_netFlow', netFlowFilterThreshold)
      flowDataArray = calculateRelativeSizePercent(flowDataArray, 'absolute_netFlow')
    }

    setFlows(flowDataArray)
  }

  const prepareCentreFlowData = (flowData: any[]) => {
    let centreflowArray: { [key: number]: { totalInFlow: number, totalOutFlow: number } } = {}
    let returnArray: Array<{ from: number, to: number, absolute_inFlow: number, absolute_outFlow: number, absolute_netFlowDirection: string, absolute_netFlow: number }> = []

    flowData.forEach((flo) => {
      const from = flo.from
      const to = flo.to

      if (!centreflowArray[from]) {
        centreflowArray[from] = {
          totalInFlow: 0,
          totalOutFlow: 0,
        }
      }
      if (!centreflowArray[to]) {
        centreflowArray[to] = {
          totalInFlow: 0,
          totalOutFlow: 0,
        }
      }

      centreflowArray[from].totalOutFlow += flo.absolute_outFlow
      centreflowArray[from].totalInFlow += flo.absolute_inFlow
      centreflowArray[to].totalOutFlow += flo.absolute_inFlow
      centreflowArray[to].totalInFlow += flo.absolute_outFlow
    })

    Object.entries(centreflowArray).forEach(([key, flow]) => {
      let temp = {
        from: parseInt(key),
        to: noOfBubbles!,
        absolute_inFlow: flow.totalInFlow,
        absolute_outFlow: flow.totalOutFlow,
        absolute_netFlowDirection: flow.totalInFlow >= flow.totalOutFlow ? "inFlow" : "outFlow",
        absolute_netFlow: Math.abs(flow.totalInFlow - flow.totalOutFlow)
      }
      returnArray.push(temp)
    })

    if (focusBubbleId !== null) {
      returnArray = returnArray.filter(flow =>
        flow.from === focusBubbleId || flow.to === focusBubbleId
      )
    }

    return returnArray
  }

  const drawFlows = () => {
    if (!svgRef.current || !flows.length) {
      console.error('SVG ref or flows not available')
      return
    }

    const svg = d3.select(svgRef.current)
    
    // Remove existing flow lines before redrawing
    svg.selectAll("line[flow-direction]").remove()
    
    // Filter out any undefined flows
    const validFlows = flows.filter(flow => flow && flow.from && flow.to)
    
    validFlows.forEach(flow => {
      const startBubble = bubbles.find(b => b.id === flow.from)
      const endBubble = bubbles.find(b => b.id === flow.to)
      
      if (startBubble && endBubble) {
        if (flowType === 'bidirectional') {
          drawFlowLine(flow, 'inFlow', startBubble, endBubble)
          drawFlowLine(flow, 'outFlow', startBubble, endBubble)
        } else {
          drawFlowLine(flow, flowType === 'inFlow only' ? 'inFlow' : 
                            flowType === 'outFlow only' ? 'outFlow' : 
                            flowType === 'interaction' ? 'interaction' : 'netFlow', 
                      startBubble, endBubble)
        }
      }
    })
  }

  const drawFlow = (flow: any) => {
    let fromBubble = bubbles.find(bubble => bubble.id === flow.from)
    let toBubble = bubbles.find(bubble => bubble.id === flow.to)

    if (!fromBubble || !toBubble) {
      console.error('Could not find bubbles for flow:', flow)
      return
    }

    switch (flowType) {
      case "inFlow only":
        if (flow.absolute_inFlow > 0) {
          drawFlowLine(flow, 'inFlow', toBubble, fromBubble)
        }
        break
      case "outFlow only":
        if (flow.absolute_outFlow > 0) {
          drawFlowLine(flow, 'outFlow', fromBubble, toBubble)
        }
        break
      case "netFlow":
        if (flow.absolute_netFlowDirection === "inFlow") {
          drawFlowLine(flow, 'netFlow', toBubble, fromBubble)
        } else {
          drawFlowLine(flow, 'netFlow', fromBubble, toBubble)
        }
        break
      case "interaction":
        drawFlowLine(flow, 'interaction', fromBubble, toBubble)
        break
      case "bidirectional":
        if (flow.absolute_inFlow > 0) {
          drawFlowLine(flow, 'inFlow', toBubble, fromBubble)
        }
        if (flow.absolute_outFlow > 0) {
          drawFlowLine(flow, 'outFlow', fromBubble, toBubble)
        }
        break
    }
  }

  const drawFlowLine = (flow: any, flowDirection: keyof LinePointsType, startBubble: any, endBubble: any) => {
    const svg = d3.select(svgRef.current)
    let lineColor = startBubble.color
    const lineThickness = calculateLineThickness(flow[`sizePercent_absolute_${flowDirection}`])

    const linePoints: LinePointsType = calculateOuterRingPoints(startBubble, endBubble)

    let tooltipTitleText = ''
    if (centreFlow) {
      lineColor = startBubble.id === noOfBubbles ? endBubble.color : startBubble.color

      switch (flowDirection) {
        case "inFlow":
          tooltipTitleText = `Churn into ${endBubble.label} was ${formatNumber(flow["absolute_" + flowDirection])}.`
          break
        case "outFlow":
          tooltipTitleText = `Churn away from ${startBubble.label} was ${formatNumber(flow["absolute_" + flowDirection])}.`
          break
        case "netFlow":
          if (flow["absolute_netFlowDirection"] === "inFlow") {
            tooltipTitleText = `Churn into ${endBubble.label} was ${formatNumber(flow["absolute_" + flowDirection])}.`
          } else {
            tooltipTitleText = `Churn away from ${startBubble.label} was ${formatNumber(flow["absolute_" + flowDirection])}.`
          }
          break
        case "interaction":
          tooltipTitleText = `${formatNumber(flow["absolute_" + flowDirection])} people interacted between ${startBubble.label} and ${endBubble.label}.`
          break
      }
    } else {
      switch (flowDirection) {
        case "inFlow":
          tooltipTitleText = `${formatNumber(flow["absolute_" + flowDirection])} people came to ${endBubble.label} from ${startBubble.label}.`
          break
        case "outFlow":
          tooltipTitleText = `${formatNumber(flow["absolute_" + flowDirection])} people went to ${endBubble.label} from ${startBubble.label}.`
          break
        case "netFlow":
          tooltipTitleText = `${formatNumber(flow["absolute_" + flowDirection])} people went from ${startBubble.label} to ${endBubble.label}.`
          break
        case "interaction":
          tooltipTitleText = `${formatNumber(flow["absolute_" + flowDirection])} people interacted between ${startBubble.label} and ${endBubble.label}.`
          break
      }
    }

    let markerType, markerStartId, markerEndId = ''
    if (flowDirection === 'interaction') {
      markerType = 'node'
      markerStartId = `node-start-${startBubble.id}-${endBubble.id}`
      markerEndId = `node-end-${startBubble.id}-${endBubble.id}`
    } else {
      markerType = 'arrow'
      markerStartId = ``
      markerEndId = `arrow-end-${startBubble.id}-${endBubble.id}`
    }

    const markerSizeScale = d3.scaleLinear()
      .domain([minFlowLineThickness, maxFlowLineThickness])
      .range([minMarkerSize, maxMarkerSize])
      .clamp(true)

    if (markerType === 'node') {
      svg.append("marker")
        .attr("id", markerStartId)
        .attr("viewBox", "0 0 10 10")
        .attr("refX", "5")
        .attr("refY", "5")
        .attr("markerWidth", markerSizeScale(lineThickness))
        .attr("markerHeight", markerSizeScale(lineThickness))
        .attr("markerUnits", "userSpaceOnUse")
        .attr("orient", "auto")
        .append("circle")
        .attr("cx", "5")
        .attr("cy", "5")
        .attr("r", "4")
        .attr("fill", startBubble.color)

      svg.append("marker")
        .attr("id", markerEndId)
        .attr("viewBox", "0 0 10 10")
        .attr("refX", "5")
        .attr("refY", "5")
        .attr("markerWidth", markerSizeScale(lineThickness))
        .attr("markerHeight", markerSizeScale(lineThickness))
        .attr("markerUnits", "userSpaceOnUse")
        .attr("orient", "auto")
        .append("circle")
        .attr("cx", "5")
        .attr("cy", "5")
        .attr("r", "4")
        .attr("fill", endBubble.color)
    }

    if (markerType === 'arrow') {
      svg.append("marker")
        .attr("id", markerEndId)
        .attr("viewBox", "0 0 10 10")
        .attr("refX", "10")
        .attr("refY", "5")
        .attr("markerWidth", markerSizeScale(lineThickness))
        .attr("markerHeight", markerSizeScale(lineThickness))
        .attr("markerUnits", "userSpaceOnUse")
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,0 L10,5 L0,10 z")
        .attr("fill", lineColor)
    }

    const flowLine = svg.append("line")
      .attr("id", `flow-${startBubble.id}-${endBubble.id}-${flowDirection}`)
      .attr("x1", linePoints[flowDirection].start.x)
      .attr("y1", linePoints[flowDirection].start.y)
      .attr("x2", linePoints[flowDirection].end.x)
      .attr("y2", linePoints[flowDirection].end.y)
      .attr("stroke", lineColor)
      .attr("stroke-width", lineThickness)
      .attr("flow-direction", flowDirection)
      .on("mouseover", function (event) {
        d3.select(".tooltip")
          .transition()
          .duration(200)
          .style("opacity", .9)
        d3.select(".tooltip").html(tooltipTitleText)
          .style("left", (event.pageX) + "px")
          .style("top", (event.pageY - 28) + "px")
      })
      .on("mouseout", function () {
        d3.select(".tooltip")
          .transition()
          .duration(500)
          .style("opacity", 0)
      })

    if (markerType === 'node') {
      flowLine.attr("marker-start", "url(#" + markerStartId + ")")
      flowLine.attr("marker-end", "url(#" + markerEndId + ")")
    } else if (markerType === 'arrow') {
      flowLine.attr("marker-end", "url(#" + markerEndId + ")")
    }
  }

  const calculateOuterRingPoints = (fromBubble: any, toBubble: any) => {
    const centerStart = calculateOuterRingPoint(fromBubble, toBubble)
    const centerEnd = calculateOuterRingPoint(toBubble, fromBubble)
    const offsetPoints = calculateOffsetPoints(centerStart, centerEnd, parallelOffsetBtwFlowLines)
    return {
      inFlow: offsetPoints.positive,
      outFlow: offsetPoints.positive,
      netFlow: {
        start: centerStart,
        end: centerEnd
      },
      interaction: {
        start: centerStart,
        end: centerEnd
      }
    }
  }

  const calculateOuterRingPoint = (fromBubble: any, toBubble: any) => {
    const dx = toBubble.x - fromBubble.x
    const dy = toBubble.y - fromBubble.y
    const angle = Math.atan2(dy, dx)
    return {
      x: fromBubble.x + outerRingRadius! * Math.cos(angle),
      y: fromBubble.y + outerRingRadius! * Math.sin(angle)
    }
  }

  const calculateOffsetPoints = (start: any, end: any, offset: number) => {
    const angle = Math.atan2(end.y - start.y, end.x - start.x)
    const offsetX = offset * Math.sin(angle)
    const offsetY = offset * Math.cos(angle)
    return {
      positive: {
        start: { x: start.x + offsetX, y: start.y - offsetY },
        end: { x: end.x + offsetX, y: end.y - offsetY }
      },
      negative: {
        start: { x: start.x - offsetX, y: start.y + offsetY },
        end: { x: end.x - offsetX, y: end.y + offsetY }
      }
    }
  }

  const calculateLineThickness = (sizePercent: number) => {
    return minFlowLineThickness +
      ((maxFlowLineThickness - minFlowLineThickness) * sizePercent / 100)
  }

  const clearFlows = () => {
    const svg = d3.select(svgRef.current)
    svg.selectAll("line").remove()
  }

  const clearSVG = () => {
    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()
  }

  const resetGlobalVariables = () => {
    setNoOfBubbles(null)
    setBubbles([])
    setFocusBubbleId(null)
    setFlows([])
    setLoadedFlowData(null)
    setOuterRingRadius(null)
  }

  const render = async () => {
    if (!svgRef.current) {
      console.error('SVG ref not available')
      return
    }

    try {
      // Clear existing content
      const svg = d3.select(svgRef.current)
      svg.selectAll("*").remove()

      // Load bubble data
      const bubbleData = await loadBubbleData()
      if (!bubbleData || !bubbleData.length) {
        console.error('No bubble data available')
        return
      }
      
      // Update bubbles state and wait for it to be reflected
      setBubbles(bubbleData)
      
      // Load flow data while state updates
      await loadFlowData()
      
      // Use the actual bubble data for drawing, don't rely on state
      drawBubblesWithData(bubbleData)
      drawFlows()
    } catch (error) {
      console.error('Error rendering visualization:', error)
    }
  }

  const drawBubblesWithData = (bubbleData: any[]) => {
    if (!svgRef.current || !bubbleData.length) {
      console.error('SVG ref or bubbles not available:', { 
        svgRef: !!svgRef.current, 
        bubblesLength: bubbleData.length 
      });
      return;
    }

    const svg = d3.select(svgRef.current)
    
    // Clear existing bubbles
    svg.selectAll("g.bubble").remove();
    
    const bubbleGroups = svg.selectAll("g.bubble")
      .data(bubbleData)
      .enter()
      .append("g")
      .attr("transform", d => `translate(${d.x},${d.y})`)
      .on("click", (event, d) => {
        const newFocusState = !d.focus
        const updatedBubbles = bubbleData.map(b => ({
          ...b,
          focus: b.id === d.id ? newFocusState : false
        }))
        setBubbles(updatedBubbles)
        setFocusBubbleId(newFocusState ? d.id : null)
      })

    // Add circles
    bubbleGroups.append("circle")
      .attr("r", d => d.radius)
      .attr("fill", d => d.color)
      .attr("class", "bubble")

    // Add labels
    bubbleGroups.append("text")
      .attr("dy", ".3em")
      .style("text-anchor", "middle")
      .style("fill", "#ffffff")
      .style("font-size", "12px")
      .text(d => d.label)
  }

  return (
    <div className="relative w-full h-full">
      <div id="flow-type-container" className="absolute top-4 right-4">
        <div>FlowType :</div>
        <Select onValueChange={(value) => setFlowType(value)} defaultValue={flowType}>
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
        <div className="mt-4">
          <Checkbox
            id="centreFlowCheckbox"
            checked={centreFlow}
            onCheckedChange={(checked) => setCentreFlow(checked as boolean)}
          />
          <label htmlFor="centreFlowCheckbox" className="ml-2">
            Centre Flow
          </label>
        </div>
      </div>

      <div id="filter-threshold-container" className="absolute top-4 left-4">
        <div>Filter Threshold :</div>
        <Slider
          defaultValue={[0]}
          max={100}
          step={1}
          onValueChange={(value) => setNetFlowFilterThreshold(value[0])}
        />
      </div>

      <svg ref={svgRef} id="svg-container"></svg>
    </div>
  )
}

export default Datasphere
