Fetch trending Thai TikTok hashtags and content ideas.

1. Call `get_trending_hashtags` from the openthai-ai MCP server.
2. Call `get_news_rag` to get today's Thai news content angles.

Present the results in two sections:

### Trending Hashtags
List the top hashtags grouped by category (viral sounds, product niches, news-driven).

### Content Angles from Today's News
List 3–5 content ideas based on current Thai news that fit the openthai-ai product categories (OTOP, beauty, food, herbs, etc.).

If no argument is provided ($ARGUMENTS is empty), show general trending data.
If an argument is given (e.g. `/trending น้ำพริก`), also call `competitor_analyze` with that niche.
