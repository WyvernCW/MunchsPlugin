export function GET() {
  return Response.json({
    name: "Munch MCP",
    status: "online",
    version: "1.0.0",
    transport: "streamable-http",
    endpoint: "/api/mcp",
    authentication: process.env.MUNCH_HTTP_TOKEN ? "bearer" : "not-configured",
  }, {
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=60",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
