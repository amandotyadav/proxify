const http = require("http");
const { Readable } = require("stream");

const TOTAL_MB = Number(process.argv[2] || 20);
const TOTAL_BYTES = TOTAL_MB * 1024 * 1024;
const CHUNK_SIZE = 256 * 1024;

function makeDataStream(totalBytes, chunkSize) {
  let sent = 0;
  const chunk = Buffer.alloc(chunkSize, "a");

  return new Readable({
    read() {
      if (sent >= totalBytes) {
        this.push(null);
        return;
      }
      const toSend = Math.min(chunkSize, totalBytes - sent);
      sent += toSend;
      this.push(toSend === chunkSize ? chunk : chunk.subarray(0, toSend));
    },
  });
}

const startedAt = Date.now();

const req = http.request(
  {
    host: "localhost",
    port: 3000,
    method: "POST",
    path: "/api/upload",
    headers: { "Content-Length": TOTAL_BYTES },
  },
  (res) => {
    let body = "";
    res.on("data", (c) => (body += c));
    res.on("end", () => {
      const seconds = ((Date.now() - startedAt) / 1000).toFixed(2);
      console.log(
        `Client: upload finished in ${seconds}s. Backend reported: ${body}`,
      );
    });
  },
);

req.on("error", (err) => {
  console.error("Upload failed:", err.message);
});

console.log(`Streaming ${TOTAL_MB}MB through the proxy to /api/upload ...`);
makeDataStream(TOTAL_BYTES, CHUNK_SIZE).pipe(req);
