# Browserbase MCP Server - Handoff Documentation for Claude Code Agents

Ez a dokumentum azért készült, hogy egy másik Claude Code agent meg tudja érteni a projekt működését és elkerülje a korábbi hibákat.

## 📋 Projekt Áttekintés

Ez egy **MCP (Model Context Protocol) server**, amely a **Browserbase** felhő böngésző platformot és a **Stagehand v3** AI-powered browser automation framework-öt kombinálja. A server lehetővé teszi, hogy LLM-ek (Claude, GPT, Gemini) természetes nyelvű parancsokkal vezéreljenek böngészőket.

**FONTOS**: A projekt **Stagehand v3.0.0**-t használ (2025. október), ami jelentős breaking changes-eket tartalmaz v2-höz képest!

### Fő komponensek:

1. **MCP Server** (`src/index.ts`) - A Model Context Protocol server implementáció
2. **SessionManager** (`src/sessionManager.ts`) - Böngésző session-ök kezelése
3. **Tools** (`src/tools/`) - MCP tool-ok: navigate, act, extract, observe, screenshot, session
4. **Config** (`src/config.ts`) - Konfiguráció kezelés CLI és env vars-ból
5. **Context** (`src/context.ts`) - Tool execution context és session management

## 🏗️ Architektúra

```
MCP Client (n8n, Claude Desktop, stb.)
    ↓ (JSON-RPC 2.0 / STDIO vagy SHTTP)
MCP Server (index.ts)
    ↓
Context (context.ts) - Tool execution coordination
    ↓
SessionManager (sessionManager.ts) - Browser session lifecycle
    ↓
Stagehand Instance - AI-powered browser automation
    ↓
Browserbase Cloud Browser - Remote browser platform
```

### MCP Protocol Részletek

Az **Model Context Protocol (MCP)** egy nyílt szabvány és open-source framework, amelyet az Anthropic vezetett be 2024 novemberében. A protokoll célja, hogy **szabványosítsa az AI rendszerek (LLM-ek) és külső adatforrások/tool-ok közötti integrációt**.

#### MCP Komponensek

1. **Host** (MCP Client) - Az LLM alkalmazás, amely kezdeményezi a kapcsolatot (pl. Claude Desktop, n8n)
2. **Client** - A host alkalmazáson belüli connector (kommunikál a szerverrel)
3. **Server** - A szolgáltatás, amely context-et (eszközöket, adatokat) biztosít

#### MCP Capabilities

Az MCP server 3 fő capability-t tud nyújtani:

1. **Resources** - Context és adat a felhasználóknak vagy AI modelleknek
2. **Prompts** - Template-elt üzenetek és workflow-k
3. **Tools** - Függvények, amelyeket az AI modellek végrehajthatnak

Ez a projekt **Tools**-t nyújt: `navigate`, `act`, `extract`, `observe`, `screenshot`, `session`.

#### Transport Layer

Az MCP **JSON-RPC 2.0** üzeneteket használ **stateful kapcsolatokkal** és **capability negotiation**-nel:

- **STDIO** (Standard Input/Output) - Helyi MCP szerverek esetén (npx, Docker)
- **SHTTP** (Server-Sent Events over HTTP) - Remote hosted MCP szerverek esetén (Smithery)

#### Security és Trust

Az MCP specifikáció hangsúlyozza a következő biztonsági szempontokat:

- **User Consent**: A felhasználónak **explicit módon** jóvá kell hagynia minden adathozzáférést és műveletet
- **Data Privacy**: A host-oknak **explicit felhasználói beleegyezést** kell kérniük, mielőtt adatokat továbbítanak a szervereknek
- **Tool Safety**: A tool-ok **tetszőleges kód végrehajtást** jelentenek, ezért megfelelő óvatossággal kell kezelni őket
- **LLM Sampling Controls**: A felhasználóknak jóvá kell hagyniuk a sampling kéréseket és kontrollálniuk kell a küldött prompt-okat

## 🔑 API Key Flow és Kritikus Szabályok

### ⚠️ KRITIKUS: API Key Handling

Az API key kezelés a projekt egyik **legkritikusabb** része. A következő szabályokat **MINDIG** be kell tartani:

#### 1. Google/Gemini Model API Key Kezelés

A **Google Gemini modellek** (gemini-2.0-flash, gemini-2.5-flash, stb.) az API key-t **közvetlenül a környezeti változókból olvassák**:

