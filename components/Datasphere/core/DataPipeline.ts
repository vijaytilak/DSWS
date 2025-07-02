export type PipelineStage<T = unknown, R = unknown> = (input: T) => R;

export interface PipelineStageInfo {
  name: string;
  stage: PipelineStage;
  executionTime?: number;
  error?: Error;
}

/**
 * Generic data processing pipeline that supports chainable operations
 * Provides debugging, error handling, and performance monitoring
 */
export class DataPipeline<T = unknown> {
  private stages: PipelineStageInfo[] = [];
  private debug: boolean = false;

  constructor(initialData?: T) {
    if (initialData !== undefined) {
      this.stages.push({
        name: 'initial',
        stage: () => initialData
      });
    }
  }

  /**
   * Add a processing stage to the pipeline
   */
  addStage<R>(name: string, stage: PipelineStage<T, R>): DataPipeline<R> {
    this.stages.push({
      name,
      stage: stage as unknown as PipelineStage<unknown, unknown>
    });
    return this as unknown as DataPipeline<R>;
  }

  /**
   * Enable debug mode for detailed logging
   */
  enableDebug(): this {
    this.debug = true;
    return this;
  }

  /**
   * Execute the complete pipeline
   */
  execute(): T {
    if (this.stages.length === 0) {
      throw new Error('Pipeline has no stages to execute');
    }

    let result: unknown = undefined;
    const executionLog: PipelineStageInfo[] = [];

    for (let i = 0; i < this.stages.length; i++) {
      const stageInfo = this.stages[i];
      const startTime = performance.now();

      try {
        result = stageInfo.stage(result);
        
        const executionTime = performance.now() - startTime;
        stageInfo.executionTime = executionTime;

        executionLog.push({
          ...stageInfo,
          executionTime
        });

      } catch (error) {
        const executionTime = performance.now() - startTime;
        const pipelineError = error instanceof Error ? error : new Error(String(error));
        
        stageInfo.error = pipelineError;
        stageInfo.executionTime = executionTime;

        console.error(`Pipeline: Stage '${stageInfo.name}' failed after ${executionTime.toFixed(2)}ms:`, pipelineError);
        
        executionLog.push({
          ...stageInfo,
          error: pipelineError,
          executionTime
        });

        throw new Error(`Pipeline failed at stage '${stageInfo.name}': ${pipelineError.message}`);
      }
    }

    if (this.debug) {
      this.logExecutionSummary(executionLog);
    }

    return result as T;
  }

  /**
   * Execute pipeline with error recovery
   */
  executeWithRecovery(fallbackValue: T): T {
    try {
      return this.execute();
    } catch (error) {
      console.warn('Pipeline execution failed, using fallback value:', error);
      return fallbackValue;
    }
  }

  /**
   * Get pipeline stage information
   */
  getStages(): PipelineStageInfo[] {
    return [...this.stages];
  }

  /**
   * Clear all stages
   */
  clear(): this {
    this.stages = [];
    return this;
  }

  /**
   * Clone the pipeline
   */
  clone(): DataPipeline<T> {
    const cloned = new DataPipeline<T>();
    cloned.stages = [...this.stages];
    cloned.debug = this.debug;
    return cloned;
  }

  /**
   * Transform pipeline to handle different data types
   */
  transform<R>(transformer: (data: T) => R): DataPipeline<R> {
    return this.addStage('transform', transformer);
  }

  /**
   * Filter pipeline data
   */
  filter(predicate: (data: T) => boolean): DataPipeline<T> {
    return this.addStage<T>('filter', (data: T) => {
      if (Array.isArray(data)) {
        return data.filter(predicate as (item: unknown) => boolean) as unknown as T;
      }
      return predicate(data) ? data : undefined as unknown as T;
    });
  }

  /**
   * Map over array data
   */
  map<R>(mapper: (item: unknown, index: number) => R): DataPipeline<R[]> {
    return this.addStage<R[]>('map', (data: T) => {
      if (!Array.isArray(data)) {
        throw new Error('Map operation requires array input');
      }
      return data.map(mapper) as R[];
    });
  }

  /**
   * Reduce array data
   */
  reduce<R>(reducer: (acc: R, item: unknown, index: number) => R, initialValue: R): DataPipeline<R> {
    return this.addStage('reduce', (data) => {
      if (!Array.isArray(data)) {
        throw new Error('Reduce operation requires array input');
      }
      return data.reduce(reducer, initialValue);
    });
  }

  /**
   * Sort array data
   */
  sort(compareFn?: (a: unknown, b: unknown) => number): DataPipeline<T> {
    return this.addStage<T>('sort', (data: T) => {
      if (!Array.isArray(data)) {
        throw new Error('Sort operation requires array input');
      }
      return [...data].sort(compareFn) as unknown as T;
    });
  }

  /**
   * Log execution summary
   */
  private logExecutionSummary(executionLog: PipelineStageInfo[]): void {
    const totalTime = executionLog.reduce((sum, stage) => sum + (stage.executionTime || 0), 0);
    const successfulStages = executionLog.filter(stage => !stage.error).length;
    
    // Pipeline execution complete
  }
}
