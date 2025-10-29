# Stagehand v2 → v3 Migration Guide for Developers

> **Audience**: Developers migrating from Stagehand v2 to v3, regardless of whether they're building MCP servers, automation scripts, or other applications.
>
> **Date**: 2025. október
>
> **Context**: This guide documents real-world migration experiences and critical changes when upgrading from Stagehand v2.5.2 to v3.0.0.

---

## 🚨 Critical Breaking Changes

### 1. Model Configuration Format

**Most Important Change**: Stagehand v3 uses the Vercel AI SDK model naming convention.

**v2 Format:**

```typescript
new Stagehand({
  modelName: "gemini-2.5-flash",
  modelClientOptions: {
    apiKey: process.env.GEMINI_API_KEY,
  },
});
```

**v3 Format:**

```typescript
new Stagehand({
  model: "google/gemini-2.5-flash", // ⚠️ MUST include provider prefix!
  // API key auto-detected from GEMINI_API_KEY or GOOGLE_API_KEY
});
```

**⚠️ Common Error:**

```
Error: please use one of the supported models: ...
```

**Why it happens**: Using `"gemini-2.5-flash"` instead of `"google/gemini-2.5-flash"`. The Browserbase API (when using `env: "BROWSERBASE"`) validates the model name and expects the `provider/model` format.

**✅ Correct formats:**

- `"google/gemini-2.5-flash"` ✅
- `"anthropic/claude-3-7-sonnet-latest"` ✅
- `"openai/gpt-4o"` ✅

**❌ Incorrect formats:**

- `"gemini-2.5-flash"` ❌ (missing provider)
- `"claude-3-7-sonnet-latest"` ❌ (missing provider)

**Key Takeaway**: Always use `provider/model` format in v3, even if TypeScript types accept plain strings.

---

### 2. API Method Location Changes

All primary methods moved from `stagehand.page` to the `stagehand` instance directly.

**v2:**

```typescript
await stagehand.page.act({ action: "click button", variables: {...} });
await stagehand.page.extract(instruction);
await stagehand.page.observe({ instruction, returnAction: true });
```

**v3:**

```typescript
await stagehand.act("click button", { variables: {...} });
await stagehand.extract(instruction);
await stagehand.observe(instruction);
```

**Key Changes:**

1. **Method location**: `page.act()` → `stagehand.act()`
2. **Parameter style**: Object format → Positional parameters
3. **First parameter**: Now a string, not an object

---

### 3. act() Method Signature

**v2:**

```typescript
await stagehand.page.act({
  action: "click the login button",
  variables: { username: "test" },
  timeoutMs: 30000,
  domSettleTimeoutMs: 2000,
});
```

**v3:**

```typescript
await stagehand.act(
  "click the login button", // First param is the action string
  {
    variables: { username: "test" },
    timeout: 30000, // Renamed from timeoutMs
  },
);
```

**Changes:**

- ✅ `action` is now first positional parameter (string)
- ✅ Options moved to second parameter object
- ✅ `timeoutMs` → `timeout`
- ✅ `domSettleTimeoutMs` removed (handled automatically)
- ✅ `iframes` flag removed (automatic iframe support)

**Return Value Change:**

```typescript
// v2: Returns simple string
const result = await stagehand.page.act({ action: "..." });
// result: { action: "clicked button" }

// v3: Returns detailed action breakdown
const result = await stagehand.act("...");
// result: {
//   success: true,
//   message: "Action completed",
//   actionDescription: "clicked the login button",
//   actions: [{ type: "click", element: "...", ... }]
// }
```

---

### 4. Page Access Pattern

**v2:**

```typescript
const page = stagehand.page; // Direct Playwright Page object
await page.goto("https://example.com");
await page.click("button");
```

**v3:**

```typescript
// Option 1: Via context API
const page = stagehand.context.activePage(); // Returns v3 Page or undefined
if (!page) {
  throw new Error("No active page");
}
await page.goto("https://example.com");

// Option 2: Convenience getter (same as above)
const page = stagehand.page;
```