```typescript
// src/config.ts - lines 48-52
if (!mergedConfig.modelApiKey) {
  mergedConfig.modelApiKey =
    process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
}
```

#### 2. Stagehand v3 Constructor - Model Parameter

**FONTOS VÁLTOZÁS v3-ban**: A `modelName` + `modelClientOptions` helyett most **egyetlen `model` parameter** van:

```typescript
// src/sessionManager.ts - line 30
model: params.modelName || config.modelName || "gemini-2.5-flash",
```

**v3 automatikusan detektálja az API key-t** a környezeti változókból:

- Google: `GEMINI_API_KEY` vagy `GOOGLE_API_KEY`
- OpenAI: `OPENAI_API_KEY`
- Anthropic: `ANTHROPIC_API_KEY`

**NEM KELL** külön `modelClientOptions` objektumot átadni a Google modelleknél!

#### 3. OpenAI és Anthropic Modellek

Az OpenAI és Anthropic modellek esetén a `modelClientOptions` objektum **OpenAIClientOptions** vagy **AnthropicClientOptions** típusú lehet:

```typescript
// From @browserbasehq/stagehand/dist/types/model.d.ts
export type ClientOptions = OpenAIClientOptions | AnthropicClientOptions;
```

Ezeknek van `apiKey` property-jük, és a Stagehand konstruktorban kell átadni őket.

## 🆕 Stagehand v3 Breaking Changes (2025. október)

A projekt **2025. októberében frissült Stagehand v2.5.2-ről v3.0.0-ra**. Ez **MAJOR breaking change** frissítés volt.

### Fő v3 Változások:

#### 1. API Method Változások

**v2:**

```typescript
await stagehand.page.act({ action: "click button", variables: {...} });
await stagehand.page.extract(instruction);
await stagehand.page.observe({ instruction, returnAction });
```

**v3:**

```typescript
await stagehand.act("click button", { variables: {...} });
await stagehand.extract(instruction);
await stagehand.observe(instruction);
```

**Változások:**

- `stagehand.page.act()` → `stagehand.act()` (első paraméter string, nem object!)
- `stagehand.page.extract()` → `stagehand.extract()`
- `stagehand.page.observe()` → `stagehand.observe()`
- `returnAction` paraméter eltávolítva az observe-ból

#### 2. Page Access Változás

**v2:**

```typescript
const page = stagehand.page; // Playwright Page
```

**v3:**

```typescript
const page = stagehand.context.activePage(); // v3 CDP-based Page | undefined
```

**Fontos különbségek:**

- v3 Page **NEM** Playwright Page, hanem saját CDP-based implementáció
- `activePage()` visszaad `Page | undefined`-ot
- Nincs `page.isClosed()` method
- Nincs `page.context()` method (mint Playwright-ban)
- DE van: `page.goto()`, `page.screenshot()`, `page.url()`, `page.locator()` stb.

#### 3. Browser Access Változás

**v2:**

```typescript
const browser = stagehand.browser; // Playwright Browser
const context = stagehand.context; // Playwright BrowserContext
```

**v3:**

```typescript
const context = stagehand.context; // V3Context (NEM Playwright!)
// Nincs közvetlen browser access!
```

**v3-ban NEM elérhető**:

- `browser.isConnected()`
- `browser.on("disconnected", ...)`
- Playwright `BrowserContext`

#### 4. Property Név Változások

```typescript
// v2:
stagehand.browserbaseSessionID;

// v3:
stagehand.browserbaseSessionId; // Kis 'd'!
```

#### 5. Model Config Egyszerűsítés

**v2:**

```typescript
new Stagehand({
  modelName: "gemini-2.5-flash",
  modelClientOptions: {
    apiKey: process.env.GEMINI_API_KEY,
  },
});
```

**v3:**

```typescript
new Stagehand({
  model: "gemini-2.5-flash",
  // API key automatically detected from env vars!
});
```

### v3 Migration Checklist

Ha frissítesz v3-ra vagy v3-mal dolgozol:

- [ ] `page.act()` → `act()` (first param is string!)
- [ ] `page.extract()` → `extract()`
- [ ] `page.observe()` → `observe()`
- [ ] `stagehand.page` → `stagehand.context.activePage()`
- [ ] `browserbaseSessionID` → `browserbaseSessionId`
- [ ] Remove `page.isClosed()` checks
- [ ] Remove `browser.isConnected()` checks
- [ ] Remove browser disconnect handlers
- [ ] Update `model` config (no modelClientOptions needed for Google)

