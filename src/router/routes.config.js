module.exports = [
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
