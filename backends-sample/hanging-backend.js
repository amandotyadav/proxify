const http = require("http");
const PORT = process.env.PORT || 4004;

const server = http.createServer((req, res) => {
  console.log(
    `hanging-backend: received ${req.method} ${req.url}, staying silent forever`,
  );
});

server.listen(PORT, () => {
  console.log(`Hanging backend listening on :${PORT} (never responds)`);
});
