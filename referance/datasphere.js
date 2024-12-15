

// API Configuration
const apiUrl = "http://localhost/DS";
const bubblesApi = "cubeapi/GetItems.json";
const flowsApi = "cubeapi/GetFlows.json";

//Canvas configuration
canvasWidth = 1500;
canvasHeight = 1550;

const svg = d3.select("#svg-container")
  .attr("width", canvasWidth)
  .attr("height", canvasHeight)
  .attr("viewBox", `0 0 ${canvasWidth} ${canvasHeight}`);

// Global Configuration
let flowType = "two-way flows";
let centreFlow = false;
let netFlowFilterThreshold = 0; //controlled by slider
const outerRingVisibility = false;
const positionCircleVisibility = false;
const maxOuterRingRadius = 100;
const minFlowLineThickness = 2;
const maxFlowLineThickness = 15;
const minMarkerSize = 10;
const maxMarkerSize = 35;
const parallelOffsetBtwFlowLines = 10;

//Position Circle Configuration
const marginForPositionCircle = 140;
const minDistanceBetweenRings = 80;
const minDistanceBetweenBubbleAndRing = 20;
const minBubbleRadiusPercentage = 0.2;
const labelOffset = 20;
const highContrastColors = [
  "#FF5733", "#03a9f4", "#5733FF", "#FF33A6", "#33FF00",
  "#FF0033", "#FFE701", "#33C866", "#d289ff", "#009688",
  "#ff98a1", "#FF3366", "#3382FF", "#A633FF", "#FF33F0",
  "#9DFF33", "#FF4033", "#335DFF", "#E733FF", "#FF338C"
];

let positionCircleRadius = Math.min(canvasWidth, canvasHeight) / 2 - marginForPositionCircle;
let noOfBubbles = null;
let bubbles = null;
let focusBubbleId = null;
let flows = null;
let loadedflowData = null;
let outerRingRadius = null;
let datasphereMode = "Normal";

// Create a tooltip
const tooltip = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

function filterByPercentRanks(arr, valueKey, threshold = null) {
  console.log(arr, valueKey, threshold);
  let values = arr.map(item => item[valueKey]);
  values.sort((a, b) => a - b);
  let len = values.length;
  arr.forEach(item => {
    if(len <= 1) {
      item.percentRank = 100;
    } else {
      let value = item[valueKey];
      let rank = 0;
      for (let i = 0; i < len; i++) {
        if (values[i] < value) {
          rank++;
        }
      }
      let adjustedPercentile = (rank / (len - 1)) * 100;
      item.percentRank = adjustedPercentile;
    }
  });

  if (threshold !== undefined) {
    arr = arr.filter(item => item.percentRank >= threshold);
  }

  return arr;
}

function calculateRelativeSizePercent(array, sizeProperty1, sizeProperty2 = null) {

  // If sizeProperty2 is provided, find the overall min and max across both properties
  let minSize, maxSize;
  if (sizeProperty2) {
    minSize = Math.min(...array.map(obj => Math.min(obj[sizeProperty1], obj[sizeProperty2])));
    maxSize = Math.max(...array.map(obj => Math.max(obj[sizeProperty1], obj[sizeProperty2])));
  } else {
    // If sizeProperty2 is not provided, find the min and max for sizeProperty1 only
    minSize = Math.min(...array.map(obj => obj[sizeProperty1]));
    maxSize = Math.max(...array.map(obj => obj[sizeProperty1]));
  }

  const sizeRange = maxSize - minSize;

  // Map over the array to calculate and assign the sizePercent for each object
  const updatedArray = array.map(obj => {
    // Calculate sizePercent for sizeProperty1
    const sizePercent1 = sizeRange > 0 ? ((obj[sizeProperty1] - minSize) / sizeRange) * 100 : 100;
    const updatedObj1 = {
      ...obj,
      ['sizePercent_' + sizeProperty1]: parseFloat(sizePercent1.toFixed(2))
    };

    // If sizeProperty2 is provided, calculate sizePercent for sizeProperty2
    if (sizeProperty2) {
      const sizePercent2 = sizeRange > 0 ? ((obj[sizeProperty2] - minSize) / sizeRange) * 100 : 100;
      return {
        ...updatedObj1,
        ['sizePercent_' + sizeProperty2]: parseFloat(sizePercent2.toFixed(2))
      };
    }

    return updatedObj1;
  });

  return updatedArray;
}

