// OpenThaiAi — OpenAPI 3.0 Specification
// Auto-served at GET /api/openapi.json | Interactive docs at GET /api-docs

export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'OpenThaiAi API',
    version: '2.0.0',
    description:
      'AI-powered Thai social media content generation platform. Supports TikTok, Facebook, LINE, and more. Built on Claude (primary) + Gemini (fallback).',
    contact: { email: 'occylthailand@gmail.com', url: 'https://www.OpenThaiAi.com' },
    license: { name: 'Proprietary', url: 'https://www.OpenThaiAi.com/terms' },
  },
  servers: [
    { url: 'https://api.OpenThaiAi.com', description: 'Production' },
    { url: 'http://localhost:8000', description: 'Local development' },
  ],
  tags: [
    { name: 'AI Generation', description: 'Generate Thai social media content with AI' },
    { name: 'Trending', description: 'Real-time Thai trends and news-based content ideas' },
    { name: 'Agent', description: 'Automated AI content scheduler' },
    { name: 'Affiliate', description: 'Affiliate program management' },
    { name: 'Integrations', description: 'LINE OA and TTS voice integration' },
    { name: 'System', description: 'Health, metrics, watchdog, and auto-heal' },
    { name: 'Auth', description: 'JWT authentication' },
    { name: 'Privacy', description: 'PDPA compliance endpoints' },
  ],
  components: {
    securitySchemes: {
      BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      ContentForm: {
        type: 'object',
        required: ['product'],
        properties: {
          product: { type: 'string', maxLength: 500, example: 'น้ำพริกแม่บ้าน' },
          category: {
            type: 'string',
            enum: ['OTOP', 'อาหาร', 'ความงาม', 'สิ่งทอ', 'เครื่องดื่ม', 'สมุนไพร', 'เครื่องประดับ', 'เฟอร์นิเจอร์', 'ทั่วไป'],
            default: 'ทั่วไป',
          },
          platform: { type: 'string', enum: ['TikTok', 'Facebook', 'Instagram', 'LINE', 'YouTube'], default: 'TikTok' },
          style: { type: 'string', enum: ['educational', 'entertainment', 'sales'], default: 'sales' },
          lang: { type: 'string', enum: ['ภาษาไทย', 'English', 'ไทย + อังกฤษ'], default: 'ภาษาไทย' },
          price: { type: 'string', example: '299 บาท' },
          audience: { type: 'string', example: 'แม่บ้าน อายุ 25-45 ปี' },
        },
      },
      ContentResult: {
        type: 'object',
        properties: {
          hook: { type: 'string', description: 'Opening hook sentence' },
          script: { type: 'array', items: { type: 'string' }, description: 'Video script steps' },
          caption: { type: 'string', description: 'Ready-to-post caption with emojis' },
          hashtags: { type: 'array', items: { type: 'string' }, example: ['#OTOP', '#สินค้าไทย', '#OpenThaiAi'] },
          criticScore: { type: 'string', example: '8.7', description: 'AI quality score 0.0–10.0' },
          source: { type: 'string', enum: ['claude', 'gemini', 'mock', 'mock-fallback'] },
        },
      },
      Agent: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          product: { type: 'string' },
          category: { type: 'string' },
          platform: { type: 'string' },
          style: { type: 'string' },
          lang: { type: 'string' },
          schedule: { type: 'string', enum: ['daily', 'weekly', 'manual'] },
          hour: { type: 'integer', minimum: 0, maximum: 23 },
          active: { type: 'boolean' },
          lastRun: { type: 'string', format: 'date-time', nullable: true },
          lastError: { type: 'string', nullable: true },
          results: { type: 'array', items: { $ref: '#/components/schemas/ContentResult' } },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' },
          success: { type: 'boolean', example: false },
        },
      },
    },
  },
  paths: {
    // ── AI GENERATION ──────────────────────────────────────────────────────────
    '/api/generate': {
      post: {
        tags: ['AI Generation'],
        summary: 'Generate Thai social media content',
        description: 'Generates hook, script, caption, and hashtags optimised for Thai products. Uses Claude → Gemini → Mock fallback chain.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ContentForm' } } },
        },
        responses: {
          200: { description: 'Generated content', content: { 'application/json': { schema: { $ref: '#/components/schemas/ContentResult' } } } },
          400: { description: 'Missing product field', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          429: { description: 'Rate limit exceeded (10 req/min per IP)' },
        },
      },
    },
    '/api/generate-ab': {
      post: {
        tags: ['AI Generation'],
        summary: 'A/B test — generate 2 content variants',
        description: 'Returns variant A (original style) and variant B (opposite style) simultaneously.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ContentForm' } } },
        },
        responses: {
          200: {
            description: 'Two content variants',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    a: { $ref: '#/components/schemas/ContentResult' },
                    b: { $ref: '#/components/schemas/ContentResult' },
                  },
                },
              },
            },
          },
          429: { description: 'Rate limit exceeded' },
        },
      },
    },
    '/api/analyze-image': {
      post: {
        tags: ['AI Generation'],
        summary: 'Analyze product image with AI vision',
        description: 'Extracts product name, category, description, and target audience from an image using Claude/Gemini vision.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['base64'],
                properties: {
                  base64: { type: 'string', description: 'Base64-encoded image data (max 5MB)' },
                  mimeType: { type: 'string', example: 'image/jpeg', default: 'image/jpeg' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Image analysis result',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    product: { type: 'string' },
                    category: { type: 'string' },
                    description: { type: 'string' },
                    audience: { type: 'string' },
                    source: { type: 'string' },
                  },
                },
              },
            },
          },
          503: { description: 'No AI API key configured' },
        },
      },
    },
    // ── TRENDING ──────────────────────────────────────────────────────────────
    '/api/trending': {
      get: {
        tags: ['Trending'],
        summary: 'Get trending Thai hashtags and topics',
        description: 'Returns trending hashtags, topics, and sounds. Cached 30 min. Uses Gemini AI to generate real-time trends when available.',
        responses: {
          200: {
            description: 'Trending data',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    hashtags: { type: 'array', items: { type: 'object', properties: { tag: { type: 'string' }, views: { type: 'string' }, hot: { type: 'boolean' } } } },
                    topics: { type: 'array', items: { type: 'object', properties: { topic: { type: 'string' }, momentum: { type: 'string' } } } },
                    sounds: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, uses: { type: 'string' } } } },
                    source: { type: 'string', enum: ['gemini', 'curated'] },
                    ts: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/news-rag': {
      get: {
        tags: ['Trending'],
        summary: 'Get news-based content ideas (RAG)',
        description: 'Fetches Thai news headlines from RSS feeds (Thairath, Sanook) and converts them into content ideas. Cached 1 hour.',
        responses: {
          200: {
            description: 'News-based content ideas',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    headlines: { type: 'array', items: { type: 'string' } },
                    content_ideas: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          idea: { type: 'string' },
                          angle: { type: 'string' },
                          category: { type: 'string' },
                        },
                      },
                    },
                    source: { type: 'string', enum: ['rss+ai', 'ai', 'fallback'] },
                    ts: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/competitor-analyze': {
      post: {
        tags: ['Trending'],
        summary: 'Analyze competitor strategy in a niche',
        description: 'AI-powered competitor analysis: tactics, content gaps, winning hooks, and recommended angles.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['niche'],
                properties: {
                  niche: { type: 'string', example: 'น้ำพริก' },
                  competitor: { type: 'string', example: '@competitor_account' },
                  platform: { type: 'string', default: 'TikTok' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Competitor analysis',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    niche_overview: { type: 'string' },
                    competitor_tactics: { type: 'array', items: { type: 'string' } },
                    content_gaps: { type: 'array', items: { type: 'string' } },
                    winning_hooks: { type: 'array', items: { type: 'string' } },
                    best_post_times: { type: 'string' },
                    differentiation: { type: 'string' },
                  },
                },
              },
            },
          },
          429: { description: 'Rate limit (5 req/min)' },
        },
      },
    },
    // ── AGENT ─────────────────────────────────────────────────────────────────
    '/api/agent': {
      get: {
        tags: ['Agent'],
        summary: 'List all AI agents',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Agent list', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array', items: { $ref: '#/components/schemas/Agent' } } } } } } },
        },
      },
      post: {
        tags: ['Agent'],
        summary: 'Create a new AI agent',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'product'],
                properties: {
                  name: { type: 'string' },
                  product: { type: 'string' },
                  category: { type: 'string' },
                  platform: { type: 'string', default: 'TikTok' },
                  style: { type: 'string', default: 'sales' },
                  lang: { type: 'string', default: 'ภาษาไทย' },
                  schedule: { type: 'string', enum: ['daily', 'weekly', 'manual'], default: 'daily' },
                  hour: { type: 'integer', default: 18 },
                  lineEnabled: { type: 'boolean', default: false },
                  lineUserId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Created agent', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/Agent' } } } } } },
        },
      },
    },
    '/api/agent/{id}/run': {
      post: {
        tags: ['Agent'],
        summary: 'Manually trigger an agent run',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Run result', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/ContentResult' } } } } } },
          404: { description: 'Agent not found' },
        },
      },
    },
    // ── AFFILIATE ─────────────────────────────────────────────────────────────
    '/api/affiliate/apply': {
      post: {
        tags: ['Affiliate'],
        summary: 'Apply for affiliate program',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email'],
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  phone: { type: 'string' },
                  platform: { type: 'string', default: 'TikTok' },
                  followers: { type: 'string' },
                  channel_url: { type: 'string' },
                  note: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Application accepted',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        ref_code: { type: 'string', example: 'AFF123456' },
                        ref_link: { type: 'string' },
                        tier: { type: 'string', example: 'starter' },
                        commission_rate: { type: 'number', example: 0.2 },
                      },
                    },
                  },
                },
              },
            },
          },
          409: { description: 'Email already registered' },
        },
      },
    },
    '/api/affiliate/stats/{ref_code}': {
      get: {
        tags: ['Affiliate'],
        summary: 'Get affiliate stats by ref code',
        parameters: [{ name: 'ref_code', in: 'path', required: true, schema: { type: 'string' }, example: 'AFF123456' }],
        responses: {
          200: { description: 'Affiliate stats' },
          404: { description: 'Affiliate not found' },
        },
      },
    },
    // ── INTEGRATIONS ──────────────────────────────────────────────────────────
    '/api/line/send': {
      post: {
        tags: ['Integrations'],
        summary: 'Send LINE message to a user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['to', 'message'],
                properties: {
                  to: { type: 'string', description: 'LINE user ID' },
                  message: { type: 'string', maxLength: 5000 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Message sent' },
          503: { description: 'LINE_CHANNEL_TOKEN not configured' },
        },
      },
    },
    '/api/line/status': {
      get: {
        tags: ['Integrations'],
        summary: 'Check LINE OA connection status',
        responses: {
          200: { description: 'LINE status', content: { 'application/json': { schema: { type: 'object', properties: { connected: { type: 'boolean' }, token: { type: 'string' } } } } } },
        },
      },
    },
    '/api/tts': {
      post: {
        tags: ['Integrations'],
        summary: 'Text-to-speech via ElevenLabs',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['text'],
                properties: {
                  text: { type: 'string', maxLength: 2500 },
                  voiceId: { type: 'string', description: 'ElevenLabs voice ID (optional)' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Audio MP3 binary', content: { 'audio/mpeg': {} } },
          503: { description: 'ELEVENLABS_API_KEY not configured' },
        },
      },
    },
    // ── SYSTEM ────────────────────────────────────────────────────────────────
    '/api/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        description: 'Returns API status, AI engine, active services, and resource usage.',
        responses: {
          200: {
            description: 'System health',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    version: { type: 'string', example: '2.0.0' },
                    ai_primary: { type: 'string' },
                    ai_fallback: { type: 'string' },
                    ai_active: { type: 'string' },
                    uptime_sec: { type: 'integer' },
                    memory_mb: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/system/metrics': {
      get: {
        tags: ['System'],
        summary: 'System metrics (agents, runs, scores, memory)',
        responses: { 200: { description: 'Metrics snapshot' } },
      },
    },
    '/api/system/logs': {
      get: {
        tags: ['System'],
        summary: 'System event logs',
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 100, maximum: 500 } },
          { name: 'level', in: 'query', schema: { type: 'string', enum: ['info', 'warn', 'error'] } },
          { name: 'source', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Log entries' } },
      },
    },
    '/api/system/diagnose': {
      post: {
        tags: ['System'],
        summary: 'AI-powered self-diagnosis',
        description: 'Analyzes recent errors and warns, returns health_score and recommendations.',
        responses: {
          200: {
            description: 'Diagnosis result',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['healthy', 'warning', 'critical'] },
                    health_score: { type: 'integer', minimum: 0, maximum: 100 },
                    issues: { type: 'array', items: { type: 'string' } },
                    recommendations: { type: 'array', items: { type: 'string' } },
                    auto_fixed: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/system/auto-heal': {
      post: {
        tags: ['System'],
        summary: 'Manually trigger watchdog auto-heal',
        responses: { 200: { description: 'Heal result' } },
      },
    },
    // ── AUTH ──────────────────────────────────────────────────────────────────
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login with password or Google OAuth',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  password: { type: 'string' },
                  override_key: { type: 'string' },
                  recovery_code: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'JWT token', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, token: { type: 'string' } } } } } },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    '/api/auth/verify': {
      get: {
        tags: ['Auth'],
        summary: 'Verify JWT token',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Token valid', content: { 'application/json': { schema: { type: 'object', properties: { valid: { type: 'boolean' } } } } } },
        },
      },
    },
    // ── PRIVACY ───────────────────────────────────────────────────────────────
    '/api/privacy/consent': {
      post: {
        tags: ['Privacy'],
        summary: 'Record PDPA consent (มาตรา 19)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'purposes'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  purposes: { type: 'array', items: { type: 'string' }, example: ['marketing', 'analytics'] },
                  version: { type: 'string', default: '1.0' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Consent recorded' } },
      },
    },
    '/api/privacy/erasure': {
      post: {
        tags: ['Privacy'],
        summary: 'Request data erasure (Right to be forgotten — มาตรา 33)',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' } } } } },
        },
        responses: { 200: { description: 'Data erased from all stores' } },
      },
    },
    // ── CONTACT / WAITLIST ────────────────────────────────────────────────────
    '/api/contact': {
      post: {
        tags: ['System'],
        summary: 'Send a contact message',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'message'],
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  subject: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Message sent' } },
      },
    },
    '/api/waitlist': {
      post: {
        tags: ['System'],
        summary: 'Join the waitlist',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' }, source: { type: 'string', default: 'landing' } } } } },
        },
        responses: { 200: { description: 'Waitlist registration' } },
      },
    },
  },
};