**⚠️ Important Differences:**

1. **Page Type**: v3 Page is NOT a Playwright Page anymore. It's a CDP-based custom implementation.
2. **Returns undefined**: `activePage()` can return `undefined` if no page exists
3. **Missing Methods**: Some Playwright Page methods don't exist in v3

**Removed Methods:**

```typescript
// ❌ These don't exist in v3:
page.isClosed(); // No longer available
page.context(); // No longer available
browser.isConnected(); // Browser not exposed in v3
```

**Why**: v3 uses Chrome DevTools Protocol (CDP) directly instead of Playwright, so the Page object is a different implementation.

---

### 5. extract() Method Changes

**v2:**

```typescript
await stagehand.page.extract({
  instruction: "Extract all product names",
  schema: myZodSchema,
  domSettleTimeoutMs: 2000,
});
```

**v3:**

```typescript
// Positional parameters
await stagehand.extract(
  "Extract all product names", // instruction (required)
  myZodSchema, // schema (optional)
  {
    timeout: 30000,
    selector: ".product-list", // New: scope to specific element
  },
);
```

**Changes:**

- ✅ Instruction is first positional parameter
- ✅ Schema is second positional parameter (optional)
- ✅ Options moved to third parameter
- ✅ `domSettleTimeoutMs` removed
- ✅ Added `selector` option to scope extraction
- ✅ Supports array schemas directly (no wrapper object needed)

**New Property Name:**

```typescript
// v2
const data = await extract(...);
console.log(data.page_text); // Underscore

// v3
const data = await extract(...);
console.log(data.pageText); // CamelCase
```

---

### 6. observe() Method Changes

**v2:**

```typescript
await stagehand.page.observe({
  instruction: "Find the login button",
  returnAction: true, // ❌ Removed in v3
  drawOverlay: true, // ❌ Removed in v3
  iframes: true, // ❌ Removed (automatic now)
});
```

**v3:**

```typescript
await stagehand.observe("Find the login button", {
  selector: ".auth-section", // New: scope to specific area
  timeout: 30000,
});
```

**Removed Options:**

- ❌ `returnAction` - No longer supported
- ❌ `drawOverlay` - No longer supported
- ❌ `iframes` - Automatic support, flag removed

**New Options:**

- ✅ `selector` - Scope observation to specific CSS selector

---

### 7. Browser and Context Lifecycle

**v2:**

```typescript
// Access browser directly
const browser = stagehand.browser;
console.log(browser.isConnected());

// Browser disconnect events
browser.on("disconnected", () => {
  console.log("Browser disconnected");
});
```

**v3:**

```typescript
// ❌ Browser not exposed directly
const browser = stagehand.browser; // undefined or null

// ✅ Use Stagehand lifecycle instead
await stagehand.close(); // Proper cleanup

// ❌ No browser disconnect events
// v3 manages lifecycle internally
```

**Key Takeaway**: Don't try to access or manage the Browser object directly in v3. Use Stagehand's methods for lifecycle management.

---

### 8. Session and Property Names

**v2:**

```typescript
const sessionId = stagehand.browserbaseSessionID; // Uppercase ID
```

**v3:**

```typescript
const sessionId = stagehand.browserbaseSessionId; // camelCase Id
```

**Change**: `browserbaseSessionID` → `browserbaseSessionId` (uppercase `ID` → camelCase `Id`)

---

### 9. Async Properties

**v2:**

```typescript
const history = stagehand.history; // Synchronous property
const metrics = stagehand.metrics; // Synchronous property
```

**v3:**

```typescript
const history = await stagehand.history; // Async method
const metrics = await stagehand.metrics; // Async method
```

**Change**: Both `history` and `metrics` are now async methods, not properties.

---

### 10. Automatic Features (No Flags Needed)

**v2:**

