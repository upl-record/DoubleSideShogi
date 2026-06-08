import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SIZE = 5;
const BASES = ["pawn", "tokin", "gold", "silver"];
const WIN_SCORE = 1_000_000;
const WIN_DEPTH_BONUS = 100;

const DEFAULT_CACHE_PATH = path.join("outputs", "opening_tree", "fairy-analysis-cache.json");

function usage() {
  return `Usage: node build_opening_tree.mjs [options]

Builds a Yangmyeon Janggi opening tree with Fairy-Stockfish.

Options:
  --depth N             Fairy-Stockfish search depth per position. Default: 20
  --movetime-ms N       Use fixed movetime instead of depth. Default: 0
  --plies N             Number of opening move plies to include. Default: 2
  --branching N         Top moves to expand below the root. Default: 3
  --root all|N          Root moves to include. Default: all
  --root-limit N        Extra cap for root moves, useful for quick tests. Default: 0
  --max-multipv N       MultiPV safety cap. Default: 64
  --max-positions N     Stop after expanding this many positions. Default: 0
  --timeout-ms N|none   Per-search timeout. Default: auto
  --engine PATH         Fairy-Stockfish executable path.
  --variant PATH        variants.ini path. Default: variants.ini
  --hash N              Engine hash MB. Default: 256
  --threads N           Engine thread count. Default: 1
  --cache PATH          Analysis cache path. Default: ${DEFAULT_CACHE_PATH}
  --no-cache            Disable reading/writing the analysis cache.
  --force               Recompute even if a cached payload exists.
  --out PATH            JSON output path.
  --markdown PATH       Markdown output path.
  --no-markdown         Skip Markdown output.
  --help                Show this help.

Examples:
  node build_opening_tree.mjs --depth 20 --plies 1
  node build_opening_tree.mjs --depth 20 --plies 3 --branching 3
  node build_opening_tree.mjs --depth 20 --plies 4 --root 5 --branching 2
`;
}

function parseInteger(value, fallback, min = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.round(number));
}

