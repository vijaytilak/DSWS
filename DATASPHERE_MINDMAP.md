# DataSphere Component Mindmap

## Overview
This mindmap shows the flow of functions and files accessed when selecting each menu option in the DataSphere visualization component.

## Component Structure

### Core Component
- **`components/Datasphere/Datasphere.tsx`** - Main component that orchestrates the entire visualization

### Menu Structure

## 1. View Selection (Markets vs Brands)

### 🏢 **Markets View** (Default)
**Menu Location:** Left Sidebar → "Markets"

**Files Accessed:**
- `components/layout/sidebar/app-sidebar.tsx` → `handleViewChange()`
- `app/dashboard/layout.tsx` → `CentreFlowContext` state updates
  - `setIsMarketView(true)`
  - `setCentreFlow(true)`
  - Reset to Churn + Net flow

**Functions Called:**
1. `handleViewChange()` in app-sidebar.tsx
2. Context state updates via `useCentreFlow()`
3. Re-render of `Datasphere.tsx` with new props

**Data Flow:**
- Uses `data.flows_markets` array
- Each market bubble connects to center
- Flow data from `MarketFlow` interface

---

### 🏷️ **Brands View**
**Menu Location:** Left Sidebar → "Brands"

**Files Accessed:**
- `components/layout/sidebar/app-sidebar.tsx` → `handleViewChange()`
- `app/dashboard/layout.tsx` → `CentreFlowContext` state updates
  - `setIsMarketView(false)`
  - `setCentreFlow(false)`

**Functions Called:**
1. `handleViewChange()` in app-sidebar.tsx
2. Context state updates
3. Re-render with brand-specific flow processing

**Data Flow:**
- Uses `data.flows_brands` array
- Brand-to-brand connections
- Flow data from `BrandFlow` interface

---

## 2. Metric Selection

### 📊 **Churn** (Default)
**Menu Location:** Left Sidebar → Metric → "Churn"

**Files Accessed:**
- `components/layout/sidebar/nav-options.tsx` → option selection
- `components/Datasphere/utils/flow.ts` → `prepareFlowData()`
- `components/Datasphere/utils/flowTypeUtils.ts` → `isBidirectionalFlowType()`

**Functions Called:**
1. `onFlowOptionChange('churn')` in nav-options.tsx
2. `prepareFlowData()` with `flowOption: 'churn'`
3. Market view: Uses `marketFlow.churn` data
4. Brand view: Uses `brandFlow.churn[0]` data

**Data Structure Used:**
```typescript
churn: {
  in: { abs, switch_perc, other_perc, switch_index, other_index },
  out: { abs, switch_perc, other_perc, switch_index, other_index },
  net: { abs, perc, index },
  both: { abs, out_perc, in_perc, out_index, in_index }
}
```

---

### 🔄 **Switching**
**Menu Location:** Left Sidebar → Metric → "Switching"

**Files Accessed:**
- Same as Churn but processes switching data

**Functions Called:**
1. `onFlowOptionChange('switching')`
2. `prepareFlowData()` with `flowOption: 'switching'`
3. Uses `marketFlow.switching` or `brandFlow.switching[0]`

**Data Structure Used:**
```typescript
switching: {
  in: { abs, perc, index },
  out: { abs, perc, index },
  net: { abs, perc, index },
  both: { abs, out_perc, in_perc, out_index, in_index }
}
```

---

### ❤️ **Affinity** (Brands Only)
**Menu Location:** Left Sidebar → Metric → "Affinity" (only visible in Brands view)

**Files Accessed:**
- `components/layout/sidebar/nav-options.tsx` → filtered display (`brandsOnly: true`)
- `components/layout/sidebar/app-sidebar.tsx` → forces `netFlow` type

**Functions Called:**
1. `onFlowOptionChange('affinity')`
2. Forces `setFlowType('netFlow')`
3. Hides Flow Type selector (line 119 in app-sidebar.tsx)

**Special Behavior:**
- Only available in Brands view
- Automatically sets flow type to "netFlow"
- Flow Type selector is hidden when Affinity is selected

---

## 3. Flow Type Selection

### ⬆️ **Out Flow**
**Menu Location:** Left Sidebar → Flow Type → "out"

**Files Accessed:**
- `components/layout/sidebar/nav-flowtypes.tsx` → flow type selection
- `components/Datasphere/utils/flow.ts` → flow filtering logic

**Functions Called:**
1. `handleClick()` with `flowType: 'out'`
2. `prepareFlowData()` processes outflow data
3. **Focus Filtering:** When bubble selected, filters to `flow.from === focusBubbleId`
4. Uses `flow.absolute_outFlow` for calculations

**Visualization Logic:**
- Shows flows going OUT from selected bubble
- If no focus: shows all outflows
- Threshold applied to `absolute_outFlow` values

---

### ⬇️ **In Flow**
**Menu Location:** Left Sidebar → Flow Type → "in"

**Functions Called:**
1. `handleClick()` with `flowType: 'in'`
2. **Focus Filtering:** When bubble selected, filters to `flow.to === focusBubbleId`
3. Uses `flow.absolute_inFlow` for calculations

**Visualization Logic:**
- Shows flows going INTO selected bubble
- If no focus: shows all inflows
- Threshold applied to `absolute_inFlow` values

---

### ↔️ **Net Flow**
**Menu Location:** Left Sidebar → Flow Type → "net"

**Functions Called:**
1. `handleClick()` with `flowType: 'net'`
2. **Focus Filtering:** Shows all flows connected to focus bubble (`from` OR `to`)
3. Uses `flow.absolute_netFlow` for calculations
4. Flow direction determined by `absolute_netFlowDirection`

