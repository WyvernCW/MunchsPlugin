import { timingSafeEqual } from "node:crypto";

import { createMcpHandler } from "mcp-handler";

import { configureMcpServer } from "../mcp-server/build/index.js";

const handler = createMcpHandler(
  (server) => {
    configureMcpServer(server);
  },
  {
    serverInfo: {
      name: "munch",
      version: "1.0.0",
    },
  },
  {
    basePath: "/api",
    disableSse: true,
    maxDuration: 60,
    verboseLogs: process.env.MUNCH_VERBOSE_HTTP === "true",
  },
);

function tokenMatches(actual, expected) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length
    && timingSafeEqual(actualBuffer, expectedBuffer);
}

function responseWithCors(request, response) {
  const origin = request.headers.get("origin");
  const allowedOrigins = new Set(
    (process.env.MUNCH_ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  if (origin && allowedOrigins.has(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Vary", "Origin");
  }
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type, MCP-Protocol-Version, MCP-Session-Id, X-Request-Id",
  );
  return response;
}

async function securedHandler(request) {
  const origin = request.headers.get("origin");
  const allowedOrigins = new Set(
    (process.env.MUNCH_ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  if (origin && !allowedOrigins.has(origin)) {
    return Response.json({ error: "Origin not allowed" }, { status: 403 });
  }
  if (request.method === "OPTIONS") {
    return responseWithCors(request, new Response(null, { status: 204 }));
  }

  const token = process.env.MUNCH_HTTP_TOKEN;
  const insecure = process.env.MUNCH_ALLOW_INSECURE_HTTP === "true";
  if (!token && !insecure) {
    return Response.json(
      { error: "MUNCH_HTTP_TOKEN is not configured" },
      { status: 503 },
    );
  }
  if (token) {
    const authorization = request.headers.get("authorization") ?? "";
    const bearer = authorization.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : "";
    if (!tokenMatches(bearer, token)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "WWW-Authenticate": "Bearer",
        },
      });
    }
  }

  return responseWithCors(request, await handler(request));
}

export const GET = securedHandler;
export const POST = securedHandler;
export const DELETE = securedHandler;
export const OPTIONS = securedHandler;
