export interface SourceMetadata {
  title: string;
  url: string;
  snippet: string;
  timestampFetched: string;
}

export interface IngestionPayload {
  agentId: string;
  timestamp: string;
  rawPayloads: Array<{
    source: string;
    statusCode: number;
    data: any;
  }>;
}

export interface LLMProcessingContext {
  systemPrompt: string;
  dynamicContextChunk: string;
  maxTokensOutput: number;
  temperature: number;
}