function parseArgs(argv) {
  const options = {
    depth: 20,
    movetimeMs: 0,
    plies: 2,
    branching: 3,
    root: "all",
    rootLimit: 0,
    maxMultipv: 64,
    maxPositions: 0,
    timeoutMs: null,
    noTimeout: false,
    engine: "",
    variant: "variants.ini",
    hash: 256,
    threads: 1,
    cache: DEFAULT_CACHE_PATH,
    noCache: false,
    force: false,
    out: "",
    markdown: "",
    writeMarkdown: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const readValue = () => {
      index += 1;
      if (index >= argv.length) throw new Error(`${arg} requires a value`);
      return argv[index];
    };

    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--depth") {
      options.depth = parseInteger(readValue(), options.depth, 1);
    } else if (arg === "--movetime-ms") {
      options.movetimeMs = parseInteger(readValue(), options.movetimeMs, 0);
    } else if (arg === "--plies") {
      options.plies = parseInteger(readValue(), options.plies, 1);
    } else if (arg === "--branching") {
      options.branching = parseInteger(readValue(), options.branching, 1);
    } else if (arg === "--root") {
      const value = readValue();
      options.root = value === "all" ? "all" : parseInteger(value, options.branching, 1);
    } else if (arg === "--root-limit") {
      options.rootLimit = parseInteger(readValue(), options.rootLimit, 0);
    } else if (arg === "--max-multipv") {
      options.maxMultipv = parseInteger(readValue(), options.maxMultipv, 1);
    } else if (arg === "--max-positions") {
      options.maxPositions = parseInteger(readValue(), options.maxPositions, 0);
    } else if (arg === "--timeout-ms") {
      const value = readValue();
      if (value === "none") {
        options.noTimeout = true;
        options.timeoutMs = null;
      } else {
        options.timeoutMs = parseInteger(value, 0, 0);
      }
    } else if (arg === "--engine") {
      options.engine = readValue();
    } else if (arg === "--variant") {
      options.variant = readValue();
    } else if (arg === "--hash") {
      options.hash = parseInteger(readValue(), options.hash, 1);
    } else if (arg === "--threads") {
      options.threads = parseInteger(readValue(), options.threads, 1);
    } else if (arg === "--cache") {
      options.cache = readValue();
    } else if (arg === "--no-cache") {
      options.noCache = true;
    } else if (arg === "--force") {
      options.force = true;
    } else if (arg === "--out") {
      options.out = readValue();
    } else if (arg === "--markdown") {
      options.markdown = readValue();
      options.writeMarkdown = true;
    } else if (arg === "--no-markdown") {
      options.writeMarkdown = false;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return options;
}

function resolveFromRoot(value) {
  return path.isAbsolute(value) ? value : path.resolve(ROOT, value);
}

function defaultOutputName(options, extension) {
  const search = options.movetimeMs > 0
    ? `t${Math.round(options.movetimeMs / 1000)}s`
    : `d${options.depth}`;
  return path.join("outputs", "opening_tree", `opening-tree-${search}-p${options.plies}.${extension}`);
}

function findEnginePath(options) {
  const candidates = [
    options.engine,
    process.env.FAIRY_STOCKFISH,
    path.join(ROOT, "Fairy-Stockfish-master-src", "Fairy-Stockfish-master", "src", "stockfish.exe"),
    path.join(ROOT, "fairy-stockfish-largeboard_x86-64-bmi2.exe"),
    path.join(ROOT, "fairy-stockfish-latest-largeboard_x86-64.exe"),
  ].filter(Boolean).map(resolveFromRoot);
  return candidates.find((candidate) => existsSync(candidate)) || "";
}

function makeMockClassList() {
  return {
    add() {},
    remove() {},
    toggle() {},
    contains() {
      return false;
    },
  };
}

function makeMockElement() {
  const element = {
    style: {},
    dataset: {},
    disabled: false,
    checked: false,
    hidden: false,
    value: "",
    textContent: "",
    innerHTML: "",
    title: "",
    files: [],
    scrollTop: 0,
    scrollHeight: 0,
    classList: makeMockClassList(),
    parentElement: null,
    appendChild() {},
    append() {},
    remove() {},
    addEventListener() {},
    setAttribute() {},
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    focus() {},
    select() {},
    setSelectionRange() {},
    load() {},
  };
  element.parentElement = {
    style: {},
    dataset: {},
    classList: makeMockClassList(),
    appendChild() {},
    append() {},
  };
  return element;
}

function makeMockDocument() {
  const elements = new Map();
  return {
    body: {
      dataset: {},
      classList: makeMockClassList(),
      appendChild() {},
      removeChild() {},
      append() {},
    },
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, makeMockElement());
      return elements.get(id);
    },
    querySelector(selector) {
      if (!elements.has(selector)) elements.set(selector, makeMockElement());
      return elements.get(selector);
    },
    querySelectorAll() {
      return [];
    },
    createElement() {
      return makeMockElement();
    },
    execCommand() {
      return false;
    },
  };
}

async function loadAppApi() {
  const sourcePath = path.join(ROOT, "brps_app.js");
  let source = await fs.readFile(sourcePath, "utf8");
  const bootIndex = source.indexOf('\nresetButton.addEventListener("click", resetGame);');
  if (bootIndex !== -1) {
    source = source.slice(0, bootIndex);
  }

  const localStorage = {
    getItem() {
      return null;
    },
    setItem() {},
    removeItem() {},
  };
  const mockWindow = {
    location: {
      hostname: "127.0.0.1",
      protocol: "file:",
    },
    localStorage,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    URL: {
      createObjectURL() {
        return "";
      },
      revokeObjectURL() {},
    },
  };
  const sandbox = {
    console,
    document: makeMockDocument(),
    window: mockWindow,
    navigator: {},
    performance,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Blob: class Blob {},
    URL: mockWindow.URL,
    Audio: class Audio {
      constructor() {
        this.volume = 1;
        this.currentTime = 0;
      }
      load() {}
      play() {
        return Promise.resolve();
      }
      cloneNode() {
        return new this.constructor();
      }
    },
  };

  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: sourcePath });
  return sandbox;
}

function initialPosition(api) {
  return {
    board: api.makeInitialBoard(),
    hands: {
      1: api.emptyHands(),
      2: api.emptyHands(),
    },
    turn: 1,
    winner: null,
  };
}

