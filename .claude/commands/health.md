Check the openthai-ai backend health and show a status summary.

Call the `system_health` tool from the openthai-ai MCP server, then format the result as a concise table:

| Service | Status |
|---------|--------|
| AI Engine | ... |
| Agents | ... |
| Memory | ... |

Also call `list_agents` and show a short list of active agents with their last-run time.

If the backend is offline, report: "Backend offline — start it with: cd backend && npm start"
