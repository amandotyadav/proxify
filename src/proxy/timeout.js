function attachTimeouts(
  proxyReq,
  controller,
  { connectMs, requestMs, responseMs },
) {
  let connectTimer = setTimeout(() => {
    controller.abort(new Error("connect-timeout"));
  }, connectMs);

  let requestTimer = null;
  let responseTimer = null;

  proxyReq.once("socket", (socket) => {
    if (socket.connecting) {
      socket.once("connect", onConnected);
    } else {
      onConnected();
    }
  });

  function onConnected() {
    clearTimeout(connectTimer);
    connectTimer = null;

    requestTimer = setTimeout(() => {
      controller.abort(new Error("request-timeout"));
    }, requestMs);
  }

  proxyReq.once("finish", () => {
    if (requestTimer) {
      clearTimeout(requestTimer);
      requestTimer = null;
    }
    responseTimer = setTimeout(() => {
      controller.abort(new Error("response-timeout"));
    }, responseMs);
  });

  proxyReq.once("response", () => {
    if (responseTimer) {
      clearTimeout(responseTimer);
      responseTimer = null;
    }
  });

  function clearAll() {
    clearTimeout(connectTimer);
    clearTimeout(requestTimer);
    clearTimeout(responseTimer);
  }

  proxyReq.once("error", clearAll);
  proxyReq.once("close", clearAll);
}

module.exports = { attachTimeouts };
