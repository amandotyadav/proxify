import { describe, it, expect } from "vitest";
import { matchRoute, rewritePath } from "../../src/router/matcher.js";

const routes = [
  {
    pathPrefix: "/api/users",
    rewrite: "",
    target: { host: "localhost", port: 4001 },
  },
  {
    pathPrefix: "/api/products",
    rewrite: "",
    target: { host: "localhost", port: 4002 },
  },
];

describe("matchRoute", () => {
  const cases = [
    { pathname: "/api/users", expectedPrefix: "/api/users" },
    { pathname: "/api/users/42", expectedPrefix: "/api/users" },
    { pathname: "/api/products/9/reviews", expectedPrefix: "/api/products" },
    { pathname: "/api/users-admin", expectedPrefix: null },
    { pathname: "/unrelated", expectedPrefix: null },
  ];

  for (const { pathname, expectedPrefix } of cases) {
    it(`matches "${pathname}" -> ${expectedPrefix ?? "no route"}`, () => {
      const result = matchRoute(routes, pathname);
      if (expectedPrefix === null) {
        expect(result).toBeNull();
      } else {
        expect(result.pathPrefix).toBe(expectedPrefix);
      }
    });
  }

  it("picks the longest prefix when multiple routes could match", () => {
    const overlapping = [
      { pathPrefix: "/api", rewrite: "", target: {} },
      { pathPrefix: "/api/users", rewrite: "", target: {} },
    ];
    const result = matchRoute(overlapping, "/api/users/42");
    expect(result.pathPrefix).toBe("/api/users");
  });
});

describe("rewritePath", () => {
  const route = { pathPrefix: "/api/users", rewrite: "" };

  const cases = [
    { pathname: "/api/users/42", expected: "/42" },
    { pathname: "/api/users", expected: "/" },
    { pathname: "/api/users/", expected: "/" },
  ];

  for (const { pathname, expected } of cases) {
    it(`rewrites "${pathname}" -> "${expected}"`, () => {
      expect(rewritePath(pathname, route)).toBe(expected);
    });
  }

  it("supports a non-empty rewrite base", () => {
    const withRewrite = { pathPrefix: "/api/users", rewrite: "/v2" };
    expect(rewritePath("/api/users/42", withRewrite)).toBe("/v2/42");
  });
});