```typescript
await stagehand.page.act({
  action: "click button in iframe",
  iframes: true, // Required for iframe support
});
```

**v3:**

```typescript
await stagehand.act("click button in iframe");
// iframes automatically supported, no flag needed
```

**Features now automatic:**

- ✅ iframe support (was `iframes: true`)
- ✅ Shadow DOM handling (was manual)
- ✅ Dynamic content waiting (improved automatic detection)

---

## 🔧 Migration Checklist

When migrating from v2 to v3, check these items:

### Configuration

- [ ] Change `modelName` + `modelClientOptions` → single `model` parameter
- [ ] Add provider prefix: `"gemini-2.5-flash"` → `"google/gemini-2.5-flash"`
- [ ] Remove `domSettleTimeoutMs`, use `domSettleTimeout` if needed
- [ ] Change `enableCaching` to `cacheDir` if used

### API Methods

- [ ] `page.act()` → `stagehand.act()`
- [ ] `page.extract()` → `stagehand.extract()`
- [ ] `page.observe()` → `stagehand.observe()`
- [ ] Update act() to use positional parameters: `act(action, options)`
- [ ] Update extract() to use positional parameters: `extract(instruction, schema, options)`
- [ ] Update observe() to use positional parameters: `observe(instruction, options)`

### Options Rename

- [ ] `timeoutMs` → `timeout`
- [ ] `domSettleTimeoutMs` → removed (automatic)
- [ ] Remove `iframes` flags (automatic)
- [ ] Remove `returnAction` from observe()
- [ ] Remove `drawOverlay` from observe()

### Page Access

- [ ] Replace direct `stagehand.page` with `stagehand.context.activePage()`
- [ ] Handle `undefined` return from `activePage()`
- [ ] Remove `page.isClosed()` checks
- [ ] Remove `page.context()` calls
- [ ] Don't access `stagehand.browser` directly

### Property Names

- [ ] `browserbaseSessionID` → `browserbaseSessionId`
- [ ] `page_text` → `pageText` in extract results

### Lifecycle

- [ ] Remove browser disconnect event handlers
- [ ] Use `stagehand.close()` for cleanup
- [ ] Remove browser connection checks

### Async Changes

- [ ] `stagehand.history` → `await stagehand.history`
- [ ] `stagehand.metrics` → `await stagehand.metrics`

---

## 💡 Common Migration Pitfalls

### Pitfall 1: Model Name Without Provider

```typescript
// ❌ WRONG - Will fail with "unsupported model" error
model: "gemini-2.5-flash";

// ✅ CORRECT
model: "google/gemini-2.5-flash";
```

### Pitfall 2: Checking Browser Object

```typescript
// ❌ WRONG - Will fail, browser is null/undefined in v3
if (!session.browser || !session.browser.isConnected()) {
  throw new Error("Browser not connected");
}

// ✅ CORRECT - Only check page and stagehand
if (!session.page || !session.stagehand) {
  throw new Error("Session invalid");
}
```

### Pitfall 3: Using page.isClosed()

```typescript
// ❌ WRONG - Method doesn't exist in v3
if (page && !page.isClosed()) {
  await page.goto(url);
}

// ✅ CORRECT - Just check if page exists
if (page) {
  await page.goto(url);
}
```

### Pitfall 4: Act Object Parameter

```typescript
// ❌ WRONG - v3 doesn't use object for action
await stagehand.act({ action: "click button" });

// ✅ CORRECT - First param is string
await stagehand.act("click button");
```

### Pitfall 5: Observe returnAction

```typescript
// ❌ WRONG - returnAction removed in v3
await stagehand.observe("find button", { returnAction: true });

// ✅ CORRECT - returnAction not needed/supported
await stagehand.observe("find button");
```

---

## 🎯 Best Practices for v3

### 1. Always Use Provider/Model Format

Even if your code compiles without it, the Browserbase API will reject model names without provider prefixes at runtime.

### 2. Handle Undefined Pages

