let enginePromise = null;

async function loadEngine() {
  if (enginePromise) return enginePromise;
  enginePromise = (async () => {
    const { default: createModule } = await import("./ffish.js");
    const ffish = await createModule({
      locateFile(file) {
        return new URL(file, import.meta.url).href;
      },
    });
    const response = await fetch(new URL("variants.ini", import.meta.url));
    if (!response.ok) {
      throw new Error(`variants.ini HTTP ${response.status}`);
    }
    ffish.loadVariantConfig(await response.text());
    return ffish;
  })();
  return enginePromise;
}

self.addEventListener("message", async (event) => {
  const request = event.data || {};
  if (request.type !== "analyze") return;

  try {
    const ffish = await loadEngine();
    const resultText = ffish.analyze(
      "yangmyeonjanggi",
      request.fen,
      Number(request.depth) || 6,
      Number(request.multipv) || 3,
      Number(request.movetimeMs) || 0,
    );
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
