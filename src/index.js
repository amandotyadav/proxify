const http = require("http");
const { matchRoute, rewritePath } = require("./router/matcher");
const { buildForwardedHeaders } = require("./router/forwarded-header");
const {
  reloadRoutes,
  getRoutes,
  startWatching,
} = require("./router/routes-loader");
const agent = require("./proxy/agent");
const { attachTimeouts } = require("./proxy/timeout");
const { setupGracefulShutdown } = require("./core/shutdown");

const LISTEN_PORT = 3000;

const TIMEOUTS = {
  connectMs: 3000,
  requestMs: 5000,
  responseMs: 8000,
};

function mapErrorToStatus(err) {
  if (err.code === "ABORT_ERR") {
    const reason = err.cause instanceof Error ? err.cause.message : "unknown";
    switch (reason) {
      case "connect-timeout":
        return {
          status: 504,
          message:
            "504 Gateway Timeout: backend did not accept a connection in time\n",
        };
      case "request-timeout":
        return {
          status: 504,
          message:
            "504 Gateway Timeout: timed out sending request to backend\n",
        };
      case "response-timeout":
        return {
          status: 504,
          message: "504 Gateway Timeout: backend did not respond in time\n",
        };
      default:
        return {
          status: 504,
          message: "504 Gateway Timeout\n",
        };
    }
  }

  if (err.code === "ECONNREFUSED") {
    return {
      status: 502,
      message: "502 Bad Gateway: connection refused by backend\n",
    };
  }

  if (err.code === "ENOTFOUND" || err.code === "EAI_AGAIN") {
    return {
      status: 502,
      message: "502 Bad Gateway: backend host not found\n",
    };
  }

  return { status: 502, message: "502 Bad Gateway: upstream request failed\n" };
}

reloadRoutes();

const server = http.createServer((clientReq, clientRes) => {
  const requestId = Date.now();

  const parsedUrl = new URL(
    clientReq.url,
    `http://${clientReq.headers.host}` || "localhost",
  );

  const route = matchRoute(getRoutes(), parsedUrl.pathname);

  if (!route) {
    console.log(
      `[${requestId}] ${clientReq.method} ${parsedUrl.pathname} -> no matching route`,
    );
    clientRes.writeHead(404, { "Content-Type": "text/plain" });
    clientRes.end("404 Not Found: no route matches this path\n");
    return;
  }

  const rewrittenPath =
    rewritePath(parsedUrl.pathname, route) + parsedUrl.search;
  const { target } = route;
  console.log(
    `[${requestId}] ${clientReq.method} ${parsedUrl.pathname} -> ${target.host}:${target.port} ${rewrittenPath}`,
  );

  const controller = new AbortController();

  const proxyReq = http.request(
    {
      host: target.host,
      port: target.port,
      method: clientReq.method,
      path: rewrittenPath,
      headers: buildForwardedHeaders(clientReq, target),
      agent,
      signal: controller.signal,
    },
    (proxyRes) => {
      clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(clientRes);
    },
  );

  attachTimeouts(proxyReq, controller, TIMEOUTS);

  proxyReq.on("error", (err) => {
    const { status, message } = mapErrorToStatus(err);
    console.error(`[${requestId}] backend request failed:`, err.message);
    if (!clientRes.headersSent) {
      clientRes.writeHead(status, { "Content-Type": "text/plain" });
      clientRes.end(message);
    } else {
      clientRes.end();
    }
  });

  clientReq.pipe(proxyReq);
});

if (process.env.DEBUG_MEMORY === "true") {
  setInterval(() => {
    const mem = process.memoryUsage();
    console.log(
      `[memory] rss=${(mem.rss / 1024 / 1024).toFixed(1)}MB heapUsed=${(mem.heapUsed / 1024 / 1024).toFixed(1)}MB`,
    );
  }, 200);
}

startWatching();

process.on("SIGHUP", () => {
  try {
    reloadRoutes();
    console.log("[routes] reloaded via SIGHUP");
  } catch (err) {
    console.error(
      `[routes] SIGHUP reload failed, keeping previous routes: ${err.message}`,
    );
  }
});

setupGracefulShutdown(server, { forceExitMs: 10000 });

server.listen(LISTEN_PORT, () => {
  console.log(`Proxify listening on http://localhost:${LISTEN_PORT}`);
  console.log("Routes:");
  for (const route of getRoutes()) {
    console.log(
      `  ${route.pathPrefix} -> ${route.target.host}:${route.target.port}`,
    );
  }
});