### ❌ NE TEDD SOHA (v3)

#### 1. NE használd a v2 API syntax-ot!

**HELYES** (commit 00994f70):

```typescript
// src/tools/extract.ts
const extraction = await stagehand.page.extract(params.instruction);
```

**HIBÁS** (commit 0e076c9 - visszavontam):

```typescript
// ❌ NE HASZNÁLD! HIBÁS!
const extraction = await stagehand.page.extract({
  instruction: params.instruction, // OBJECT - WRONG!
  modelClientOptions: { apiKey },
});
```

**Magyarázat**: A TypeScript definition alapján az `extract()` method **overloaded**:

```typescript
// StagehandPage.d.ts line 82
extract<T extends z.AnyZodObject = typeof defaultExtractSchema>(
  instructionOrOptions?: string | ExtractOptions<T>
): Promise<ExtractResult<T>>;
```

Ez azt jelenti:

- **Ha STRING-et adsz át**: A Stagehand használja a konstruktorban megadott modelClientOptions-t
- **Ha ExtractOptions objectet adsz át**: Felülírhatod a model-t és apiKey-t, DE ez NEM szükséges a Google Gemini modelleknél, mert azok a process.env-ből olvassák!

#### 2. NE add át a `modelClientOptions`-t az `act()`, `extract()`, `observe()` hívásokban!

**HELYES**:

```typescript
// src/tools/act.ts
await stagehand.page.act({
  action: params.action,
  variables: params.variables,
});
```

**HIBÁS** (commit 0e076c9 - visszavontam):

```typescript
// ❌ NE HASZNÁLD! HIBÁS!
await stagehand.page.act({
  action: params.action,
  variables: params.variables,
  modelClientOptions: { apiKey }, // ❌ NEM KELL!
});
```

**Magyarázat**: A `modelClientOptions` **opcionális paraméter**, de a Google Gemini modellek esetében **NEM SZÜKSÉGES**, mert:

1. A Stagehand konstruktorban már megadtuk a `modelClientOptions`-t
2. Ha egy method hívásban újra átadod, akkor felülírod az eredeti beállítást
3. De a Google esetében ez **nem segít**, mert a Google SDK a `process.env.GEMINI_API_KEY`-t keresi

## 🔍 TypeScript Definitions és Method Signatures

### Stagehand Method Signatures

Az alábbi TypeScript definíciók a `@browserbasehq/stagehand@2.5.2` package-ból származnak:

#### `act()` method

```typescript
// StagehandPage.d.ts line 81
act(actionOrOptions: string | ActOptions | ObserveResult): Promise<ActResult>;

// ActOptions from stagehand.d.ts lines 113-122
interface ActOptions {
  action: string;
  modelName?: AvailableModel;
  modelClientOptions?: ClientOptions;  // ⚠️ Opcionális, Google esetén NEM kell!
  variables?: Record<string, string>;
  domSettleTimeoutMs?: number;
  timeoutMs?: number;
  iframes?: boolean;
  frameId?: string;
}
```

#### `extract()` method

```typescript
// StagehandPage.d.ts line 82
extract<T extends z.AnyZodObject = typeof defaultExtractSchema>(
  instructionOrOptions?: string | ExtractOptions<T>
): Promise<ExtractResult<T>>;

// ExtractOptions from stagehand.d.ts lines 128-141
interface ExtractOptions<T extends z.AnyZodObject> {
  instruction?: string;
  schema?: T;
  modelName?: AvailableModel;
  modelClientOptions?: ClientOptions;  // ⚠️ Opcionális, Google esetén NEM kell!
  domSettleTimeoutMs?: number;
  useTextExtract?: boolean;  // @deprecated
  selector?: string;
  iframes?: boolean;
  frameId?: string;
}
```

#### `observe()` method

```typescript
// StagehandPage.d.ts line 83
observe(instructionOrOptions?: string | ObserveOptions): Promise<ObserveResult[]>;

// ObserveOptions from stagehand.d.ts lines 143-156
interface ObserveOptions {
  instruction?: string;
  modelName?: AvailableModel;
  modelClientOptions?: ClientOptions;  // ⚠️ Opcionális, Google esetén NEM kell!
  domSettleTimeoutMs?: number;
  returnAction?: boolean;
  onlyVisible?: boolean;  // @deprecated
  drawOverlay?: boolean;
  iframes?: boolean;
  frameId?: string;
}
```

