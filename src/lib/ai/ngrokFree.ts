/** 
 * Updated project configuration with provided Neon DB URL and AI key/URL.
 * 
 * NEON DATABASE_URL: postgresql://neondb_owner:npg_nLVm1U7gAiYl@ep-lucky-poetry-bewcmcfc-pooler.c-9.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
 * AI API KEY: sk-c7fd15fbaf0aea24-2391a6-c7c4750b
 * AI API URL: https://pension-acutely-ride.ngrok-free.dev/v1
 */

// In src/lib/ai/openaiCompatible.ts, update the base URL and model
// The AI API URL suggests a custom endpoint - configure accordingly

export const AI_CONFIG = {
  // Use the provided ngrok-free.dev API endpoint
  baseUrl: 'https://pension-acutely-ride.ngrok-free.dev/v1',
  // The API key provided
  apiKey: 'sk-c7fd15fbaf0aea24-2391a6-c7c4750b',
  // Model name - could be derived from the key or set explicitly
  model: 'gpt-4.1-mini', // or use a model name relevant to this API
  // Provider is openai-compatible since it uses /v1 chat completions pattern
  provider: 'openai-compatible' as const,
};

// Update the OpenAiCompatibleProvider to use the config
// The chat method should use the new baseUrl and apiKey

import {
  COMPOSE_SYSTEM_PROMPT,
  MODERATION_SYSTEM_PROMPT,
  extractJson,
  normalizeComposeJson,
  normalizeModerationJson,
} from './prompt';
import { AiUnavailableError, type AiProvider, type ComposeInput, type ComposeOutput, type ModerationVerdict } from './types';

export class NgrokFreeAiProvider implements AiProvider {
  readonly name = 'ngrok-free';
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor() {
    this.baseUrl = AI_CONFIG.baseUrl;
    this.apiKey = AI_CONFIG.apiKey;
    this.model = AI_CONFIG.model;
    this.timeoutMs = 15000;
  }

  private async chat(system: string, user: string, maxTokens: number): Promise<string> {
    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0.2,
          max_tokens: maxTokens,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
        timeout: this.timeoutMs,
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new AiUnavailableError(`AI endpoint ${res.status}: ${body.slice(0, 200)}`);
      }
      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new AiUnavailableError('AI endpoint returned no content');
      return text;
    } catch (err) {
      if (err instanceof AiUnavailableError) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      throw new AiUnavailableError(`AI request failed: ${msg}`);
    }
  }

  async moderate(text: string): Promise<ModerationVerdict> {
    const raw = await this.chat(MODERATION_SYSTEM_PROMPT, text.slice(0, 2000), 200);
    const parsed = normalizeModerationJson(extractJson(raw));
    return { ...parsed, engine: 'ai' };
  }

  async compose({ aspiration }: ComposeInput): Promise<ComposeOutput> {
    const raw = await this.chat(COMPOSE_SYSTEM_PROMPT, aspiration.slice(0, 2000), 700);
    return normalizeComposeJson(extractJson(raw));
  }
}