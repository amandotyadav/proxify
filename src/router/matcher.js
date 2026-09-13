function matchRoute(routes, pathname) {
  let best = null;

  for (const route of routes) {
    const prefix = route.pathPrefix;
    const matchesExactly = pathname === prefix;
    const matchesAsSegment = pathname.startsWith(
      prefix.endsWith("/") ? prefix : `${prefix}/`,
    );

    if (matchesExactly || matchesAsSegment) {
      if (!best || prefix.length > best.pathPrefix.length) {
        best = route;
      }
    }
  }

  return best;
}

function rewritePath(pathname, route) {
  const prefix = route.pathPrefix;
  const rewriteBase = route.rewrite ?? "";

  let rest = pathname.slice(prefix.length);
  if (rest.length > 0 && !rest.startsWith("/")) {
    rest = `/${rest}`;
  }

  const newPath = `${rewriteBase}${rest}`;
  return newPath === "" ? "/" : newPath;
}

module.exports = { matchRoute, rewritePath };
