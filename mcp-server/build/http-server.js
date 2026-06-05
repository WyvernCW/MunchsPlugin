import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { getControlSnapshot, renderControlDashboard } from "./advanced-runtime.js";
export function startHttpServer(options) {
    if (!options.token && !options.allowInsecure) {
        throw new Error("HTTP mode requires MUNCH_HTTP_TOKEN. Set MUNCH_ALLOW_INSECURE_HTTP=true only for isolated local development.");
    }
    const sessions = new Map();
    const legacyTransports = new Map();
    const rates = new Map();
    let ready = false;
    const cleanupTimer = setInterval(() => {
        const cutoff = Date.now() - options.sessionTtlMs;
        for (const [id, entry] of sessions) {
            if (entry.lastSeen < cutoff) {
                sessions.delete(id);
                void entry.transport.close();
            }
        }
    }, Math.min(options.sessionTtlMs, 60_000));
    cleanupTimer.unref();
    const server = createServer(async (request, response) => {
        const requestId = request.headers["x-request-id"]?.toString() ?? randomUUID();
        response.setHeader("X-Request-Id", requestId);
        try {
            if (!applyCors(request, response, options.allowedOrigins))
                return;
            if (request.method === "OPTIONS") {
                response.writeHead(204);
                response.end();
                return;
            }
            if (!rateAllowed(request, rates, options.rateLimitPerMinute)) {
                sendJson(response, 429, { error: "Rate limit exceeded", requestId });
                return;
            }
            const url = new URL(request.url ?? "/", "http://localhost");
            if (request.method === "GET" && url.pathname === "/health") {
                sendJson(response, 200, { status: "online", version: "1.0.0", requestId });
                return;
            }
            if (request.method === "GET" && url.pathname === "/ready") {
                sendJson(response, ready ? 200 : 503, { ready, sessions: sessions.size, requestId });
                return;
            }
            if (!authorized(request, options.token)) {
                response.setHeader("WWW-Authenticate", "Bearer");
                sendJson(response, 401, { error: "Unauthorized", requestId });
                return;
            }
            if (request.method === "GET" && url.pathname === "/control.json") {
                sendJson(response, 200, {
                    ...getControlSnapshot(),
                    ...(options.controlSnapshot?.() ?? {}),
                    activeSessions: sessions.size,
                });
                return;
            }
            if (request.method === "GET" && url.pathname === "/dashboard") {
                const snapshot = {
                    ...getControlSnapshot(),
                    ...(options.controlSnapshot?.() ?? {}),
                    activeSessions: sessions.size,
                };
                response.writeHead(200, {
                    "Content-Type": "text/html; charset=utf-8",
                    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
                    "X-Content-Type-Options": "nosniff",
                    "Referrer-Policy": "no-referrer",
                });
                response.end(renderControlDashboard(snapshot));
                return;
            }
            if (url.pathname === "/mcp") {
                await handleStreamableRequest(request, response, options, sessions);
                return;
            }
            if (options.enableLegacySse && url.pathname === "/sse" && request.method === "GET") {
                const transport = new SSEServerTransport("/messages", response);
                legacyTransports.set(transport.sessionId, transport);
                const mcpServer = options.createMcpServer();
                await mcpServer.connect(transport);
                request.on("close", () => legacyTransports.delete(transport.sessionId));
                return;
            }
            if (options.enableLegacySse && url.pathname === "/messages" && request.method === "POST") {
                const sessionId = url.searchParams.get("sessionId") ?? request.headers["x-session-id"]?.toString();
                const transport = sessionId ? legacyTransports.get(sessionId) : undefined;
                if (!transport) {
                    sendJson(response, 404, { error: "Legacy SSE session not found", requestId });
                    return;
                }
                await transport.handlePostMessage(request, response);
                return;
            }
            sendJson(response, 404, { error: "Not found", requestId });
        }
        catch (error) {
            console.error(JSON.stringify({
                level: "error",
                event: "http_request_failed",
                requestId,
                message: error instanceof Error ? error.message : String(error),
            }));
            if (!response.headersSent)
                sendJson(response, 500, { error: "Internal server error", requestId });
        }
    });
    server.requestTimeout = 30_000;
    server.headersTimeout = 15_000;
    server.keepAliveTimeout = 5_000;
    server.listen(options.port, () => {
        ready = true;
        console.error(JSON.stringify({
            level: "info",
            event: "http_server_started",
            port: options.port,
            transport: "streamable-http",
            legacySse: options.enableLegacySse,
        }));
    });
    const shutdown = async () => {
        ready = false;
        clearInterval(cleanupTimer);
        for (const entry of sessions.values())
            await entry.transport.close();
        for (const transport of legacyTransports.values())
            await transport.close();
        await new Promise((resolve) => server.close(() => resolve()));
    };
    process.once("SIGINT", () => void shutdown().finally(() => process.exit(0)));
    process.once("SIGTERM", () => void shutdown().finally(() => process.exit(0)));
    return { server, shutdown, sessions };
}
async function handleStreamableRequest(request, response, options, sessions) {
    const sessionId = request.headers["mcp-session-id"]?.toString();
    let entry = sessionId ? sessions.get(sessionId) : undefined;
    if (request.method === "POST") {
        const body = await readJsonBody(request, options.maxBodyBytes);
        if (!entry && isInitializeRequest(body)) {
            if (sessions.size >= options.maxSessions) {
                sendJson(response, 503, { error: "Session capacity reached" });
                return;
            }
            let transport;
            transport = new StreamableHTTPServerTransport({
                sessionIdGenerator: () => randomUUID(),
                onsessioninitialized: (id) => {
                    sessions.set(id, {
                        transport,
                        server: mcpServer,
                        lastSeen: Date.now(),
                    });
                },
            });
            const mcpServer = options.createMcpServer();
            transport.onclose = () => {
                if (transport.sessionId)
                    sessions.delete(transport.sessionId);
            };
            await mcpServer.connect(transport);
            await transport.handleRequest(request, response, body);
            return;
        }
        if (!entry) {
            sendJson(response, 400, { error: "Missing or invalid MCP session" });
            return;
        }
        entry.lastSeen = Date.now();
        await entry.transport.handleRequest(request, response, body);
        return;
    }
    if (!entry) {
        sendJson(response, 404, { error: "MCP session not found" });
        return;
    }
    entry.lastSeen = Date.now();
    await entry.transport.handleRequest(request, response);
}
function readJsonBody(request, maximum) {
    return new Promise((resolve, reject) => {
        let body = "";
        request.setEncoding("utf8");
        request.on("data", (chunk) => {
            body += chunk;
            if (Buffer.byteLength(body, "utf8") > maximum) {
                reject(new Error("Request body exceeds configured limit"));
                request.destroy();
            }
        });
        request.on("end", () => {
            try {
                resolve(body ? JSON.parse(body) : undefined);
            }
            catch {
                reject(new Error("Request body is not valid JSON"));
            }
        });
        request.on("error", reject);
    });
}
function authorized(request, token) {
    return !token || request.headers.authorization === `Bearer ${token}`;
}
function applyCors(request, response, allowedOrigins) {
    const origin = request.headers.origin;
    if (origin && !allowedOrigins.has(origin)) {
        sendJson(response, 403, { error: "Origin not allowed" });
        return false;
    }
    if (origin) {
        response.setHeader("Access-Control-Allow-Origin", origin);
        response.setHeader("Vary", "Origin");
    }
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, MCP-Session-Id, X-Request-Id");
    return true;
}
function rateAllowed(request, rates, maximum) {
    const key = request.socket.remoteAddress ?? "unknown";
    const now = Date.now();
    const current = rates.get(key);
    if (!current || current.resetAt <= now) {
        rates.set(key, { count: 1, resetAt: now + 60_000 });
        return true;
    }
    current.count += 1;
    return current.count <= maximum;
}
function sendJson(response, status, body) {
    response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify(body));
}
