# AI on BI Tree

The Node server can call an OpenAI-compatible provider while the website, database and display run on your laptop. An internet connection and an API key with access to the configured model are required. The offline fallback remains available without either.

## 1. Disable external processing (optional but decided up front)

Set `AI_MODE=offline` to never send visitor text to any external provider. Leave it as `AI_MODE=auto` to use the provider when a key is configured.

## 2. Configure the provider

Open `.env.local` in the project root (alongside `package.json`). Keep the existing staff password and encryption key. Set:

```dotenv
AI_MODE=auto
AI_API_KEY=your_provider_key_here
AI_BASE_URL=https://your-provider.example.com/v1
AI_MODEL=free-ai/mistral
AI_TIMEOUT_MS=15000
```

`AI_BASE_URL` is any OpenAI-compatible base URL (Kilocode, OpenRouter, OpenAI itself, a hosted proxy, etc.). Exposure of the key is server-only; never prefix it with `NEXT_PUBLIC_`, never put it in browser code, never commit `.env.local` (the file is ignored).

## 3. Restart

`npm run dev` picks it up on restart. For a production server, `npm run build` then restart `npm start`.

## 4. Verify

Submit a safe note at `/join`. A successful provider call labels the private reply “AI reply”. A missing key, provider failure or timeout uses a clearly labelled “Offline reply”. The staff dashboard shows provider successes, fallbacks and the configured model. `GET /api/health` reports `ai: "offline" | "openai"` (configuration, not provider reachability).

## Behavior

- One structured **Responses** request produces the public leaf, guide-path number and private reply; input and both output texts pass local checks, and the provider-side mitigation is best-effort.
- The private reply is encrypted alongside the private note; it is never added to the public `leaf` object, the live display or shared keepsakes.
- Notes are treated as data rather than instructions; model output is schema-validated and length-capped.
- No key, `AI_MODE=offline`, provider failure, malformed output or timeout activates the **curated offline fallback**: a keyword/theme-matched safe message, labelled as such. Moderation rejections never become fallback approvals.
- The Agentic AI guide at `POST /api/agent/chat` runs a server-side plan→act→observe loop (≤3 iterations) with tools `search_places`, `get_place`, `list_folktales` and `get_folktale`. It is stateless (client holds the conversation), grounded in the sourced guide data in `src/lib/bhutan-guide.ts`, and every provider reply passes the same local checks; on any failure a deterministic offline keyword fallback answers with `mode: "offline"`.
- The guide data (restaurants, temples, heritage sites, folktales) is real and sourced — see the attribution section in `README.md`.

## Official references

Consult your provider's documentation for: structured outputs / Responses API, key authentication and model access. For an OpenAI-compatible provider, use its documented base URL as `AI_BASE_URL`.
