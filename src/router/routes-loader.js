const fs = require("fs");
const path = require("path");

const DEFAULT_CONFIG_PATH = path.join(__dirname, "routes.config.json");
const CONFIG_PATH = process.env.ROUTES_CONFIG_PATH || DEFAULT_CONFIG_PATH;

let currentRoutes = [];

let watcher = null;
let debounceTimer = null;

function validateRoute(route, index) {
  const label = `routes[${index}]`;

  if (!route || typeof route !== "object") {
    throw new Error(`${label} must be an object`);
  }

  if (
    typeof route.pathPrefix !== "string" ||
    !route.pathPrefix.startsWith("/")
  ) {
    throw new Error(`${label}.pathPrefix must be a string starting with "/"`);
  }

  if (route.rewrite !== undefined && typeof route.rewrite !== "string") {
    throw new Error(`${label}.rewrite must be a string if provided`);
  }

  if (!route.target || typeof route.target !== "object") {
    throw new Error(`${label}.target must be an object with host/port`);
  }

  if (typeof route.target.host !== "string" || route.target.host.length === 0) {
    throw new Error(`${label}.target.host must be a non-empty string`);
  }

  const port = route.target.port;
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(
      `${label}.target.port must be an integer between 1 and 65535`,
    );
  }
}

function parseConfig(rawText) {
  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    throw new Error(`Invalid JSON in routes config: ${err.message}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Routes config must be a JSON array of route objects");
  }

  parsed.forEach((route, index) => {
    validateRoute(route, index);
    if (route.rewrite === undefined) {
      route.rewrite = "";
    }
  });

  return parsed;
}

function loadRoutesFromDisk() {
  const rawText = fs.readFileSync(CONFIG_PATH, "utf8");
  return parseConfig(rawText);
}

function reloadRoutes() {
  const routes = loadRoutesFromDisk();
  currentRoutes = routes;
  console.log(`[routes] loaded ${routes.length} route(s) from ${CONFIG_PATH}`);
  return currentRoutes;
}

function getRoutes() {
  return currentRoutes;
}

function startWatching() {
  if (watcher) return;

  watcher = fs.watch(CONFIG_PATH, (eventType) => {
    if (eventType !== "change") return;

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      try {
        reloadRoutes();
      } catch (err) {
        console.error(
          `[routes] failed to reload config, keeping previous routes: ${err.message}`,
        );
      }
    }, 100);
  });

  console.log(`[routes] watching ${CONFIG_PATH} for changes`);
}

function stopWatching() {
  if (watcher) {
    watcher.close();
    watcher = null;
  }
  clearTimeout(debounceTimer);
}

module.exports = {
  CONFIG_PATH,
  parseConfig,
  reloadRoutes,
  getRoutes,
  startWatching,
  stopWatching,
};
