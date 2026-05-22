// OpenThai AI — MCP Server Handler
// Implements Model Context Protocol (MCP) so Claude and other AI agents
// can discover and call OpenThai AI's tools directly.
//
// Endpoint: POST /mcp
// Protocol: JSON-RPC 2.0 + MCP spec
//   - initialize        → server info
//   - tools/list        → available tools
//   - tools/call        → invoke a tool

// ── Tool definitions ─────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'generate_content',
    description:
      'Generate Thai social media content (hook, script, caption, hashtags) for a product. Optimised for TikTok, Facebook, LINE. Uses Claude → Gemini → Mock fallback.',
    inputSchema: {
      type: 'object',
      required: ['product'],
      properties: {
        product:  { type: 'string',  description: 'Product name in Thai or English' },
        category: { type: 'string',  description: 'Product category', enum: ['OTOP','อาหาร','ความงาม','สิ่งทอ','เครื่องดื่ม','สมุนไพร','เครื่องประดับ','เฟอร์นิเจอร์','ทั่วไป'], default: 'ทั่วไป' },
        platform: { type: 'string',  description: 'Target platform', enum: ['TikTok','Facebook','Instagram','LINE','YouTube'], default: 'TikTok' },
        style:    { type: 'string',  description: 'Content style', enum: ['educational','entertainment','sales'], default: 'sales' },
        lang:     { type: 'string',  description: 'Output language', enum: ['ภาษาไทย','English','ไทย + อังกฤษ'], default: 'ภาษาไทย' },
        price:    { type: 'string',  description: 'Product price, e.g. "299 บาท"' },
        audience: { type: 'string',  description: 'Target audience, e.g. "แม่บ้าน 25-45 ปี"' },
      },
    },
  },
  {
    name: 'generate_ab_test',
    description:
      'Generate two content variants (A/B test) for the same product simultaneously. Variant A uses the specified style; variant B uses the opposite style.',
    inputSchema: {
      type: 'object',
      required: ['product'],
      properties: {
        product:  { type: 'string' },
        category: { type: 'string', default: 'ทั่วไป' },
        platform: { type: 'string', default: 'TikTok' },
        style:    { type: 'string', default: 'sales' },
        lang:     { type: 'string', default: 'ภาษาไทย' },
        price:    { type: 'string' },
        audience: { type: 'string' },
      },
    },
  },
  {
    name: 'analyze_image',
    description:
      'Analyze a product image using AI vision (Claude or Gemini). Returns product name, category, description, and recommended target audience.',
    inputSchema: {
      type: 'object',
      required: ['base64'],
      properties: {
        base64:   { type: 'string', description: 'Base64-encoded image data' },
        mimeType: { type: 'string', description: 'Image MIME type', default: 'image/jpeg' },
      },
    },
  },
  {
    name: 'get_trending_hashtags',
    description:
      'Get trending Thai hashtags, hot topics, and viral sounds for TikTok. Data is AI-generated or curated, cached for 30 minutes.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_news_rag',
    description:
      'Get Thai news headlines from RSS feeds (Thairath, Sanook) and AI-generated content ideas based on those headlines. Cached 1 hour.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'competitor_analyze',
    description:
      'Analyze competitor strategies and content gaps in a Thai market niche. Returns tactics, content gaps, winning hooks, and differentiation strategy.',
    inputSchema: {
      type: 'object',
      required: ['niche'],
      properties: {
        niche:      { type: 'string', description: 'Product niche, e.g. "น้ำพริก" or "ครีมหน้าใส"' },
        competitor: { type: 'string', description: 'Competitor account name (optional)' },
        platform:   { type: 'string', default: 'TikTok' },
      },
    },
  },
  {
    name: 'system_health',
    description:
      'Check the health status of the OpenThai AI backend: AI engine, active agents, memory usage, watchdog status, and services.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_agents',
    description: 'List all automated AI content agents with their schedule, last run time, and recent results.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'run_agent',
    description: 'Manually trigger an AI agent to generate content immediately.',
    inputSchema: {
      type: 'object',
      required: ['agent_id'],
      properties: {
        agent_id: { type: 'string', description: 'Agent ID from list_agents' },
      },
    },
  },
];

