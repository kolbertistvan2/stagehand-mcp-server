# n8n MCP Client Setup Guide

## Overview

This guide shows how to connect n8n to your Railway-hosted Stagehand MCP Server.

## Prerequisites

- Stagehand MCP Server deployed on Railway with public URL
- n8n instance (cloud or self-hosted)
- Basic understanding of n8n workflows

## Connection Architecture

```
┌─────────┐     HTTP/SHTTP      ┌──────────────┐     WebSocket      ┌────────────┐
│   n8n   │ ──────────────────→ │ Railway MCP  │ ─────────────────→ │ Browserbase│
│ AI Agent│                      │    Server    │                     │  Browser   │
└─────────┘                      └──────────────┘                     └────────────┘
```

## Method 1: Using AI Agent with HTTP Request Tool (Recommended)

### Step 1: Create Base Workflow

1. Open n8n and create a new workflow
2. Add a **Manual Trigger** or **Webhook** node as the starting point

### Step 2: Add AI Agent Node

1. Add an **AI Agent** node
2. Configure the LLM (Gemini, GPT-4, Claude, etc.)
3. Set the agent type to "Tools Agent"

### Step 3: Add HTTP Request Tool

1. In the AI Agent node, click "Add Tool"
2. Select **HTTP Request**
3. Configure the following:

**Tool Name**: `stagehand_browser`

**Tool Description**:

```
Use this tool to automate web browser actions. Available actions:
- navigate: Go to a URL
- act: Click, type, or interact with page elements
- extract: Extract structured data from pages
- screenshot: Take screenshots
- observe: Get page content and structure
```

**Request Settings**:

- **Method**: POST
- **URL**: `https://your-railway-url.up.railway.app/mcp`
- **Authentication**: None (unless you add custom auth)

**Headers**:

```json
{
  "Content-Type": "application/json"
}
```

**Body** (use n8n expressions):

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "{{ $parameter.toolName }}",
    "arguments": {{ $parameter.toolArguments }}
  },
  "id": 1
}
```

### Step 4: Create Session Management Nodes

#### Session Create Node (HTTP Request)

**Method**: POST
**URL**: `https://your-railway-url.up.railway.app/mcp`
**Body**:

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "browserbase_session_create",
    "arguments": {}
  },
  "id": 1
}
```

Save the session ID from response: `{{ $json.result.sessionId }}`

#### Session Close Node (HTTP Request)

**Method**: POST
**URL**: `https://your-railway-url.up.railway.app/mcp`
**Headers**:

```json
{
  "Content-Type": "application/json",
  "mcp-session-id": "{{ $('Session Create').item.json.result.sessionId }}"
}
```

**Body**:

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "browserbase_session_close",
    "arguments": {}
  },
  "id": 1
}
```

### Step 5: Example Complete Workflow

```
[Manual Trigger]
    → [Session Create]
    → [AI Agent with Stagehand Tool]
    → [Session Close]
    → [Output Results]
```

## Method 2: Using Custom MCP Client Node (Advanced)

If you want native MCP protocol support in n8n, you can create a custom node:

### Install n8n MCP Package

```bash
npm install @modelcontextprotocol/sdk
```

### Create Custom Node (n8n-nodes-mcp-client)

This requires developing a custom n8n node. Documentation: https://docs.n8n.io/integrations/creating-nodes/

## Example Workflows

### Workflow 1: Extract Product Data from E-commerce

```json
{
  "nodes": [
    {
      "name": "Manual Trigger",
      "type": "n8n-nodes-base.manualTrigger"
    },
    {
      "name": "Create Session",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "POST",
        "url": "https://your-railway-url.up.railway.app/mcp",
        "jsonParameters": true,
        "bodyParametersJson": "={\"jsonrpc\":\"2.0\",\"method\":\"tools/call\",\"params\":{\"name\":\"browserbase_session_create\",\"arguments\":{}},\"id\":1}"
      }
    },
    {
      "name": "Navigate to Product",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "POST",
        "url": "https://your-railway-url.up.railway.app/mcp",
        "headerParameters": {
          "parameters": [
            {
              "name": "mcp-session-id",
              "value": "={{ $('Create Session').item.json.result.sessionId }}"
            }
          ]
        },
        "jsonParameters": true,
        "bodyParametersJson": "={\"jsonrpc\":\"2.0\",\"method\":\"tools/call\",\"params\":{\"name\":\"browserbase_stagehand_navigate\",\"arguments\":{\"url\":\"https://example.com/product/123\"}},\"id\":1}"
      }
    },
    {
      "name": "Extract Product Data",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "POST",
        "url": "https://your-railway-url.up.railway.app/mcp",
        "headerParameters": {
          "parameters": [
            {
              "name": "mcp-session-id",
              "value": "={{ $('Create Session').item.json.result.sessionId }}"
            }
          ]
        },
        "jsonParameters": true,
        "bodyParametersJson": "={\"jsonrpc\":\"2.0\",\"method\":\"tools/call\",\"params\":{\"name\":\"browserbase_stagehand_extract\",\"arguments\":{\"instruction\":\"Extract product name, price, description, and availability\"}},\"id\":1}"
      }
    },
    {
      "name": "Close Session",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "POST",
        "url": "https://your-railway-url.up.railway.app/mcp",
        "headerParameters": {
          "parameters": [
            {
              "name": "mcp-session-id",
              "value": "={{ $('Create Session').item.json.result.sessionId }}"
            }
          ]
        },
        "jsonParameters": true,
        "bodyParametersJson": "={\"jsonrpc\":\"2.0\",\"method\":\"tools/call\",\"params\":{\"name\":\"browserbase_session_close\",\"arguments\":{}},\"id\":1}"
      }
    }
  ],
  "connections": {
    "Manual Trigger": {
      "main": [[{ "node": "Create Session" }]]
    },
    "Create Session": {
      "main": [[{ "node": "Navigate to Product" }]]
    },
    "Navigate to Product": {
      "main": [[{ "node": "Extract Product Data" }]]
    },
    "Extract Product Data": {
      "main": [[{ "node": "Close Session" }]]
    }
  }
}
```

### Workflow 2: AI-Driven Web Research

Let the AI Agent decide what actions to take:

```
[Manual Trigger with user question]
    → [Session Create]
    → [AI Agent with Stagehand tool]
        - Agent can navigate, extract, screenshot automatically
        - Agent decides when task is complete
    → [Session Close]
    → [Format and return results]
