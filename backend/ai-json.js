// Extract a JSON object from a model's text reply.
//
// Every AI skill endpoint (36 call sites in server.js) and the dispute-arbitration path in
// disputes.js funnel the model's raw text through this to get structured data; on a throw the
// caller falls back to a generic mock. It was an inline server.js helper with no test that did:
//   const m = text.match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0]); throw new Error('no json');
// Two real weaknesses that this hardening (behaviour-compatible for everything that parsed before)
// fixes so fewer valid replies get thrown away into the mock fallback:
//   1. text.match on a null/undefined reply (a provider returned nothing) threw a *TypeError* rather
//      than the intended "no json" Error — same catch, but now it's explicit and can't surprise a
//      future un-try/catch'd caller.
//   2. models very commonly wrap JSON in a ```json … ``` code fence, sometimes with trailing prose
//      that also contains a "}"; the greedy {…} then over-matched across the fence and JSON.parse
//      threw. Prefer the fenced block's contents when present, then fall back to the greedy scan.
// Anything that parsed under the old rule parses to the same value here (plain "{…}", prose around
// a single object, etc.); only previously-failing inputs (null, fenced-with-trailing-brace) improve.
export function parseAIJson(text) {
  if (typeof text !== 'string' || !text.trim()) throw new Error('no json: empty or non-string reply');
  // Prefer a ```json … ``` (or bare ``` … ```) fenced block's contents if one is present.
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1] : text;
  const m = candidate.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('no json');
  return JSON.parse(m[0]);
}