function enumerateLegalActions(api, position) {
  const actions = [];
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      const piece = position.board[row][col];
      if (!piece || piece.owner !== position.turn) continue;
      for (const move of api.legalMovesFrom(position.board, row, col)) {
        const captured = position.board[move.row][move.col];
        actions.push({
          type: "move",
          fromRow: row,
          fromCol: col,
          toRow: move.row,
          toCol: move.col,
          capturedBase: captured ? captured.base : null,
          capturesKing: Boolean(captured && captured.base === "king"),
        });
      }
    }
  }

  for (const base of BASES) {
    for (const drop of api.legalDropsFor(position.board, position.hands, base, position.turn)) {
      actions.push({
        type: "drop",
        base,
        row: drop.row,
        col: drop.col,
      });
    }
  }

  return actions.length ? actions : [{ type: "pass" }];
}

function parseInfoLine(line) {
  const tokens = line.trim().split(/\s+/);
  const entry = {
    multipv: 1,
    depth: 0,
    score: 0,
    scoreType: "cp",
    nodes: 0,
    nps: 0,
    time: 0,
    pv: [],
    raw: line,
  };

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === "depth") entry.depth = Number(tokens[index + 1] || 0);
    if (token === "multipv") entry.multipv = Number(tokens[index + 1] || 1);
    if (token === "nodes") entry.nodes = Number(tokens[index + 1] || 0);
    if (token === "nps") entry.nps = Number(tokens[index + 1] || 0);
    if (token === "time") entry.time = Number(tokens[index + 1] || 0);
    if (token === "score") {
      entry.scoreType = tokens[index + 1] || "cp";
      entry.score = Number(tokens[index + 2] || 0);
    }
    if (token === "pv") {
      entry.pv = tokens.slice(index + 1);
      break;
    }
  }

  return entry;
}

class FairyUciEngine {
  constructor({ enginePath, variantPath, hash, threads }) {
    this.enginePath = enginePath;
    this.variantPath = variantPath;
    this.hash = hash;
    this.threads = threads;
    this.child = null;
    this.stdoutBuffer = "";
    this.stderr = [];
    this.waiters = [];
    this.search = null;
    this.started = false;
  }

  start() {
    if (this.started) return Promise.resolve();
    this.child = spawn(this.enginePath, [], {
      cwd: path.dirname(this.enginePath),
      windowsHide: true,
    });
    this.started = true;

    this.child.stdout.on("data", (chunk) => {
      this.stdoutBuffer += chunk.toString("utf8");
      const lines = this.stdoutBuffer.split(/\r?\n/);
      this.stdoutBuffer = lines.pop() || "";
      for (const line of lines) this.handleLine(line.trim());
    });

    this.child.stderr.on("data", (chunk) => {
      this.stderr.push(chunk.toString("utf8"));
    });

    this.child.on("error", (error) => this.rejectAll(error));
    this.child.on("exit", (code) => {
      if (code !== 0) this.rejectAll(new Error(`Fairy-Stockfish exited with code ${code}`));
    });

    return this.initialize();
  }

  async initialize() {
    this.write("uci");
    await this.waitForLine((line) => line === "uciok", 30000, "uciok");
    const variantOptionPath = path.relative(path.dirname(this.enginePath), this.variantPath).replace(/\\/g, "/");
    this.write(`setoption name VariantPath value ${variantOptionPath}`);
    this.write("setoption name UCI_Variant value yangmyeonjanggi");
    this.write("setoption name Use NNUE value false");
    this.write(`setoption name Hash value ${this.hash}`);
    this.write(`setoption name Threads value ${this.threads}`);
    await this.ready();
  }

  write(command) {
    if (!this.child || this.child.killed) return;
    this.child.stdin.write(`${command}\n`);
  }

  ready() {
    this.write("isready");
    return this.waitForLine((line) => line === "readyok", 30000, "readyok");
  }

  waitForLine(predicate, timeoutMs, label) {
    return new Promise((resolve, reject) => {
      const waiter = { predicate, resolve, reject, label, timer: null };
      waiter.timer = setTimeout(() => {
        this.waiters = this.waiters.filter((item) => item !== waiter);
        reject(new Error(`Timed out waiting for ${label}`));
      }, timeoutMs);
      this.waiters.push(waiter);
    });
  }

  handleLine(line) {
    if (!line) return;
    if (this.search && this.search.handle(line)) return;

    for (const waiter of [...this.waiters]) {
      if (waiter.predicate(line)) {
        clearTimeout(waiter.timer);
        this.waiters = this.waiters.filter((item) => item !== waiter);
        waiter.resolve(line);
      }
    }
  }