### Stagehand Constructor

```typescript
// stagehand.d.ts lines 11-107
interface ConstructorParams {
  env: "LOCAL" | "BROWSERBASE";
  apiKey?: string; // Browserbase API key
  projectId?: string; // Browserbase Project ID
  verbose?: 0 | 1 | 2;
  llmProvider?: LLMProvider;
  logger?: (message: LogLine) => void | Promise<void>;
  domSettleTimeoutMs?: number;
  browserbaseSessionCreateParams?: Omit<
    Browserbase.Sessions.SessionCreateParams,
    "projectId"
  > & {
    projectId?: string;
  };
  enableCaching?: boolean;
  browserbaseSessionID?: string;
  modelName?: AvailableModel; // Default: "gemini-2.0-flash"
  llmClient?: LLMClient;
  modelClientOptions?: ClientOptions; // ✅ Itt adjuk át az API key-t!
  systemPrompt?: string;
  useAPI?: boolean;
  waitForCaptchaSolves?: boolean;
  localBrowserLaunchOptions?: LocalBrowserLaunchOptions;
  logInferenceToFile?: boolean;
  selfHeal?: boolean;
  disablePino?: boolean;
  experimental?: boolean;
}
```

### ClientOptions Type

```typescript
// model.d.ts line 7
export type ClientOptions = OpenAIClientOptions | AnthropicClientOptions;
```

**FONTOS**: A `ClientOptions` típus **NEM tartalmazza** a Google Gemini modellek API key objektum típusát! Ezért a Google modellek esetében az API key-t **közvetlenül a környezeti változókból** kell olvasni!

## 📁 Fájl Struktúra és Felelősségek

### src/index.ts

- **Felelősség**: MCP server setup (Smithery format)
- **Fontos részek**:
  - `configSchema` - Zod schema a config validációhoz
  - `default function` - Smithery entry point
  - Tool registration és error handling

### src/config.ts

- **Felelősség**: Konfiguráció merge (defaults + CLI + env vars)
- **Fontos részek**:
  - `defaultConfig` - Default értékek (modelName: "gemini-2.0-flash" a commit 00994f70-ben)
  - `resolveConfig()` - Config merge logika
  - **Lines 48-52**: Gemini API key env var handling

### src/sessionManager.ts

- **Felelősség**: Browser session lifecycle management
- **Fontos részek**:
  - `createStagehandInstance()` - Stagehand instance létrehozás
  - **Lines 25-64**: Stagehand constructor hívás az API key-vel
  - **Line 29**: modelName fallback (`"gemini-2.0-flash"` a commit 00994f70-ben)
  - `SessionManager` class - Session tracking és management

### src/context.ts

- **Felelősség**: Tool execution context és Stagehand instance provider
- **Fontos részek**:
  - `getStagehand()` - Stagehand instance getter (session manager-től)
  - `run()` - Tool execution wrapper

### src/tools/ directory

- **act.ts**: Perform actions (click, type, scroll, stb.)
- **extract.ts**: Extract structured data from page
- **observe.ts**: Find elements on page without acting
- **navigate.ts**: Navigate to URL
- **screenshot.ts**: Take screenshots
- **session.ts**: Session management (create, switch, close, list)
- **url.ts**: Get current URL

## 🚀 Deployment

### Railway

- **Config**: `railway.json`
- **Build Command**: `pnpm install && pnpm build`
- **Start Command**: `node dist/index.js --port $PORT --host 0.0.0.0`
- **Environment Variables**:
  - `BROWSERBASE_API_KEY`
  - `BROWSERBASE_PROJECT_ID`
  - `GEMINI_API_KEY` vagy `GOOGLE_API_KEY`

### Docker

- **Build**: `docker build -t mcp-browserbase .`
- **Run**: `docker run --rm -i -e BROWSERBASE_API_KEY -e BROWSERBASE_PROJECT_ID -e GEMINI_API_KEY mcp-browserbase`

## 🔧 Working Configuration (Commit 00994f70)

A **commit 00994f70** az utolsó működő verzió. Ez a konfiguráció:

