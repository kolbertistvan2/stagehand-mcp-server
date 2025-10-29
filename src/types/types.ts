import type { Stagehand } from "@browserbasehq/stagehand";
import type { Browser, Page } from "playwright-core";
import { ImageContent, TextContent } from "@modelcontextprotocol/sdk/types.js";
import { Tool } from "../tools/tool.js";
import { InputType } from "../tools/tool.js";

export type StagehandSession = {
  id: string; // MCP-side ID
  stagehand: Stagehand; // owns the Browserbase session
  page: Page;
  browser: Browser;
  created: number;
  metadata?: Record<string, any>; // optional extras (proxy, contextId, bbSessionId)
};

export type CreateSessionParams = {
  apiKey?: string;
  projectId?: string;
  modelName?: string;
  modelApiKey?: string;
  browserbaseSessionID?: string;
  browserbaseSessionCreateParams?: any;
  meta?: Record<string, any>;
};

export type BrowserSession = {
  browser: any; // v3 doesn't expose Browser directly
  page: any; // v3 Page is CDP-based, not Playwright Page
  sessionId: string;
  stagehand: Stagehand;
};

export type ToolActionResult =
  | { content?: (ImageContent | TextContent)[] }
  | undefined
  | void;

// Type for the tools array used in MCP server registration
export type MCPTool = Tool<InputType>;
export type MCPToolsArray = MCPTool[];