  rejectAll(error) {
    for (const waiter of this.waiters) {
      clearTimeout(waiter.timer);
      waiter.reject(error);
    }
    this.waiters = [];
    if (this.search) {
      this.search.reject(error);
      this.search = null;
    }
  }

  async analyze({ fen, depth, multipv, movetimeMs, timeoutMs }) {
    await this.start();
    this.write(`setoption name MultiPV value ${multipv}`);
    await this.ready();

    return new Promise((resolve, reject) => {
      const latestByMultiPv = new Map();
      const infoStrings = [];
      const startedAt = performance.now();
      let bestmove = null;
      let settled = false;
      let stopTimer = null;

      const finish = (error) => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        if (stopTimer) clearTimeout(stopTimer);
        this.search = null;
        if (error) {
          reject(error);
          return;
        }
        const lines = [...latestByMultiPv.values()].sort((left, right) => left.multipv - right.multipv);
        const resolvedDepth = Math.max(0, ...lines.map((line) => line.depth || 0)) || depth;
        resolve({
          fen,
          depth: resolvedDepth,
          requestedDepth: depth,
          movetimeMs,
          multipv,
          bestmove,
          lines,
          nodes: Math.max(0, ...lines.map((line) => line.nodes || 0)),
          nps: Math.max(0, ...lines.map((line) => line.nps || 0)),
          time: Math.max(0, ...lines.map((line) => line.time || 0)),
          elapsedMs: Math.round(performance.now() - startedAt),
          infoStrings,
        });
      };

      const timer = timeoutMs > 0 ? setTimeout(() => {
        this.write("stop");
        stopTimer = setTimeout(() => {
          finish(new Error(`Fairy-Stockfish timed out at ${movetimeMs > 0 ? `${movetimeMs}ms` : `depth ${depth}`}`));
        }, 5000);
      }, timeoutMs) : null;

      this.search = {
        handle: (line) => {
          if (line.startsWith("info string")) {
            infoStrings.push(line.slice("info string".length).trim());
            return true;
          }
          if (line.startsWith("info depth")) {
            const entry = parseInfoLine(line);
            if (entry.pv.length > 0) latestByMultiPv.set(entry.multipv, entry);
            return true;
          }
          if (line.startsWith("bestmove")) {
            bestmove = line.split(/\s+/)[1] || null;
            finish();
            return true;
          }
          return false;
        },
        reject,
      };

      this.write(`position fen ${fen}`);
      this.write(movetimeMs > 0 ? `go movetime ${movetimeMs}` : `go depth ${depth}`);
    });
  }

  close() {
    if (!this.child || this.child.killed) return;
    this.write("quit");
    this.child.kill();
  }
}

class PayloadCache {
  constructor(filePath, disabled, force) {
    this.filePath = filePath;
    this.disabled = disabled;
    this.force = force;
    this.map = new Map();
    this.dirty = false;
  }

  async load() {
    if (this.disabled || !existsSync(this.filePath)) return;
    const payload = JSON.parse(await fs.readFile(this.filePath, "utf8"));
    const entries = Array.isArray(payload.entries) ? payload.entries : [];
    this.map = new Map(entries.filter((entry) => Array.isArray(entry) && entry.length === 2));
  }

  key({ fen, depth, multipv, movetimeMs }) {
    return `${fen}|depth=${depth}|movetime=${movetimeMs}|multipv=${multipv}`;
  }

  get(request) {
    if (this.disabled || this.force) return null;
    return this.map.get(this.key(request)) || null;
  }

  set(request, payload) {
    if (this.disabled) return;
    this.map.set(this.key(request), payload);
    this.dirty = true;
  }

