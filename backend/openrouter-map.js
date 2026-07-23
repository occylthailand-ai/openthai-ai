// Pure helpers for the OpenRouter AI wrapper in server.js (used when OPENROUTER_API_KEY is set,
// as the Claude-via-OpenRouter fallback). OpenRouter speaks the OpenAI chat-completions shape;
// the rest of server.js expects the Anthropic-SDK shape ({ content: [{ text }] }). Extracted into
// its own module so the request/response mapping is unit-testable WITHOUT a network call — same
// "pure logic in a module" pattern as affiliate-payout.js / affiliate-withdraw-math.js.

// Anthropic model id -> OpenRouter model id. Anything else that looks like a Claude id is passed
// through under the anthropic/ namespace; a fully-qualified/other id is left untouched.
const MODEL_MAP = {
  'claude-haiku-4-5-20251001': 'anthropic/claude-haiku-4-5',
  'claude-haiku-4-5': 'anthropic/claude-haiku-4-5',
  'claude-sonnet-4-5': 'anthropic/claude-sonnet-4-5',
  'claude-3-haiku-20240307': 'anthropic/claude-3-haiku',
};

export function mapModel(model) {
  if (MODEL_MAP[model]) return MODEL_MAP[model];
  if (typeof model === 'string' && model.startsWith('claude')) return `anthropic/${model}`;
  return model;
}

// Map an OpenRouter chat-completions response to the Anthropic-SDK { content: [{ text }] } shape.
// Throws a CLEAR Error on an error body, or on a malformed / empty / content-filtered response
// (choices missing, choices empty, or message.content not a string). The old wrapper did
// `data.choices[0].message.content` unguarded, so any of those threw a cryptic
// "Cannot read properties of undefined (reading '0')" — or, when content was null (a
// content_filter finish_reason), silently returned { text: null } which broke downstream string
// handling. A clear throw lets server.js's hybrid fallback (→ Gemini → mock) kick in cleanly and
// log something actionable.
export function extractText(data) {
  if (!data || typeof data !== 'object') throw new Error('OpenRouter: empty response');
  if (data.error) throw new Error(data.error.message || 'OpenRouter error');
  const text = data.choices?.[0]?.message?.content;
  if (typeof text !== 'string') throw new Error('OpenRouter: no message content in response');
  return { content: [{ text }] };
}
