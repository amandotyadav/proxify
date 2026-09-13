function buildForwardedHeaders(clientReq, target) {
  const headers = { ...clientReq.headers };

  const remoteAddress = clientReq.socket.remoteAddress;
  const existingForwardedFor = headers["x-forwarded-for"];
  headers["x-forwarded-for"] = existingForwardedFor
    ? `${existingForwardedFor}, ${remoteAddress}`
    : remoteAddress;

  headers["x-forwarded-host"] = headers["host"];
  headers["x-forwarded-proto"] = headers["x-forwarded-proto"] || "http";

  headers["host"] = `${target.host}:${target.port}`;

  return headers;
}

module.exports = { buildForwardedHeaders };