```typescript
// src/config.ts lines 26-40
const defaultConfig: Config = {
  browserbaseApiKey: process.env.BROWSERBASE_API_KEY ?? "",
  browserbaseProjectId: process.env.BROWSERBASE_PROJECT_ID ?? "",
  proxies: false,
  server: {
    port: undefined,
    host: undefined,
  },
  viewPort: {
    browserWidth: 1024, // ⚠️ Később 1920-ra változtatva
    browserHeight: 768, // ⚠️ Később 1080-ra változtatva
  },
  cookies: undefined,
  modelName: "gemini-2.0-flash", // ⚠️ Később "gemini-2.5-flash"-re változtatva
};
```

```typescript
// src/sessionManager.ts line 29
modelName: params.modelName || config.modelName || "gemini-2.0-flash",
```

## 📝 Változtatási Kérések és Implementáció

### Ha a felhasználó új model-t szeretne használni:

1. **Ellenőrizd a model támogatottságát** a Stagehand dokumentációban: https://docs.stagehand.dev
2. **Ha Google model**: NEM kell változtatni az API key handling-en, csak a `modelName`-t
3. **Ha OpenAI vagy Anthropic model**: Frissítsd a `config.modelApiKey` logikát is (src/config.ts)

### Ha a felhasználó viewport méretet szeretne változtatni:

1. **Módosítsd a `defaultConfig`-ot** a `src/config.ts`-ben
2. **NE változtasd meg** a `sessionManager.ts` fallback értékeit (46-47 sorok)

### Ha API key hibát kapsz:

1. **Ellenőrizd a Railway environment variables-t** a Railway dashboard-on
2. **Nézd meg a logs-ot**, hogy a `config.modelApiKey` be van-e állítva
3. **Ellenőrizd**, hogy a `modelClientOptions` objektum **csak a Stagehand konstruktorban** van átadva
4. **NE add át** a `modelClientOptions`-t az `act()`, `extract()`, `observe()` method hívásokban

## 🐛 Debugging Checklist

Ha "No LLM API key or LLM Client configured" hibát kapsz:

- [ ] Van-e `GEMINI_API_KEY` vagy `GOOGLE_API_KEY` a Railway/Docker env vars-ban?
- [ ] A `config.modelApiKey` be van-e állítva? (src/config.ts lines 48-52)
- [ ] A `modelClientOptions` át van-e adva a Stagehand konstruktorban? (src/sessionManager.ts lines 30-35)
- [ ] NEM adtad-e át a `modelClientOptions`-t az `act()`, `extract()`, `observe()` hívásokban?
- [ ] A `modelName` helyes? (Támogatott model a Stagehand-ben?)
- [ ] Az `extract()` method STRING paraméterrel van-e hívva, nem OBJECT-tel?

## 📚 További Dokumentációk

- **MCP Protocol**: https://modelcontextprotocol.io/introduction
- **Stagehand**: https://docs.stagehand.dev
- **Browserbase**: https://docs.browserbase.com
- **Browserbase MCP**: https://docs.browserbase.com/integrations/mcp/introduction

## 🎯 Összefoglalás: A Legfontosabb Tanulságok

1. **A Google Gemini modellek az API key-t a `process.env.GEMINI_API_KEY` vagy `process.env.GOOGLE_API_KEY` környezeti változókból olvassák**.
2. **A `modelClientOptions` CSAK a Stagehand konstruktorban van átadva**, NEM az egyes method hívásokban.
3. **Az `extract()` method STRING paramétert vár** (nem OBJECT-et), ha egyszerű instruction-t adsz át.
4. **Commit 00994f70 az utolsó működő verzió** - ez a baseline minden változtatáshoz.
5. **Ha bizonytalan vagy, nézd meg az eredeti Browserbase MCP repository kódját**: https://github.com/browserbase/mcp-server-browserbase

## 📌 Git Commit Markerek

- **00994f70** - Utolsó működő verzió (Docker build fix)
- **0e076c9** - HIBÁS commit (extract() signature változtatás + unwanted modelClientOptions)
- **b7ec6f6** - Extract() method fix (visszavontam az 0e076c9 változtatásait)
- **4496b80** - További fix az extract() és observe() method-okra
- **c19b994** - modelClientOptions eltávolítása az act/extract/observe hívásokból

---

**Utolsó frissítés**: 2025-01-XX (Commit 00994f70 reset után)
**Készítette**: Claude Code Agent (Sonnet 4.5)
