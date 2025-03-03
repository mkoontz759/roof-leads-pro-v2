import { connectDB } from '@/lib/mongodb'
import { MLSAgent, MLSListing, MLSSource } from '@/lib/models/mls'
import { SyncHistory } from '@/lib/models/sync-history'
import { syncSparkData, syncSparkDataIncremental } from '@/lib/services/spark-sync'

// This interface ensures each MLS provider implementation follows the same pattern
export interface MLSSyncProvider {
  syncFull(): Promise<SyncResult>
  syncIncremental(): Promise<SyncResult>
  testConnection(): Promise<boolean>
  getSourceName(): MLSSource
}

// Unified result format for all MLS sync operations
export interface SyncResult {
  success: boolean
  source: MLSSource
  listings?: {
    processed: number
    upserted: number
  }
  agents?: {
    processed: number
    upserted: number
  }
  error?: string
}

// Main service that handles MLS sync operations
export class MLSSyncService {
  private providers: Map<MLSSource, MLSSyncProvider>;
  
  constructor() {
    // Initialize with available providers
    this.providers = new Map();
    
    // Register the Spark API provider
    // This will be expanded as more providers are added
    this.registerProvider(new SparkSyncProvider());
  }
  
  registerProvider(provider: MLSSyncProvider) {
    this.providers.set(provider.getSourceName(), provider);
  }
  
  async syncAll(type: 'full' | 'incremental' = 'incremental'): Promise<SyncResult[]> {
    const results: SyncResult[] = [];
    
    // Sync all registered providers
    // Use Array.from to convert Map values to array to avoid iteration issues
    for (const provider of Array.from(this.providers.values())) {
      try {
        const result = type === 'full' 
          ? await provider.syncFull() 
          : await provider.syncIncremental();
        
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          source: provider.getSourceName(),
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return results;
  }
  
  async syncSource(source: MLSSource, type: 'full' | 'incremental' = 'incremental'): Promise<SyncResult> {
    const provider = this.providers.get(source);
    
    if (!provider) {
      return {
        success: false,
        source,
        error: `Provider not found for source: ${source}`
      };
    }
    
    try {
      return type === 'full' 
        ? await provider.syncFull() 
        : await provider.syncIncremental();
    } catch (error) {
      return {
        success: false,
        source,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  async testConnections(): Promise<Record<MLSSource, boolean>> {
    const results = {} as Record<MLSSource, boolean>;
    
    // Use Array.from to convert Map entries to array to avoid iteration issues
    for (const [source, provider] of Array.from(this.providers.entries())) {
      try {
        results[source] = await provider.testConnection();
      } catch (error) {
        results[source] = false;
      }
    }
    
    return results;
  }
}

// Implementation for Spark API
class SparkSyncProvider implements MLSSyncProvider {
  getSourceName(): MLSSource {
    return MLSSource.SPARK;
  }
  
  async syncFull(): Promise<SyncResult> {
    try {
      const result = await syncSparkData('full');
      return {
        success: result.success,
        source: MLSSource.SPARK,
        listings: result.listings,
        agents: result.agents
      };
    } catch (error) {
      return {
        success: false,
        source: MLSSource.SPARK,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  async syncIncremental(): Promise<SyncResult> {
    try {
      // Use the new incremental sync function instead of the quick sync
      const result = await syncSparkDataIncremental();
      return {
        success: result.success,
        source: MLSSource.SPARK,
        listings: result.listings,
        agents: result.agents
      };
    } catch (error) {
      return {
        success: false,
        source: MLSSource.SPARK,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  async testConnection(): Promise<boolean> {
    try {
      // Use the existing testSparkApi function
      const { testSparkApi } = await import('@/lib/spark-api');
      const result = await testSparkApi();
      return result.success;
    } catch (error) {
      return false;
    }
  }
}

// Create and export a singleton instance
export const mlsSyncService = new MLSSyncService(); 