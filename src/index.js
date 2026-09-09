const http = require("http");

const LISTEN_PORT = 3000;

const TARGET_HOST = "localhost";
const TARGET_PORT = 4000;

const server = http.createServer((clientReq, clientRes) => {
  const requestId = Date.now();
  console.log(
    `[${requestId}] ${clientReq.method} ${clientReq.url} -> ${TARGET_HOST}:${TARGET_PORT}`,
  );

  const proxyReq = http.request(
    {
      host: TARGET_HOST,
      port: TARGET_PORT,
      method: clientReq.method,
      path: clientReq.url,
      headers: clientReq.headers,
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
  console.log(`Forwarding everything to http://${TARGET_HOST}:${TARGET_PORT}`);
});