**Visualization Logic:**
- Shows net flow direction (dominant flow)
- Bidirectional display based on `isBidirectionalFlowType()`
- Default for Markets view and when Affinity is selected

---

### ⟷ **Both Flow**
**Menu Location:** Left Sidebar → Flow Type → "both"

**Functions Called:**
1. `handleClick()` with `flowType: 'both'`
2. `isBidirectionalFlowType()` returns `true`
3. Uses `Math.max(absolute_inFlow, absolute_outFlow)` for threshold
4. Special bidirectional rendering

**Visualization Logic:**
- Always shows bidirectional flows
- Uses `bidirectional_inPerc` and `bidirectional_outPerc`
- Visual representation shows both directions simultaneously

---

## 4. Bubble Interaction

### 🎯 **Bubble Click**
**Files Accessed:**
- `components/Datasphere/Datasphere.tsx` → `handleBubbleClick()`
- `app/contexts/table-data-context.tsx` → table data updates

**Functions Called:**
1. `handleBubbleClick(bubble)` in Datasphere.tsx
2. `setFocusBubbleId()` - updates focus state
3. `setFocusedFlow(null)` - clears flow selection
4. `setTableData()` - updates right sidebar table
5. `setSelectedItemLabel()` - updates table header

**Data Flow:**
- Finds bubble data: `data.itemIDs.find(item => item.itemID === bubble.id)`
- Loads table data: `bubbleData.tabledata`
- Updates label: `bubbleData.itemLabel`

**Visual Effects:**
- Filters flows to show only connected flows
- Updates bubble styling (focus state)
- Populates right sidebar with bubble-specific data

---

### 🔗 **Flow Click**
**Files Accessed:**
- Same as bubble click but handles flow-specific data

**Functions Called:**
1. `handleFlowClick(flow)` in Datasphere.tsx
2. `setFocusedFlow()` - updates flow focus state
3. Different logic for Markets vs Brands:

**Markets View Flow Click:**
- Finds: `data.flows_markets.find(f => f.itemID === flow.from)`
- Label: `Market: ${sourceBubble.itemLabel}`

**Brands View Flow Click:**
- Finds: `data.flows_brands.find(f => (f.from === flow.from && f.to === flow.to))`
- Label: `Flow: ${sourceBubble.itemLabel} → ${targetBubble.itemLabel}`

---

## 5. Visualization Rendering

### 🎨 **Core Rendering Pipeline**

**Files Accessed:**
- `components/Datasphere/utils/visualization.ts` → exports
- `components/Datasphere/utils/vis/VisualizationManager.ts`
- `components/Datasphere/utils/vis/bubbleDrawing.ts`
- `components/Datasphere/utils/vis/flowDrawing.ts`

**Functions Called in Order:**
1. `initializeBubbleVisualization()` - calculates bubble positions
2. `drawBubbles()` - renders bubble elements
3. `prepareFlowData()` - processes flow data
4. `drawFlows()` - renders flow lines

**Key Utilities:**
- `useDimensions()` - responsive sizing
- `useTheme()` - dark/light mode handling
- D3.js integration for SVG manipulation

---

## 6. State Management

### 🔄 **Context Providers**

**Global State (dashboard/layout.tsx):**
```typescript
CentreFlowContext: {
  centreFlow: boolean,      // Markets: true, Brands: false
  flowType: string,         // "out", "in", "net", "both"
  isMarketView: boolean,    // Markets: true, Brands: false
  flowOption: FlowOption,   // "churn", "switching", "affinity"
  focusBubbleId: number|null // Selected bubble ID
}
```

**Table Data Context:**
```typescript
TableDataContext: {
  tableData: TableDataItem[],     // Right sidebar data
  selectedItemLabel: string       // Right sidebar header
}
```

---

## 7. Data Flow Summary

### **Menu Selection → Component Updates:**

1. **View Change (Markets/Brands)**
   - `app-sidebar.tsx` → `handleViewChange()`
   - Updates `CentreFlowContext` state
   - Re-renders `Datasphere.tsx` with new `isMarketView` prop

2. **Metric Change (Churn/Switching/Affinity)**
   - `nav-options.tsx` → `onFlowOptionChange()`
   - Updates `flowOption` in context
   - `prepareFlowData()` uses different data arrays

3. **Flow Type Change (out/in/net/both)**
   - `nav-flowtypes.tsx` → `handleClick()`
   - Updates `flowType` in context
   - Changes filtering logic in `prepareFlowData()`

4. **Bubble/Flow Interaction**
   - `Datasphere.tsx` → click handlers
   - Updates focus states and table data
   - Triggers re-render with filtered flows

### **Key Processing Functions:**
- `prepareFlowData()` - Central data processing hub
- `isBidirectionalFlowType()` - Determines visual style
- `handleBubbleClick()` / `handleFlowClick()` - User interactions
- `drawBubbles()` / `drawFlows()` - Visual rendering

---

## 8. File Dependencies Map

```
Datasphere.tsx (MAIN)
├── types.ts (interfaces)
├── utils/
│   ├── flow.ts (data processing)
│   ├── flowTypeUtils.ts (flow logic)
│   ├── visualization.ts (exports)
│   └── vis/
│       ├── VisualizationManager.ts
│       ├── bubbleDrawing.ts
│       └── flowDrawing.ts
├── hooks/
│   └── useDimensions.ts
└── constants/
    └── config.ts

Layout & Context:
├── app/dashboard/layout.tsx (CentreFlowContext)
├── app/contexts/table-data-context.tsx
└── components/layout/sidebar/
    ├── app-sidebar.tsx
    ├── nav-options.tsx
    └── nav-flowtypes.tsx
```

This mindmap provides a comprehensive view of how each menu selection triggers specific functions and accesses particular files in the DataSphere component system.
