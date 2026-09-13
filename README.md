# Proxify

A production-style HTTP reverse proxy and API gateway, built from scratch in Node.js on the raw `http`/`net`/`stream` APIs — no Nginx/Envoy/HAProxy wrapping. The goal is to understand and demonstrate what a proxy actually does at the socket level, not just call a library that does it.

## What it does today

- **Streaming request/response forwarding** — bodies are piped end-to-end (`req.pipe(proxyReq)` / `proxyRes.pipe(res)`), never buffered in memory, so large uploads/downloads stay memory-flat and backpressure is handled correctly.
- **Path-based routing** — longest-prefix route matching with path rewriting, query string passthrough, and correct `X-Forwarded-For` / `X-Forwarded-Host` / `X-Forwarded-Proto` header handling.
- **Production HTTP handling** — a shared keep-alive `http.Agent` for backend connection reuse; separate connect/request/response timeout budgets via `AbortController`; errors mapped to the right status code (`502` for connection failures, `504` for timeouts); graceful `SIGTERM` shutdown that stops accepting new connections and waits for in-flight requests before exiting.
- **Config-driven routing** — routes are loaded from a validated JSON file rather than hardcoded, with the active route table swapped atomically so in-flight requests never see a half-updated table. Hot-reloads on `SIGHUP` or a debounced file watcher, falling back to the previous good routes on invalid config instead of crashing.

## What it will become

Proxify is being built in phases toward a full API gateway: load balancing (round robin / weighted / least-connections), active + passive health checks, Redis-backed rate limiting (token bucket) and response caching, circuit breaking with retries, API-key/JWT auth with RBAC, structured logging with correlation IDs, Prometheus metrics, a React monitoring dashboard, WebSocket proxying, a security-hardening pass (request smuggling, SSRF, Host header attacks, Slowloris), and full Docker Compose + CI/CD deployment.

## Status

| Phase | Area                                          | Status     |
| ----- | --------------------------------------------- | ---------- |
| 0     | Networking fundamentals                       | ✅         |
| 1     | Minimal HTTP proxy                            | ✅         |
| 2     | Reverse proxy routing                         | ✅         |
| 3     | Streaming & backpressure                      | ✅         |
| 4     | Timeouts, keep-alive agent, graceful shutdown | ✅         |
| 5     | Dynamic (config-driven) routing               | ✅         |
| 6     | Load balancing                                | 🚧 planned |
| 7     | Health checks                                 | 🚧 planned |
| 8     | Rate limiting (Redis)                         | 🚧 planned |
| 9     | Auth & RBAC                                   | 🚧 planned |
| 10    | Caching (Redis)                               | 🚧 planned |
| 11    | Circuit breaker                               | 🚧 planned |
| 12    | Retry mechanism                               | 🚧 planned |
| 13-14 | Logging & correlation IDs                     | 🚧 planned |
| 15-16 | Metrics & dashboard                           | 🚧 planned |
| 17    | WebSocket proxying                            | 🚧 planned |
| 18    | Security hardening                            | 🚧 planned |
| 19    | Dockerization                                 | 🚧 planned |
| 20-21 | Testing & performance                         | 🚧 planned |
| 22-23 | CI/CD & deployment                            | 🚧 planned |

## Getting started

```bash
npm install

# start a toy backend on :4000
npm run backend

# start a second one on :4001 (used by the /api/users route)
PORT=4001 npm run backend

# start the proxy on :3000
npm start
```

```bash
curl http://localhost:3000/api/users/42
```

## Project structure

```
src/
├── core/      # graceful shutdown
├── proxy/     # forwarding engine: agent, timeouts
├── router/    # route matching, path rewriting, forwarded headers,
│              # config loading + hot reload
backends-sample/   # toy backends for local dev/testing
scripts/           # manual load/upload test scripts
tests/unit/        # unit tests (Vitest)
```

## Testing

```bash
npm test        # run once
npm run test:watch
```

## License

MIT
