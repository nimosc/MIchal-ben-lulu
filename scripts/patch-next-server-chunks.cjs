/**
 * Workaround for intermittent Next/webpack server chunk resolution on Windows.
 *
 * Symptom: `.next/server/webpack-runtime.js` (or its caller) attempts to load
 * `./<chunkId>.js` while chunks are emitted under `.next/server/chunks/<chunkId>.js`.
 *
 * We redirect only those numeric root chunk requires originating from the server
 * webpack runtime. This keeps the patch narrowly scoped and safe.
 */
const Module = require("module");
const path = require("path");

const originalResolveFilename = Module._resolveFilename;

function isServerWebpackRuntime(parentFilename) {
  if (!parentFilename) return false;
  const suffix = path.join(".next", "server", "webpack-runtime.js");
  return parentFilename.endsWith(suffix);
}

function isNumericRootChunkRequest(request) {
  return typeof request === "string" && /^\.\.?(\/|\\)\d+\.js$/.test(request) === false
    ? false
    : typeof request === "string" && /^\.\/*\d+\.js$/.test(request);
}

Module._resolveFilename = function patchedResolveFilename(request, parent, isMain, options) {
  try {
    if (
      isNumericRootChunkRequest(request) &&
      parent &&
      isServerWebpackRuntime(parent.filename)
    ) {
      const redirected = "./chunks/" + request.replace(/^\.\//, "");
      try {
        return originalResolveFilename.call(this, redirected, parent, isMain, options);
      } catch {
        // Fall through to the original request.
      }
    }
  } catch {
    // Never block module loading because of this patch.
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};

