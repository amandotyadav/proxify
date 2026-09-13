function setupGracefulShutdown(server, { forceExitMs = 10000 } = {}) {
  let inFlight = 0;
  let shuttingDown = false;

  server.on("request", (req, res) => {
    inFlight++;
    res.on("finish", () => {
      inFlight--;
    });
  });

  function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(
      `\n[shutdown] ${signal} received — ${inFlight} request(s) in flight, refusing new connections`,
    );

    server.close(() => {
      console.log("[shutdown] all connections closed, exiting cleanly");
      process.exit(0);
    });

    server.closeIdleConnections();

    const forceTimer = setTimeout(() => {
      console.error(
        `[shutdown] ${inFlight} request(s) still in flight after ${forceExitMs}ms — forcing exit`,
      );
      process.exit(1);
    }, forceExitMs);
    forceTimer.unref();
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

module.exports = { setupGracefulShutdown };
