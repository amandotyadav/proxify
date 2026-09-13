const http = require("http");
const { matchRoute, rewritePath } = require("./router/matcher");
const { buildForwardedHeaders } = require("./router/forwarded-header");
const routes = require("./router/routes.config");

const LISTEN_PORT = 3000;

const server = http.createServer((clientReq, clientRes) => {
  const requestId = Date.now();

  const parsedUrl = new URL(
    clientReq.url,
    `http://${clientReq.headers.host}` || "localhost",
  );

  const route = matchRoute(routes, parsedUrl.pathname);

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

  const proxyReq = http.request(
    {
      host: target.host,
      port: target.port,
      method: clientReq.method,
      path: rewrittenPath,
      headers: buildForwardedHeaders(clientReq, target),
    },
    (proxyRes) => {
      clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(clientRes);
    },
  );

  proxyReq.on("error", (err) => {
    console.error(`[${requestId}] backend request failed:`, err.message);
    if (!clientRes.headersSent) {
      clientRes.writeHead(502, { "Content-Type": "text/plain" });
      clientRes.end("502 Bad Gateway: upstream request failed\n");
    }
  });

  clientReq.pipe(proxyReq);
});

server.listen(LISTEN_PORT, () => {
  console.log(`Proxify listening on http://localhost:${LISTEN_PORT}`);
  console.log("Routes:");
  for (const route of routes) {
    console.log(
      `  ${route.pathPrefix} -> ${route.target.host}:${route.target.port}`,
    );
  }
});
