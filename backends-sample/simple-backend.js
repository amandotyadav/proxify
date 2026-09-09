const http = require("http");

const PORT = process.env.PORT || 4000;

const server = http.createServer((req, res) => {
  console.log(`[backend:${PORT}] ${req.method} ${req.url}`);

  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end(`Hello from backend on port ${PORT}\n`);
});

server.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