```

## Available MCP Tools

| Tool Name                          | Arguments                            | Description                              |
| ---------------------------------- | ------------------------------------ | ---------------------------------------- |
| `browserbase_session_create`       | `sessionId?` (optional)              | Create or resume browser session         |
| `browserbase_session_close`        | None                                 | Close current session                    |
| `browserbase_stagehand_navigate`   | `url` (string)                       | Navigate to URL                          |
| `browserbase_stagehand_act`        | `action` (string), `url?` (optional) | Perform actions like click, type, scroll |
| `browserbase_stagehand_extract`    | `instruction` (string)               | Extract structured data using AI         |
| `browserbase_stagehand_observe`    | None                                 | Get current page state and DOM           |
| `browserbase_stagehand_screenshot` | `fullPage?` (boolean)                | Take screenshot                          |

## Debugging Tips

### Enable Verbose Logging

Add a **Set** node before AI Agent to log requests:

```json
{
  "requestBody": "={{ $json.body }}",
  "timestamp": "={{ $now }}",
  "sessionId": "={{ $json.sessionId }}"
}
```

### View Browser Sessions

All tool responses include a Browserbase debug URL:

```
https://www.browserbase.com/sessions/{sessionId}
```

Open this URL to watch the browser in real-time.

### Check Railway Logs

```bash
railway logs --tail
```

### Test Tools Manually

Use curl to test individual tools:

```bash
# Create session
curl -X POST https://your-railway-url.up.railway.app/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "browserbase_session_create",
      "arguments": {}
    },
    "id": 1
  }'

# Navigate (use session ID from above)
curl -X POST https://your-railway-url.up.railway.app/mcp \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: <session-id-from-above>" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "browserbase_stagehand_navigate",
      "arguments": {"url": "https://example.com"}
    },
    "id": 1
  }'
```

## Error Handling

### Session Not Found (404)

**Cause**: Session ID is invalid or expired
**Solution**: Always create a session before other actions

### Model API Error

**Cause**: GEMINI_API_KEY is invalid or has no credits
**Solution**: Check Railway environment variables

### Timeout Errors

**Cause**: Page is taking too long to load
**Solution**: Increase timeout or use `waitUntil: 'domcontentloaded'` option

## Performance Optimization

1. **Reuse Sessions**: For multiple actions, use the same session
2. **Parallel Execution**: Use n8n's parallel branches for independent tasks
3. **Cache Results**: Store extracted data in n8n's database to avoid re-scraping

## Cost Management

- Browserbase charges per session minute
- Gemini 2.0 Flash is very cheap (~$0.0002 per action)
- Railway Hobby plan: $5/month covers most use cases

Total estimated cost per extraction: **$0.001 - $0.005**

## Next Steps

1. Deploy your MCP server to Railway (see DEPLOY_NOW.md)
2. Import one of the example workflows above
3. Configure your API keys in Railway
4. Test with a simple navigation task
5. Build more complex AI-driven automations