```typescript
const page = stagehand.context.activePage();
if (!page) {
  throw new Error("No active page - did you navigate anywhere yet?");
}
// Now safe to use page
```

### 3. Don't Access Browser Directly

v3 doesn't expose the browser object. Use Stagehand methods for all operations.

### 4. Use New Return Values

v3's `act()` returns much richer data. Use it for debugging and logging:

```typescript
const result = await stagehand.act("click button");
console.log(result.actionDescription); // Detailed description
console.log(result.actions); // Array of actions taken
```

### 5. Leverage Automatic Features

Remove unnecessary flags:

- No need for `iframes: true`
- No need for `domSettleTimeoutMs` in most cases
- Shadow DOM handled automatically

---

## 📚 Supported Models in v3

### Google (Gemini)

- `google/gemini-2.5-flash` ⭐ Recommended (fast, cost-effective)
- `google/gemini-2.5-pro-preview-03-25`
- `google/gemini-2.5-flash-preview-04-17`
- `google/gemini-2.0-flash`
- `google/gemini-2.0-flash-lite`
- `google/gemini-1.5-flash`
- `google/gemini-1.5-flash-8b`
- `google/gemini-1.5-pro`

### Anthropic (Claude)

- `anthropic/claude-3-7-sonnet-latest`
- `anthropic/claude-3-7-sonnet-20250219`
- `anthropic/claude-3-5-sonnet-latest`
- `anthropic/claude-3-5-sonnet-20241022`
- `anthropic/claude-3-5-sonnet-20240620`

### OpenAI

- `openai/gpt-4.1`
- `openai/gpt-4.1-mini`
- `openai/gpt-4o`
- `openai/gpt-4o-mini`
- `openai/o1`
- `openai/o1-mini`
- `openai/o3`
- `openai/o3-mini`

### Others

- Cerebras: `cerebras/llama-3.3-70b`, `cerebras/llama-3.1-8b`
- Groq: `groq/llama-3.3-70b-versatile`, `groq/llama-3.3-70b-specdec`

**Note**: When using `env: "BROWSERBASE"`, the Browserbase API must support the model. Check their current supported models list.

---

## 🔗 Official Resources

- **v3 Migration Guide**: https://docs.stagehand.dev/v3/migrations/v2
- **v3 Configuration**: https://docs.stagehand.dev/v3/configuration/models
- **v3 Documentation**: https://docs.stagehand.dev/v3/

---

## 📝 Real-World Migration Timeline

Our migration from v2.5.2 to v3.0.0 (October 2025):

1. **Package Update**: Updated `package.json` to v3.0.0
2. **TypeScript Errors**: Fixed ~15 compilation errors
3. **Model Format**: Discovered and fixed provider/model format requirement
4. **Session Validation**: Removed browser checks from validation
5. **Deprecated Parameters**: Removed `returnAction` from observe
6. **Testing**: Verified in production with n8n integration
7. **Total Time**: ~2 hours of careful migration

**Key Success Factors:**

- Read migration docs thoroughly FIRST
- Fix TypeScript errors systematically
- Test each change incrementally
- Watch for runtime validation errors (model names, etc.)

---

## ✅ Summary

Stagehand v3 is a major rewrite that:

- Uses Vercel AI SDK for model flexibility (requires provider/model format)
- Simplifies API by moving methods to stagehand instance
- Uses positional parameters instead of object parameters
- Implements CDP-based Page instead of Playwright Page
- Provides automatic iframe and Shadow DOM support
- Removes browser-level access and events

**The migration is straightforward if you:**

1. Update model configuration to provider/model format
2. Move method calls from `page` to `stagehand`
3. Convert to positional parameters
4. Remove deprecated options
5. Stop accessing browser directly

**After migration, you get:**

- Better model flexibility (13+ providers)
- Cleaner, more intuitive API
- Automatic handling of complex scenarios
- Better performance and reliability

Good luck with your migration! 🚀
