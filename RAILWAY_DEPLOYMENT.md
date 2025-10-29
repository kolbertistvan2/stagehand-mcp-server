# Railway Deployment Guide - Stagehand MCP Server

## Prerequisites

1. Railway account created
2. Browserbase API credentials
3. Google Gemini API key

## Step 1: Deploy to Railway

### Option A: Deploy from GitHub (Recommended)

1. Push this repository to GitHub:

```bash
cd /Users/kolbert/Dev/stagehand-mcp-server
git init
git add .
git commit -m "Initial commit: Stagehand MCP Server for Railway"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

2. Go to [Railway Dashboard](https://railway.app/dashboard)
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your `stagehand-mcp-server` repository
5. Railway will auto-detect the configuration from `railway.json`

### Option B: Deploy from Local Directory

1. Install Railway CLI:

```bash
npm install -g @railway/cli
```

2. Login to Railway:

```bash
railway login
```

3. Initialize and deploy:

```bash
cd /Users/kolbert/Dev/stagehand-mcp-server
railway init
railway up
```

## Step 2: Configure Environment Variables

In Railway Dashboard, go to your project → Variables tab and add:

```
BROWSERBASE_API_KEY=your_actual_browserbase_api_key
BROWSERBASE_PROJECT_ID=your_actual_browserbase_project_id
GEMINI_API_KEY=your_actual_gemini_api_key
PORT=3000
HOST=0.0.0.0
```

## Step 3: Enable Public Domain

1. In Railway Dashboard, go to Settings tab
2. Under "Networking", click "Generate Domain"
3. Copy the generated URL (e.g., `https://your-app.up.railway.app`)

## Step 4: Test the Deployment

Test the MCP endpoint:

```bash
curl -X POST https://your-app.up.railway.app/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{},"id":1}'
```

Expected response: Session ID and initialization confirmation.

## Step 5: Configure n8n MCP Client

### Using n8n HTTP Request Tool

In your n8n workflow:

1. Add **AI Agent** node with your LLM (Gemini/GPT/Claude)
2. Add **HTTP Request** tool to the Agent
3. Configure the HTTP Request Tool:

**Method**: POST
**URL**: `https://your-app.up.railway.app/mcp`
**Headers**:

```json
{
  "Content-Type": "application/json",
  "mcp-session-id": "={{ $json.sessionId }}"
}
```

**Body**:

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "browserbase_stagehand_act",
    "arguments": {
      "action": "{{ $json.action }}",
      "url": "{{ $json.url }}"
    }
  },
  "id": 1
}
```

### Available MCP Tools

| Tool Name                          | Description                         |
| ---------------------------------- | ----------------------------------- |
| `browserbase_session_create`       | Create/resume browser session       |
| `browserbase_session_close`        | Close current session               |
| `browserbase_stagehand_navigate`   | Navigate to URL                     |
| `browserbase_stagehand_act`        | Perform actions (click, type, etc.) |
| `browserbase_stagehand_extract`    | Extract structured data             |
| `browserbase_stagehand_observe`    | Get page DOM information            |
| `browserbase_stagehand_screenshot` | Take screenshots                    |

## Step 6: Monitor and Debug

### View Logs

```bash
railway logs
```

### View Metrics

Go to Railway Dashboard → Metrics tab to see:

- CPU usage
- Memory usage
- Network traffic
- Request count

### Debug Browser Sessions

The server returns Browserbase session URLs in responses:

```
https://www.browserbase.com/sessions/{sessionId}
```

## Configuration Options

You can customize the server behavior by modifying the start command in `railway.json`:

```json
{
  "deploy": {
    "startCommand": "node dist/program.js --port ${PORT:-3000} --host 0.0.0.0 --proxies --browserWidth 1920 --browserHeight 1080"
  }
}
```

### Available Flags

| Flag                       | Description                                  |
| -------------------------- | -------------------------------------------- |
| `--proxies`                | Enable Browserbase proxies                   |
| `--advancedStealth`        | Enable advanced stealth mode                 |
| `--keepAlive`              | Keep browser sessions alive                  |
| `--browserWidth <width>`   | Browser viewport width (default: 1024)       |
| `--browserHeight <height>` | Browser viewport height (default: 768)       |
| `--modelName <model>`      | Change from gemini-2.0-flash to other models |
| `--modelApiKey <key>`      | API key for custom models                    |

## Troubleshooting

### Issue: Server not responding

**Solution**: Check Railway logs for errors, ensure PORT and HOST are set correctly

### Issue: Session creation fails

**Solution**: Verify BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID are correct

### Issue: Model errors

**Solution**: Ensure GEMINI_API_KEY is valid and has credits

### Issue: n8n can't connect

**Solution**: Verify the public domain is generated and accessible, check CORS if needed

## Cost Estimate

Railway pricing (as of 2025):

- **Hobby Plan**: $5/month includes 500 execution hours
- **Pro Plan**: $20/month for production workloads

Stagehand/Browserbase costs:

- Browserbase: Pay-as-you-go for browser session minutes
- Gemini 2.0 Flash: ~$0.0002 per action (very cheap)

## Next Steps

1. Set up monitoring alerts in Railway
2. Configure auto-scaling if needed
3. Add custom domain (optional)
4. Set up GitHub Actions for CI/CD (optional)
