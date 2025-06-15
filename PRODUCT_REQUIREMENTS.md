# Product Requirements Document: Datapshere

## Table of Contents
1.  [Introduction](#1-introduction)
2.  [Purpose](#2-purpose)
3.  [Goals](#3-goals)
4.  [Scope](#4-scope)
    *   [4.1. In Scope](#41-in-scope)
    *   [4.2. Out of Scope](#42-out-of-scope)
5.  [Functional Requirements](#5-functional-requirements)
    *   [5.1. User Authentication](#51-user-authentication)
    *   [5.2. Data Visualization](#52-data-visualization)
        *   [5.2.1. Bubble (Node) Representation](#521-bubble-node-representation)
        *   [5.2.2. Flow (Edge) Representation](#522-flow-edge-representation)
        *   [5.2.3. Outer Ring Configuration](#523-outer-ring-configuration)
        *   [5.2.4. Display Logic Conditions](#524-display-logic-conditions)
    *   [5.3. Interactivity](#53-interactivity)
    *   [5.4. Controls and Customization](#54-controls-and-customization)
    *   [5.5. Data Management & Display](#55-data-management--display)
    *   [5.6. Dashboard](#56-dashboard)
6.  [Non-Functional Requirements](#6-non-functional-requirements)
    *   [6.1. Usability](#61-usability)
    *   [6.2. Performance](#62-performance)
    *   [6.3. Scalability](#63-scalability)
    *   [6.4. Maintainability](#64-maintainability)
    *   [6.5. Reliability](#65-reliability)
    *   [6.6. Security](#66-security)
7.  [Data Model](#7-data-model)
    *   [7.1. Bubble Data Structure](#71-bubble-data-structure)
    *   [7.2. Flow Data Structure](#72-flow-data-structure)
    *   [7.3. Overall Data Structure (`FlowData`)](#73-overall-data-structure-flowdata)
8.  [API Dependencies](#8-api-dependencies)
    *   [8.1. Intermediary Backend APIs](#81-intermediary-backend-apis)
    *   [8.2. External API Endpoints](#82-external-api-endpoints)
    *   [8.3. Dependency Acknowledgment](#83-dependency-acknowledgment)
9.  [(Optional) Future Considerations](#9-optional-future-considerations)

## 1. Introduction

Datapshere is an interactive, web-based data visualization tool designed to help users explore and understand complex datasets. Its core capability lies in representing data entities as visually distinct 'bubbles' and the relationships or movements between these entities as 'flows'. Built using modern web technologies, specifically Next.js for the frontend framework and D3.js for powerful data visualization, Datapshere offers a dynamic and engaging way to interact with interconnected data.

## 2. Purpose

The primary purpose of Datapshere is to empower users to visually explore, understand, and analyze complex relationships and flows within their datasets. It aims to transform raw data into actionable insights by providing a clear and intuitive visual representation of how different data points are connected and influence each other.

Datapshere is targeted towards data analysts, business intelligence professionals, researchers, and anyone who needs to make sense of interconnected data structures, such as network traffic, financial transactions, supply chain movements, social network interactions, or any system where entities and their relationships are key to understanding the overall picture.

## 3. Goals

The key objectives for the Datapshere project are:

*   **Intuitive Visualization:** Provide an intuitive and interactive visual interface for network-like data, making complex datasets approachable and easy to comprehend at a glance.
*   **Customization:** Allow users to customize the visualization to focus on specific aspects of their data. This includes filtering by entity types, flow types, adjusting thresholds for flow magnitudes, and modifying visual encodings.
*   **Drill-Down Capabilities:** Enable users to drill down into specific data points (bubbles) or relationships (flows) to access more detailed information and attributes associated with them.
*   **Clear Flow Representation:** Offer a clear, unambiguous, and understandable representation of data magnitudes (e.g., volume, frequency) and directions in flows between entities.
*   **Performance:** Ensure responsive performance and smooth interactions for a good user experience, even with moderately large datasets.
*   **Data Import:** Facilitate easy import of data from common formats (e.g., CSV, JSON) to quickly get started with visualization.
*   **Export & Sharing:** Allow users to export visualizations (e.g., as images or data files) and share their findings with others.

## 4. Scope

### 4.1. In Scope

The following features and functionalities are within the scope of the Datapshere project:

*   **User Authentication:**
    *   Secure user login mechanism to access the application.
*   **Core Data Visualization:**
    *   Data entities will be displayed as 'bubbles' (nodes). Bubble size and labels will be configurable or data-driven.
    *   Relationships or transactions between entities will be represented as 'flows' (edges) connecting the bubbles.
    *   Flow direction will be clearly indicated (e.g., via arrowheads).
    *   Flow magnitude will be visually represented (e.g., through varying line thickness or color intensity).
*   **Interactivity:**
    *   Users can click on a bubble to highlight it, along with its connected flows, and view associated detailed data.
    *   Users can click on a flow to highlight it and view its associated detailed data.
    *   Hovering over bubbles or flows will display tooltips with summary information.
*   **Customization & Filtering:**
    *   Users can select different types of flows to visualize (e.g., "two-way flows", "net flow", "inFlow only", "outFlow only", "interaction flow").
    *   A threshold filter will allow users to display only flows above a certain magnitude.
    *   Functionality to center the visualization on a specific bubble ("focusBubbleId") or a specific flow ("centreFlow").
    *   The application will support both light and dark user interface themes.
*   **Data Display:**
    *   A dedicated panel or table view will display detailed attributes and information for a selected bubble or flow.
*   **Dashboard Interface:**
    *   A primary dashboard will serve as the main user interface, containing the data visualization, controls, and data display areas.
*   **Backend Data Fetching:**
    *   The application will fetch data by making requests to pre-defined API endpoints: `/api/bubbles` for entity data and `/api/flows` for relationship data. These backend endpoints will, in turn, retrieve data from a configured external data source or API.

### 4.2. Out of Scope

The following features and functionalities are explicitly out of scope for the initial version of Datapshere:

*   **Advanced User Management:** User roles, granular permissions, and administrative interfaces beyond a single authenticated user type.
*   **Direct Data Manipulation:** The ability for users to directly input, edit, or delete the underlying data through the Datapshere interface. Datapshere is a visualization tool for existing datasets.
*   **Real-time Data Streaming:** Continuous, real-time updates of the visualization as the underlying data changes. Data will typically be fetched on initial load or when specific user interactions trigger a data refresh.
*   **Saving and Exporting Visualizations:** Features to save the current state of the visualization or export it as an image (e.g., PNG, SVG) or data file (e.g., CSV, JSON of the visualized subset).
*   **Advanced Analytical Tools:** Complex data analysis features, statistical calculations, or predictive modeling capabilities directly within Datapshere. The focus is on visual exploration and understanding of provided data.
*   **User-defined Custom Visual Encodings:** While some customization is in scope (themes, flow types), users will not be able to define arbitrary visual mappings for data attributes beyond what is pre-configured.
*   **Version Control for Visualizations:** Saving different states or versions of a visualization for later review or comparison.

## 5. Functional Requirements

### 5.1. User Authentication
*   **5.1.1. Login:**
    *   Users must be able to log in using credentials (e.g., email/password).
    *   The system shall verify credentials against a user store.
    *   Successful authentication shall grant access to the Datapshere dashboard.
    *   Failed authentication attempts shall display an appropriate error message.
*   **5.1.2. Protected Routes:**
    *   The main Datapshere visualization and dashboard shall be accessible only to authenticated users.

### 5.2. Data Visualization
*   **5.2.1. Bubble (Node) Representation:**
    *   Bubbles shall be rendered as circular elements in an SVG canvas.
    *   Each bubble shall represent a distinct data entity.
    *   Bubble size should be configurable, potentially relative to a data metric (e.g., `itemSize_absolute`).
    *   Each bubble should display a label (`itemLabel`).
    *   Bubbles may have distinct colors for better visual differentiation.
    *   A central bubble might be used in certain views (e.g., "centreFlow" mode).
*   **5.2.2. Flow (Edge) Representation:**
    *   Flows shall be rendered as lines or paths connecting two bubbles.
    *   Flows represent the relationship or movement between the connected bubble entities.
    *   **5.2.2.1. Directionality:** Flows can be directional, indicated by arrowheads or similar visual cues.
    *   **5.2.2.2. Magnitude:** The thickness of a flow line should visually represent its magnitude (e.g., `absolute_inFlow`, `absolute_outFlow`, `absolute_netFlow`). There should be a configurable min/max thickness.
    *   **5.2.2.3. Flow Types:** The system must support different interpretations and displays of flow data:
        *   _Two-way Flows_: Displaying both inflow and outflow between two bubbles if data exists.
        *   _Net Flow_: Displaying a single flow representing the net difference between inflow and outflow.
        *   _Inflow Only_: Displaying only flows directed towards a bubble.
        *   _Outflow Only_: Displaying only flows originating from a bubble.
        *   _Interaction_: Displaying a general interaction without specific direction, possibly using nodes at line ends.
*   **5.2.3. Outer Ring Configuration:**
    *   The visualization may optionally display an outer ring around bubbles, with configurable stroke width, dash array, and opacity.

#### 5.2.4. Display Logic Conditions

The Datapshere visualization is dynamic, and its appearance is directly influenced by user selections and the inherent properties of the data. The following conditions and data attributes significantly affect what is displayed:

*   **Flow Type Selection (`flowType`):**
    *   **Net Flow:** Displays a single line/arrow per pair of connected bubbles, representing the net magnitude and direction of flow. The direction is determined by `absolute_netFlowDirection`, and thickness by `absolute_netFlow`.
    *   **Two-way Flows:** Can display two separate lines/arrows (or offset lines) between connected bubbles if both `inFlow` and `outFlow` magnitudes exist and are significant. Thickness is determined by `absolute_inFlow` and `absolute_outFlow` respectively.
    *   **Inflow Only:** Only displays flows directed *towards* a selected/relevant bubble, or all incoming flows if no specific bubble is the focus. Thickness is based on `absolute_inFlow`.
    *   **Outflow Only:** Only displays flows originating *from* a selected/relevant bubble, or all outgoing flows if no specific bubble is the focus. Thickness is based on `absolute_outFlow`.
    *   **Interaction:** Displays a single line, typically without arrowheads, representing a general interaction. Thickness may be based on a combined interaction metric or `absolute_netFlow`.

*   **Flow Magnitude Threshold (`threshold`):**
    *   Only flows (or individual components of a two-way flow) whose relevant magnitude (e.g., `absolute_netFlow`, `absolute_inFlow`, `absolute_outFlow`) meets or exceeds the user-defined `threshold` value will be rendered. Flows below this threshold are hidden.

*   **Focus Bubble (`focusBubbleId`):**
    *   When a `focusBubbleId` is set (e.g., by clicking a bubble):
        *   Flows displayed may be filtered to only those directly connected to the focused bubble.
        *   The layout might re-center or adjust to emphasize the focused bubble and its immediate connections.
        *   The calculation of `inFlow` or `outFlow` for "Inflow Only" / "Outflow Only" modes becomes relative to this focused bubble.

*   **Centre Flow Mode (`centreFlow`):**
    *   When `centreFlow` mode is active:
        *   Flows may be re-calculated to show aggregate flows from individual bubbles to a conceptual central point or entity (representing, for example, "Major Chains" as seen in `referance/datasphere.js`).
        *   Alternatively, if a `focusBubbleId` is also active, this mode might alter how its flows are displayed in relation to the overall system or other bubbles. The exact behavior depends on the interplay between `centreFlow` and `focusBubbleId`.

*   **Data-Driven Visual Attributes:**
    *   **Bubble Size:** The visual radius of a bubble is primarily determined by its `itemSize_absolute` data property, scaled relative to other bubbles (often using `sizeRankPercentage`).
    *   **Flow Thickness:** The thickness of flow lines is determined by the magnitude of the relevant flow metric (e.g., `sizePercent_absolute_netFlow`, `sizePercent_absolute_inFlow`, `sizePercent_absolute_outFlow`), scaled within a defined min/max thickness range.
    *   **Flow Color:** Flow lines typically inherit color from their source bubble, but this can vary based on specific interaction designs.

*   **Outer Ring Visibility (`outerRingConfig`):**
    *   The optional display of an outer ring around bubbles, along with its stroke width, dash style, and opacity, is controlled by the `outerRingConfig` prop passed to the Datasphere component. If `outerRingConfig.show` is false or the config is not provided, these rings are not rendered.

*   **Theme Selection (Light/Dark):**
    *   The active theme affects the colors of the background, text, bubbles, and flows to ensure readability and visual appeal in the chosen mode. Color definitions for visual elements are adjusted accordingly.

These conditions work in concert to provide a flexible and insightful visualization tailored to the user's current analytical focus.

### 5.3. Interactivity
*   **5.3.1. Bubble Interaction:**
    *   **5.3.1.1. Click:** Clicking a bubble shall select it. This may trigger:
        *   Highlighting the selected bubble (e.g., changing its border or style).
        *   Filtering flows to show only those connected to the selected bubble if in a "focus" mode (`focusBubbleId`).
        *   Displaying detailed data associated with the bubble in a separate panel/table (`setTableData`).
    *   **5.3.1.2. Hover:** Hovering over a bubble shall display a tooltip with summary information (e.g., label, size metric).
*   **5.3.2. Flow Interaction:**
    *   **5.3.2.1. Click:** Clicking a flow line shall select it. This may trigger:
        *   Highlighting the selected flow.
        *   Displaying detailed data associated with the flow in a separate panel/table.
    *   **5.3.2.2. Hover:** Hovering over a flow line shall display a tooltip with summary information (e.g., source, target, magnitude, flow type).
*   **5.3.3. Zooming and Panning:**
    *   Users should be able to zoom in/out and pan the visualization for better exploration, especially with many bubbles.

### 5.4. Controls and Customization
*   **5.4.1. Flow Type Selection:**
    *   Users must be able to select the desired flow type (as listed in 5.2.2.3) from a UI control (e.g., dropdown).
*   **5.4.2. Centre Flow Toggle:**
    *   Users must be able to toggle a "centre flow" mode, which might aggregate flows towards a central point or modify the display based on a central entity.
*   **5.4.3. Threshold Filter:**
    *   Users must be able to set a numerical threshold to filter out flows below a certain magnitude. This should be adjustable via a slider or input field.
*   **5.4.4. Focus Bubble:**
    *   The system shall allow focusing on a specific bubble, potentially altering the layout or filtering flows to be relevant to this bubble (`focusBubbleId`, `setFocusBubbleId`).
*   **5.4.5. Theme Selection:**
    *   Users should be able to switch between light and dark themes for the application interface and visualization.

### 5.5. Data Management & Display
*   **5.5.1. Data Fetching:**
    *   The application shall fetch bubble and flow data from backend API endpoints (`/api/bubbles/route.ts`, `/api/flows/route.ts`).
    *   These backend endpoints, in turn, fetch data from an external, configurable API URL.
*   **5.5.2. Detailed Data Display:**
    *   A dedicated UI component (e.g., a table or information panel) shall display detailed attributes and metrics for a selected bubble or flow.

### 5.6. Dashboard
*   **5.6.1. Main Layout:**
    *   A primary dashboard layout shall host the Datapshere visualization, controls, and data display panels.
*   **5.6.2. Navigation:**
    *   The dashboard may include navigation elements (e.g., sidebar for different views or projects).

## 6. Non-Functional Requirements

### 6.1. Usability
*   **6.1.1. Intuitive Interface:** The visualization and controls should be easy to understand and use, even for users not deeply familiar with graph theory.
*   **6.1.2. Learnability:** New users should be able to quickly learn how to navigate and interpret the Datapshere visualization.
*   **6.1.3. Feedback:** The system should provide clear visual feedback for user interactions (e.g., selections, hover states, loading indicators).
*   **6.1.4. Accessibility:** Consideration should be given to accessibility standards (e.g., color contrast for themes, keyboard navigation if possible for controls).

### 6.2. Performance
*   **6.2.1. Rendering Speed:** The initial rendering of the Datapshere visualization with a typical dataset (e.g., 50-100 bubbles, 100-200 flows) should complete within 5 seconds.
*   **6.2.2. Interaction Responsiveness:** User interactions (clicking, hovering, filtering, theme changes) should result in UI updates within 1 second.
*   **6.2.3. Data Handling Efficiency:** Backend API calls for bubble and flow data should be optimized for efficiency, though performance may be influenced by the external API.

### 6.3. Scalability
*   **6.3.1. Data Volume:** The system should gracefully handle up to 200 bubbles and 400 flows without significant degradation in performance. Performance with larger datasets will be subject to optimization.
*   **6.3.2. Concurrent Users:** For deployments in shared environments, the system should support a small number of concurrent users (e.g., 5-10) without significant performance degradation. (This is a secondary consideration for its primary use case as a specialized tool).

### 6.4. Maintainability
*   **6.4.1. Code Quality:** Code should be well-structured, with comments for complex logic, and adhere to consistent coding standards.
*   **6.4.2. Modularity:** Components should be designed for modularity and reusability, following the existing structure in the `components` directory.
*   **6.4.3. Configurability:** Key parameters, such as API endpoints, must be configurable (e.g., via environment variables).
*   **6.4.4. Testability:** Core logic, particularly data transformation and visualization utility functions, should be designed to be testable.

### 6.5. Reliability
*   **6.5.1. Error Handling:** The application must gracefully handle potential errors, including failed API calls, unexpected data formats, or network issues, providing clear and informative messages to the user.
*   **6.5.2. Stability:** The application should be stable and minimize crashes or freezes during normal user operations.

### 6.6. Security
*   **6.6.1. Authentication:** Secure user authentication mechanisms must be implemented and enforced to protect access to the application and its data.
*   **6.6.2. API Security:** Backend API endpoints (`/api/bubbles`, `/api/flows`) must be protected and only accessible by authenticated users.

## 7. Data Model

Datapshere primarily visualizes two types of data entities: "Bubbles" (representing individual items or nodes) and "Flows" (representing the relationships or movements between these bubbles). The data is expected to be provided to the frontend in a structure that contains arrays of bubble objects and flow objects.

### 7.1. Bubble Data Structure

Each bubble object represents a distinct entity in the visualization. The backend API (`/api/bubbles`) should provide an array of these objects. Key attributes for each bubble include:

*   **`id` / `itemID` (Number/String):** A unique identifier for the bubble.
*   **`label` / `itemLabel` (String):** The textual label displayed for the bubble.
*   **`itemSize_absolute` (Number):** An absolute metric associated with the bubble (e.g., number of visitors, market share). This can influence the bubble's visual size.
*   **`radius` (Number, Calculated):** The visual radius of the bubble on the canvas. This is typically calculated by the frontend based on `itemSize_absolute` and `sizeRankPercentage`, relative to other bubbles.
*   **`x`, `y` (Number, Calculated):** The Cartesian coordinates for positioning the center of the bubble on the SVG canvas. These are calculated by the frontend.
*   **`color` (String):** A hexadecimal or named color code for the bubble's fill.
*   **`sizeRankPercentage` (Number):** The bubble's size metric expressed as a percentage relative to other bubbles, used for scaling.
*   **`tabledata` (Array of Objects):** An array of key-value pairs (e.g., `{ item: "Attribute Name", index: "Value", abs: "Absolute Value" }`) providing detailed information about the bubble, suitable for display in a tabular format when the bubble is selected.
*   **`angle` (Number, Calculated):** The angular position of the bubble, used in circular layouts.
*   **`focus` (Boolean):** A flag indicating if the bubble is currently focused by user interaction.

_Example based on `components/Datasphere/types.ts` (`Bubble` interface) and `referance/datasphere.js` processing:_
```typescript
interface Bubble {
  id: number;
  label: string;
  radius: number; // Calculated
  x: number;      // Calculated
  y: number;      // Calculated
  itemSizeAbsolute: number;
  sizeRankPercentage: number; // Calculated
  color: string;
  focus: boolean; // Interaction state
  // tabledata would be associated via ItemID in the raw data
}

// Raw ItemID structure from types.ts which feeds into Bubble creation
interface ItemID {
  itemID: number;
  itemLabel: string;
  itemSize_absolute: number;
  itemSize_relative: number; // Potentially related to sizeRankPercentage
  tabledata: TableDataItem[];
}
```

### 7.2. Flow Data Structure

Each flow object represents a relationship or movement between two bubbles. The backend API (`/api/flows`) should provide arrays of these objects (potentially categorized, e.g., `flows_brands`, `flows_markets`). Key attributes for each flow include:

*   **`from` (Number/String):** The `id` of the source bubble for the flow.
*   **`to` (Number/String):** The `id` of the target bubble for the flow.
*   **`absolute_inFlow` / `inFlow` (Number):** The magnitude of the flow directed from the `from` bubble into the `to` bubble.
*   **`absolute_outFlow` / `outFlow` (Number):** The magnitude of the flow directed from the `from` bubble out to the `to` bubble.
*   **`absolute_netFlow` (Number):** The net magnitude of the flow. This can be `abs(inFlow - outFlow)` or a separately defined metric representing the primary flow value between the two bubbles.
*   **`absolute_netFlowDirection` (String: "inFlow" | "outFlow" | null):** Indicates the predominant direction of the `absolute_netFlow`.
*   **`interaction` (Number, Optional):** A metric representing a general interaction strength, used when directionality is less important or for a specific "interaction" flow type.
*   **`tabledata` (Array of Objects):** An array of key-value pairs providing detailed information about the flow, suitable for display in a tabular format when the flow is selected.
*   **Derived Visual Properties (Calculated by Frontend):**
    *   `sizePercent_absolute_inFlow` (Number)
    *   `sizePercent_absolute_outFlow` (Number)
    *   `sizePercent_absolute_netFlow` (Number)
    These percentages are calculated relative to other flows and are used to determine visual properties like line thickness.

_Example based on `components/Datasphere/types.ts` (`Flow`, `BrandFlow`, `MarketFlow` interfaces) and `referance/datasphere.js` processing:_
```typescript
interface ProcessedFlow { // Represents the structure after frontend processing
  from: number;
  to: number;
  absolute_inFlow: number;
  absolute_outFlow: number;
  absolute_netFlowDirection: "inFlow" | "outFlow";
  absolute_netFlow: number;
  // Derived properties for visualization:
  sizePercent_absolute_inFlow?: number;
  sizePercent_absolute_outFlow?: number;
  sizePercent_absolute_netFlow?: number;
  // tabledata would be associated from BrandFlow/MarketFlow
}

// Raw BrandFlow structure from types.ts
interface BrandFlow {
  from: number;
  to: number;
  outFlow: number;
  inFlow: number;
  interaction: number;
  tabledata?: TableDataItem[];
}
```

### 7.3. Overall Data Structure (`FlowData`)

The frontend application expects to receive a primary data object that encapsulates both the bubble and flow information. This structure is defined by the `FlowData` interface in `components/Datasphere/types.ts`.

*   **`itemIDs` (Array of `ItemID` objects):** This array contains the raw data for each bubble before frontend processing transforms it into the `Bubble` structure used for rendering.
*   **`flows_brands` (Array of `BrandFlow` objects):** An array of flow data specifically categorized as "brand" flows. These will be processed into the common `Flow` structure.
*   **`flows_markets` (Array of `MarketFlow` objects):** An array of flow data specifically categorized as "market" flows. These will also be processed into the common `Flow` structure. The distinction between `flows_brands` and `flows_markets` suggests that the source data might have different types of relationships that could potentially be handled or visualized differently, though the PRD currently implies they are processed into a unified `Flow` model for visualization.

This data model allows Datapshere to represent complex systems with interconnected entities and the varying magnitudes and directions of flows between them. The frontend is responsible for processing this raw data into the specific structures needed for D3.js visualization, including calculating positions, radii, and relative sizes.

## 8. API Dependencies

The Datapshere application relies on external APIs to source its data for visualization. The application's backend, implemented as Next.js API routes, acts as an intermediary, fetching data from these external sources and then providing it to the Datapshere frontend.

### 8.1. Intermediary Backend APIs

Datapshere uses the following Next.js API routes to handle data fetching:

*   **`/api/bubbles/route.ts`:** This route is responsible for fetching the data required to render the "bubbles" (nodes) in the visualization.
*   **`/api/flows/route.ts`:** This route is responsible for fetching the data required to render the "flows" (edges) between the bubbles.

### 8.2. External API Endpoints

These intermediary backend routes make requests (primarily POST, with GET often used for testing or simpler data retrieval scenarios) to external API endpoints. The URLs for these external APIs are constructed dynamically using environment variables, ensuring flexibility and security for different deployment environments.

The key environment variables used are:

*   **`process.env.API_URL`:** This variable defines the base URL for the external API service.
*   **`process.env.BUBBLES_API`:** This variable specifies the specific path or endpoint (relative to `API_URL`) from which bubble data is fetched. The full URL would typically be `${process.env.API_URL}/${process.env.BUBBLES_API}`.
*   **`process.env.FLOWS_API`:** This variable specifies the specific path or endpoint (relative to `API_URL`) from which flow data is fetched. The full URL would typically be `${process.env.API_URL}/${process.env.FLOWS_API}`.

### 8.3. Dependency Acknowledgment

The availability, performance, and correctness of the data visualized within Datapshere are directly dependent on these external APIs. Any issues with these upstream data sources (e.g., downtime, slow responses, changes in data format not anticipated by Datapshere) will impact the Datapshere application.

The detailed request/response structure, authentication mechanisms, and specific parameters for these external APIs are outside the scope of this PRD. However, it is crucial to acknowledge this dependency for development, deployment, and troubleshooting purposes.

## 9. (Optional) Future Considerations

The following are suggestions for potential future enhancements to Datapshere. These items are not part of the current project scope but represent common areas for growth and improvement in data visualization tools.

*   **Advanced Filtering and Searching:** Allow users to filter bubbles and flows based on specific data attributes (e.g., "show only bubbles with attribute X > Y" or "flows related to category Z"), not just magnitude. Implement a search functionality to quickly find and focus on specific bubbles by their label or other attributes.
*   **Data Export:** Enable users to export the current state of the visualization (e.g., as an SVG or PNG image) or the underlying filtered data subset (e.g., as a CSV or JSON file). This was initially listed as a goal but moved out of scope for the MVP.
*   **User-Defined Views/Layouts:** Allow users to save their current visualization configurations (including filter settings, selected flow types, focused bubbles, zoom levels) as named views. Users could then load these views later to quickly return to a specific state of analysis.
*   **Real-time Data Updates:** For datasets that change frequently, explore options for automatically or manually refreshing the visualization to reflect the latest data without requiring a full page reload. This could involve WebSocket connections or periodic polling.
*   **Expanded Data Connectors:** Enhance the backend to support fetching data from a wider variety of sources beyond the current API structure, such as direct database connections (SQL, NoSQL), or other common data storage services.
*   **Enhanced Annotation Tools:** Provide users with the ability to add textual notes, callouts, or other annotations directly onto the visualization canvas to highlight insights or areas of interest for sharing or personal reference.
*   **Comparative Views:** Implement functionality to display two or more Datapshere visualizations side-by-side or overlaid, allowing for comparison of different datasets or different points in time for the same dataset.
*   **User Customization of Visual Encodings:** Grant users more granular control over visual mappings beyond predefined themes. This could include selecting specific color palettes, mapping data attributes to bubble shapes or patterns, or adjusting the range of flow line thicknesses more directly.
*   **Hierarchical/Grouping Visualizations:** For datasets with inherent hierarchies or strong groupings, explore ways to visually represent these structures, such as nested bubbles, expandable/collapsible groups, or different layout algorithms that emphasize clusters.
*   **Performance Optimizations for Very Large Datasets:** Investigate advanced rendering techniques (e.g., WebGL, canvas optimizations) and data aggregation strategies to maintain interactivity with significantly larger datasets (e.g., thousands of bubbles/flows).
