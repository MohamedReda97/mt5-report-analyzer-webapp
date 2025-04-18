/** @type {import('@remix-run/dev').AppConfig} */
export default {
  ignoredRouteFiles: ["**/.*"],
  serverModuleFormat: "esm",
  serverPlatform: "node",
  serverRuntime: "node",
  vite: {
    // Use the existing Vite config
    configFile: "./vite.config.ts"
  }
};
