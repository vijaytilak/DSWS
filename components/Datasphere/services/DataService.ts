import { FlowData, Flow } from '../types';
import { ConfigurationService } from './ConfigurationService';
import { isBidirectionalFlowType } from '../utils/flowTypeUtils';
import { FlowType, MetricType } from '../config/ViewConfigurations';
import ViewManager from './ViewManager';

/**
 * DataService
 * Provides centralized access to flow and bubble data
 * Abstracts data source specifics and processing logic
 */
export class DataService {
  private static instance: DataService;
  private configService: ConfigurationService;
  private viewManager: ViewManager;
  private flowData: FlowData | null = null;
  private processedFlows: Flow[] = [];
  private processingComplete: boolean = false;
  
  /**
   * Get singleton instance of DataService
   */
  public static getInstance(): DataService {
    if (!DataService.instance) {
      DataService.instance = new DataService();
    }
    return DataService.instance;
  }
  
  /**
   * Private constructor to enforce singleton
   */
  private constructor() {
    this.configService = ConfigurationService.getInstance();
    this.viewManager = ViewManager.getInstance();
  }
  
  /**
   * Set the raw flow data
   */
  public setFlowData(data: FlowData): void {
    this.flowData = data;
    this.processingComplete = false;
  }
  
  /**
   * Get the raw flow data
   */
  public getFlowData(): FlowData | null {
    return this.flowData;
  }
  
  /**
   * Check if flow data exists
   */
  public hasFlowData(): boolean {
    return this.flowData !== null;
  }
  
  /**
   * Get data source for current view
   */
  public getCurrentViewData(): any[] | undefined {
    if (!this.flowData) return undefined;
    
    const dataSourceKey = this.configService.getDataSourceKey();
    return this.flowData[dataSourceKey];
  }
  
  /**
   * Process flow data for visualization
   * @param flowType The flow type to process
   * @param centreFlow Whether to use centre flow
   * @param threshold Threshold value for filtering
   * @param focusBubbleId ID of the focused bubble
   * @param flowOption Flow metric type ('churn' or 'switching')
   * @returns Processed flow data
   */
  public processFlowData(
    flowType: FlowType,
    centreFlow: boolean,
    threshold: number,
    focusBubbleId: number | null,
    flowOption: MetricType = 'churn'
  ): Flow[] {
    if (!this.flowData) {
      return [];
    }
    
    const isMarketView = this.configService.isMarketView();
    const sourceData = isMarketView ? this.flowData.flows_markets : this.flowData.flows_brands;
    
    // Guard against undefined sourceData
    if (!sourceData) {
      console.warn(`Source data is undefined for ${isMarketView ? 'market' : 'brand'} view`);
      return [];
    }
    
    // Check if this flow type should be rendered as bidirectional
    const bidirectional = isBidirectionalFlowType(
      flowType, 
      isMarketView ? 'Markets' : 'Brands', 
      flowOption
    );
    
    let flows: Flow[] = [];
    
    if (isMarketView) {
      // Process market flows
      flows = sourceData.map((marketFlow: any) => {
        const optionData = marketFlow[flowOption];
        const flowDirection = optionData.net >= 0 ? "inFlow" : "outFlow";
        
        return {
          from: marketFlow.itemID,
          to: this.flowData!.itemIDs.length, // Center bubble ID
          absolute_inFlow: bidirectional ? optionData.both : optionData.in,
          absolute_outFlow: bidirectional ? (100 - optionData.both) : optionData.out,
          absolute_netFlowDirection: flowDirection,
          absolute_netFlow: Math.abs(optionData.net),
          isBidirectional: bidirectional,
          bidirectional_inPerc: bidirectional ? optionData.both : undefined,
          bidirectional_outPerc: bidirectional ? (100 - optionData.both) : undefined,
        };
      });
    } else {
      // Process brand flows
      flows = sourceData
        .filter((brandFlow: any) => {
          // Make sure we have data for this flow option
          const optionDataArray = brandFlow[flowOption];
          return optionDataArray && optionDataArray.length > 0;
        })
        .map((brandFlow: any) => {
          const optionDataArray = brandFlow[flowOption];
          const optionData = optionDataArray[0];
          const flowDirection = optionData.net.perc >= 0 ? "inFlow" : "outFlow";
          
          // For bidirectional flows, use the 'both' value directly from the flow option data
          const bothValue = optionData.both.abs;
          const inValue = optionData.in.abs;
          const outValue = optionData.out.abs;
          
          return {
            from: brandFlow.from,
            to: brandFlow.to,
            absolute_inFlow: bidirectional ? bothValue : inValue,
            absolute_outFlow: bidirectional ? (100 - bothValue) : outValue,
            absolute_netFlowDirection: flowDirection,
            absolute_netFlow: Math.abs(optionData.net.abs),
            // Include the original data arrays
            churn: brandFlow.churn,
            switching: brandFlow.switching,
            // Add bidirectional properties
            isBidirectional: bidirectional,
            bidirectional_inPerc: bidirectional ? optionData.both.in_perc * 100 : undefined,
            bidirectional_outPerc: bidirectional ? optionData.both.out_perc * 100 : undefined,
          };
        });
    }
    
    // Apply threshold filter
    flows = flows.filter((flow) => flow.absolute_netFlow >= threshold);
    
    // Apply center flow processing if required
    if (centreFlow) {
      flows = this.processCentreFlows(flows, this.flowData.itemIDs.length);
    }
    
    // Apply focus filter if required
    if (focusBubbleId !== null) {
      flows = flows.filter((flow) => 
        flow.from === focusBubbleId || flow.to === focusBubbleId
      );
    }
    
    this.processedFlows = flows;
    this.processingComplete = true;
    
    return flows;
  }
  
  /**
   * Process center flows
   */
  private processCentreFlows(flows: Flow[], noOfBubbles: number): Flow[] {
    // Logic for processing center flows
    const result = [...flows];
    // Add processing logic here
    
    return result;
  }
  
  /**
   * Get processed flows
   */
  public getProcessedFlows(): Flow[] {
    return this.processedFlows;
  }
  
  /**
   * Check if data processing is complete
   */
  public isProcessingComplete(): boolean {
    return this.processingComplete;
  }
}

export default DataService;