  async save() {
    if (this.disabled || !this.dirty) return;
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    const payload = {
      game: "yangmyeon-janggi",
      kind: "fairy-analysis-cache",
      version: 1,
      updatedAt: new Date().toISOString(),
      entries: [...this.map.entries()],
    };
    const tempPath = `${this.filePath}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(payload));
    await fs.rename(tempPath, this.filePath);
    this.dirty = false;
  }
}

function scoreFromMate(line) {
  const sign = line.score >= 0 ? 1 : -1;
  const mateMoves = Math.max(1, Math.min(100, Math.abs(Number(line.score) || 1)));
  const ply = sign > 0 ? mateMoves * 2 - 1 : mateMoves * 2;
  return sign * (WIN_SCORE - ply * WIN_DEPTH_BONUS);
}

function terminalScore(winner, perspective, ply) {
  const sign = winner.player === perspective ? 1 : -1;
  return sign * (WIN_SCORE - ply * WIN_DEPTH_BONUS);
}

function terminalScoreFromPv(api, position, pv) {
  let current = api.makePositionFromState(position);
  const perspective = position.turn;
  for (let index = 0; index < pv.length; index += 1) {
    current = api.applyActionToPosition(current, pv[index]);
    if (current.winner) return terminalScore(current.winner, perspective, index + 1);
  }
  return null;
}

function scoreFromLine(api, line, position, pv) {
  const terminal = terminalScoreFromPv(api, position, pv);
  if (terminal !== null) return terminal;
  if (line.scoreType === "mate") return scoreFromMate(line);
  return line.score || 0;
}

function resultsFromPayload(api, payload, position) {
  const seen = new Set();
  const results = [];
  for (let index = 0; index < (payload.lines || []).length; index += 1) {
    const line = payload.lines[index];
    const pv = (line.pv || []).map(api.fairyActionFromMove).filter(Boolean);
    const action = pv[0] || api.fairyActionFromMove(payload.bestmove);
    if (!action) continue;
    const key = api.actionKey(action);
    if (seen.has(key)) continue;
    seen.add(key);
    const score = scoreFromLine(api, line, position, pv);
    results.push({
      action,
      score,
      boardScore: position.turn === 1 ? score : -score,
      pv,
      pvUci: line.pv || [],
      order: Number(line.multipv || index + 1),
      depth: line.depth || payload.depth || 0,
      nodes: line.nodes || 0,
      nps: line.nps || 0,
      time: line.time || 0,
      scoreType: line.scoreType || "cp",
      rawScore: line.score || 0,
    });
  }
  return results.sort((left, right) => {
    const scoreDelta = right.score - left.score;
    if (scoreDelta !== 0) return scoreDelta;
    return left.order - right.order;
  });
}

function rootRequestCount(options, legalCount) {
  if (options.root === "all") return legalCount;
  return Math.min(Number(options.root), legalCount);
}

function cappedRootCount(options, legalCount) {
  const requested = rootRequestCount(options, legalCount);
  const limited = options.rootLimit > 0 ? Math.min(requested, options.rootLimit) : requested;
  return Math.max(1, Math.min(limited, options.maxMultipv));
}

function multipvForNode(options, ply, legalCount) {
  if (ply === 0) return cappedRootCount(options, legalCount);
  return Math.max(1, Math.min(options.branching, legalCount, options.maxMultipv));
}

function selectedLineCount(options, ply, legalCount, resultCount) {
  if (ply === 0) return Math.min(cappedRootCount(options, legalCount), resultCount);
  return Math.min(options.branching, resultCount);
}

function effectiveTimeoutMs(options) {
  if (options.noTimeout) return 0;
  if (options.timeoutMs !== null) return options.timeoutMs;
  if (options.movetimeMs > 0) return Math.max(10000, options.movetimeMs + 15000);
  return Math.max(60000, options.depth * 60000);
}

function winnerPayload(winner) {
  if (!winner) return null;
  return {
    player: winner.player,
    side: winner.player === 1 ? "white" : "black",
    reason: winner.reason,
  };
}

function shouldExpand(stats, options) {
  return options.maxPositions <= 0 || stats.positions < options.maxPositions;
}

async function buildOpeningTree(api, engine, cache, options, stats, position, ply = 0, pathText = []) {
  const fen = api.fairyFenFromPosition(position);
  const legalActions = enumerateLegalActions(api, position);
  const multipv = multipvForNode(options, ply, legalActions.length);
  const request = {
    fen,
    depth: options.depth,
    multipv,
    movetimeMs: options.movetimeMs,
  };
  stats.positions += 1;

  const label = pathText.length ? pathText.join(" ") : "root";
  process.stdout.write(`[${stats.positions}] ply ${ply} ${label} · legal ${legalActions.length} · multipv ${multipv}\n`);

  let payload = cache.get(request);
  let cached = Boolean(payload);
  if (payload) {
    stats.cacheHits += 1;
  } else {
    payload = await engine.analyze({
      ...request,
      timeoutMs: effectiveTimeoutMs(options),
    });
    cache.set(request, payload);
    await cache.save();
    stats.engineSearches += 1;
  }

  stats.engineNodes += payload.nodes || 0;
  stats.engineTimeMs += payload.time || 0;
  if ((payload.lines || []).length < multipv) {
    stats.shortMultiPv += 1;
  }

  const results = resultsFromPayload(api, payload, position);
  const selected = results.slice(0, selectedLineCount(options, ply, legalActions.length, results.length));
  const node = {
    ply,
    turn: position.turn,
    sideToMove: position.turn === 1 ? "white" : "black",
    fen,
    legalActions: legalActions.length,
    requestedDepth: options.depth,
    depth: payload.depth || 0,
    movetimeMs: options.movetimeMs,
    multipv,
    cached,
    nodes: payload.nodes || 0,
    nps: payload.nps || 0,
    engineTimeMs: payload.time || 0,
    elapsedMs: payload.elapsedMs || 0,
    bestmove: payload.bestmove || "",
    lines: [],
  };

  for (const result of selected) {
    const moveText = api.actionText(result.action, position);
    const childPosition = api.applyActionToPosition(position, result.action);
    const line = {
      move: moveText,
      actionKey: api.actionKey(result.action),
      scoreSideToMove: result.score,
      scoreSideToMoveText: api.formatScore(result.score),
      boardScore: result.boardScore,
      boardScoreText: api.formatScore(result.boardScore),
      depth: result.depth,
      nodes: result.nodes,
      nps: result.nps,
      timeMs: result.time,
      scoreType: result.scoreType,
      rawScore: result.rawScore,
      pv: api.pvText(result.pv, position),
      pvUci: result.pvUci,
      terminal: winnerPayload(childPosition.winner),
    };

    if (ply + 1 < options.plies && !childPosition.winner) {
      if (shouldExpand(stats, options)) {
        line.child = await buildOpeningTree(api, engine, cache, options, stats, childPosition, ply + 1, [...pathText, moveText]);
      } else {
        line.truncated = "max-positions";
        stats.truncated += 1;
      }
    }
    node.lines.push(line);
  }

  return node;
}

function renderMarkdownNode(lines, node, indent = "") {
  const side = node.turn === 1 ? "백" : "흑";
  lines.push(`${indent}- ${side} 차례 · ${node.lines.length}/${node.legalActions} 후보 · d${node.depth}`);
  for (const line of node.lines) {
    const cacheText = line.child && line.child.cached ? " · cache" : "";
    const pv = line.pv ? ` · PV ${line.pv}` : "";
    const terminal = line.terminal ? ` · ${line.terminal.side} win: ${line.terminal.reason}` : "";
    lines.push(`${indent}  - ${line.move} · ${line.boardScoreText} 백 기준 · ${line.scoreSideToMoveText} 차례측 · d${line.depth}${cacheText}${terminal}${pv}`);
    if (line.child) renderMarkdownNode(lines, line.child, `${indent}    `);
    if (line.truncated) lines.push(`${indent}    - truncated: ${line.truncated}`);
  }
}

function renderMarkdown(tree) {
  const lines = [];
  const searchLabel = tree.options.movetimeMs > 0
    ? `${tree.options.movetimeMs}ms`
    : `depth ${tree.options.depth}`;
  lines.push("# 양면장기 Opening Tree");
  lines.push("");
  lines.push(`- 생성 시각: ${tree.createdAt}`);
  lines.push(`- 엔진: ${tree.engine.name}`);
  lines.push(`- 분석 설정: ${searchLabel}, tree ${tree.options.plies} plies, root ${tree.options.root}, branching ${tree.options.branching}`);
  lines.push(`- 확장 포지션: ${tree.stats.positions}, 엔진 검색: ${tree.stats.engineSearches}, 캐시 hit: ${tree.stats.cacheHits}`);
  lines.push(`- 누적 nodes: ${tree.stats.engineNodes.toLocaleString("ko-KR")}`);
  if (tree.stats.shortMultiPv > 0) {
    lines.push(`- 참고: ${tree.stats.shortMultiPv}개 포지션에서 요청한 MultiPV보다 적은 후보가 반환되었습니다.`);
  }
  lines.push("");
  lines.push("## Tree");
  renderMarkdownNode(lines, tree.root);
  lines.push("");
  return `${lines.join("\n")}\n`;
}

async function writeOpeningTreeManifest(tree, options) {
  const manifestPath = path.join(ROOT, "outputs", "opening_tree", "opening-tree-manifest.json");
  const toRootRelative = (filePath) => path.relative(ROOT, filePath).replace(/\\/g, "/");
  let existingItems = [];
  if (existsSync(manifestPath)) {
    try {
      const existing = JSON.parse(await fs.readFile(manifestPath, "utf8"));
      if (Array.isArray(existing.items)) existingItems = existing.items;
    } catch {
      existingItems = [];
    }
  }

  const jsonPath = toRootRelative(options.out);
  const markdownPath = options.writeMarkdown ? toRootRelative(options.markdown) : "";
  const item = {
    json: jsonPath,
    markdown: markdownPath,
    depth: tree.options.depth,
    plies: tree.options.plies,
    branching: tree.options.branching,
    positions: tree.stats.positions,
    createdAt: tree.createdAt,
  };
  const items = [
    item,
    ...existingItems.filter((entry) => entry && entry.json !== jsonPath),
  ].slice(0, 20);

  const manifest = {
    game: "yangmyeon-janggi",
    kind: "opening-tree-manifest",
    version: 1,
    updatedAt: new Date().toISOString(),
    latestJson: jsonPath,
    latestMarkdown: markdownPath,
    items,
  };
  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(usage());
    return;
  }

  options.variant = resolveFromRoot(options.variant);
  options.cache = resolveFromRoot(options.cache);
  options.out = resolveFromRoot(options.out || defaultOutputName(options, "json"));
  options.markdown = resolveFromRoot(options.markdown || defaultOutputName(options, "md"));

  const enginePath = findEnginePath(options);
  if (!enginePath) throw new Error("Fairy-Stockfish executable not found. Pass --engine PATH.");
  if (!existsSync(options.variant)) throw new Error(`variants.ini not found: ${options.variant}`);

  const api = await loadAppApi();
  const cache = new PayloadCache(options.cache, options.noCache, options.force);
  await cache.load();

  const engine = new FairyUciEngine({
    enginePath,
    variantPath: options.variant,
    hash: options.hash,
    threads: options.threads,
  });

  const stats = {
    positions: 0,
    engineSearches: 0,
    cacheHits: 0,
    engineNodes: 0,
    engineTimeMs: 0,
    shortMultiPv: 0,
    truncated: 0,
  };
  const startedAt = performance.now();

  try {
    const root = await buildOpeningTree(api, engine, cache, options, stats, initialPosition(api));
    await cache.save();

    const tree = {
      game: "yangmyeon-janggi",
      kind: "opening-tree",
      version: 1,
      createdAt: new Date().toISOString(),
      elapsedMs: Math.round(performance.now() - startedAt),
      options: {
        depth: options.depth,
        movetimeMs: options.movetimeMs,
        plies: options.plies,
        branching: options.branching,
        root: options.root,
        rootLimit: options.rootLimit,
        maxMultipv: options.maxMultipv,
        maxPositions: options.maxPositions,
        hash: options.hash,
        threads: options.threads,
      },
      engine: {
        path: enginePath,
        name: path.basename(enginePath),
        variantPath: options.variant,
      },
      stats,
      root,
    };

    await fs.mkdir(path.dirname(options.out), { recursive: true });
    await fs.writeFile(options.out, JSON.stringify(tree, null, 2));
    if (options.writeMarkdown) {
      await fs.mkdir(path.dirname(options.markdown), { recursive: true });
      await fs.writeFile(options.markdown, renderMarkdown(tree));
    }
    await writeOpeningTreeManifest(tree, options);

    process.stdout.write(`Done.\nJSON: ${options.out}\n`);
    if (options.writeMarkdown) process.stdout.write(`Markdown: ${options.markdown}\n`);
    process.stdout.write(`Positions: ${stats.positions}, engine searches: ${stats.engineSearches}, cache hits: ${stats.cacheHits}\n`);
  } finally {
    engine.close();
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message || String(error)}\n`);
  process.exitCode = 1;
});
