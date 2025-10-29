# Deploy to Railway - Quick Steps

## 1. Login to Railway CLI

```bash
railway login
```

A browser window will open - login with your Railway account.

## 2. Initialize Railway Project

```bash
cd /Users/kolbert/Dev/stagehand-mcp-server
railway init
```

Select "Create new project" and give it a name (e.g., "stagehand-mcp-server").

## 3. Set Environment Variables

```bash
railway variables set BROWSERBASE_API_KEY="your_browserbase_api_key"
railway variables set BROWSERBASE_PROJECT_ID="your_browserbase_project_id"
railway variables set GEMINI_API_KEY="your_gemini_api_key"
railway variables set PORT=3000
railway variables set HOST=0.0.0.0
```

## 4. Deploy

```bash
railway up
```

## 5. Generate Public URL

```bash
railway domain
```

This will generate a public URL like `https://stagehand-mcp-server-production.up.railway.app`

## 6. Test the Deployment

```bash
curl -X POST https://your-railway-url.up.railway.app/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{},"id":1}'
```

## 7. View Logs

```bash
railway logs
```

## Alternative: Deploy via Dashboard

1. Go to https://railway.app/dashboard
2. Click "New Project"
3. Select "Empty Project"
4. Click "Deploy from GitHub repo" or "Deploy from local"
5. Add environment variables in the Variables tab
6. The deployment will start automatically using `railway.json` config

## Your MCP Endpoint

After deployment, your MCP server will be available at:

```
https://your-app.up.railway.app/mcp
```

Use this URL in your n8n workflow's HTTP Request node.