function updateVisualization() {
  const bubbleGroups = svg.selectAll("g");
  const isAnyBubbleFocused = bubbles.some(b => b.focus);

  bubbleGroups.each(function (d) {
    const bubble = d3.select(this);

    const hasSignificantFlow = flows.some(flow =>
      (flow.from === d.id || flow.to === d.id)
    );

    if (isAnyBubbleFocused) {
      const hasConnection = flows.some(flow =>
        (flow.from === d.id || flow.to === d.id) &&
        (flow.absolute_netFlow !== 0 || flow.absolute_inFlow !== 0 || flow.absolute_outFlow !== 0) &&
        (bubbles.some(b => (b.id === flow.to || b.id === flow.from) && b.focus))
      );

      //console.log(`Bubble ${d.id} hasConnection: ${hasConnection}`);


      if (d.focus || hasConnection) {
        bubble.classed("highlighted", true)
          .select("circle")
          .transition()
          .duration(200)
          .style("stroke", d.focus ? "#FFF" : null)
          .style("stroke-width", d.focus ? "8px" : "0px");
        bubble.transition().duration(500).attr("opacity", 1);
      } else {
        bubble.classed("highlighted", false)
          .select("circle")
          .transition()
          .duration(200)
          .style("stroke", null)
          .style("stroke-width", "0px");
        bubble.transition().duration(500).attr("opacity", 1);
      }
    } else {
      bubble.classed("highlighted", false)
        .select("circle")
        .transition()
        .duration(200)
        .style("stroke", null)
        .style("stroke-width", "0px");
      bubble.transition().duration(500).attr("opacity", hasSignificantFlow ? 1 : 1);
    }
  });

  clearFlows();  // Clear existing flows
  drawFlows();   // Draw the new set of flows
  //console.log(`Focused bubble:`, bubbles.find(b => b.focus));
}

