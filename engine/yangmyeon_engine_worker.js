let enginePromise = null;

function formatError(error) {
  if (!error) return "unknown error";
  if (error.stack) return error.stack;
  if (error.message) return error.message;
  return String(error);
}

function createDiagnostics() {
  const lines = [];
  return {
    lines,
    push(message) {
      lines.push(String(message));
      if (lines.length > 40) lines.shift();
    },
    summary() {
      return lines.length ? ` Diagnostics: ${lines.join(" | ")}` : "";
    },
  };
}

async function loadEngine() {
  if (enginePromise) return enginePromise;
  enginePromise = (async () => {
    const diagnostics = createDiagnostics();
    let createModule;
    try {
      diagnostics.push("import ffish.js");
      ({ default: createModule } = await import("./ffish.js"));
    } catch (error) {
      throw new Error(`import ffish.js failed: ${formatError(error)}${diagnostics.summary()}`);
    }

    let ffish;
    try {
      diagnostics.push("create ffish module");
      ffish = await createModule({
        locateFile(file) {
          const url = new URL(file, import.meta.url).href;
          diagnostics.push(`locate ${file} -> ${url}`);
          return url;
        },
        onAbort(reason) {
          diagnostics.push(`abort ${String(reason)}`);
        },
        print(message) {
          diagnostics.push(`stdout ${String(message)}`);
        },
        printErr(message) {
          diagnostics.push(`stderr ${String(message)}`);
        },
      });
    } catch (error) {
      throw new Error(`create ffish module failed: ${formatError(error)}${diagnostics.summary()}`);
    }

    let variantText;
    try {
      diagnostics.push("fetch variants.ini");
      const response = await fetch(new URL("variants.ini", import.meta.url));
      if (!response.ok) {
        throw new Error(`variants.ini HTTP ${response.status}`);
      }
      variantText = await response.text();
    } catch (error) {
      throw new Error(`fetch variants.ini failed: ${formatError(error)}${diagnostics.summary()}`);
    }

    try {
      diagnostics.push("load variants.ini");
      ffish.loadVariantConfig(variantText);
      if (typeof ffish.variants === "function" && !ffish.variants().split(" ").includes("yangmyeonjanggi")) {
        throw new Error("yangmyeonjanggi variant was not registered");
      }
    } catch (error) {
      throw new Error(`load variants.ini failed: ${formatError(error)}${diagnostics.summary()}`);
    }

    return ffish;
  })().catch((error) => {
    enginePromise = null;
    throw error;
  });
  return enginePromise;
}

self.addEventListener("message", async (event) => {
  const request = event.data || {};
  if (request.type !== "analyze") return;

  try {
    const ffish = await loadEngine();
    let resultText;
    try {
      resultText = ffish.analyze(
        "yangmyeonjanggi",
        request.fen,
        Number(request.depth) || 6,
        Number(request.multipv) || 3,
        Number(request.movetimeMs) || 0,
      );
    } catch (error) {
      throw new Error(`ffish analyze failed: ${formatError(error)}`);
    }
    const payload = JSON.parse(resultText);
    if (!payload.ok) {
      throw new Error(payload.error || "Fairy WASM analyze failed");
    }
    self.postMessage({ id: request.id, ok: true, payload });
  } catch (error) {
    self.postMessage({
      id: request.id,
      ok: false,
      error: error && error.message ? error.message : "Fairy WASM worker failed",
    });
  }
});