// ── Internal fetch helper (calls own Express routes) ─────────────────────────

async function callOwnApi(method, path, body, baseUrl) {
  const url = `${baseUrl}${path}`;
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', 'X-MCP-Client': 'mcp-internal' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

// ── Tool handlers ─────────────────────────────────────────────────────────────

async function handleToolCall(toolName, args, baseUrl) {
  switch (toolName) {
    case 'generate_content':
      return callOwnApi('POST', '/api/generate', args, baseUrl);

    case 'generate_ab_test':
      return callOwnApi('POST', '/api/generate-ab', args, baseUrl);

    case 'analyze_image':
      return callOwnApi('POST', '/api/analyze-image', args, baseUrl);

    case 'get_trending_hashtags':
      return callOwnApi('GET', '/api/trending', null, baseUrl);

    case 'get_news_rag':
      return callOwnApi('GET', '/api/news-rag', null, baseUrl);

    case 'competitor_analyze':
      return callOwnApi('POST', '/api/competitor-analyze', args, baseUrl);

    case 'system_health':
      return callOwnApi('GET', '/api/health', null, baseUrl);

    case 'list_agents':
      return callOwnApi('GET', '/api/agent', null, baseUrl);

    case 'run_agent': {
      const { agent_id, ...rest } = args;
      return callOwnApi('POST', `/api/agent/${agent_id}/run`, rest, baseUrl);
    }

    default:
      throw { code: -32601, message: `Tool not found: ${toolName}` };
  }
}

// ── MCP JSON-RPC dispatcher ───────────────────────────────────────────────────

export async function handleMcp(req, res) {
  // Support both single request and batched requests
  const body = req.body;

  // Infer server base URL from incoming request
  const proto = req.headers['x-forwarded-proto'] || (req.socket?.encrypted ? 'https' : 'http');
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:8000';
  const baseUrl = `${proto}://${host}`;

  const processOne = async (rpc) => {
    const { jsonrpc, id, method, params = {} } = rpc || {};

    const ok = (result) => ({ jsonrpc: '2.0', id: id ?? null, result });
    const err = (code, message, data) => ({
      jsonrpc: '2.0', id: id ?? null,
      error: { code, message, ...(data ? { data } : {}) },
    });

    if (jsonrpc !== '2.0') return err(-32600, 'Invalid Request — jsonrpc must be "2.0"');
    if (!method) return err(-32600, 'Invalid Request — method required');

    try {
      // ── initialize ───────────────────────────────────────────────────────
      if (method === 'initialize') {
        return ok({
          protocolVersion: '2024-11-05',
          capabilities: { tools: { listChanged: false } },
          serverInfo: {
            name: 'openthai-ai',
            version: '2.0.0',
            description: 'OpenThai AI — Thai social media content generation platform',
          },
        });
      }

      // ── tools/list ───────────────────────────────────────────────────────
      if (method === 'tools/list') {
        return ok({ tools: TOOLS });
      }

      // ── tools/call ───────────────────────────────────────────────────────
      if (method === 'tools/call') {
        const { name, arguments: toolArgs = {} } = params;
        if (!name) return err(-32602, 'Invalid params — name required');

        const data = await handleToolCall(name, toolArgs, baseUrl);

        // MCP content response format
        return ok({
          content: [
            {
              type: 'text',
              text: typeof data === 'string' ? data : JSON.stringify(data, null, 2),
            },
          ],
          isError: false,
        });
      }

      // ── notifications/initialized (fire-and-forget, no response needed) ─
      if (method === 'notifications/initialized') {
        return null; // no response for notifications
      }

      return err(-32601, `Method not found: ${method}`);
    } catch (e) {
      const code  = e?.code  || -32603;
      const msg   = e?.message || 'Internal error';
      return err(code, msg);
    }
  };

  // Batch support
  if (Array.isArray(body)) {
    const results = (await Promise.all(body.map(processOne))).filter(Boolean);
    return res.json(results);
  }

  const result = await processOne(body);
  if (result === null) return res.status(204).end(); // notification ack
  return res.json(result);
}