// Load Bubble Data
async function loadBubbleData() {
  const postData = {
    "strVariableName": "HD_MERCHANT",
    "byAggregating": "IDs"
  }
  let response = await fetch(`${apiUrl}/${bubblesApi}?_=${new Date().getTime()}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify(postData),
  });

  // Check if the request was successful
  if (!response.ok) {
    throw new Error('Failed API request to load Bubble Data :  ' + response.statusText);
  }

  let data = await response.json();

  // Compute the relative size of each item based on sizeRank
  data = calculateRelativeSizePercent(data, 'itemSize_absolute');

  // Compute the outer ring radius
  noOfBubbles = data.length;
  outerRingRadius = Math.min((2 * Math.PI * positionCircleRadius - (noOfBubbles - 1) * minDistanceBetweenRings) / (2 * noOfBubbles), maxOuterRingRadius);

  // Determine the maximum and minimum bubble radius
  const maxBubbleRadius = outerRingRadius - minDistanceBetweenBubbleAndRing;
  const minBubbleRadius = minBubbleRadiusPercentage * maxBubbleRadius;

  return data.map((d, index) => {
    const rankPercentage = d.sizePercent_itemSize_absolute;
    const scaledRadius = minBubbleRadius + (maxBubbleRadius - minBubbleRadius) * (rankPercentage / 100);

    const angle = (2 * Math.PI * index) / noOfBubbles;
    const x = canvasWidth / 2 + positionCircleRadius * Math.cos(angle);
    const y = canvasHeight / 2 + positionCircleRadius * Math.sin(angle);

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
}

function drawBubbles() {
  // Drawing the positioning circle if visibility is set to true
  if (positionCircleVisibility) {
    svg.append("circle")
      .attr("cx", canvasWidth / 2)
      .attr("cy", canvasHeight / 2)
      .attr("r", positionCircleRadius)
      .attr("fill", "none")
      .attr("stroke", "#999")
      .attr("stroke-width", "1");
  }

  // // Drawing the central circle as part of the bubble groups
  // const centralBubble = svg.append("g").attr('data-id', 'centreCircle');

  // centralBubble.append("circle")
  //   .attr("id", 'centreCircle')
  //   .attr("cx", canvasWidth / 2)
  //   .attr("cy", canvasHeight / 2)
  //   .attr("r", 0.1 * positionCircleRadius) // Adjust the radius as needed
  //   .attr("fill", "red") // Set your desired fill color
  //   .attr("stroke", "#999") // Set your desired stroke color
  //   .attr("stroke-width", "1");

  // // Append the label for the central circle if needed
  // centralBubble.append("text")
  //   .attr("x", canvasWidth / 2)
  //   .attr("y", canvasHeight / 2)
  //   .attr("text-anchor", "middle")
  //   .attr("fill", "#fff") // Set your desired text color
  //   .attr("font-size", "32px") // Set your desired font size
  //   .attr("font-weight", "bold")
  //   .text("Central Label"); // Replace with your desired text


  // Push a centre Bubble with id = noOfBubbles
  bubbles.push({
    id: noOfBubbles,
    label: "Major Chains",
    radius: 0.1 * positionCircleRadius,
    x: canvasWidth / 2,
    y: canvasHeight / 2,
    angle: 0,
    color: "white",
    focus: false,
    itemSizeAbsolute: 0,
    sizeRankPercentage: 0
  });

  console.log("BUBBLES:", bubbles);

  // Create a group for each bubble
  const bubbleGroups = svg.selectAll("g.bubble")
    .data(bubbles)
    .enter()
    .append("g")
    .attr('data-id', d => d.id)
    .attr('class', 'bubble')
    .attr("opacity", 1)  // Set an initial opacity when the bubbles are created
    .on('click', async function (clickedBubble) {
      // If clicked bubble is not centreCircle
      if (clickedBubble.id != noOfBubbles) {
        if (clickedBubble.focus) {
          // If the bubble was already focused, then unfocus and return to normal mode
          clickedBubble.focus = false;
          focusBubbleId = null;
          datasphereMode = "Normal";
          // if (flowType == "netFlow") {
          //   d3.select("#centreFlowCheckbox").property("checked", true);
          //   d3.select("#centreFlowCheckbox").dispatch("change");
          // }
        } else {
          // Reset focus for all bubbles
          bubbles.forEach(b => b.focus = false);

          // Focus the clicked bubble
          clickedBubble.focus = true;
          datasphereMode = "Drilldown";
          focusBubbleId = clickedBubble.id;
          // d3.select("#centreFlowCheckbox").property("checked", false);
          // d3.select("#centreFlowCheckbox").dispatch("change");
          //resetSlider();  // Reset the slider
        }
        // Update visualization based on focus
        prepareFlowData();
        updateVisualization();
      }

    });

  bubbleGroups.on("mouseover", function (d) {
    if (d.id != noOfBubbles) {
      tooltip.transition()
        .duration(200)
        .style("opacity", .9);
      tooltip.html(`${formatNumber(d.itemSizeAbsolute)} people visited ${d.label}`)
        .style("left", (d3.event.pageX) + "px")
        .style("top", (d3.event.pageY - 28) + "px");
    }
  })
    .on("mouseout", function () {
      tooltip.transition()
        .duration(500)
        .style("opacity", 0);
    });



  // Append the main circle for each bubble
  bubbleGroups.append("circle")
    .attr("id", d => d.id)
    .attr("cx", d => d.x)
    .attr("cy", d => d.y)
    .attr("r", d => d.radius)
    .attr("data-value", d => d.itemSizeAbsolute)
    .attr("title", d => d.id == noOfBubbles ? "" : `${formatNumber(d.itemSizeAbsolute)} people visited ${d.label}.`)
    .attr("fill", d => d.id == noOfBubbles ? "" : d.color);

  // Append the outer ring for each bubble
  if (outerRingVisibility) {
    bubbleGroups.append("circle")
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", outerRingRadius)  // Radius of bubble + distance to create the ring
      .attr("fill", "none")
      .attr("stroke", d => d.color)
      .attr("stroke-dasharray", "5,5");  // Dashed stroke
  }

  // Append the text/label for each bubble
  bubbleGroups.append("text")
    .attr("x", (d) => {
      return d.x + (Math.cos(d.angle) * (d.radius + (outerRingRadius - 10))); // Adjust 10 for a little spacing
    })
    .attr("y", (d) => {
      return d.y + (Math.sin(d.angle) * (d.radius + (outerRingRadius - labelOffset)));
    })
    .attr("text-anchor", "middle")
    .attr("fill", d => d.color)
    .attr("font-size", "32px")
    .attr("font-weight", "bold")
    .text(d => d.id == noOfBubbles ? "" : d.label);
}

// load Flow Data
async function loadFlowData() {
  const postData = {
    "strVariableName": "HD_MERCHANT",
    "flowCountingUnit": "records",
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
  });

  // Check if the request was successful
  if (!response.ok) {
    throw new Error('Failed API request to load Flow Data :  ' + response.statusText);
  }

  let data = await response.json();

  loadedflowData = data.flows_absolute;

  // Prepare/Transform the data
  prepareFlowData();
}

function prepareFlowData() {

  const filtered = {};

  // Filter duplicate flows
  Object.keys(loadedflowData).forEach((key, val) => {
    const cleanedKey = key.replace(/'/g, '');
    const reversedKey = cleanedKey.split(",").reverse().join(",");
    if (!filtered[reversedKey]) {
      filtered[cleanedKey] = loadedflowData[key];
    }
  });

  // Build uniqueFlows array
  const uniqueFlows = [];
  for (let key in filtered) {
    const flow = filtered[key];
    const adjustedKey = key.replace(/'/g, ""); // Removes single quotes
    const nodes = adjustedKey.split(',').map(Number);
    [from, to] = nodes;

    // If focusBubbleId is provided, filter flows to only include flows from/to the selected bubble
    if ((focusBubbleId || focusBubbleId === 0) && from !== focusBubbleId && to !== focusBubbleId) {
      continue;
    }

    // If focusBubbleId is provided, focusBubbleId should be the 'from' bubble
    if ((focusBubbleId || focusBubbleId === 0) && to === focusBubbleId) {
      uniqueFlows[key] = {
        from: to,
        to: from,
        absolute_inFlow: flow.outFlow,
        absolute_outFlow: flow.inFlow,
        absolute_netFlowDirection: flow.inFlow >= flow.outFlow ? "inFlow" : "outFlow",
        absolute_netFlow: Math.abs(flow.inFlow - flow.outFlow)
      };
    } else {
      uniqueFlows[key] = {
        from: from,
        to: to,
        absolute_inFlow: flow.inFlow,
        absolute_outFlow: flow.outFlow,
        absolute_netFlowDirection: flow.inFlow >= flow.outFlow ? "inFlow" : "outFlow",
        absolute_netFlow: Math.abs(flow.inFlow - flow.outFlow)
      };
    }
  }

  let flowDataArray = Object.values(uniqueFlows);

  if (centreFlow) {
    flowDataArray = prepareCentreFlowData(flowDataArray);
  }

  console.log("FOCUSBUBBLE:", focusBubbleId);
  console.log("FOCUSFLOWARRAY:", flowDataArray);

  if (flowType === 'two-way flows') {
    flowDataArray = filterByPercentRanks(flowDataArray, 'absolute_netFlow', netFlowFilterThreshold);
    flowDataArray = calculateRelativeSizePercent(flowDataArray, 'absolute_inFlow', 'absolute_outFlow');
  } else if (flowType === 'netFlow') {
    flowDataArray = filterByPercentRanks(flowDataArray, 'absolute_netFlow', netFlowFilterThreshold);
    flowDataArray = calculateRelativeSizePercent(flowDataArray, 'absolute_netFlow');
  } else if (flowType === 'inFlow only') {
    flowDataArray = filterByPercentRanks(flowDataArray, 'absolute_inFlow', netFlowFilterThreshold);
    flowDataArray = calculateRelativeSizePercent(flowDataArray, 'absolute_inFlow');
  } else if (flowType === 'outFlow only') {
    flowDataArray = filterByPercentRanks(flowDataArray, 'absolute_outFlow', netFlowFilterThreshold);
    flowDataArray = calculateRelativeSizePercent(flowDataArray, 'absolute_outFlow');
  } else if (flowType === 'interaction') {
    flowDataArray = filterByPercentRanks(flowDataArray, 'absolute_netFlow', netFlowFilterThreshold);
    flowDataArray = calculateRelativeSizePercent(flowDataArray, 'absolute_netFlow');
  }

  flows = flowDataArray;
  console.log("FLOWS:", flows);
  return flowDataArray;
}

function prepareCentreFlowData(flowData) {

  let centreflowArray = [];
  let returnArray = [];

  // Iterate over flows array
  flowData.forEach((flo) => {

    // Get bubble ids
    const from = flo.from;
    const to = flo.to;

    // Initialize sums if first time seeing bubble
    if (!centreflowArray[from]) {
      centreflowArray[from] = {
        totalInFlow: 0,
        totalOutFlow: 0,
      };
    }
    if (!centreflowArray[to]) {
      centreflowArray[to] = {
        totalInFlow: 0,
        totalOutFlow: 0,
      };
    }

    // Sum the flows
    centreflowArray[from].totalOutFlow += flo.absolute_outFlow;
    centreflowArray[from].totalInFlow += flo.absolute_inFlow;
    centreflowArray[to].totalOutFlow += flo.absolute_inFlow;
    centreflowArray[to].totalInFlow += flo.absolute_outFlow;
  });

  // Rebuild flowDataArray
  centreflowArray.forEach((flow, key) => {
    let temp = {};
    temp = {
      from: key,
      to: noOfBubbles,
      absolute_inFlow: flow.totalInFlow,
      absolute_outFlow: flow.totalOutFlow,
      absolute_netFlowDirection: flow.totalInFlow >= flow.totalOutFlow ? "inFlow" : "outFlow",
      absolute_netFlow: Math.abs(flow.totalInFlow - flow.totalOutFlow)
    };

    returnArray.push(temp);
  });

  // Only get flows for focused bubble
  if (focusBubbleId !== null) {
    returnArray = returnArray.filter(flow =>
      flow.from === focusBubbleId || flow.to === focusBubbleId
    );
  }

  return returnArray;
}


function drawFlows() {

  const flowLines = svg.selectAll("line")
    .data(flows, (d, i) => {  // i is the index of the data element
      if (d) {  // Check if d is defined
        return d.from + "-" + d.to;  // Key function to track data join by flow endpoints
      } else {
        console.error('Undefined data point encountered at index:', i);
        return null;
      }
    });
  // Key function to track data join by flow endpoints

  // Exit selection: Remove lines that no longer have associated data
  flowLines.exit()
    .transition()
    .duration(500)  // Duration of fade out transition
    .style("opacity", 0)
    .remove();

  // Enter selection: Create lines for new data
  const newFlowLines = flowLines.enter()
    .append("line")
    .style("opacity", 0);  // Initial opacity 0 for fade in transition

  // Update selection: Merge enter and update selections and set line attributes
  newFlowLines.merge(flowLines)
    .each(flow => {
      drawFlow(flow);
    })
    .transition()
    .duration(500)  // Duration of fade in transition
    .style("opacity", 1);
}

function drawFlow(flow) {
  let fromBubble = bubbles.find(bubble => bubble.id === flow.from);
  let toBubble = bubbles.find(bubble => bubble.id === flow.to);

  if (!fromBubble || !toBubble) {
    console.error('Could not find bubbles for flow:', flow);
    return;
  }

  switch (flowType) {
    case "inFlow only":
      if (flow.absolute_inFlow > 0) {
        // Draw an arrow representing inflow from 'toBubble' to 'fromBubble'
        drawFlowLine(flow, 'inFlow', toBubble, fromBubble);
      }
      break;
    case "outFlow only":
      if (flow.absolute_outFlow > 0) {
        // Draw an arrow representing outflow from 'fromBubble' to 'toBubble'
        drawFlowLine(flow, 'outFlow', fromBubble, toBubble);
      }
      break;
    case "netFlow":
      if (flow.absolute_netFlowDirection === "inFlow") {
        // Draw an arrow representing net - inflow from 'toBubble' to 'fromBubble'
        drawFlowLine(flow, 'netFlow', toBubble, fromBubble);
      } else {
        // Draw an arrow representing net - outflow from 'fromBubble' to 'toBubble'
        drawFlowLine(flow, 'netFlow', fromBubble, toBubble);
      }
      break;
    case "interaction":
      // Draw a node representing interaction between 'fromBubble' and 'toBubble'
      drawFlowLine(flow, 'interaction', fromBubble, toBubble);
      break;
    case "two-way flows":
      if (flow.absolute_inFlow > 0) {
        // Draw an arrow representing inflow from 'toBubble' to 'fromBubble'
        drawFlowLine(flow, 'inFlow', toBubble, fromBubble);
      }
      if (flow.absolute_outFlow > 0) {
        // Draw an arrow representing outflow from 'fromBubble' to 'toBubble'
        drawFlowLine(flow, 'outFlow', fromBubble, toBubble);
      }
      break;
  }
}

function drawFlowLine(flow, flowDirection, startBubble, endBubble) {

  let lineColor = startBubble.color;
  const lineThickness = calculateLineThickness(flow["sizePercent_absolute_" + flowDirection]);

  // Calculate starting and ending points of the flow line
  const linePoints = calculateOuterRingPoints(startBubble, endBubble);

  // tooltipTitleText
  let tooltipTitleText = '';
  if (centreFlow) {

    // Marker color should be equivalent to the bubble in the positioning circle
    lineColor = startBubble.id === noOfBubbles ? endBubble.color : startBubble.color;

    switch (flowDirection) {
      case "inFlow":
        tooltipTitleText = `Churn into ${endBubble.label} was ${formatNumber(flow["absolute_" + flowDirection])}.`;
        break;
      case "outFlow":
        tooltipTitleText = `Churn away from ${startBubble.label} was ${formatNumber(flow["absolute_" + flowDirection])}.`;
        break;
      case "netFlow":
        if (flow["absolute_netFlowDirection"] === "inFlow") {
          tooltipTitleText = `Churn into ${endBubble.label} was ${formatNumber(flow["absolute_" + flowDirection])}.`;
        } else {
          tooltipTitleText = `Churn away from ${startBubble.label} was ${formatNumber(flow["absolute_" + flowDirection])}.`;
        }
        break;
      case "interaction":
        tooltipTitleText = `${formatNumber(flow["absolute_" + flowDirection])} people interacted between ${startBubble.label} and ${endBubble.label}.`;
        break;
    }
  } else {
    switch (flowDirection) {
      case "inFlow":
        tooltipTitleText = `${formatNumber(flow["absolute_" + flowDirection])} people came to ${endBubble.label} from ${startBubble.label}.`;
        break;
      case "outFlow":
        tooltipTitleText = `${formatNumber(flow["absolute_" + flowDirection])} people went to ${endBubble.label} from ${startBubble.label}.`;
        break;
      case "netFlow":
        tooltipTitleText = `${formatNumber(flow["absolute_" + flowDirection])} people went from ${startBubble.label} to ${endBubble.label}.`;
        break;
      case "interaction":
        tooltipTitleText = `${formatNumber(flow["absolute_" + flowDirection])} people interacted between ${startBubble.label} and ${endBubble.label}.`;
        break;
    }
  }

  //const tooltipTitleText = `${formatNumber(flow["absolute_" + flowDirection])} people went from ${startBubble.label}(${startBubble.id}) to ${endBubble.label}(${endBubble.id}). (${flowDirection})`;


  // Marker
  let markerType, markerStartId, markerEndId = '';
  if (flowDirection === 'interaction') {
    markerType = 'node';
    markerStartId = `node-start-${startBubble.id}-${endBubble.id}`;
    markerEndId = `node-end-${startBubble.id}-${endBubble.id}`;
  } else {
    markerType = 'arrow';
    markerStartId = ``;
    markerEndId = `arrow-end-${startBubble.id}-${endBubble.id}`;
  }

  // This ensures that sizes outside the range are clamped to the min or max size.
  const markerSizeScale = d3.scaleLinear()
    .domain([minFlowLineThickness, maxFlowLineThickness])
    .range([minMarkerSize, maxMarkerSize])
    .clamp(true);

  // Create Marker - Interaction
  if (markerType === 'node') {
    const markerStart = svg.append("marker")
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
      .attr("r", "4")  // Node radius
      .attr("fill", startBubble.color);

    const markerEnd = svg.append("marker")
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
      .attr("r", "4")  // Node radius
      .attr("fill", endBubble.color);
  }

  // Create Marker - Arrow
  if (markerType === 'arrow') {
    const markerEnd = svg.append("marker")
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
      .attr("fill", lineColor);
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
    .on("mouseover", function () {
      tooltip.transition()
        .duration(200)
        .style("opacity", .9);
      tooltip.html(tooltipTitleText)
        .style("left", (d3.event.pageX) + "px")
        .style("top", (d3.event.pageY - 28) + "px");
    })
    .on("mouseout", function () {
      tooltip.transition()
        .duration(500)
        .style("opacity", 0);
    });


  if (markerType === 'node') {
    flowLine.attr("marker-start", "url(#" + markerStartId + ")");
    flowLine.attr("marker-end", "url(#" + markerEndId + ")");
  } else if (markerType === 'arrow') {
    flowLine.attr("marker-end", "url(#" + markerEndId + ")");
  }
}

function calculateOuterRingPoints(fromBubble, toBubble) {
  const centerStart = calculateOuterRingPoint(fromBubble, toBubble);
  const centerEnd = calculateOuterRingPoint(toBubble, fromBubble);
  const offsetPoints = calculateOffsetPoints(centerStart, centerEnd, parallelOffsetBtwFlowLines);
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
  };
}

function calculateOuterRingPoint(fromBubble, toBubble) {
  const dx = toBubble.x - fromBubble.x;
  const dy = toBubble.y - fromBubble.y;
  const angle = Math.atan2(dy, dx);
  return {
    x: fromBubble.x + outerRingRadius * Math.cos(angle),
    y: fromBubble.y + outerRingRadius * Math.sin(angle)
  };
}


function calculateOffsetPoints(start, end, offset) {
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const offsetX = offset * Math.sin(angle);
  const offsetY = offset * Math.cos(angle);
  return {
    positive: {
      start: { x: start.x + offsetX, y: start.y - offsetY },
      end: { x: end.x + offsetX, y: end.y - offsetY }
    },
    negative: {
      start: { x: start.x - offsetX, y: start.y + offsetY },
      end: { x: end.x - offsetX, y: end.y + offsetY }
    }
  };
}

function calculateLineThickness(sizePercent) {
  return minFlowLineThickness +
    ((maxFlowLineThickness - minFlowLineThickness) * sizePercent / 100);
}

function formatNumber(number) {
  return new Intl.NumberFormat('en-US').format(number);
}

function clearFlows() {
  svg.selectAll("line").remove();  // This assumes that only lines used are for flows
}

function clearSVG() {
  svg.selectAll("*").remove();
}

function resetGlobalVariables() {
  // Reset global variables to their initial state
  noOfBubbles = null;
  bubbles = null;
  focusBubbleId = null;
  flows = null;
  loadedflowData = null;
  outerRingRadius = null;
}

function resetSlider() {
  netFlowFilterThreshold = 0;  // Reset the threshold
  prepareFlowData();
  updateVisualization();
  d3.select("div#slider").select("svg").remove();  // Remove the current slider
  initSlider();  // Initialize the slider again
}

function initSlider() {
  const slider = d3.sliderBottom()
    .min(0)
    .max(100)  // Slider ranges from 0% to 100%
    .width(300)
    .ticks(5)
    .default(0)   // Calculate default slider value
    .on('onchange', async val => {
      netFlowFilterThreshold = val;
      prepareFlowData();
      updateVisualization();
    });

  const g = d3
    .select('div#slider')
    .append('svg')
    .attr('width', 500)
    .attr('height', 100)
    .append('g')
    .attr('transform', 'translate(30,30)');

  g.call(slider);
}

function initFlowTypeDropdown() {
  const flowTypeOptions = [
    { id: "netFlow", value: "Net Flow" },
    { id: "two-way flows", value: "Two-way Flows" },
    { id: "interaction", value: "Interaction" },
    { id: "outFlow only", value: "Out-Flow Only" },
    { id: "inFlow only", value: "In-Flow Only" }
  ];

  const dropdown = d3.select("#flow-type-dropdown-container")
    .append("select")
    .attr("id", "flow-type-dropdown")
    .attr("title", "flow-type-dropdown")
    .on("change", onFlowTypeChange);

  dropdown.selectAll("option")
    .data(flowTypeOptions)
    .enter()
    .append("option")
    .text(d => d.value)
    .attr("value", d => d.id);

  // Set the initial value to the global flowType variable
  dropdown.property("value", flowType);

  function onFlowTypeChange() {
    flowType = d3.select("#flow-type-dropdown").property("value");

    // centreFlow : flowType is netFlow and no bubble is focused
    // if ((flowType === 'netFlow') && (focusBubbleId == null)) {
    //   // trigger checkbox change event to prepare flow data
    //   d3.select("#centreFlowCheckbox").property("checked", true);
    //   d3.select("#centreFlowCheckbox").dispatch("change");
    // } else if (((flowType === 'inFlow only') || (flowType === 'outFlow only') || (flowType === 'interaction') || (flowType === 'two-way flows')) && (focusBubbleId == null)) {
    //   // trigger checkbox change event to prepare flow data
    //   d3.select("#centreFlowCheckbox").property("checked", false);
    //   d3.select("#centreFlowCheckbox").dispatch("change");
    // } else {
    //   prepareFlowData();
    //   updateVisualization();
    // }
    prepareFlowData();
    updateVisualization();
  }

  // Centre Flow Checkbox
  const centreFlowCheckboxContainer = d3.select("#centreflow-checkbox-container");
  const centreFlowCheckbox = centreFlowCheckboxContainer.append("input")
    .attr("type", "checkbox")
    .attr("id", "centreFlowCheckbox");

  centreFlowCheckboxContainer.append("label")
    .attr("for", "centreFlowCheckbox")
    .text("Centre Flow");

  d3.select("#centreFlowCheckbox").on("change", function () {
    centreFlow = d3.select(this).property("checked");
    prepareFlowData();
    updateVisualization();
    console.log("Checkbox state changed:", centreFlow);
  });

}

async function render() {

  // Load bubble data
  const bubbleData = await loadBubbleData();

  // Set bubble data
  bubbles = bubbleData;

  // Draw bubbles
  drawBubbles();

  // Load flow data
  await loadFlowData();

  // Draw flows
  drawFlows();

  // Slider and dropdown initialization
  const existingSlider = d3.select('div#slider').select('svg');
  if (existingSlider.empty()) {
    initSlider();
  }
  initFlowTypeDropdown();
}

render();