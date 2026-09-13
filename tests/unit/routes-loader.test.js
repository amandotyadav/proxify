import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

describe("routes-loader", () => {
  let tmpFile;
  let loader;

  beforeEach(async () => {
    tmpFile = path.join(
      os.tmpdir(),
      `routes-test-${Date.now()}-${Math.random().toString(16).slice(2)}.json`,
    );
    process.env.ROUTES_CONFIG_PATH = tmpFile;

    vi.resetModules();
    loader = await import("../../src/router/routes-loader.js");
  });

  afterEach(() => {
    loader.stopWatching();
    if (fs.existsSync(tmpFile)) {
      fs.unlinkSync(tmpFile);
    }
    delete process.env.ROUTES_CONFIG_PATH;
  });

  it("loads valid routes from disk and fills in a default rewrite", () => {
    fs.writeFileSync(
      tmpFile,
      JSON.stringify([
        { pathPrefix: "/api/test", target: { host: "localhost", port: 5000 } },
      ]),
    );

    const routes = loader.reloadRoutes();

    expect(routes).toHaveLength(1);
    expect(routes[0].pathPrefix).toBe("/api/test");
    expect(routes[0].rewrite).toBe("");
    expect(loader.getRoutes()).toBe(routes);
  });

  it("throws when the config is not a JSON array", () => {
    fs.writeFileSync(tmpFile, JSON.stringify({ not: "an array" }));
    expect(() => loader.reloadRoutes()).toThrow(/must be a JSON array/);
  });

  it("throws when pathPrefix is missing or malformed", () => {
    fs.writeFileSync(
      tmpFile,
      JSON.stringify([{ target: { host: "localhost", port: 5000 } }]),
    );
    expect(() => loader.reloadRoutes()).toThrow(/pathPrefix/);
  });

  it("throws when target.port is not a valid port number", () => {
    fs.writeFileSync(
      tmpFile,
      JSON.stringify([
        {
          pathPrefix: "/api/test",
          target: { host: "localhost", port: "not-a-number" },
        },
      ]),
    );
    expect(() => loader.reloadRoutes()).toThrow(/target\.port/);
  });

  it("throws when target.host is missing", () => {
    fs.writeFileSync(
      tmpFile,
      JSON.stringify([{ pathPrefix: "/api/test", target: { port: 5000 } }]),
    );
    expect(() => loader.reloadRoutes()).toThrow(/target\.host/);
  });

  it("parseConfig rejects invalid JSON without touching disk", () => {
    expect(() => loader.parseConfig("not json")).toThrow(/Invalid JSON/);
  });

  it("keeps the previous good routes if a later reload fails", () => {
    fs.writeFileSync(
      tmpFile,
      JSON.stringify([
        { pathPrefix: "/api/good", target: { host: "localhost", port: 5000 } },
      ]),
    );
    loader.reloadRoutes();

    fs.writeFileSync(tmpFile, "{ this is not valid json");
    expect(() => loader.reloadRoutes()).toThrow();

    expect(loader.getRoutes()[0].pathPrefix).toBe("/api/good");
  });
});
