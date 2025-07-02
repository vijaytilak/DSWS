import { DataAdapter } from '../../adapters/DataAdapter';
import { FlowIntegrationProcessor } from '../../processors/FlowIntegrationProcessor';
import type { FlowData } from '../../types';

// Mock dependencies
jest.mock('../../processors/FlowIntegrationProcessor');

describe('DataAdapter', () => {
  let dataAdapter: DataAdapter;
  let mockData: FlowData;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock data
    mockData = {
      itemIDs: [
        { itemID: 1, itemLabel: 'Item 1', itemSize_absolute: 100, itemSize_relative: 0.5, tabledata: [] },
        { itemID: 2, itemLabel: 'Item 2', itemSize_absolute: 80, itemSize_relative: 0.4, tabledata: [] }
      ],
      flow_brands: [
        { 
          from: 1, 
          to: 2, 
          absolute_inFlow: 50, 
          absolute_outFlow: 30, 
          absolute_netFlow: 20, 
          absolute_netFlowDirection: 'inFlow',
          tabledata: [] 
        }
      ],
      flow_markets: []
    };
    
    // Mock fetch API
    global.fetch = jest.fn().mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockData)
      })
    );
    
    // Mock FlowIntegrationProcessor
    (FlowIntegrationProcessor as jest.Mock).mockImplementation(() => ({
      processFlowDataSync: jest.fn().mockReturnValue([])
    }));
    
    // Initialize DataAdapter
    dataAdapter = new DataAdapter();
  });
  
  describe('loadData', () => {
    it('should load data from the default path', async () => {
      const result = await dataAdapter.loadData();
      
      expect(result).toEqual(mockData);
      expect(fetch).toHaveBeenCalledWith('/data/ds.json');
    });
    
    it('should load data from a custom path', async () => {
      const customPath = '/custom/path.json';
      const result = await dataAdapter.loadData(customPath);
      
      expect(result).toEqual(mockData);
      expect(fetch).toHaveBeenCalledWith(customPath);
    });
    
    it('should throw an error if fetch fails', async () => {
      global.fetch = jest.fn().mockImplementation(() => 
        Promise.resolve({
          ok: false,
          statusText: 'Not Found'
        })
      );
      
      await expect(dataAdapter.loadData()).rejects.toThrow('Failed to load data: Not Found');
    });
    
    it('should throw an error if data validation fails', async () => {
      global.fetch = jest.fn().mockImplementation(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ itemIDs: 'not an array' })
        })
      );
      
      await expect(dataAdapter.loadData()).rejects.toThrow('Data is missing itemIDs array');
    });
  });
  
  describe('getData', () => {
    it('should return the loaded data', async () => {
      await dataAdapter.loadData();
      const result = dataAdapter.getData();
      
      expect(result).toEqual(mockData);
    });
    
    it('should throw an error if data is not loaded', () => {
      expect(() => dataAdapter.getData()).toThrow('Data not loaded. Call loadData() first.');
    });
  });
  
  describe('processFlowData', () => {
    it('should process flow data with the correct parameters', async () => {
      // Mock the processor's processFlowDataSync method
      const mockProcessFlowDataSync = jest.fn().mockReturnValue([]);
      (FlowIntegrationProcessor as jest.Mock).mockImplementation(() => ({
        processFlowDataSync: mockProcessFlowDataSync
      }));
      
      await dataAdapter.loadData();
      dataAdapter.processFlowData(false, 'net', 'churn', 1, 5, true);
      
      expect(mockProcessFlowDataSync).toHaveBeenCalledWith(
        mockData,
        false,
        'net',
        'churn',
        1,
        5,
        true
      );
    });
    
    it('should throw an error if data is not loaded', () => {
      expect(() => dataAdapter.processFlowData(false, 'net', 'churn')).toThrow('Data not loaded. Call loadData() first.');
    });
  });
  
  describe('processMarketFlowData', () => {
    it('should call processFlowData with isMarketView=true', async () => {
      await dataAdapter.loadData();
      
      const spy = jest.spyOn(dataAdapter, 'processFlowData');
      dataAdapter.processMarketFlowData('net', 'churn', 1, 5, true);
      
      expect(spy).toHaveBeenCalledWith(true, 'net', 'churn', 1, 5, true);
    });
  });
  
  describe('processBrandFlowData', () => {
    it('should call processFlowData with isMarketView=false', async () => {
      await dataAdapter.loadData();
      
      const spy = jest.spyOn(dataAdapter, 'processFlowData');
      dataAdapter.processBrandFlowData('net', 'churn', 1, 5, true);
      
      expect(spy).toHaveBeenCalledWith(false, 'net', 'churn', 1, 5, true);
    });
  });
  
  describe('validateData', () => {
    it('should throw an error if data is null', () => {
      // Using private method through any type casting
      expect(() => (dataAdapter as any).validateData(null)).toThrow('Data is empty or null');
    });
    
    it('should throw an error if itemIDs is not an array', () => {
      expect(() => (dataAdapter as any).validateData({ itemIDs: 'not an array' })).toThrow('Data is missing itemIDs array');
    });
    
    it('should throw an error if flow_brands is not an array', () => {
      expect(() => (dataAdapter as any).validateData({ 
        itemIDs: [],
        flow_brands: 'not an array'
      })).toThrow('Data is missing flow_brands array');
    });
    
    it('should throw an error if flow_markets is not an array', () => {
      expect(() => (dataAdapter as any).validateData({ 
        itemIDs: [],
        flow_brands: [],
        flow_markets: 'not an array'
      })).toThrow('Data is missing flow_markets array');
    });
    
    it('should throw an error if itemID is not a number', () => {
      expect(() => (dataAdapter as any).validateData({ 
        itemIDs: [{ itemID: 'not a number', itemLabel: 'Label' }],
        flow_brands: [],
        flow_markets: []
      })).toThrow('Invalid itemID in itemIDs');
    });
    
    it('should throw an error if itemLabel is not a string', () => {
      expect(() => (dataAdapter as any).validateData({ 
        itemIDs: [{ itemID: 1, itemLabel: 123 }],
        flow_brands: [],
        flow_markets: []
      })).toThrow('Invalid itemLabel in itemIDs');
    });
    
    it('should throw an error if brand flow has invalid from/to', () => {
      expect(() => (dataAdapter as any).validateData({ 
        itemIDs: [{ itemID: 1, itemLabel: 'Label' }],
        flow_brands: [{ from: 'not a number', to: 2 }],
        flow_markets: []
      })).toThrow('Invalid brand flow');
    });
    
    it('should throw an error if market flow has invalid from/to', () => {
      expect(() => (dataAdapter as any).validateData({ 
        itemIDs: [{ itemID: 1, itemLabel: 'Label' }],
        flow_brands: [],
        flow_markets: [{ from: 1, to: 'not a number' }]
      })).toThrow('Invalid market flow');
    });
  });
});
