const http = require("http");

const PORT = process.env.PORT || 4003;

const SLOW_MODE = process.env.SLOW_MODE === "true";

const server = http.createServer((req, res) => {
  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "text/plain" });
    res.end("Only POST is supported on this backend\n");
    return;
  }

  let totalBytes = 0;
  const startedAt = Date.now();
  let throttleInterval;

  if (SLOW_MODE) {
    req.pause();
    throttleInterval = setInterval(() => {
      req.resume();
      setTimeout(() => req.pause(), 100);
    }, 500);
  }

  req.on("data", (chunk) => {
    totalBytes += chunk.length;
  });

  req.on("end", () => {
    if (throttleInterval) clearInterval(throttleInterval);
    const seconds = ((Date.now() - startedAt) / 1000).toFixed(2);
    console.log(
      `[upload-backend${SLOW_MODE ? ":SLOW" : ""}] received ${totalBytes} bytes in ${seconds}s`,
    );
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ totalBytes, seconds: Number(seconds) }));
  });

  req.on("error", (err) => {
    if (throttleInterval) clearInterval(throttleInterval);
    console.error("[upload-backend] request error:", err.message);
  });
});

server.listen(PORT, () => {
  console.log(
    `Upload backend (${SLOW_MODE ? "SLOW mode" : "fast mode"}) listening on http://localhost:${PORT}`,
  );
});
