"use strict";

const SIZE = 5;
const BASES = ["pawn", "tokin", "gold", "silver"];
const FILES = ["A", "B", "C", "D", "E"];
const BOARD_SQUARES = SIZE * SIZE;
const MOVE_ACTION_OFFSET = 1;
const DROP_ACTION_OFFSET = MOVE_ACTION_OFFSET + BOARD_SQUARES * BOARD_SQUARES;
const MAX_ACTION_CODE = DROP_ACTION_OFFSET + BASES.length * BOARD_SQUARES - 1;
const WIN_SCORE = 1_000_000;
const WIN_DEPTH_BONUS = 100;
const AUTO_ANALYSIS_DEPTHS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const ANALYSIS_LINE_LIMIT = 3;
const ANALYSIS_EVAL_VERSION = "eval-strategic-v6-lru-53bit-cache";
const ANALYSIS_CACHE_STORAGE_KEY = "yangmyeonJanggi.analysisCache.v8";
const ANALYSIS_CACHE_MAX_ENTRIES = 5_000_000;
const ANALYSIS_CACHE_LOCAL_STORAGE_ENTRIES = 20000;
const ANALYSIS_CACHE_FILE_VERSION = 8;
const ANALYSIS_CACHE_FILE_NAME = "yangmyeon-janggi-analysis-cache.json";
const KIFU_FILE_VERSION = 1;
const KIFU_STORAGE_KEY = "yangmyeonJanggi.savedKifu.v1";
const ANALYSIS_TIME_STORAGE_KEY = "yangmyeonJanggi.analysisTimeSeconds.v1";
const AI_GAME_TIME_STORAGE_KEY = "yangmyeonJanggi.aiTimeSeconds.v1";
const AI_GAME_EVAL_STORAGE_KEY = "yangmyeonJanggi.aiShowEvaluation.v1";
const AI_GAME_FIRST_MOVE_STORAGE_KEY = "yangmyeonJanggi.aiFirstMove.v1";
const REVIEW_EXTRA_TIME_STORAGE_KEY = "yangmyeonJanggi.reviewExtraTimeSeconds.v1";
const ANALYSIS_TIME_DEFAULT_SECONDS = 3;
const ANALYSIS_TIME_MIN_SECONDS = 0.5;
const ANALYSIS_TIME_MAX_SECONDS = 60;
const AI_GAME_DEFAULT_SECONDS = 3;
const REVIEW_EXTRA_TIME_DEFAULT_SECONDS = 6;
const REVIEW_ANALYSIS_MOVETIME_MS = 5000;
const REVIEW_FOCUSED_MOVETIME_MS = 6000;
const REVIEW_FOCUSED_DELAY_MS = 250;
const REVIEW_MOVE_QUALITY_SCORE_CAP = 12;
const MOVE_SOUND_URL = "Reference/freesound_community-ficha-de-ajedrez-34722.mp3";
const MOVE_SOUND_VOLUME = 0.72;
const MOVE_SOUND_START_OFFSET_SECONDS = 0.2;
const FAIRY_ANALYSIS_START_DEPTH = 2;
const FAIRY_ANALYSIS_DEPTH_STEP = 1;
const FAIRY_ANALYSIS_MIN_DISPLAY_DEPTH = 16;
const FAIRY_ANALYSIS_MATE_CONFIRM_EXTRA_DEPTH = 6;
const FAIRY_BRIDGE_ORIGIN = "http://127.0.0.1:8765";
const LOCAL_FAIRY_BRIDGE_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const IS_GITHUB_PAGES_HOST = window.location.hostname.endsWith(".github.io");
const CAN_USE_FAIRY_BRIDGE = window.location.protocol === "file:"
  || LOCAL_FAIRY_BRIDGE_HOSTS.has(window.location.hostname);
const FAIRY_WASM_WORKER_URL = "engine/yangmyeon_engine_worker.js";
const CAN_USE_FAIRY_WASM = typeof Worker !== "undefined" && !CAN_USE_FAIRY_BRIDGE;
const CAN_USE_FAIRY_ENGINE = CAN_USE_FAIRY_BRIDGE || CAN_USE_FAIRY_WASM;
const FAIRY_ANALYSIS_ENDPOINT = CAN_USE_FAIRY_BRIDGE
  ? (window.location.protocol === "file:" ? `${FAIRY_BRIDGE_ORIGIN}/api/fairy/analyze` : "/api/fairy/analyze")
  : "";
const OPENING_TREE_MANIFEST_URL = "outputs/opening_tree/opening-tree-manifest.json";
const OPENING_TREE_FALLBACK_DATA_URLS = [
  "outputs/opening_tree/opening-tree-d20-p4.json",
  "outputs/opening_tree/opening-tree-d20-p3.json",
  "outputs/opening_tree/opening-tree-d20-p2.json",
  "outputs/opening_tree/opening-tree-d20-p1.json",
];
const TT_EXACT = 0;
const TT_LOWER = 1;
const TT_UPPER = 2;
const TT_NO_ACTION = -1;

const EVAL_CONFIG = {
  pieceValues: {
    king: { front: 0, back: 0 },
    pawn: { front: 65.57, back: 340.98 },
    tokin: { front: 104.92, back: 170.49 },
    gold: { front: 118.03, back: 190.16 },
    silver: { front: 111.48, back: 327.87 },
  },
  handMultiplier: 0.72,
  kingSafety: {
    forwardMove: 16,
    otherMove: 8,
    safeMove: 8,
    attackedKing: 130,
    attackedEscape: 12,
    nearbyEnemyControl: 9,
    progress: 30,
    entryPressure: 70,
  },
  activity: {
    nonKingMove: 3,
    forwardMove: 2,
    dropMove: 1.5,
    advancedPiece: 3,
  },
  center: {
    occupyCore: 18,
    occupyNear: 8,
    controlCore: 8,
    controlNear: 3,
  },
  tactics: {
    kingThreat: 125,
    attackedValue: 0.12,
    fork: 18,
    lastPieceAttack: 95,
  },
  quiescence: {
    maxDepth: 2,
  },
  moveOrdering: {
    capturesKing: WIN_SCORE,
    kingEntry: 820000,
    lastPieceCapture: 760000,
    kingThreat: 620000,
    thirdRankBreakthrough: 380000,
    lastPieceAttack: 300000,
    captureBase: 110000,
    captureValue: 420,
    center: 38,
    forwardProgress: 24,
    dropValue: 35,
  },
};

const PIECE_CODES = {
  king: { front: "K", back: "K" },
  pawn: { front: "보", back: "비" },
  gold: { front: "금", back: "계" },
  tokin: { front: "토", back: "향" },
  silver: { front: "은", back: "각" },
};

const PIECES = {
  king: {
    frontName: "왕",
    frontShort: "왕",
    backName: "왕",
    backShort: "왕",
  },
  pawn: {
    frontName: "보병",
    frontShort: "보",
    backName: "비차",
    backShort: "비",
  },
  tokin: {
    frontName: "토금",
    frontShort: "토",
    backName: "향차",
    backShort: "향",
  },
  gold: {
    frontName: "금장",
    frontShort: "금",
    backName: "계마",
    backShort: "계",
  },
  silver: {
    frontName: "은장",
    frontShort: "은",
    backName: "각행",
    backShort: "각",
  },
};

let state;

const boardEl = document.getElementById("board");
const handEls = {
  1: document.getElementById("hand1"),
  2: document.getElementById("hand2"),
};
const turnTitleEl = document.getElementById("turnTitle");
const statusTextEl = document.getElementById("statusText");
const moveLogEl = document.getElementById("moveLog");
const panelTitleEl = document.getElementById("panelTitle");
const panelTabButtons = document.querySelectorAll("[data-panel-tab]");
const panelViews = document.querySelectorAll(".panel-view");
const resetButton = document.getElementById("resetButton");
const undoButton = document.getElementById("undoButton");
const saveKifuButton = document.getElementById("saveKifuButton");
const loadKifuButton = document.getElementById("loadKifuButton");
const kifuFileInput = document.getElementById("kifuFileInput");
const aiGameHeadingEl = document.getElementById("aiGameHeading");
const aiGameButton = document.getElementById("aiGameButton");
const aiGameSettingsEl = document.getElementById("aiGameSettings");
const aiFirstMoveInputs = document.querySelectorAll("input[name='aiFirstMove']");
const aiTimeInput = document.getElementById("aiTimeInput");
const aiEvalToggle = document.getElementById("aiEvalToggle");
const startAiGameButton = document.getElementById("startAiGameButton");
const cancelAiGameButton = document.getElementById("cancelAiGameButton");
const gameRecordSaveButton = document.getElementById("gameRecordSaveButton");
const gameTabStatusEl = document.getElementById("gameTabStatus");
const openingTreeTitleEl = document.getElementById("openingTreeTitle");
const openingTreeDepthEl = document.getElementById("openingTreeDepth");
const openingTreeStatusEl = document.getElementById("openingTreeStatus");
const openingTreePathEl = document.getElementById("openingTreePath");
const openingMoveListEl = document.getElementById("openingMoveList");
const openingStartButton = document.getElementById("openingStartButton");
const openingBackButton = document.getElementById("openingBackButton");
const openingForwardButton = document.getElementById("openingForwardButton");
const reviewTitleEl = document.getElementById("reviewTitle");
const reviewLoadButton = document.getElementById("reviewLoadButton");
const reviewFileInput = document.getElementById("reviewFileInput");
const reviewStartButton = document.getElementById("reviewStartButton");
const reviewUndoButton = document.getElementById("reviewUndoButton");
const reviewRedoButton = document.getElementById("reviewRedoButton");
const reviewEndButton = document.getElementById("reviewEndButton");
const reviewAnalyzeButton = document.getElementById("reviewAnalyzeButton");
const reviewExtraTimeInput = document.getElementById("reviewExtraTimeInput");
const reviewStatusEl = document.getElementById("reviewStatus");
const reviewScoreLabel = document.getElementById("reviewScoreLabel");
const reviewCategoryLabel = document.getElementById("reviewCategoryLabel");
const reviewBestMoveEl = document.getElementById("reviewBestMove");
const reviewMoveListEl = document.getElementById("reviewMoveList");
const analysisDepthLabel = document.getElementById("analysisDepthLabel");
const analysisStateLabel = document.getElementById("analysisStateLabel");
const resumeAnalysisButton = document.getElementById("resumeAnalysisButton");
const stopAnalysisButton = document.getElementById("stopAnalysisButton");
const analysisTimeInput = document.getElementById("analysisTimeInput");
const analysisProgressBar = document.getElementById("analysisProgressBar");
const analysisProgressText = document.getElementById("analysisProgressText");
const analysisStatsText = document.getElementById("analysisStatsText");
const cacheStatusText = document.getElementById("cacheStatusText");
const saveCacheButton = document.getElementById("saveCacheButton");
const loadCacheButton = document.getElementById("loadCacheButton");
const cacheFileInput = document.getElementById("cacheFileInput");
const analysisLinesEl = document.getElementById("analysisLines");
const scoreFillEl = document.getElementById("scoreFill");
const scoreValueEl = document.getElementById("scoreValue");
const playerStrips = {
  1: document.querySelector(".player-one"),
  2: document.querySelector(".player-two"),
};

let analysisToken = 0;
let analysisRunning = false;
let analysisCache = new Map();
let analysisCacheDirty = false;
let analysisAbortController = null;
let gameAnalysisRecords = new Map();
let analysisTimeSeconds = ANALYSIS_TIME_DEFAULT_SECONDS;
let lastDisplayedScore = null;
let activePanelTab = "analysis";
let aiGameActive = false;
let aiThinking = false;
let aiGameToken = 0;
let aiAbortController = null;
let aiPlayer = 2;
let aiTimeSeconds = AI_GAME_DEFAULT_SECONDS;
let aiShowEvaluation = true;
let aiFirstMoveMode = "human";
let reviewRecord = null;
let reviewAnalysisToken = 0;
let reviewQueueRunning = false;
let reviewFocusedTimer = null;
let reviewFocusedAbortController = null;
let reviewApplyingPosition = false;
let pendingReviewBranch = null;
let reviewExtraTimeSeconds = REVIEW_EXTRA_TIME_DEFAULT_SECONDS;
let openingTreeData = null;
let openingTreeLoadPromise = null;
let openingTreePath = [];
let openingTreeRedoStack = [];
let openingTreeSourceUrl = "";
let moveSoundTemplate = null;
const activeMoveSounds = new Set();
let fairyWasmWorker = null;
let fairyWasmRequestId = 0;
const fairyWasmPending = new Map();
const fairyWasmQueue = [];
let fairyWasmActiveRequest = null;
const FAIRY_WASM_MIN_TIMEOUT_MS = 15000;
const FAIRY_WASM_TIMEOUT_GRACE_MS = 10000;
const FAIRY_WASM_MAX_TIMEOUT_MS = 130000;

function fairyWasmAbortError() {
  return new DOMException("analysis cancelled", "AbortError");
}

function fairyWasmTimeoutMs(body = {}) {
  const movetimeMs = Number(body.movetimeMs) || 0;
  return Math.max(
    FAIRY_WASM_MIN_TIMEOUT_MS,
    Math.min(FAIRY_WASM_MAX_TIMEOUT_MS, movetimeMs + FAIRY_WASM_TIMEOUT_GRACE_MS),
  );
}

function cleanupFairyWasmRequest(request) {
  if (!request) return;
  if (request.timeoutId) {
    window.clearTimeout(request.timeoutId);
    request.timeoutId = null;
  }
  if (request.signal && request.abortHandler) {
    request.signal.removeEventListener("abort", request.abortHandler);
  }
}

function settleFairyWasmRequest(request, error, payload) {
  cleanupFairyWasmRequest(request);
  if (error) {
    request.reject(error);
  } else {
    request.resolve(payload);
  }
}

function terminateFairyWasmWorker() {
  if (fairyWasmWorker) {
    fairyWasmWorker.terminate();
    fairyWasmWorker = null;
  }
}

function rejectAllFairyWasmRequests(error) {
  const active = fairyWasmActiveRequest;
  fairyWasmActiveRequest = null;
  if (active) {
    fairyWasmPending.delete(active.id);
    settleFairyWasmRequest(active, error);
  }
  while (fairyWasmQueue.length) {
    settleFairyWasmRequest(fairyWasmQueue.shift(), error);
  }
  for (const pending of fairyWasmPending.values()) {
    settleFairyWasmRequest(pending, error);
  }
  fairyWasmPending.clear();
}

function finishFairyWasmActiveRequest(id, ok, payload, error) {
  const pending = fairyWasmPending.get(id);
  if (!pending) return;
  fairyWasmPending.delete(id);
  if (fairyWasmActiveRequest === pending) {
    fairyWasmActiveRequest = null;
  }
  settleFairyWasmRequest(
    pending,
    ok ? null : new Error(error || "Fairy WASM engine error"),
    payload,
  );
  processFairyWasmQueue();
}

function getFairyWasmWorker() {
  if (fairyWasmWorker) return fairyWasmWorker;
  fairyWasmWorker = new Worker(FAIRY_WASM_WORKER_URL, { type: "module" });
  fairyWasmWorker.addEventListener("message", (event) => {
    const { id, ok, payload, error } = event.data || {};
    finishFairyWasmActiveRequest(id, ok, payload, error);
  });
  fairyWasmWorker.addEventListener("error", (event) => {
    rejectAllFairyWasmRequests(new Error(event.message || "Fairy WASM worker failed"));
    terminateFairyWasmWorker();
  });
  fairyWasmWorker.addEventListener("messageerror", () => {
    rejectAllFairyWasmRequests(new Error("Fairy WASM worker returned an unreadable message"));
    terminateFairyWasmWorker();
  });
  return fairyWasmWorker;
}

function abortFairyWasmRequest(request) {
  const abortError = fairyWasmAbortError();
  const queuedIndex = fairyWasmQueue.indexOf(request);
  if (queuedIndex >= 0) {
    fairyWasmQueue.splice(queuedIndex, 1);
    settleFairyWasmRequest(request, abortError);
    return;
  }
  if (fairyWasmActiveRequest === request) {
    fairyWasmPending.delete(request.id);
    fairyWasmActiveRequest = null;
    settleFairyWasmRequest(request, abortError);
    terminateFairyWasmWorker();
    processFairyWasmQueue();
  }
}

function processFairyWasmQueue() {
  if (fairyWasmActiveRequest) return;
  while (fairyWasmQueue.length) {
    const request = fairyWasmQueue.shift();
    if (request.signal && request.signal.aborted) {
      settleFairyWasmRequest(request, fairyWasmAbortError());
      continue;
    }
    fairyWasmActiveRequest = request;
    request.started = true;
    try {
      const worker = getFairyWasmWorker();
      fairyWasmPending.set(request.id, request);
      request.timeoutId = window.setTimeout(() => {
        if (fairyWasmActiveRequest !== request) return;
        fairyWasmPending.delete(request.id);
        fairyWasmActiveRequest = null;
        settleFairyWasmRequest(request, new Error("Fairy WASM analysis timed out"));
        terminateFairyWasmWorker();
        processFairyWasmQueue();
      }, fairyWasmTimeoutMs(request.body));
      worker.postMessage({ id: request.id, type: "analyze", ...request.body });
    } catch (error) {
      fairyWasmActiveRequest = null;
      settleFairyWasmRequest(request, error);
      terminateFairyWasmWorker();
      continue;
    }
    break;
  }
}

function requestFairyWasmAnalysis(body, signal) {
  if (!CAN_USE_FAIRY_WASM) {
    return Promise.reject(new Error("Fairy WASM engine is unavailable"));
  }
  if (signal && signal.aborted) {
    return Promise.reject(fairyWasmAbortError());
  }
  const id = ++fairyWasmRequestId;
  return new Promise((resolve, reject) => {
    const request = {
      id,
      body,
      signal,
      resolve,
      reject,
      started: false,
      timeoutId: null,
      abortHandler: null,
    };
    if (signal) {
      request.abortHandler = () => abortFairyWasmRequest(request);
      signal.addEventListener("abort", request.abortHandler, { once: true });
    }
    fairyWasmQueue.push(request);
    processFairyWasmQueue();
  });
}

async function requestFairyAnalysisPayload(body, signal) {
  if (CAN_USE_FAIRY_BRIDGE) {
    const response = await fetch(FAIRY_ANALYSIS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
    if (!response.ok) {
      throw new Error(`Fairy bridge HTTP ${response.status}`);
    }
    const payload = await response.json();
    if (!payload.ok) {
      throw new Error(payload.error || "Fairy bridge error");
    }
    return payload;
  }
  return requestFairyWasmAnalysis(body, signal);
}

function getMoveSoundTemplate() {
  if (!moveSoundTemplate) {
    moveSoundTemplate = new Audio(MOVE_SOUND_URL);
    moveSoundTemplate.preload = "auto";
    moveSoundTemplate.volume = MOVE_SOUND_VOLUME;
  }
  return moveSoundTemplate;
}

function playMoveSound() {
  try {
    const audio = getMoveSoundTemplate().cloneNode(true);
    audio.volume = MOVE_SOUND_VOLUME;
    try {
      audio.currentTime = MOVE_SOUND_START_OFFSET_SECONDS;
    } catch {
      // If the browser cannot seek yet, still play the sound.
    }
    activeMoveSounds.add(audio);
    const release = () => activeMoveSounds.delete(audio);
    audio.addEventListener("ended", release, { once: true });
    audio.addEventListener("error", release, { once: true });
    const playback = audio.play();
    if (playback && typeof playback.catch === "function") {
      playback.catch(release);
    }
  } catch {
    // Sound is cosmetic; game actions should never fail because audio cannot play.
  }
}

function emptyHands() {
  return {
    pawn: 0,
    tokin: 0,
    gold: 0,
    silver: 0,
  };
}

function makePiece(owner, base, face = "front") {
  return { owner, base, face };
}

function makeInitialBoard() {
  const board = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  board[0] = [
    makePiece(2, "pawn"),
    makePiece(2, "gold"),
    makePiece(2, "king"),
    makePiece(2, "silver"),
    makePiece(2, "tokin"),
  ];
  board[4] = [
    makePiece(1, "tokin"),
    makePiece(1, "silver"),
    makePiece(1, "king"),
    makePiece(1, "gold"),
    makePiece(1, "pawn"),
  ];
  return board;
}

function resetGame() {
  saveAnalysisCache();
  stopAiGame({ update: false });
  clearReviewSession({ render: false });
  gameAnalysisRecords = new Map();
  lastDisplayedScore = null;
  state = {
    board: makeInitialBoard(),
    hands: {
      1: emptyHands(),
      2: emptyHands(),
    },
    turn: 1,
    selected: null,
    winner: null,
    status: "초기 배치 완료",
    log: [],
    history: [],
  };
  openingTreePath = [];
  openingTreeRedoStack = [];
  render();
  renderOpeningTreePanel();
  clearAnalysis();
  runAutoAnalysis();
}

function clampAnalysisTimeSeconds(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return ANALYSIS_TIME_DEFAULT_SECONDS;
  return Math.max(ANALYSIS_TIME_MIN_SECONDS, Math.min(ANALYSIS_TIME_MAX_SECONDS, Math.round(number * 10) / 10));
}

function formatAnalysisTime(seconds = analysisTimeSeconds) {
  const value = clampAnalysisTimeSeconds(seconds);
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function analysisMovetimeMs() {
  return Math.round(clampAnalysisTimeSeconds(analysisTimeSeconds) * 1000);
}

function updateAnalysisTimeInput() {
  if (analysisTimeInput) {
    analysisTimeInput.value = formatAnalysisTime();
  }
}

function loadAnalysisTimeSetting() {
  try {
    const raw = window.localStorage.getItem(ANALYSIS_TIME_STORAGE_KEY);
    analysisTimeSeconds = clampAnalysisTimeSeconds(raw || ANALYSIS_TIME_DEFAULT_SECONDS);
  } catch {
    analysisTimeSeconds = ANALYSIS_TIME_DEFAULT_SECONDS;
  }
  updateAnalysisTimeInput();
}

function saveAnalysisTimeSetting() {
  analysisTimeSeconds = clampAnalysisTimeSeconds(analysisTimeInput ? analysisTimeInput.value : analysisTimeSeconds);
  updateAnalysisTimeInput();
  try {
    window.localStorage.setItem(ANALYSIS_TIME_STORAGE_KEY, formatAnalysisTime());
  } catch {
    // Time control is a preference; ignore storage failures.
  }
}

function clampReviewExtraTimeSeconds(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return REVIEW_EXTRA_TIME_DEFAULT_SECONDS;
  return Math.max(ANALYSIS_TIME_MIN_SECONDS, Math.min(ANALYSIS_TIME_MAX_SECONDS, Math.round(number * 10) / 10));
}

function formatReviewExtraTime(seconds = reviewExtraTimeSeconds) {
  const value = clampReviewExtraTimeSeconds(seconds);
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function reviewExtraMovetimeMs() {
  return Math.round(clampReviewExtraTimeSeconds(reviewExtraTimeSeconds) * 1000);
}

function updateReviewExtraTimeInput() {
  if (reviewExtraTimeInput) {
    reviewExtraTimeInput.value = formatReviewExtraTime();
  }
}

function loadReviewExtraTimeSetting() {
  try {
    const raw = window.localStorage.getItem(REVIEW_EXTRA_TIME_STORAGE_KEY);
    reviewExtraTimeSeconds = clampReviewExtraTimeSeconds(raw || REVIEW_EXTRA_TIME_DEFAULT_SECONDS);
  } catch {
    reviewExtraTimeSeconds = REVIEW_EXTRA_TIME_DEFAULT_SECONDS;
  }
  updateReviewExtraTimeInput();
}

function saveReviewExtraTimeSetting() {
  reviewExtraTimeSeconds = clampReviewExtraTimeSeconds(reviewExtraTimeInput ? reviewExtraTimeInput.value : reviewExtraTimeSeconds);
  updateReviewExtraTimeInput();
  try {
    window.localStorage.setItem(REVIEW_EXTRA_TIME_STORAGE_KEY, formatReviewExtraTime());
  } catch {
    // Review analysis time is a preference; ignore storage failures.
  }
}

function clampAiTimeSeconds(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return AI_GAME_DEFAULT_SECONDS;
  return Math.max(ANALYSIS_TIME_MIN_SECONDS, Math.min(ANALYSIS_TIME_MAX_SECONDS, Math.round(number * 10) / 10));
}

function formatAiTime(seconds = aiTimeSeconds) {
  const value = clampAiTimeSeconds(seconds);
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function aiMovetimeMs() {
  return Math.round(clampAiTimeSeconds(aiTimeSeconds) * 1000);
}

function normalizeAiFirstMoveMode(value) {
  return ["human", "ai", "random"].includes(value) ? value : "human";
}

function selectedAiFirstMoveMode() {
  const selected = [...aiFirstMoveInputs].find((input) => input.checked);
  return normalizeAiFirstMoveMode(selected ? selected.value : aiFirstMoveMode);
}

function updateAiGameSettingsInput() {
  for (const input of aiFirstMoveInputs) {
    input.checked = input.value === aiFirstMoveMode;
  }
  if (aiTimeInput) {
    aiTimeInput.value = formatAiTime();
  }
  if (aiEvalToggle) {
    aiEvalToggle.checked = aiShowEvaluation;
  }
}

function loadAiGameSettings() {
  try {
    const rawTime = window.localStorage.getItem(AI_GAME_TIME_STORAGE_KEY);
    aiTimeSeconds = clampAiTimeSeconds(rawTime || AI_GAME_DEFAULT_SECONDS);
    const rawEval = window.localStorage.getItem(AI_GAME_EVAL_STORAGE_KEY);
    aiShowEvaluation = rawEval === null ? true : rawEval !== "false";
    aiFirstMoveMode = normalizeAiFirstMoveMode(window.localStorage.getItem(AI_GAME_FIRST_MOVE_STORAGE_KEY));
  } catch {
    aiTimeSeconds = AI_GAME_DEFAULT_SECONDS;
    aiShowEvaluation = true;
    aiFirstMoveMode = "human";
  }
  updateAiGameSettingsInput();
}

function saveAiGameSettings() {
  aiTimeSeconds = clampAiTimeSeconds(aiTimeInput ? aiTimeInput.value : aiTimeSeconds);
  aiShowEvaluation = aiEvalToggle ? aiEvalToggle.checked : aiShowEvaluation;
  aiFirstMoveMode = selectedAiFirstMoveMode();
  updateAiGameSettingsInput();
  try {
    window.localStorage.setItem(AI_GAME_TIME_STORAGE_KEY, formatAiTime());
    window.localStorage.setItem(AI_GAME_EVAL_STORAGE_KEY, aiShowEvaluation ? "true" : "false");
    window.localStorage.setItem(AI_GAME_FIRST_MOVE_STORAGE_KEY, aiFirstMoveMode);
  } catch {
    // AI game settings are local preferences; ignore storage failures.
  }
}

function snapshot() {
  return JSON.stringify({
    board: state.board,
    hands: state.hands,
    turn: state.turn,
    selected: null,
    winner: state.winner,
    status: state.status,
    log: state.log,
  });
}

function saveHistory() {
  state.history.push(snapshot());
}

function restoreSnapshot(raw) {
  const restored = JSON.parse(raw);
  state.board = restored.board;
  state.hands = restored.hands;
  state.turn = restored.turn;
  state.selected = null;
  state.winner = restored.winner;
  state.status = restored.status;
  state.log = restored.log;
}

function gameAnalysisKey(position) {
  return fairyFenFromPosition(position);
}

function snapshotAnalysisKey(raw) {
  try {
    const restored = JSON.parse(raw);
    return gameAnalysisKey({
      board: restored.board,
      hands: restored.hands,
      turn: restored.turn,
      winner: restored.winner || null,
    });
  } catch {
    return null;
  }
}

function positionFromSnapshot(raw) {
  try {
    const restored = JSON.parse(raw);
    return {
      board: restored.board,
      hands: restored.hands,
      turn: restored.turn,
      winner: restored.winner || null,
    };
  } catch {
    return null;
  }
}

function currentGameAnalysisKeys() {
  const keys = new Set();
  if (!state) return keys;
  keys.add(gameAnalysisKey(makePositionFromState(state)));
  for (const raw of state.history) {
    const key = snapshotAnalysisKey(raw);
    if (key) keys.add(key);
  }
  return keys;
}

function currentGameAnalysisRecord() {
  if (!state) return null;
  return gameAnalysisRecords.get(gameAnalysisKey(makePositionFromState(state))) || null;
}

function updateResumeAnalysisButton() {
  if (!resumeAnalysisButton) return;
  const record = currentGameAnalysisRecord();
  const enabled = Boolean(record && state && !state.winner && !analysisRunning);
  resumeAnalysisButton.disabled = !enabled;
  resumeAnalysisButton.title = record
    ? `${record.label}에서 다음 depth부터 이어서 분석`
    : "저장된 분석이 있을 때 이어서 분석";
}

function setPanelTab(tab) {
  activePanelTab = tab;
  const titleByTab = { analysis: "분석", game: "게임", opening: "오프닝", review: "리뷰" };
  panelTitleEl.textContent = titleByTab[tab] || "분석";
  for (const button of panelTabButtons) {
    const selected = button.dataset.panelTab === tab;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-selected", selected ? "true" : "false");
  }
  for (const view of panelViews) {
    view.hidden = view.id !== `${tab}PanelTab`;
    view.classList.toggle("active", !view.hidden);
  }
  if (tab === "review") {
    renderReviewPanel();
  } else if (tab === "opening") {
    ensureOpeningTreeLoaded();
    renderOpeningTreePanel();
  }
}

function updateGameTabState() {
  const canSaveFinishedRecord = Boolean(state && state.winner);
  if (aiGameHeadingEl) {
    if (aiThinking) {
      aiGameHeadingEl.textContent = "AI 계산 중";
    } else if (aiGameActive) {
      aiGameHeadingEl.textContent = "AI 대국 중";
    } else {
      aiGameHeadingEl.textContent = "대기 중";
    }
  }
  if (gameTabStatusEl) {
    if (state && state.winner) {
      gameTabStatusEl.textContent = `${resultNotationForWinner(state.winner.player)} · ${winnerSideName(state.winner.player)} 승리`;
    } else if (aiThinking) {
      gameTabStatusEl.textContent = `AI 계산 중 · ${formatAiTime()}초`;
    } else if (aiGameActive) {
      gameTabStatusEl.textContent = state && state.turn === aiPlayer
        ? "AI 차례"
        : `Player ${opponent(aiPlayer)} 차례 · AI는 Player ${aiPlayer}`;
    } else {
      gameTabStatusEl.textContent = "Player 1 수동 대국";
    }
  }
  if (aiGameButton) {
    aiGameButton.textContent = aiGameActive ? "AI 중지" : "AI 대국";
  }
  if (gameRecordSaveButton) {
    gameRecordSaveButton.disabled = !canSaveFinishedRecord;
  }
}

function setAiGameSettingsVisible(visible) {
  if (aiGameSettingsEl) {
    aiGameSettingsEl.hidden = !visible;
  }
}

function isHumanInputLocked() {
  return Boolean(aiThinking || (aiGameActive && state && !state.winner && state.turn === aiPlayer));
}

function abortAiTurn() {
  if (aiAbortController) {
    aiAbortController.abort();
    aiAbortController = null;
  }
  aiThinking = false;
}

function stopAiGame(options = {}) {
  aiGameActive = false;
  aiGameToken += 1;
  abortAiTurn();
  setAiGameSettingsVisible(false);
  if (state && !state.winner && options.restoreStatus !== false) {
    state.status = `Player ${state.turn} 차례`;
  }
  if (options.update !== false) {
    updateGameTabState();
  }
}

function startAiGame() {
  if (!state || state.winner) {
    if (gameTabStatusEl) {
      gameTabStatusEl.textContent = "종료된 경기는 New 후 AI 대국을 시작하세요.";
    }
    return;
  }
  if (!CAN_USE_FAIRY_ENGINE) {
    setAiGameSettingsVisible(false);
    clearAnalysis("엔진 브리지 없음");
    analysisDepthLabel.textContent = "AI 대국";
    analysisStateLabel.textContent = "엔진 없음";
    analysisProgressText.textContent = "이 브라우저에서는 Fairy-Stockfish 엔진을 사용할 수 없습니다.";
    analysisLinesEl.innerHTML = '<p class="empty-analysis">AI 대국은 WASM 엔진 또는 로컬 Fairy-Stockfish 브리지를 사용할 수 있을 때 실행됩니다.</p>';
    if (gameTabStatusEl) {
      gameTabStatusEl.textContent = "AI 대국에 사용할 엔진을 찾을 수 없습니다.";
    }
    return;
  }
  saveAiGameSettings();
  const firstMoveMode = aiFirstMoveMode === "random"
    ? (Math.random() < 0.5 ? "human" : "ai")
    : aiFirstMoveMode;
  aiPlayer = firstMoveMode === "ai" ? state.turn : opponent(state.turn);
  aiGameActive = true;
  aiGameToken += 1;
  state.selected = null;
  state.status = state.turn === aiPlayer
    ? "AI 계산 중"
    : `Player ${state.turn} 차례 · AI는 Player ${aiPlayer}`;
  setAiGameSettingsVisible(false);
  render();
  if (state.turn === aiPlayer) {
    clearAnalysis("AI 계산 준비");
    maybeRunAiTurn();
  } else if (aiShowEvaluation) {
    clearAnalysis("자동 분석 준비");
    runAutoAnalysis();
  } else {
    clearAnalysis("평가치 표시 꺼짐");
    analysisDepthLabel.textContent = "AI 대국";
    analysisStateLabel.textContent = "표시 꺼짐";
    analysisProgressText.textContent = "평가치 표시가 꺼져 있습니다.";
    analysisLinesEl.innerHTML = '<p class="empty-analysis">AI 대국 중 평가치 표시가 꺼져 있습니다.</p>';
  }
}

function maybeRunAiTurn() {
  if (!aiGameActive || aiThinking || !state || state.winner || state.turn !== aiPlayer) return;
  window.setTimeout(() => {
    runAiTurn();
  }, 0);
}

function aiAnalysisStatsFromPayload(payload) {
  return {
    nodes: payload.nodes || 0,
    terminalCuts: 0,
    alphaBetaCuts: 0,
    cacheHits: 0,
    cacheStores: 0,
    qNodes: 0,
    nps: payload.nps || 0,
    engine: payload.engine || "stockfish",
  };
}

function passTurn() {
  saveHistory();
  state.log.push("pass");
  state.selected = null;
  advanceTurn();
  afterPositionChanged("AI 착수 완료");
}

function applyAiAction(action) {
  if (!action) return false;
  const previousLogLength = state.log.length;
  if (action.type === "move") {
    movePiece(action.fromRow, action.fromCol, action.toRow, action.toCol);
  } else if (action.type === "drop") {
    dropPiece(action.base, action.row, action.col);
  } else if (action.type === "pass") {
    passTurn();
  }
  return state.log.length > previousLogLength;
}

async function runAiTurn() {
  if (!aiGameActive || aiThinking || !state || state.winner || state.turn !== aiPlayer) return;
  if (!CAN_USE_FAIRY_ENGINE) {
    stopAiGame({ restoreStatus: false });
    state.status = "AI 대국에 사용할 엔진을 찾을 수 없습니다.";
    clearAnalysis("엔진 브리지 없음");
    render();
    return;
  }

  const token = aiGameToken;
  const movetimeMs = aiMovetimeMs();
  const timeText = formatAiTime(movetimeMs / 1000);
  const position = makePositionFromState(state);
  const fen = fairyFenFromPosition(position);
  const controller = new AbortController();
  let progressTimer = null;
  let applied = false;

  if (analysisAbortController) {
    analysisAbortController.abort();
    analysisAbortController = null;
  }
  analysisToken += 1;
  setAnalysisRunning(false);

  aiThinking = true;
  aiAbortController = controller;
  state.selected = null;
  state.status = "AI 계산 중";
  render();

  analysisDepthLabel.textContent = `AI ${timeText}s`;
  analysisStateLabel.textContent = "AI 계산 중";
  analysisProgressBar.style.width = "8%";
  analysisProgressText.textContent = `AI가 ${timeText}초 동안 착수를 계산 중`;
  analysisStatsText.textContent = CAN_USE_FAIRY_BRIDGE ? "engine bridge" : "engine wasm";
  if (!aiShowEvaluation) {
    analysisLinesEl.innerHTML = '<p class="empty-analysis">AI 대국 중 평가치 표시가 꺼져 있습니다.</p>';
  }

  const startedAt = Date.now();
  progressTimer = window.setInterval(() => {
    if (token !== aiGameToken) return;
    const elapsed = Date.now() - startedAt;
    const ratio = Math.min(0.96, elapsed / movetimeMs);
    const remaining = Math.max(0, (movetimeMs - elapsed) / 1000);
    analysisProgressBar.style.width = `${Math.max(8, Math.round(ratio * 100))}%`;
    analysisProgressText.textContent = `AI 계산 중 · ${remaining.toFixed(1)}초 남음`;
  }, 100);

  try {
    const payload = await requestFairyAnalysisPayload({
      fen,
      movetimeMs,
      multipv: ANALYSIS_LINE_LIMIT,
    }, controller.signal);
    if (token !== aiGameToken || !aiGameActive || state.turn !== aiPlayer) return;

    const results = fairyResultsFromPayload(payload, position);
    if (results.length === 0) {
      throw new Error("Fairy bridge returned no AI move");
    }
    const resolvedDepth = payloadDepth(payload);
    const stats = aiAnalysisStatsFromPayload(payload);
    const visibleBoardScore = topBoardScore(position, results);
    if (aiShowEvaluation) {
      renderAnalysisResults(results, position, resolvedDepth, stats, {
        label: `AI d${resolvedDepth}`,
        source: "fairy",
        progressText: `AI ${timeText}초 완료 · d${resolvedDepth} · ${formatScore(visibleBoardScore)}`,
      });
      analysisStateLabel.textContent = "AI 착수";
      analysisStatsText.textContent = `engine ${payload.engine || "stockfish"} · nodes ${(payload.nodes || 0).toLocaleString("ko-KR")} · nps ${(payload.nps || 0).toLocaleString("ko-KR")}`;
    }

    aiThinking = false;
    aiAbortController = null;
    applied = applyAiAction(results[0].action);
    if (!applied && aiGameActive) {
      state.status = "AI 착수 적용 실패";
      render();
    }
  } catch (error) {
    if (error.name !== "AbortError" && token === aiGameToken) {
      console.error("AI game move failed.", error);
      aiGameActive = false;
      state.status = "AI 착수 계산 실패";
      analysisStateLabel.textContent = "AI 오류";
      analysisProgressText.textContent = "AI 착수 계산 실패";
      render();
    }
  } finally {
    if (progressTimer) {
      window.clearInterval(progressTimer);
    }
    if (!applied) {
      aiThinking = false;
    }
    if (aiAbortController === controller) {
      aiAbortController = null;
    }
    updateGameTabState();
    if (aiGameActive && state && !state.winner && state.turn === aiPlayer && !aiThinking) {
      maybeRunAiTurn();
    }
  }
}

function isResultLogEntry(entry) {
  return ["1-0", "0-1", "1 - 0", "0 - 1", "1/2-1/2", "1/2 - 1/2"].includes(entry);
}

function resultNotationForWinner(player) {
  return player === 1 ? "1 - 0" : "0 - 1";
}

function compactResultNotationForWinner(player) {
  return player === 1 ? "1-0" : "0-1";
}

function formatResultNotation(entry) {
  if (entry === "1-0" || entry === "1 - 0") return "1 - 0";
  if (entry === "0-1" || entry === "0 - 1") return "0 - 1";
  if (entry === "1/2-1/2" || entry === "1/2 - 1/2") return "1/2 - 1/2";
  return entry;
}

function winnerSideName(player) {
  return player === 1 ? "백" : "흑";
}

function makeInitialStateData() {
  return {
    board: makeInitialBoard(),
    hands: {
      1: emptyHands(),
      2: emptyHands(),
    },
    turn: 1,
    selected: null,
    winner: null,
    status: "초기 배치 완료",
    log: [],
    history: [],
  };
}

function cloneStateData(source) {
  return {
    board: cloneBoard(source.board),
    hands: cloneHands(source.hands),
    turn: source.turn === 2 ? 2 : 1,
    selected: null,
    winner: source.winner ? { ...source.winner } : null,
    status: typeof source.status === "string" ? source.status : `Player ${source.turn === 2 ? 2 : 1} 차례`,
    log: Array.isArray(source.log) ? [...source.log] : [],
    history: Array.isArray(source.history) ? [...source.history] : [],
  };
}

function stateDataFromSnapshot(raw, fallback = null) {
  try {
    const restored = JSON.parse(raw);
    return cloneStateData({
      ...restored,
      history: [],
    });
  } catch {
    return fallback ? cloneStateData(fallback) : null;
  }
}

function reviewMoveEntriesFromLog(log = []) {
  const moves = [];
  let ply = 0;
  for (const entry of log) {
    if (isResultLogEntry(entry)) continue;
    ply += 1;
    moves.push({
      ply,
      moveNumber: Math.ceil(ply / 2),
      player: ply % 2 === 1 ? 1 : 2,
      notation: entry,
    });
  }
  return moves;
}

function buildReviewStates(finalState, moves) {
  const states = [];
  const history = Array.isArray(finalState.history) ? finalState.history : [];
  for (let ply = 0; ply <= moves.length; ply += 1) {
    let item = null;
    if (ply < moves.length && history[ply]) {
      item = stateDataFromSnapshot(history[ply]);
      if (item) {
        item.history = history.slice(0, ply);
      }
    } else if (ply === moves.length) {
      item = cloneStateData(finalState);
    }
    if (!item && ply === 0) {
      item = history[0] ? stateDataFromSnapshot(history[0]) : makeInitialStateData();
    }
    if (!item && states[ply - 1]) {
      item = cloneStateData(states[ply - 1]);
    }
    if (item) {
      item.selected = null;
      item.status = ply === 0 ? "리뷰 시작 포지션" : `리뷰 ${ply}수 후`;
      states.push(item);
    }
  }
  return states;
}

function clearReviewSession(options = {}) {
  reviewAnalysisToken += 1;
  reviewQueueRunning = false;
  if (reviewFocusedTimer) {
    window.clearTimeout(reviewFocusedTimer);
    reviewFocusedTimer = null;
  }
  if (reviewFocusedAbortController) {
    reviewFocusedAbortController.abort();
    reviewFocusedAbortController = null;
  }
  reviewRecord = null;
  pendingReviewBranch = null;
  if (options.render !== false) {
    renderReviewPanel();
  }
}

function reviewPositionForTarget(target) {
  if (!reviewRecord || !target) return null;
  if (target.type === "branch") {
    const branch = reviewRecord.branches.find((item) => item.id === target.id);
    return branch ? makePositionFromState(branch.state) : null;
  }
  const stateItem = reviewRecord.states[target.ply];
  return stateItem ? makePositionFromState(stateItem) : null;
}

function reviewEvalForTarget(target) {
  if (!reviewRecord || !target) return null;
  if (target.type === "branch") {
    const branch = reviewRecord.branches.find((item) => item.id === target.id);
    return branch ? branch.eval : null;
  }
  return reviewRecord.evals[target.ply] || null;
}

function setReviewEvalForTarget(target, evalRecord) {
  if (!reviewRecord || !target) return;
  if (target.type === "branch") {
    const branch = reviewRecord.branches.find((item) => item.id === target.id);
    if (branch) {
      branch.eval = evalRecord;
    }
    return;
  }
  reviewRecord.evals[target.ply] = evalRecord;
}

function terminalReviewEval(position) {
  const boardScore = position.winner.player === 1 ? WIN_SCORE : -WIN_SCORE;
  const resultText = compactResultNotationForWinner(position.winner.player);
  return {
    boardScore,
    bestScore: position.turn === 1 ? boardScore : -boardScore,
    bestText: resultText,
    depth: 0,
    nodes: 0,
    nps: 0,
    engine: "terminal",
    results: [],
    terminal: true,
    resultText,
    updatedAt: Date.now(),
  };
}

async function requestFairyReviewAnalysis(position, movetimeMs, signal) {
  if (position.winner) {
    return terminalReviewEval(position);
  }
  if (!CAN_USE_FAIRY_ENGINE) {
    throw new Error("Fairy engine unavailable");
  }
  const payload = await requestFairyAnalysisPayload({
    fen: fairyFenFromPosition(position),
    movetimeMs,
    multipv: ANALYSIS_LINE_LIMIT,
  }, signal);
  const results = fairyResultsFromPayload(payload, position);
  if (results.length === 0) {
    throw new Error("Fairy bridge returned no review line");
  }
  const depth = payloadDepth(payload);
  return {
    boardScore: topBoardScore(position, results),
    bestScore: results[0].score,
    bestText: pvText(results[0].pv, position),
    depth,
    nodes: payload.nodes || 0,
    nps: payload.nps || 0,
    engine: payload.engine || "stockfish",
    results,
    updatedAt: Date.now(),
  };
}

async function analyzeReviewTarget(target, movetimeMs, token) {
  const position = reviewPositionForTarget(target);
  if (!position) return null;
  const controller = new AbortController();
  if (target.type === "focused" || target.focused) {
    reviewFocusedAbortController = controller;
  }
  try {
    const evalRecord = await requestFairyReviewAnalysis(position, movetimeMs, controller.signal);
    if (token !== reviewAnalysisToken || !reviewRecord) return null;
    setReviewEvalForTarget(target, evalRecord);
    renderReviewPanel();
    if (reviewRecord && !reviewRecord.activeBranchId && target.type !== "branch" && target.ply === reviewRecord.currentPly) {
      setScoreRail(evalRecord.boardScore);
    }
    return evalRecord;
  } finally {
    if (reviewFocusedAbortController === controller) {
      reviewFocusedAbortController = null;
    }
  }
}

async function runReviewBatchAnalysis() {
  if (!reviewRecord || reviewQueueRunning) return;
  if (!CAN_USE_FAIRY_ENGINE) {
    reviewStatusEl.textContent = "리뷰 분석에 사용할 Fairy-Stockfish 엔진을 찾을 수 없습니다.";
    updateReviewAnalyzeButtonState();
    return;
  }
  reviewQueueRunning = true;
  updateReviewAnalyzeButtonState();
  const token = reviewAnalysisToken;
  try {
    for (let ply = 0; reviewRecord && ply < reviewRecord.states.length; ply += 1) {
      if (token !== reviewAnalysisToken) return;
      if (!reviewRecord.evals[ply]) {
        reviewStatusEl.textContent = `전체 리뷰 분석 중 · ${ply + 1}/${reviewRecord.states.length}`;
        await analyzeReviewTarget({ type: "main", ply }, REVIEW_ANALYSIS_MOVETIME_MS, token);
        await waitForUi();
      }
    }
    if (token === reviewAnalysisToken && reviewRecord) {
      reviewStatusEl.textContent = "기본 5초 리뷰 분석 완료";
      renderReviewPanel();
    }
  } catch (error) {
    if (token === reviewAnalysisToken && reviewRecord) {
      console.error("Review analysis failed.", error);
      reviewStatusEl.textContent = "리뷰 분석 중 오류가 발생했습니다.";
    }
  } finally {
    if (token === reviewAnalysisToken) {
      reviewQueueRunning = false;
      updateReviewAnalyzeButtonState();
    }
  }
}

function scheduleReviewFocusedAnalysis(target = null) {
  if (!reviewRecord) return;
  if (!CAN_USE_FAIRY_ENGINE) {
    reviewStatusEl.textContent = "현재 수 분석에 사용할 Fairy-Stockfish 엔진을 찾을 수 없습니다.";
    return;
  }
  if (reviewFocusedTimer) {
    window.clearTimeout(reviewFocusedTimer);
  }
  if (reviewFocusedAbortController) {
    reviewFocusedAbortController.abort();
    reviewFocusedAbortController = null;
  }
  const focusedTarget = target || (
    reviewRecord.activeBranchId
      ? { type: "branch", id: reviewRecord.activeBranchId }
      : { type: "main", ply: reviewRecord.currentPly }
  );
  if (reviewQueueRunning || reviewEvalForTarget(focusedTarget)) {
    updateReviewAnalyzeButtonState();
    return;
  }
  const token = reviewAnalysisToken;
  reviewFocusedTimer = window.setTimeout(async () => {
    reviewFocusedTimer = null;
    if (!reviewRecord || token !== reviewAnalysisToken) return;
    reviewStatusEl.textContent = "현재 수 추가 분석 중";
    try {
      await analyzeReviewTarget({ ...focusedTarget, focused: true }, Math.max(REVIEW_FOCUSED_MOVETIME_MS, analysisMovetimeMs()), token);
      if (reviewRecord && token === reviewAnalysisToken) {
        reviewStatusEl.textContent = reviewQueueRunning ? "전체 리뷰 분석 계속 진행 중" : "현재 수 추가 분석 완료";
      }
    } catch (error) {
      if (error.name !== "AbortError" && token === reviewAnalysisToken) {
        console.error("Focused review analysis failed.", error);
        reviewStatusEl.textContent = "현재 수 추가 분석 실패";
      }
    }
  }, REVIEW_FOCUSED_DELAY_MS);
}

async function runReviewExtraAnalysis() {
  if (!reviewRecord) return;
  if (!CAN_USE_FAIRY_ENGINE) {
    reviewStatusEl.textContent = "추가 분석에 사용할 Fairy-Stockfish 엔진을 찾을 수 없습니다.";
    updateReviewAnalyzeButtonState();
    return;
  }
  saveReviewExtraTimeSetting();
  const focusedTarget = currentReviewTarget();
  if (!focusedTarget) return;
  if (reviewFocusedTimer) {
    window.clearTimeout(reviewFocusedTimer);
    reviewFocusedTimer = null;
  }
  if (reviewFocusedAbortController) {
    reviewFocusedAbortController.abort();
    reviewFocusedAbortController = null;
  }
  const token = reviewAnalysisToken;
  const timeText = formatReviewExtraTime();
  reviewStatusEl.textContent = `${timeText}초 추가 분석 중`;
  if (reviewAnalyzeButton) {
    reviewAnalyzeButton.disabled = true;
  }
  try {
    await analyzeReviewTarget({ ...focusedTarget, focused: true }, reviewExtraMovetimeMs(), token);
    if (reviewRecord && token === reviewAnalysisToken) {
      reviewStatusEl.textContent = reviewQueueRunning ? "전체 리뷰 분석 계속 진행 중" : `${timeText}초 추가 분석 완료`;
    }
  } catch (error) {
    if (error.name !== "AbortError" && token === reviewAnalysisToken) {
      console.error("Extra review analysis failed.", error);
      reviewStatusEl.textContent = "추가 분석 실패";
    }
  } finally {
    updateReviewAnalyzeButtonState();
    renderReviewPanel();
  }
}

function reviewScoreCategory(boardScore) {
  if (boardScore === null || boardScore === undefined) return "-";
  if (Math.abs(boardScore) > WIN_SCORE / 2) {
    return `${boardScore >= 0 ? "백" : "흑"} ${formatScore(boardScore)}`;
  }
  const side = boardScore >= 0 ? "백" : "흑";
  const pawns = Math.abs(boardScore / 100);
  if (pawns < 1) return "동등";
  if (pawns < 2) return `${side} 미세 유리`;
  if (pawns < 4) return `${side} 근소 유리`;
  if (pawns < 6) return `${side} 유리`;
  return `${side} 매우 유리`;
}

function reviewEvalText(evalRecord) {
  if (!evalRecord) return "...";
  return evalRecord.terminal ? evalRecord.resultText : formatScore(evalRecord.boardScore);
}

function reviewEvalCategory(evalRecord) {
  if (!evalRecord) return "-";
  return evalRecord.terminal ? evalRecord.resultText : reviewScoreCategory(evalRecord.boardScore);
}

function reviewMoveQualityPointScore(score) {
  if (score === null || score === undefined) return 0;
  if (Math.abs(score) > WIN_SCORE / 2) {
    return score >= 0 ? REVIEW_MOVE_QUALITY_SCORE_CAP : -REVIEW_MOVE_QUALITY_SCORE_CAP;
  }
  return Math.max(-REVIEW_MOVE_QUALITY_SCORE_CAP, Math.min(REVIEW_MOVE_QUALITY_SCORE_CAP, score / 100));
}

function reviewMoveQuality(move) {
  if (!reviewRecord || !move || move.ply <= 0) return null;
  const before = reviewRecord.evals[move.ply - 1];
  const after = reviewRecord.evals[move.ply];
  if (!before || !after) return null;
  const actualForMover = move.player === 1 ? after.boardScore : -after.boardScore;
  const bestForMover = reviewMoveQualityPointScore(before.bestScore);
  const actualPointScore = reviewMoveQualityPointScore(actualForMover);
  const pointLoss = bestForMover - actualPointScore;
  if (pointLoss >= 6) return { key: "blunder", label: "Blunder", bestText: before.bestText };
  if (pointLoss >= 4) return { key: "mistake", label: "Mistake", bestText: before.bestText };
  if (pointLoss >= 2) return { key: "inaccuracy", label: "Inaccuracy", bestText: before.bestText };
  return { key: "good", label: "정확", bestText: before.bestText };
}

function currentReviewTarget() {
  if (!reviewRecord) return null;
  return reviewRecord.activeBranchId
    ? { type: "branch", id: reviewRecord.activeBranchId }
    : { type: "main", ply: reviewRecord.currentPly };
}

function currentReviewEval() {
  return reviewEvalForTarget(currentReviewTarget());
}

function currentReviewMove() {
  if (!reviewRecord || reviewRecord.activeBranchId || reviewRecord.currentPly <= 0) return null;
  return reviewRecord.moves[reviewRecord.currentPly - 1] || null;
}

function setReviewBestMoveText(text) {
  if (!reviewBestMoveEl) return;
  reviewBestMoveEl.textContent = text;
  reviewBestMoveEl.title = text;
}

function updateReviewAnalyzeButtonState() {
  if (reviewAnalyzeButton) {
    reviewAnalyzeButton.disabled = !CAN_USE_FAIRY_ENGINE
      || !reviewRecord
      || reviewQueueRunning
      || Boolean(reviewFocusedAbortController);
  }
}

function scrollActiveReviewMoveIntoView() {
  if (!reviewMoveListEl) return;
  window.requestAnimationFrame(() => {
    const activeRow = reviewMoveListEl.querySelector(".review-move-row.active, .review-branch-row.active");
    if (activeRow) {
      activeRow.scrollIntoView({ block: "nearest" });
    }
  });
}

function renderReviewPanel() {
  if (!reviewTitleEl || !reviewMoveListEl) return;
  if (!reviewRecord) {
    reviewTitleEl.textContent = "기보 없음";
    reviewStatusEl.textContent = CAN_USE_FAIRY_ENGINE
      ? "JSON 기보를 불러오면 5초 기준으로 전체 수를 분석합니다."
      : "이 브라우저에서는 리뷰 분석에 사용할 Fairy-Stockfish 엔진을 찾을 수 없습니다.";
    reviewScoreLabel.textContent = "-";
    reviewCategoryLabel.textContent = "-";
    setReviewBestMoveText("최선수: -");
    reviewMoveListEl.innerHTML = '<p class="empty-analysis">리뷰할 기보를 불러오세요.</p>';
    updateReviewAnalyzeButtonState();
    for (const button of [reviewStartButton, reviewUndoButton, reviewRedoButton, reviewEndButton]) {
      if (button) button.disabled = true;
    }
    return;
  }

  const totalMoves = reviewRecord.moves.length;
  const evalRecord = currentReviewEval();
  const currentMove = currentReviewMove();
  const quality = currentMove ? reviewMoveQuality(currentMove) : null;
  reviewTitleEl.textContent = `리뷰 · ${reviewRecord.currentPly}/${totalMoves}`;
  reviewScoreLabel.textContent = evalRecord ? reviewEvalText(evalRecord) : "계산 중";
  reviewCategoryLabel.textContent = evalRecord ? reviewEvalCategory(evalRecord) : "-";
  if (evalRecord && evalRecord.terminal) {
    setReviewBestMoveText(`종국: ${evalRecord.resultText}`);
  } else if (quality && quality.key !== "good") {
    setReviewBestMoveText(`${quality.label}: ${quality.bestText || "-"}가 더 좋았습니다.`);
  } else if (evalRecord) {
    setReviewBestMoveText(`최선수: ${evalRecord.bestText || "-"}`);
  } else {
    setReviewBestMoveText("최선수: 계산 중");
  }

  updateReviewAnalyzeButtonState();
  if (reviewStartButton) reviewStartButton.disabled = reviewRecord.currentPly === 0 && !reviewRecord.activeBranchId;
  if (reviewUndoButton) reviewUndoButton.disabled = reviewRecord.currentPly === 0 && !reviewRecord.activeBranchId;
  if (reviewRedoButton) reviewRedoButton.disabled = Boolean(reviewRecord.activeBranchId) || reviewRecord.currentPly >= totalMoves;
  if (reviewEndButton) reviewEndButton.disabled = Boolean(reviewRecord.activeBranchId) || reviewRecord.currentPly >= totalMoves;

  reviewMoveListEl.innerHTML = "";
  if (totalMoves === 0) {
    reviewMoveListEl.innerHTML = '<p class="empty-analysis">기록된 수가 없습니다.</p>';
    return;
  }

  for (const branch of reviewRecord.branches.filter((item) => item.parentPly === 0)) {
    const branchRow = document.createElement("button");
    const branchMark = document.createElement("span");
    const branchNotation = document.createElement("strong");
    const branchScore = document.createElement("small");
    branchRow.type = "button";
    branchRow.className = `review-branch-row root${reviewRecord.activeBranchId === branch.id ? " active" : ""}`;
    branchMark.textContent = "↳";
    branchNotation.textContent = branch.notation;
    branchScore.textContent = branch.eval ? reviewEvalText(branch.eval) : "...";
    branchRow.append(branchMark, branchNotation, branchScore);
    branchRow.addEventListener("click", () => goToReviewBranch(branch.id));
    reviewMoveListEl.appendChild(branchRow);
  }

  for (const move of reviewRecord.moves) {
    const row = document.createElement("button");
    const index = document.createElement("span");
    const notation = document.createElement("strong");
    const badge = document.createElement("span");
    const score = document.createElement("small");
    const moveEval = reviewRecord.evals[move.ply] || null;
    const moveQuality = reviewMoveQuality(move);
    row.type = "button";
    row.className = `review-move-row${reviewRecord.currentPly === move.ply && !reviewRecord.activeBranchId ? " active" : ""}${moveQuality && moveQuality.key !== "good" ? ` ${moveQuality.key}` : ""}`;
    index.className = "review-ply";
    index.textContent = String(move.ply);
    notation.textContent = move.notation;
    badge.className = "review-quality";
    badge.textContent = moveQuality && moveQuality.key !== "good" ? moveQuality.label : "";
    score.textContent = moveEval ? reviewEvalText(moveEval) : "...";
    row.append(index, notation, badge, score);
    row.addEventListener("click", () => goToReviewPly(move.ply));
    reviewMoveListEl.appendChild(row);

    for (const branch of reviewRecord.branches.filter((item) => item.parentPly === move.ply)) {
      const branchRow = document.createElement("button");
      const branchMark = document.createElement("span");
      const branchNotation = document.createElement("strong");
      const branchScore = document.createElement("small");
      branchRow.type = "button";
      branchRow.className = `review-branch-row${reviewRecord.activeBranchId === branch.id ? " active" : ""}`;
      branchMark.textContent = "↳";
      branchNotation.textContent = branch.notation;
      branchScore.textContent = branch.eval ? reviewEvalText(branch.eval) : "...";
      branchRow.append(branchMark, branchNotation, branchScore);
      branchRow.addEventListener("click", () => goToReviewBranch(branch.id));
      reviewMoveListEl.appendChild(branchRow);
    }
  }
}

function goToReviewPly(ply) {
  if (!reviewRecord) return false;
  const nextPly = Math.max(0, Math.min(reviewRecord.moves.length, ply));
  const nextState = reviewRecord.states[nextPly];
  if (!nextState) return false;
  reviewRecord.currentPly = nextPly;
  reviewRecord.activeBranchId = null;
  reviewApplyingPosition = true;
  state = cloneStateData(nextState);
  state.status = nextPly === 0 ? "리뷰 시작 포지션" : `리뷰 ${nextPly}수 후`;
  render();
  reviewApplyingPosition = false;
  renderReviewPanel();
  scrollActiveReviewMoveIntoView();
  const evalRecord = reviewRecord.evals[nextPly];
  if (evalRecord) {
    setScoreRail(evalRecord.boardScore);
  }
  scheduleReviewFocusedAnalysis({ type: "main", ply: nextPly });
  return true;
}

function goToReviewBranch(id) {
  if (!reviewRecord) return;
  const branch = reviewRecord.branches.find((item) => item.id === id);
  if (!branch) return;
  reviewRecord.currentPly = branch.parentPly;
  reviewRecord.activeBranchId = id;
  reviewApplyingPosition = true;
  state = cloneStateData(branch.state);
  state.status = `리뷰 분기 · ${branch.notation}`;
  render();
  reviewApplyingPosition = false;
  renderReviewPanel();
  scrollActiveReviewMoveIntoView();
  if (branch.eval) {
    setScoreRail(branch.eval.boardScore);
  }
  scheduleReviewFocusedAnalysis({ type: "branch", id });
}

function reviewUndo() {
  if (!reviewRecord) return false;
  if (reviewRecord.activeBranchId) {
    const moved = goToReviewPly(reviewRecord.currentPly);
    if (moved) playMoveSound();
    return moved;
  }
  if (reviewRecord.currentPly > 0) {
    const moved = goToReviewPly(reviewRecord.currentPly - 1);
    if (moved) playMoveSound();
    return moved;
  }
  return false;
}

function reviewRedo() {
  if (!reviewRecord || reviewRecord.activeBranchId || reviewRecord.currentPly >= reviewRecord.moves.length) return false;
  const moved = goToReviewPly(reviewRecord.currentPly + 1);
  if (moved) playMoveSound();
  return moved;
}

function startReviewFromState(finalState) {
  stopAiGame({ update: false, restoreStatus: false });
  clearReviewSession({ render: false });
  const moves = reviewMoveEntriesFromLog(finalState.log);
  const states = buildReviewStates(finalState, moves);
  reviewRecord = {
    moves,
    states,
    evals: Array.from({ length: states.length }, () => null),
    branches: [],
    currentPly: 0,
    activeBranchId: null,
    sourceState: cloneStateData(finalState),
  };
  reviewAnalysisToken += 1;
  setPanelTab("review");
  goToReviewPly(0);
  reviewStatusEl.textContent = "전체 리뷰 분석 시작";
  runReviewBatchAnalysis();
}

async function importReviewKifuFile(file) {
  if (!file) return;
  try {
    const payload = JSON.parse(await file.text());
    const nextState = normalizeKifuState(payload);
    if (!nextState) {
      throw new Error("invalid review kifu file");
    }
    startReviewFromState(nextState);
  } catch (error) {
    console.error(error);
    reviewStatusEl.textContent = "리뷰 기보 파일 오류";
  } finally {
    if (reviewFileInput) {
      reviewFileInput.value = "";
    }
  }
}

function prepareReviewBranch() {
  if (!reviewRecord || activePanelTab !== "review" || reviewApplyingPosition) return;
  pendingReviewBranch = {
    parentPly: reviewRecord.activeBranchId
      ? reviewRecord.branches.find((branch) => branch.id === reviewRecord.activeBranchId)?.parentPly || reviewRecord.currentPly
      : reviewRecord.currentPly,
    previousLogLength: state.log.length,
  };
}

function recordPendingReviewBranch() {
  if (!reviewRecord || !pendingReviewBranch) return false;
  const notation = state.log[pendingReviewBranch.previousLogLength] || state.log[state.log.length - 1] || "?";
  const branch = {
    id: `branch-${Date.now()}-${reviewRecord.branches.length + 1}`,
    parentPly: pendingReviewBranch.parentPly,
    notation,
    state: cloneStateData(state),
    eval: null,
  };
  reviewRecord.branches.push(branch);
  reviewRecord.currentPly = branch.parentPly;
  reviewRecord.activeBranchId = branch.id;
  pendingReviewBranch = null;
  state.status = `리뷰 분기 · ${notation}`;
  render();
  renderReviewPanel();
  reviewStatusEl.textContent = "사이드 분기 추가됨";
  scheduleReviewFocusedAnalysis({ type: "branch", id: branch.id });
  return true;
}

function pruneGameAnalysisRecords() {
  const keep = currentGameAnalysisKeys();
  for (const key of gameAnalysisRecords.keys()) {
    if (!keep.has(key)) {
      gameAnalysisRecords.delete(key);
    }
  }
  updateResumeAnalysisButton();
}

function pieceInfo(piece) {
  const info = PIECES[piece.base];
  if (piece.face === "back") {
    return {
      name: info.backName,
      short: info.backShort,
    };
  }
  return {
    name: info.frontName,
    short: info.frontShort,
  };
}

function frontName(base) {
  return PIECES[base].frontName;
}

function coord(row, col) {
  return `${FILES[col]}${SIZE - row}`;
}

function notationCoord(row, col) {
  return `${FILES[col].toLowerCase()}${SIZE - row}`;
}

function pieceCode(piece) {
  return PIECE_CODES[piece.base][piece.face];
}

function notationForMove(piece, captured, fromRow, fromCol, toRow, toCol) {
  const moved = flipPiece({ ...piece });
  const captureMark = captured ? "x" : "";
  const promotion = piece.base === "king" ? "" : `=${pieceCode(moved)}`;
  return `${pieceCode(piece)}${captureMark}${notationCoord(toRow, toCol)}${promotion}`;
}

function notationForDrop(base, row, col) {
  return `${PIECE_CODES[base].front}@${notationCoord(row, col)}`;
}

function inBoard(row, col) {
  return row >= 0 && row < SIZE && col >= 0 && col < SIZE;
}

function forward(owner) {
  return owner === 1 ? -1 : 1;
}

function firstRank(owner) {
  return owner === 1 ? SIZE - 1 : 0;
}

function enemyFirstRank(owner) {
  return owner === 1 ? 0 : SIZE - 1;
}

function opponent(owner) {
  return owner === 1 ? 2 : 1;
}

function addStepMove(moves, board, owner, row, col) {
  if (!inBoard(row, col)) return;
  const target = board[row][col];
  if (!target || target.owner !== owner) {
    moves.push({ row, col });
  }
}

function addSlideMoves(moves, board, owner, row, col, directions) {
  for (const [dr, dc] of directions) {
    let nextRow = row + dr;
    let nextCol = col + dc;
    while (inBoard(nextRow, nextCol)) {
      const target = board[nextRow][nextCol];
      if (!target) {
        moves.push({ row: nextRow, col: nextCol });
      } else {
        if (target.owner !== owner) {
          moves.push({ row: nextRow, col: nextCol });
        }
        break;
      }
      nextRow += dr;
      nextCol += dc;
    }
  }
}

function legalMovesFrom(board, row, col) {
  const piece = board[row][col];
  if (!piece) return [];

  const moves = [];
  const f = forward(piece.owner);
  const owner = piece.owner;

  if (piece.base === "king") {
    for (const dr of [-1, 0, 1]) {
      for (const dc of [-1, 0, 1]) {
        if (dr !== 0 || dc !== 0) {
          addStepMove(moves, board, owner, row + dr, col + dc);
        }
      }
    }
    return moves;
  }

  if (piece.face === "front") {
    if (piece.base === "pawn") {
      addStepMove(moves, board, owner, row + f, col);
    }
    if (piece.base === "tokin" || piece.base === "gold") {
      for (const [dr, dc] of [
        [f, 0],
        [-f, 0],
        [0, -1],
        [0, 1],
        [f, -1],
        [f, 1],
      ]) {
        addStepMove(moves, board, owner, row + dr, col + dc);
      }
    }
    if (piece.base === "silver") {
      for (const [dr, dc] of [
        [f, 0],
        [f, -1],
        [f, 1],
        [-f, -1],
        [-f, 1],
      ]) {
        addStepMove(moves, board, owner, row + dr, col + dc);
      }
    }
    return moves;
  }

  if (piece.base === "pawn") {
    addSlideMoves(moves, board, owner, row, col, [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]);
  }
  if (piece.base === "tokin") {
    addSlideMoves(moves, board, owner, row, col, [[f, 0]]);
  }
  if (piece.base === "gold") {
    for (const [dr, dc] of [
      [2 * f, -1],
      [2 * f, 1],
      [f, -2],
      [f, 2],
    ]) {
      addStepMove(moves, board, owner, row + dr, col + dc);
    }
  }
  if (piece.base === "silver") {
    addSlideMoves(moves, board, owner, row, col, [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ]);
  }

  return moves;
}

function legalDropsFor(board, hands, base, player) {
  if (hands[player][base] <= 0) return [];
  const row = firstRank(player);
  const drops = [];
  for (let col = 0; col < SIZE; col += 1) {
    if (!board[row][col]) {
      drops.push({ row, col });
    }
  }
  return drops;
}

function legalDrops(base, player) {
  return legalDropsFor(state.board, state.hands, base, player);
}

function hasAnyLegalActionFor(board, hands, player) {
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      const piece = board[row][col];
      if (piece && piece.owner === player && legalMovesFrom(board, row, col).length > 0) {
        return true;
      }
    }
  }

  const hasEmptyFirstRank = board[firstRank(player)].some((cell) => cell === null);
  return hasEmptyFirstRank && BASES.some((base) => hands[player][base] > 0);
}

function hasAnyLegalAction(player) {
  return hasAnyLegalActionFor(state.board, state.hands, player);
}

function flipPiece(piece) {
  if (piece.base === "king") return piece;
  return {
    ...piece,
    face: piece.face === "front" ? "back" : "front",
  };
}

function opponentNonKingCount(player) {
  const enemy = opponent(player);
  let count = 0;
  for (const row of state.board) {
    for (const piece of row) {
      if (piece && piece.owner === enemy && piece.base !== "king") {
        count += 1;
      }
    }
  }
  return count;
}

function setWinner(player, reason) {
  state.winner = { player, reason };
  state.turn = player;
  state.status = `${resultNotationForWinner(player)} · ${winnerSideName(player)} 승리: ${reason}`;
  state.log.push(resultNotationForWinner(player));
}

function advanceTurn() {
  if (state.winner) return;
  state.turn = opponent(state.turn);

  let passCount = 0;
  while (!hasAnyLegalAction(state.turn) && passCount < 2) {
    state.log.push("pass");
    state.turn = opponent(state.turn);
    passCount += 1;
  }

  if (passCount >= 2 && !hasAnyLegalAction(state.turn)) {
    state.status = "양쪽 모두 행동할 수 없어 수 넘김 상태입니다.";
    return;
  }

  state.status = `Player ${state.turn} 차례`;
}

function afterPositionChanged(message = "자동 분석 준비") {
  pruneGameAnalysisRecords();
  render();
  if (recordPendingReviewBranch()) {
    return;
  }
  if (state.winner) {
    clearAnalysis("게임 종료");
    analysisLinesEl.innerHTML = '<p class="empty-analysis">게임이 종료되었습니다.</p>';
    return;
  }

  clearAnalysis(message);
  if (aiGameActive && state.turn === aiPlayer) {
    maybeRunAiTurn();
    return;
  }
  if (!aiGameActive || aiShowEvaluation) {
    runAutoAnalysis();
    return;
  }
  analysisDepthLabel.textContent = "AI 대국";
  analysisStateLabel.textContent = "표시 꺼짐";
  analysisProgressText.textContent = "평가치 표시가 꺼져 있습니다.";
  analysisLinesEl.innerHTML = '<p class="empty-analysis">AI 대국 중 평가치 표시가 꺼져 있습니다.</p>';
}

function movePiece(fromRow, fromCol, toRow, toCol) {
  const piece = state.board[fromRow][fromCol];
  if (!piece || piece.owner !== state.turn || state.winner) return;

  const legal = legalMovesFrom(state.board, fromRow, fromCol);
  if (!legal.some((move) => move.row === toRow && move.col === toCol)) return;

  saveHistory();

  const movingPlayer = state.turn;
  const captured = state.board[toRow][toCol];
  let movedPiece = piece;
  state.board[fromRow][fromCol] = null;

  if (captured && captured.base !== "king") {
    state.hands[movingPlayer][captured.base] += 1;
  }

  movedPiece = flipPiece(movedPiece);
  state.board[toRow][toCol] = movedPiece;

  state.log.push(notationForMove(piece, captured, fromRow, fromCol, toRow, toCol));
  state.selected = null;

  if (captured && captured.base === "king") {
    setWinner(movingPlayer, "상대 왕 포획");
  } else if (movedPiece.base === "king" && toRow === enemyFirstRank(movingPlayer)) {
    setWinner(movingPlayer, "왕의 상대 진영 입성");
  } else if (opponentNonKingCount(movingPlayer) === 0) {
    setWinner(movingPlayer, "상대 비왕 기물 전멸");
  } else {
    advanceTurn();
  }

  afterPositionChanged();
  playMoveSound();
}

function dropPiece(base, row, col) {
  if (state.winner || state.hands[state.turn][base] <= 0) return;
  if (row !== firstRank(state.turn) || state.board[row][col]) return;

  saveHistory();

  const player = state.turn;
  state.board[row][col] = makePiece(player, base, "front");
  state.hands[player][base] -= 1;
  state.log.push(notationForDrop(base, row, col));
  state.selected = null;
  advanceTurn();
  afterPositionChanged();
  playMoveSound();
}

function cloneBoard(board) {
  return board.map((row) => row.map((piece) => (piece ? { ...piece } : null)));
}

function cloneHands(hands) {
  return {
    1: { ...hands[1] },
    2: { ...hands[2] },
  };
}

function makePositionFromState(source) {
  return {
    board: cloneBoard(source.board),
    hands: cloneHands(source.hands),
    turn: source.turn,
    winner: source.winner ? { ...source.winner } : null,
  };
}

function countNonKingFor(board, player) {
  let count = 0;
  for (const row of board) {
    for (const piece of row) {
      if (piece && piece.owner === player && piece.base !== "king") {
        count += 1;
      }
    }
  }
  return count;
}

function advanceTurnFor(board, hands, nextPlayer) {
  let turn = nextPlayer;
  let passCount = 0;
  while (!hasAnyLegalActionFor(board, hands, turn) && passCount < 2) {
    turn = opponent(turn);
    passCount += 1;
  }
  return turn;
}

function legalActionCountFor(board, hands, player) {
  let count = 0;
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      const piece = board[row][col];
      if (piece && piece.owner === player) {
        count += legalMovesFrom(board, row, col).length;
      }
    }
  }
  for (const base of BASES) {
    count += legalDropsFor(board, hands, base, player).length;
  }
  return count;
}

function kingMobilityFor(board, player) {
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      const piece = board[row][col];
      if (piece && piece.owner === player && piece.base === "king") {
        const f = forward(player);
        let forwardMoves = 0;
        let sideMoves = 0;
        for (const move of legalMovesFrom(board, row, col)) {
          if (move.row - row === f) {
            forwardMoves += 1;
          } else {
            sideMoves += 1;
          }
        }
        return { forwardMoves, sideMoves };
      }
    }
  }
  return { forwardMoves: 0, sideMoves: 0 };
}

function findKing(board, player) {
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      const piece = board[row][col];
      if (piece && piece.owner === player && piece.base === "king") {
        return { row, col };
      }
    }
  }
  return null;
}

function centerWeight(row, col) {
  const distance = Math.max(Math.abs(row - 2), Math.abs(col - 2));
  if (distance === 0) return 2;
  if (distance === 1) return 1;
  return 0;
}

function makeControlMap(board, player) {
  const map = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  const movesByPiece = [];
  let king = null;
  let kingMoves = [];
  let material = 0;
  let nonKingCount = 0;
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      const piece = board[row][col];
      if (!piece || piece.owner !== player) continue;
      const moves = legalMovesFrom(board, row, col);
      movesByPiece.push({ row, col, piece, moves });
      material += pieceValue(piece);
      if (piece.base === "king") {
        king = { row, col };
        kingMoves = moves;
      } else {
        nonKingCount += 1;
      }
      for (const move of moves) {
        map[move.row][move.col] += 1;
      }
    }
  }
  return { map, movesByPiece, king, kingMoves, material, nonKingCount };
}

function squareControlCount(control, row, col) {
  if (!inBoard(row, col)) return 0;
  return control.map[row][col];
}

function isSquareControlled(board, player, row, col) {
  for (let sourceRow = 0; sourceRow < SIZE; sourceRow += 1) {
    for (let sourceCol = 0; sourceCol < SIZE; sourceCol += 1) {
      const piece = board[sourceRow][sourceCol];
      if (!piece || piece.owner !== player) continue;
      if (legalMovesFrom(board, sourceRow, sourceCol).some((move) => move.row === row && move.col === col)) {
        return true;
      }
    }
  }
  return false;
}

function isKingThreatened(board, kingPlayer, attackingPlayer) {
  const king = findKing(board, kingPlayer);
  if (!king) return true;
  return isSquareControlled(board, attackingPlayer, king.row, king.col);
}

function remainingNonKingSquare(board, player) {
  let found = null;
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      const piece = board[row][col];
      if (piece && piece.owner === player && piece.base !== "king") {
        if (found) return null;
        found = { row, col };
      }
    }
  }
  return found;
}

function controlsOnRow(board, player, targetRow) {
  let count = 0;
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      const piece = board[row][col];
      if (!piece || piece.owner !== player) continue;
      count += legalMovesFrom(board, row, col).filter((move) => move.row === targetRow).length;
    }
  }
  return count;
}

function makeOrderingContext() {
  return {
    nonKingCounts: {},
    remainingNonKings: {},
  };
}

function getOrderingNonKingCount(context, position, player) {
  if (context.nonKingCounts[player] === undefined) {
    context.nonKingCounts[player] = countNonKingFor(position.board, player);
  }
  return context.nonKingCounts[player];
}

function getOrderingRemainingNonKing(context, position, player) {
  if (context.remainingNonKings[player] === undefined) {
    context.remainingNonKings[player] = remainingNonKingSquare(position.board, player);
  }
  return context.remainingNonKings[player];
}

function isThirdRankBreakthrough(position, action, context) {
  if (action.type !== "move") return false;
  const piece = position.board[action.fromRow][action.fromCol];
  if (!piece || piece.base === "king") return false;
  const progressBefore = kingProgress(piece, action.fromRow);
  const progressAfter = kingProgress(piece, action.toRow);
  if (progressAfter !== 2 || progressAfter <= progressBefore) return false;
  const defenseRow = piece.owner === 1 ? 1 : 3;
  const enemy = opponent(piece.owner);
  const enemyDefense = controlsOnRow(position.board, enemy, defenseRow);
  const ownPressure = controlsOnRow(position.board, piece.owner, defenseRow);
  return enemyDefense <= Math.max(1, ownPressure) && enemyDefense <= 3;
}

function actionPostInfo(position, action, attackingPlayer, target) {
  const enemy = opponent(attackingPlayer);
  const undo = makeOrderingActionInPlace(position, action);
  try {
    const enemyKing = findKing(position.board, enemy);
    const givesKingThreat =
      !enemyKing || isSquareControlled(position.board, attackingPlayer, enemyKing.row, enemyKing.col);
    let attacksLastNonKing = false;
    if (target) {
      const currentTarget = position.board[target.row][target.col];
      attacksLastNonKing =
        !currentTarget ||
        currentTarget.owner !== enemy ||
        currentTarget.base === "king" ||
        isSquareControlled(position.board, attackingPlayer, target.row, target.col);
    }
    return { givesKingThreat, attacksLastNonKing };
  } finally {
    undoOrderingActionInPlace(position, undo);
  }
}

function actionAttacksLastNonKing(position, action, context) {
  const enemy = opponent(position.turn);
  const target = context
    ? getOrderingRemainingNonKing(context, position, enemy)
    : remainingNonKingSquare(position.board, enemy);
  if (!target) return false;
  return actionPostInfo(position, action, position.turn, target).attacksLastNonKing;
}

function isImmediateWinException(position, action, context) {
  if (action.type !== "move") return false;
  if (action.capturesKing) return true;

  const player = position.turn;
  const moving = position.board[action.fromRow][action.fromCol];
  if (moving && moving.base === "king" && action.toRow === enemyFirstRank(player)) {
    return true;
  }

  const captured = position.board[action.toRow][action.toCol];
  const enemy = opponent(player);
  return (
    captured &&
    captured.owner === enemy &&
    captured.base !== "king" &&
    getOrderingNonKingCount(context, position, enemy) === 1
  );
}

function actionLeavesCriticalPieceAttacked(position, action) {
  const player = position.turn;
  const enemy = opponent(player);
  const undo = makeOrderingActionInPlace(position, action);
  try {
    const king = findKing(position.board, player);
    if (!king || isSquareControlled(position.board, enemy, king.row, king.col)) {
      return true;
    }

    const lastNonKing = remainingNonKingSquare(position.board, player);
    if (lastNonKing && isSquareControlled(position.board, enemy, lastNonKing.row, lastNonKing.col)) {
      return true;
    }
    return false;
  } finally {
    undoOrderingActionInPlace(position, undo);
  }
}

function pruneThreatUnsafeActions(position, actions, context) {
  if (actions.length <= 1) return actions;
  const filtered = actions.filter((action) => {
    if (isImmediateWinException(position, action, context)) return true;
    return !actionLeavesCriticalPieceAttacked(position, action);
  });
  return filtered.length > 0 ? filtered : actions;
}

function generateActions(position, perspective = position.turn, preferredActions = []) {
  const { board, hands, turn } = position;
  const actions = [];
  const context = makeOrderingContext();

  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      const piece = board[row][col];
      if (!piece || piece.owner !== turn) continue;
      for (const move of legalMovesFrom(board, row, col)) {
        const captured = board[move.row][move.col];
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
    for (const drop of legalDropsFor(board, hands, base, turn)) {
      actions.push({
        type: "drop",
        base,
        row: drop.row,
        col: drop.col,
      });
    }
  }

  if (actions.length === 0) {
    actions.push({ type: "pass" });
  }

  return orderActions(position, pruneThreatUnsafeActions(position, actions, context), perspective, preferredActions, context);
}

function actionOrderingScore(position, action, context) {
  if (action.type === "pass") return -1000;
  const ordering = EVAL_CONFIG.moveOrdering;
  if (action.capturesKing) return ordering.capturesKing;
  let score = 0;
  if (action.type === "move") {
    const piece = position.board[action.fromRow][action.fromCol];
    const captured = position.board[action.toRow][action.toCol];
    if (!piece) return score;
    const enemy = opponent(piece.owner);
    if (piece.base === "king" && action.toRow === enemyFirstRank(piece.owner)) {
      score += ordering.kingEntry;
    }
    if (captured && captured.base !== "king" && getOrderingNonKingCount(context, position, enemy) === 1) {
      score += ordering.lastPieceCapture;
    }

    if (!captured || captured.base !== "king") {
      const target = getOrderingRemainingNonKing(context, position, enemy);
      const postInfo = actionPostInfo(position, action, piece.owner, target);
      if (postInfo.givesKingThreat) {
        score += ordering.kingThreat;
      }
      if (isThirdRankBreakthrough(position, action, context)) {
        score += ordering.thirdRankBreakthrough;
      }
      if (postInfo.attacksLastNonKing) {
        score += ordering.lastPieceAttack;
      }
    }

    if (captured && captured.base !== "king") {
      score += ordering.captureBase + ordering.captureValue * pieceValue(captured) - pieceValue(piece);
    }
    if (centerWeight(action.toRow, action.toCol) > 0) {
      score += ordering.center * centerWeight(action.toRow, action.toCol);
    }
    if (kingProgress(piece, action.toRow) > kingProgress(piece, action.fromRow)) {
      score += ordering.forwardProgress * (kingProgress(piece, action.toRow) - kingProgress(piece, action.fromRow));
    }
  }
  if (action.type === "drop") {
    const target = getOrderingRemainingNonKing(context, position, opponent(position.turn));
    const postInfo = actionPostInfo(position, action, position.turn, target);
    if (postInfo.givesKingThreat) {
      score += ordering.kingThreat;
    }
    if (postInfo.attacksLastNonKing) {
      score += ordering.lastPieceAttack;
    }
    score += ordering.dropValue * EVAL_CONFIG.pieceValues[action.base].front * EVAL_CONFIG.handMultiplier;
    score += ordering.center * centerWeight(action.row, action.col);
  }
  return score;
}

function orderActions(position, actions, perspective = position.turn, preferredActions = [], context = makeOrderingContext()) {
  const priority = new Map();
  preferredActions.forEach((action, index) => {
    const key = actionKey(action);
    if (key && !priority.has(key)) {
      priority.set(key, 2_000_000 - index * 10_000);
    }
  });
  const ttBest = getCachedBestAction(position, perspective);
  if (ttBest) {
    const key = actionKey(ttBest);
    if (key && !priority.has(key)) {
      priority.set(key, 1_500_000);
    }
  }
  return actions
    .map((action) => ({
      action,
      score: actionOrderingScore(position, action, context) + (priority.get(actionKey(action)) || 0),
    }))
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.action);
}

function makeOrderingActionInPlace(position, action) {
  const board = position.board;
  const player = position.turn;
  const undo = {
    action,
    moving: null,
    captured: null,
  };

  if (action.type === "drop") {
    board[action.row][action.col] = makePiece(player, action.base, "front");
    return undo;
  }

  if (action.type === "move") {
    const moving = board[action.fromRow][action.fromCol];
    undo.moving = moving;
    undo.captured = board[action.toRow][action.toCol];
    board[action.fromRow][action.fromCol] = null;
    board[action.toRow][action.toCol] = flipPiece({ ...moving });
  }

  return undo;
}

function undoOrderingActionInPlace(position, undo) {
  const { action } = undo;
  const board = position.board;
  if (action.type === "drop") {
    board[action.row][action.col] = null;
  } else if (action.type === "move") {
    board[action.fromRow][action.fromCol] = undo.moving;
    board[action.toRow][action.toCol] = undo.captured;
  }
}

function makeActionInPlace(position, action) {
  const board = position.board;
  const hands = position.hands;
  const player = position.turn;
  const undo = {
    action,
    player,
    previousTurn: position.turn,
    previousWinner: position.winner,
    moving: null,
    moved: null,
    captured: null,
  };

  position.winner = null;

  if (action.type === "pass") {
    position.turn = opponent(player);
    return undo;
  }

  if (action.type === "drop") {
    hands[player][action.base] -= 1;
    undo.moved = makePiece(player, action.base, "front");
    board[action.row][action.col] = undo.moved;
    position.turn = advanceTurnFor(board, hands, opponent(player));
    return undo;
  }

  const moving = board[action.fromRow][action.fromCol];
  const captured = board[action.toRow][action.toCol];
  undo.moving = moving;
  undo.captured = captured;

  board[action.fromRow][action.fromCol] = null;
  if (captured && captured.base !== "king") {
    hands[player][captured.base] += 1;
  }

  const moved = flipPiece({ ...moving });
  undo.moved = moved;
  board[action.toRow][action.toCol] = moved;

  if (captured && captured.base === "king") {
    position.winner = { player, reason: "상대 왕 포획" };
  } else if (moved.base === "king" && action.toRow === enemyFirstRank(player)) {
    position.winner = { player, reason: "왕의 상대 진영 입성" };
  } else if (countNonKingFor(board, opponent(player)) === 0) {
    position.winner = { player, reason: "상대 비왕 기물 전멸" };
  } else {
    position.turn = advanceTurnFor(board, hands, opponent(player));
  }

  return undo;
}

function undoActionInPlace(position, undo) {
  const { action, player } = undo;
  const board = position.board;
  const hands = position.hands;

  if (action.type === "drop") {
    board[action.row][action.col] = null;
    hands[player][action.base] += 1;
  } else if (action.type === "move") {
    board[action.fromRow][action.fromCol] = undo.moving;
    board[action.toRow][action.toCol] = undo.captured;
    if (undo.captured && undo.captured.base !== "king") {
      hands[player][undo.captured.base] -= 1;
    }
  }

  position.turn = undo.previousTurn;
  position.winner = undo.previousWinner;
}

function applyActionToPosition(position, action) {
  const board = cloneBoard(position.board);
  const hands = cloneHands(position.hands);
  const next = {
    board,
    hands,
    turn: position.turn,
    winner: position.winner ? { ...position.winner } : null,
  };
  makeActionInPlace(next, action);
  return next;
}

function encodeAction(action) {
  if (action.type === "pass") return 0;
  if (action.type === "drop") {
    const baseIndex = BASES.indexOf(action.base);
    return DROP_ACTION_OFFSET + baseIndex * BOARD_SQUARES + action.row * SIZE + action.col;
  }
  const from = action.fromRow * SIZE + action.fromCol;
  const to = action.toRow * SIZE + action.toCol;
  return MOVE_ACTION_OFFSET + from * BOARD_SQUARES + to;
}

function decodeAction(code) {
  if (code === 0) return { type: "pass" };
  if (code >= DROP_ACTION_OFFSET) {
    const raw = code - DROP_ACTION_OFFSET;
    const baseIndex = Math.floor(raw / BOARD_SQUARES);
    const square = raw % BOARD_SQUARES;
    return {
      type: "drop",
      base: BASES[baseIndex],
      row: Math.floor(square / SIZE),
      col: square % SIZE,
    };
  }
  const raw = code - MOVE_ACTION_OFFSET;
  const from = Math.floor(raw / BOARD_SQUARES);
  const to = raw % BOARD_SQUARES;
  return {
    type: "move",
    fromRow: Math.floor(from / SIZE),
    fromCol: from % SIZE,
    toRow: Math.floor(to / SIZE),
    toCol: to % SIZE,
  };
}

function mirrorCol(col) {
  return SIZE - 1 - col;
}

function mirrorAction(action) {
  if (action.type === "pass") return { type: "pass" };
  if (action.type === "drop") {
    return {
      ...action,
      col: mirrorCol(action.col),
    };
  }
  return {
    ...action,
    fromCol: mirrorCol(action.fromCol),
    toCol: mirrorCol(action.toCol),
  };
}

function mirrorPv(pv) {
  return pv.map((action) => mirrorAction(action));
}

function actionKey(action) {
  if (!action) return "";
  if (action.type === "pass") return "p";
  if (action.type === "drop") return `d:${action.base}:${action.row}:${action.col}`;
  return `m:${action.fromRow}:${action.fromCol}:${action.toRow}:${action.toCol}`;
}

function sameAction(left, right) {
  return actionKey(left) === actionKey(right);
}

function pieceStateCode(piece) {
  if (!piece) return 0;
  const baseCode = { king: 1, pawn: 2, tokin: 3, gold: 4, silver: 5 }[piece.base];
  const faceCode = piece.face === "back" ? 1 : 0;
  return piece.owner * 16 + baseCode * 2 + faceCode;
}

function positionSignatureCodes(position, perspective, mirrored) {
  const codes = [position.turn, perspective];
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      const sourceCol = mirrored ? mirrorCol(col) : col;
      codes.push(pieceStateCode(position.board[row][sourceCol]));
    }
  }
  for (const player of [1, 2]) {
    for (const base of BASES) {
      codes.push(position.hands[player][base]);
    }
  }
  return codes;
}

function compareCodeArrays(left, right) {
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    if (left[index] !== right[index]) {
      return left[index] - right[index];
    }
  }
  return left.length - right.length;
}

function hashCodesToSafeInt(codes) {
  let low = 2166136261;
  let high = 2166136261 ^ 0x9e3779b9;
  for (const code of codes) {
    for (let shift = 0; shift < 32; shift += 8) {
      const byte = (code >>> shift) & 0xff;
      low ^= byte;
      low = Math.imul(low, 16777619);
      high ^= byte + 0x9e3779b9;
      high = Math.imul(high, 16777619);
    }
  }
  return ((high >>> 0) & 0x1fffff) * 0x100000000 + (low >>> 0);
}

function canonicalCacheKey(position, perspective) {
  const direct = positionSignatureCodes(position, perspective, false);
  const mirrored = positionSignatureCodes(position, perspective, true);
  const useMirror = compareCodeArrays(mirrored, direct) < 0;
  const signature = useMirror ? mirrored : direct;
  return {
    key: hashCodesToSafeInt(signature),
    mirrored: useMirror,
  };
}

function trimAnalysisCache() {
  while (analysisCache.size > ANALYSIS_CACHE_MAX_ENTRIES) {
    const oldest = analysisCache.keys().next().value;
    analysisCache.delete(oldest);
  }
}

function getAnalysisCacheEntry(key, touch = true) {
  const entry = analysisCache.get(key);
  if (entry && touch) {
    analysisCache.delete(key);
    analysisCache.set(key, entry);
  }
  return entry;
}

function setAnalysisCacheEntry(key, value) {
  if (analysisCache.has(key)) {
    analysisCache.delete(key);
  }
  analysisCache.set(key, value);
}

function updateCacheStatus(message) {
  if (!cacheStatusText) return;
  if (message) {
    cacheStatusText.textContent = message;
    cacheStatusText.title = message;
    return;
  }
  const size = analysisCache.size.toLocaleString("ko-KR");
  const limit = ANALYSIS_CACHE_MAX_ENTRIES.toLocaleString("ko-KR");
  cacheStatusText.textContent = analysisCacheDirty ? `cache ${size}/${limit} · 저장 대기` : `cache ${size}/${limit}`;
  cacheStatusText.title = `전체 캐시 한도는 ${limit}개입니다. 한도를 넘으면 오래 사용되지 않은 항목부터 제거합니다. 브라우저 자동 저장은 최근 ${ANALYSIS_CACHE_LOCAL_STORAGE_ENTRIES.toLocaleString("ko-KR")}개를 보관하고, Cache 저장 파일에는 전체 캐시를 저장합니다.`;
}

function isValidEncodedAction(code) {
  return Number.isInteger(code) && code >= 0 && code <= MAX_ACTION_CODE;
}

function normalizeEncodedPv(value) {
  if (!Array.isArray(value)) return null;
  if (!value.every(isValidEncodedAction)) return null;
  return value;
}

function normalizeCachedLine(value) {
  if (!Array.isArray(value) || value.length < 2) return null;
  const score = Number(value[0]);
  const pv = normalizeEncodedPv(value[1]);
  if (!Number.isFinite(score) || !pv) return null;
  return [score, pv];
}

function normalizeCacheValue(value) {
  if (!Array.isArray(value) || value.length < 5) return null;
  const depth = Number(value[0]);
  const score = Number(value[1]);
  const pv = normalizeEncodedPv(value[2]);
  const flag = Number(value[3]);
  const bestActionCode = Number(value[4]);
  if (
    !Number.isInteger(depth) ||
    depth < 1 ||
    !Number.isFinite(score) ||
    !pv ||
    ![TT_EXACT, TT_LOWER, TT_UPPER].includes(flag) ||
    !(bestActionCode === TT_NO_ACTION || isValidEncodedAction(bestActionCode))
  ) {
    return null;
  }

  const normalized = [depth, score, pv, flag, bestActionCode];
  if (Array.isArray(value[5])) {
    const lines = value[5].map(normalizeCachedLine).filter(Boolean);
    if (lines.length > 0) {
      normalized.push(lines);
    }
  }
  return normalized;
}

function normalizeCacheEntries(payload) {
  if (
    !payload ||
    Array.isArray(payload) ||
    payload.game !== "yangmyeon-janggi" ||
    payload.version !== ANALYSIS_CACHE_FILE_VERSION ||
    payload.evalVersion !== ANALYSIS_EVAL_VERSION
  ) {
    return [];
  }
  const rawEntries = Array.isArray(payload.entries) ? payload.entries : [];
  const entries = [];
  for (const item of rawEntries) {
    if (!Array.isArray(item) || item.length < 2) continue;
    const key = Number(item[0]);
    const value = normalizeCacheValue(item[1]);
    if (!Number.isSafeInteger(key) || key < 0 || !value) continue;
    entries.push([key, value]);
  }
  return entries;
}

function mergeAnalysisCacheEntries(entries, markDirty = true) {
  let imported = 0;
  for (const [key, value] of entries) {
    const existing = getAnalysisCacheEntry(key, false);
    if (!existing || value[0] >= existing[0]) {
      setAnalysisCacheEntry(key, value);
      imported += 1;
    }
  }
  trimAnalysisCache();
  if (markDirty && imported > 0) {
    analysisCacheDirty = true;
  }
  updateCacheStatus();
  return imported;
}

function serializeAnalysisCache(maxEntries = ANALYSIS_CACHE_MAX_ENTRIES) {
  trimAnalysisCache();
  const entries = [...analysisCache.entries()].slice(-maxEntries);
  return {
    game: "yangmyeon-janggi",
    version: ANALYSIS_CACHE_FILE_VERSION,
    evalVersion: ANALYSIS_EVAL_VERSION,
    createdAt: new Date().toISOString(),
    entries,
  };
}

function loadAnalysisCache() {
  try {
    const raw = window.localStorage.getItem(ANALYSIS_CACHE_STORAGE_KEY);
    if (!raw) {
      updateCacheStatus();
      return;
    }
    const entries = normalizeCacheEntries(JSON.parse(raw));
    mergeAnalysisCacheEntries(entries, false);
    analysisCacheDirty = false;
    updateCacheStatus();
  } catch {
    analysisCache = new Map();
    analysisCacheDirty = false;
    updateCacheStatus("cache 읽기 실패");
  }
}

function saveAnalysisCache() {
  if (!analysisCacheDirty) {
    updateCacheStatus();
    return;
  }
  try {
    window.localStorage.setItem(
      ANALYSIS_CACHE_STORAGE_KEY,
      JSON.stringify(serializeAnalysisCache(ANALYSIS_CACHE_LOCAL_STORAGE_ENTRIES)),
    );
    analysisCacheDirty = false;
    updateCacheStatus();
  } catch {
    // Cache is an optimization; ignore quota or privacy-mode failures.
    updateCacheStatus("cache 저장 실패");
  }
}

function decodeStoredBestAction(entry, mirrored) {
  const code = Number(entry[4]);
  if (code === TT_NO_ACTION || !isValidEncodedAction(code)) return null;
  const action = decodeAction(code);
  return mirrored ? mirrorAction(action) : action;
}

function getCachedBestAction(position, perspective) {
  if (position.winner) return null;
  const keyInfo = canonicalCacheKey(position, perspective);
  const entry = getAnalysisCacheEntry(keyInfo.key);
  if (!entry) return null;
  return decodeStoredBestAction(entry, keyInfo.mirrored);
}

function probeCachedAnalysis(position, depth, perspective, alpha, beta, stats) {
  if (position.winner) return null;
  const keyInfo = canonicalCacheKey(position, perspective);
  const entry = getAnalysisCacheEntry(keyInfo.key);
  if (!entry || entry[0] < depth) return null;
  const score = Number(entry[1]);
  const flag = Number(entry[3]);
  const pv = entry[2].slice(0, depth).map((code) => decodeAction(code));
  const orientedPv = keyInfo.mirrored ? mirrorPv(pv) : pv;
  const bestAction = decodeStoredBestAction(entry, keyInfo.mirrored);
  stats.cacheHits += 1;

  if (flag === TT_EXACT) {
    return {
      cutoff: true,
      score,
      pv: orientedPv,
      alpha,
      beta,
      bestAction,
    };
  }

  let nextAlpha = alpha;
  let nextBeta = beta;
  if (flag === TT_LOWER) {
    nextAlpha = Math.max(nextAlpha, score);
  } else if (flag === TT_UPPER) {
    nextBeta = Math.min(nextBeta, score);
  }

  if (nextAlpha >= nextBeta) {
    return {
      cutoff: true,
      score,
      pv: orientedPv,
      alpha: nextAlpha,
      beta: nextBeta,
      bestAction,
    };
  }

  return {
    cutoff: false,
    score,
    pv: orientedPv,
    alpha: nextAlpha,
    beta: nextBeta,
    bestAction,
  };
}

function ttFlagForScore(score, alphaOriginal, betaOriginal) {
  if (score <= alphaOriginal) return TT_UPPER;
  if (score >= betaOriginal) return TT_LOWER;
  return TT_EXACT;
}

function storeCachedAnalysis(position, depth, perspective, score, pv, flag = TT_EXACT) {
  if (position.winner) return false;
  const keyInfo = canonicalCacheKey(position, perspective);
  const existing = getAnalysisCacheEntry(keyInfo.key);
  if (existing && existing[0] > depth) return false;
  const storedPv = keyInfo.mirrored ? mirrorPv(pv) : pv;
  const encodedPv = storedPv.map((action) => encodeAction(action));
  const bestActionCode = encodedPv.length > 0 ? encodedPv[0] : TT_NO_ACTION;
  const value = [depth, score, encodedPv, flag, bestActionCode];
  if (existing && existing[0] === depth && Array.isArray(existing[5])) {
    value.push(existing[5]);
  }
  setAnalysisCacheEntry(keyInfo.key, value);
  analysisCacheDirty = true;
  trimAnalysisCache();
  return true;
}

function getCachedRootAnalysis(position, depth, perspective, stats) {
  if (position.winner) return null;
  const keyInfo = canonicalCacheKey(position, perspective);
  const entry = getAnalysisCacheEntry(keyInfo.key);
  if (!entry || entry[0] < depth || !Array.isArray(entry[5])) return null;
  const results = [];
  for (const line of entry[5]) {
    const score = Number(line[0]);
    const pv = line[1].slice(0, depth).map((code) => decodeAction(code));
    const orientedPv = keyInfo.mirrored ? mirrorPv(pv) : pv;
    if (!Number.isFinite(score) || orientedPv.length === 0) continue;
    results.push({ action: orientedPv[0], score, pv: orientedPv });
  }
  if (results.length === 0) return null;
  stats.cacheHits += 1;
  return results;
}

function storeCachedRootAnalysis(position, depth, perspective, results) {
  if (position.winner || results.length === 0) return false;
  const keyInfo = canonicalCacheKey(position, perspective);
  const existing = getAnalysisCacheEntry(keyInfo.key);
  if (existing && existing[0] > depth) return false;
  const best = results[0];
  const bestPv = keyInfo.mirrored ? mirrorPv(best.pv) : best.pv;
  const encodedBestPv = bestPv.map((action) => encodeAction(action));
  const lines = results.slice(0, ANALYSIS_LINE_LIMIT).map((result) => {
    const pv = keyInfo.mirrored ? mirrorPv(result.pv) : result.pv;
    return [result.score, pv.map((action) => encodeAction(action))];
  });
  setAnalysisCacheEntry(keyInfo.key, [
    depth,
    best.score,
    encodedBestPv,
    TT_EXACT,
    encodedBestPv.length > 0 ? encodedBestPv[0] : TT_NO_ACTION,
    lines,
  ]);
  analysisCacheDirty = true;
  trimAnalysisCache();
  return true;
}

function downloadAnalysisCacheFile() {
  saveAnalysisCache();
  const blob = new Blob([JSON.stringify(serializeAnalysisCache())], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = ANALYSIS_CACHE_FILE_NAME;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  updateCacheStatus(`cache ${analysisCache.size.toLocaleString("ko-KR")} 파일 저장`);
}

async function importAnalysisCacheFile(file) {
  if (!file) return;
  try {
    const payload = JSON.parse(await file.text());
    const entries = normalizeCacheEntries(payload);
    const imported = mergeAnalysisCacheEntries(entries, true);
    saveAnalysisCache();
    updateCacheStatus(`cache ${imported.toLocaleString("ko-KR")}개 불러옴`);
    clearAnalysis("캐시 불러옴");
    runAutoAnalysis();
  } catch {
    updateCacheStatus("cache 파일 오류");
  } finally {
    if (cacheFileInput) cacheFileInput.value = "";
  }
}

function resultFromState(source = state) {
  if (!source.winner) return null;
  return {
    winner: source.winner.player,
    reason: source.winner.reason,
    notation: resultNotationForWinner(source.winner.player),
  };
}

function moveRecordsFromLog(log = state.log) {
  const moves = [];
  let ply = 0;
  for (const entry of log) {
    if (isResultLogEntry(entry)) continue;
    ply += 1;
    moves.push({
      ply,
      moveNumber: Math.ceil(ply / 2),
      player: ply % 2 === 1 ? 1 : 2,
      notation: entry,
    });
  }
  return moves;
}

function serializeKifu() {
  const position = makePositionFromState(state);
  return {
    game: "yangmyeon-janggi",
    type: "game-record",
    version: KIFU_FILE_VERSION,
    createdAt: new Date().toISOString(),
    record: {
      moves: moveRecordsFromLog(),
      result: resultFromState(),
      currentFen: fairyFenFromPosition(position),
      analysisTimeSeconds,
    },
    state: {
      board: state.board,
      hands: state.hands,
      turn: state.turn,
      winner: state.winner,
      status: state.status,
      log: state.log,
      history: state.history,
    },
  };
}

function normalizeKifuState(payload) {
  if (
    !payload ||
    payload.game !== "yangmyeon-janggi" ||
    !["kifu", "game-record"].includes(payload.type) ||
    payload.version !== KIFU_FILE_VERSION ||
    !payload.state
  ) {
    return null;
  }
  const data = payload.state;
  if (!Array.isArray(data.board) || !data.hands || !Array.isArray(data.log) || !Array.isArray(data.history)) {
    return null;
  }
  return {
    board: data.board,
    hands: data.hands,
    turn: data.turn === 2 ? 2 : 1,
    selected: null,
    winner: data.winner || null,
    status: typeof data.status === "string" ? data.status : "기보 불러옴",
    log: data.log,
    history: data.history,
  };
}

function restoreKifuState(nextState) {
  stopAiGame({ update: false, restoreStatus: false });
  clearReviewSession({ render: false });
  if (analysisAbortController) {
    analysisAbortController.abort();
    analysisAbortController = null;
  }
  analysisToken += 1;
  setAnalysisRunning(false);
  gameAnalysisRecords = new Map();
  lastDisplayedScore = null;
  state = nextState;
  render();
  clearAnalysis("기보 불러옴");
  runAutoAnalysis();
}

function saveKifuToStorage() {
  try {
    window.localStorage.setItem(KIFU_STORAGE_KEY, JSON.stringify(serializeKifu()));
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

function downloadKifuJsonFile() {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const blob = new Blob([JSON.stringify(serializeKifu(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `yangmyeon-janggi-record-${stamp}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function saveKifuJson() {
  const stored = saveKifuToStorage();
  let downloaded = true;
  try {
    downloadKifuJsonFile();
  } catch (error) {
    downloaded = false;
    console.error(error);
  }
  return downloaded || stored;
}

function loadKifuFromStorage() {
  try {
    const raw = window.localStorage.getItem(KIFU_STORAGE_KEY);
    if (!raw) {
      statusTextEl.textContent = "저장된 기보가 없습니다.";
      return false;
    }
    const nextState = normalizeKifuState(JSON.parse(raw));
    if (!nextState) {
      throw new Error("invalid kifu file");
    }
    restoreKifuState(nextState);
    return true;
  } catch (error) {
    statusTextEl.textContent = "기보 불러오기 실패";
    console.error(error);
    return false;
  }
}

async function importKifuFile(file) {
  if (!file) return;
  try {
    const payload = JSON.parse(await file.text());
    const nextState = normalizeKifuState(payload);
    if (!nextState) {
      throw new Error("invalid kifu file");
    }
    restoreKifuState(nextState);
    statusTextEl.textContent = "기보 파일 불러옴";
  } catch (error) {
    statusTextEl.textContent = "기보 파일 오류";
    console.error(error);
  } finally {
    if (kifuFileInput) {
      kifuFileInput.value = "";
    }
  }
}

function pieceValue(piece) {
  return EVAL_CONFIG.pieceValues[piece.base][piece.face];
}

function kingProgress(piece, row) {
  if (piece.owner === 1) {
    return SIZE - 1 - row;
  }
  return row;
}

function evaluateMaterial(position, player, controls) {
  let score = controls[player].material;
  for (const base of BASES) {
    score += position.hands[player][base] * EVAL_CONFIG.pieceValues[base].front * EVAL_CONFIG.handMultiplier;
  }
  return score;
}

function evaluateKingSafety(position, player, controls) {
  const king = controls[player].king;
  if (!king) return -WIN_SCORE / 2;

  const config = EVAL_CONFIG.kingSafety;
  const enemy = opponent(player);
  const enemyControl = controls[enemy];
  let score = 0;
  let safeMoves = 0;

  const kingMoves = controls[player].kingMoves;
  for (const move of kingMoves) {
    const isForward = move.row - king.row === forward(player);
    score += isForward ? config.forwardMove : config.otherMove;
    const attacksOnMove = squareControlCount(enemyControl, move.row, move.col);
    if (attacksOnMove === 0) {
      safeMoves += 1;
    } else {
      score -= Math.min(attacksOnMove, 2) * config.attackedEscape;
    }
  }
  score += safeMoves * config.safeMove;

  const kingAttacks = squareControlCount(enemyControl, king.row, king.col);
  if (kingAttacks > 0) {
    score -= config.attackedKing + (kingAttacks - 1) * 70;
  }

  for (const dr of [-1, 0, 1]) {
    for (const dc of [-1, 0, 1]) {
      if (dr === 0 && dc === 0) continue;
      const row = king.row + dr;
      const col = king.col + dc;
      if (!inBoard(row, col)) continue;
      const occupant = position.board[row][col];
      if (occupant && occupant.owner === player) continue;
      score -= Math.min(squareControlCount(enemyControl, row, col), 2) * config.nearbyEnemyControl;
    }
  }

  const progress = kingProgress({ owner: player }, king.row);
  score += progress * config.progress;
  if (progress >= SIZE - 2) {
    score += config.entryPressure;
  }
  return score;
}

function evaluateActivity(position, player, controls) {
  const config = EVAL_CONFIG.activity;
  let score = 0;
  for (const entry of controls[player].movesByPiece) {
    if (entry.piece.base === "king") continue;
    score += entry.moves.length * config.nonKingMove;
    score += kingProgress(entry.piece, entry.row) * config.advancedPiece;
    for (const move of entry.moves) {
      if (move.row - entry.row === forward(player)) {
        score += config.forwardMove;
      }
    }
  }
  for (const base of BASES) {
    score += legalDropsFor(position.board, position.hands, base, player).length * config.dropMove;
  }
  return score;
}

function evaluateCenter(position, player, controls) {
  const config = EVAL_CONFIG.center;
  let score = 0;
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      const weight = centerWeight(row, col);
      if (weight === 0) continue;
      const piece = position.board[row][col];
      if (piece && piece.owner === player) {
        score += weight === 2 ? config.occupyCore : config.occupyNear;
      }
      const controlCount = Math.min(squareControlCount(controls[player], row, col), 2);
      score += controlCount * (weight === 2 ? config.controlCore : config.controlNear);
    }
  }
  return score;
}

function evaluateTactics(position, player, controls, nonKingCounts) {
  const config = EVAL_CONFIG.tactics;
  const enemy = opponent(player);
  const enemyKing = controls[enemy].king;
  let score = 0;
  if (enemyKing) {
    const kingAttacks = squareControlCount(controls[player], enemyKing.row, enemyKing.col);
    if (kingAttacks > 0) {
      score += config.kingThreat + (kingAttacks - 1) * 80;
    }
  }

  let attackedPieces = 0;
  let attackedValue = 0;
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      const piece = position.board[row][col];
      if (!piece || piece.owner !== enemy || piece.base === "king") continue;
      if (squareControlCount(controls[player], row, col) > 0) {
        attackedPieces += 1;
        attackedValue += pieceValue(piece);
      }
    }
  }

  score += attackedValue * config.attackedValue;
  if (attackedPieces >= 2) {
    score += (attackedPieces - 1) * config.fork;
  }
  if (nonKingCounts[enemy] === 1 && attackedPieces >= 1) {
    score += config.lastPieceAttack;
  }
  return score;
}

function evaluateForPlayer(position, player, controls, nonKingCounts) {
  return (
    evaluateMaterial(position, player, controls) +
    evaluateKingSafety(position, player, controls) +
    evaluateActivity(position, player, controls) +
    evaluateCenter(position, player, controls) +
    evaluateTactics(position, player, controls, nonKingCounts)
  );
}

function evaluatePosition(position, perspective) {
  if (position.winner) {
    return position.winner.player === perspective ? WIN_SCORE : -WIN_SCORE;
  }

  const enemy = opponent(perspective);
  const controls = {
    1: makeControlMap(position.board, 1),
    2: makeControlMap(position.board, 2),
  };
  const nonKingCounts = {
    1: controls[1].nonKingCount,
    2: controls[2].nonKingCount,
  };
  return (
    evaluateForPlayer(position, perspective, controls, nonKingCounts) -
    evaluateForPlayer(position, enemy, controls, nonKingCounts)
  );
}

function terminalScore(winner, perspective, ply) {
  const sign = winner.player === perspective ? 1 : -1;
  return sign * (WIN_SCORE - ply * WIN_DEPTH_BONUS);
}

function isTacticalAction(position, action) {
  if (action.type === "pass") return false;
  if (action.capturesKing) return true;
  const enemy = opponent(position.turn);
  if (action.type === "move") {
    const piece = position.board[action.fromRow][action.fromCol];
    const captured = position.board[action.toRow][action.toCol];
    if (!piece) return false;
    if (captured) return true;
    if (piece.base === "king" && action.toRow === enemyFirstRank(piece.owner)) return true;
  }
  const target = remainingNonKingSquare(position.board, enemy);
  const postInfo = actionPostInfo(position, action, position.turn, target);
  return postInfo.givesKingThreat || postInfo.attacksLastNonKing;
}

function generateTacticalActions(position, perspective = position.turn) {
  return generateActions(position, perspective).filter((action) => isTacticalAction(position, action));
}

function quiescence(position, alpha, beta, perspective, ply, stats, qDepth) {
  stats.qNodes = (stats.qNodes || 0) + 1;
  if (position.winner) {
    stats.terminalCuts += 1;
    return terminalScore(position.winner, perspective, ply);
  }

  let best = evaluatePosition(position, perspective);
  if (qDepth <= 0) return best;

  const maximizing = position.turn === perspective;
  if (maximizing) {
    alpha = Math.max(alpha, best);
    if (alpha >= beta) return best;
    for (const action of generateTacticalActions(position, perspective)) {
      const undo = makeActionInPlace(position, action);
      const winner = position.winner;
      const value = winner
        ? terminalScore(winner, perspective, ply + 1)
        : quiescence(position, alpha, beta, perspective, ply + 1, stats, qDepth - 1);
      undoActionInPlace(position, undo);
      best = Math.max(best, value);
      alpha = Math.max(alpha, best);
      if (alpha >= beta) {
        stats.alphaBetaCuts += 1;
        break;
      }
    }
    return best;
  }

  beta = Math.min(beta, best);
  if (alpha >= beta) return best;
  for (const action of generateTacticalActions(position, perspective)) {
    const undo = makeActionInPlace(position, action);
    const winner = position.winner;
    const value = winner
      ? terminalScore(winner, perspective, ply + 1)
      : quiescence(position, alpha, beta, perspective, ply + 1, stats, qDepth - 1);
    undoActionInPlace(position, undo);
    best = Math.min(best, value);
    beta = Math.min(beta, best);
    if (alpha >= beta) {
      stats.alphaBetaCuts += 1;
      break;
    }
  }
  return best;
}

function alphaBeta(position, depth, alpha, beta, perspective, ply, stats) {
  stats.nodes += 1;
  if (position.winner) {
    stats.terminalCuts += 1;
    return terminalScore(position.winner, perspective, ply);
  }
  if (depth <= 0) {
    return quiescence(position, alpha, beta, perspective, ply, stats, EVAL_CONFIG.quiescence.maxDepth);
  }

  const alphaOriginal = alpha;
  const betaOriginal = beta;
  const cached = probeCachedAnalysis(position, depth, perspective, alpha, beta, stats);
  const preferredActions = [];
  if (cached) {
    alpha = cached.alpha;
    beta = cached.beta;
    if (cached.bestAction) preferredActions.push(cached.bestAction);
    if (cached.cutoff) {
      return cached.score;
    }
  }

  const actions = generateActions(position, perspective, preferredActions);
  const maximizing = position.turn === perspective;
  let bestPv = [];

  if (maximizing) {
    let best = -Infinity;
    for (const action of actions) {
      const undo = makeActionInPlace(position, action);
      const winner = position.winner;
      const value = winner
        ? terminalScore(winner, perspective, ply + 1)
        : alphaBeta(position, depth - 1, alpha, beta, perspective, ply + 1, stats);
      if (winner) {
        stats.terminalCuts += 1;
      }
      undoActionInPlace(position, undo);
      if (value > best) {
        best = value;
        bestPv = [action];
      }
      alpha = Math.max(alpha, best);
      if (alpha >= beta) {
        stats.alphaBetaCuts += 1;
        break;
      }
    }
    if (storeCachedAnalysis(position, depth, perspective, best, bestPv, ttFlagForScore(best, alphaOriginal, betaOriginal))) {
      stats.cacheStores += 1;
    }
    return best;
  }

  let best = Infinity;
  for (const action of actions) {
    const undo = makeActionInPlace(position, action);
    const winner = position.winner;
    const value = winner
      ? terminalScore(winner, perspective, ply + 1)
      : alphaBeta(position, depth - 1, alpha, beta, perspective, ply + 1, stats);
    if (winner) {
      stats.terminalCuts += 1;
    }
    undoActionInPlace(position, undo);
    if (value < best) {
      best = value;
      bestPv = [action];
    }
    beta = Math.min(beta, best);
    if (alpha >= beta) {
      stats.alphaBetaCuts += 1;
      break;
    }
  }
  if (storeCachedAnalysis(position, depth, perspective, best, bestPv, ttFlagForScore(best, alphaOriginal, betaOriginal))) {
    stats.cacheStores += 1;
  }
  return best;
}

async function quiescenceAsync(position, alpha, beta, perspective, ply, stats, token, qDepth) {
  if (token !== analysisToken) {
    throw new Error("analysis cancelled");
  }
  stats.qNodes = (stats.qNodes || 0) + 1;
  if ((stats.nodes + stats.qNodes) % 800 === 0) {
    await waitForUi();
  }
  if (position.winner) {
    stats.terminalCuts += 1;
    return { score: terminalScore(position.winner, perspective, ply), pv: [] };
  }

  let best = evaluatePosition(position, perspective);
  let bestPv = [];
  if (qDepth <= 0) return { score: best, pv: bestPv };

  const maximizing = position.turn === perspective;
  if (maximizing) {
    alpha = Math.max(alpha, best);
    if (alpha >= beta) return { score: best, pv: bestPv };
    for (const action of generateTacticalActions(position, perspective)) {
      const undo = makeActionInPlace(position, action);
      const winner = position.winner;
      let result;
      try {
        result = winner
          ? { score: terminalScore(winner, perspective, ply + 1), pv: [] }
          : await quiescenceAsync(position, alpha, beta, perspective, ply + 1, stats, token, qDepth - 1);
      } finally {
        undoActionInPlace(position, undo);
      }
      if (result.score > best) {
        best = result.score;
        bestPv = [action, ...result.pv];
      }
      alpha = Math.max(alpha, best);
      if (alpha >= beta) {
        stats.alphaBetaCuts += 1;
        break;
      }
    }
    return { score: best, pv: bestPv };
  }

  beta = Math.min(beta, best);
  if (alpha >= beta) return { score: best, pv: bestPv };
  for (const action of generateTacticalActions(position, perspective)) {
    const undo = makeActionInPlace(position, action);
    const winner = position.winner;
    let result;
    try {
      result = winner
        ? { score: terminalScore(winner, perspective, ply + 1), pv: [] }
        : await quiescenceAsync(position, alpha, beta, perspective, ply + 1, stats, token, qDepth - 1);
    } finally {
      undoActionInPlace(position, undo);
    }
    if (result.score < best) {
      best = result.score;
      bestPv = [action, ...result.pv];
    }
    beta = Math.min(beta, best);
    if (alpha >= beta) {
      stats.alphaBetaCuts += 1;
      break;
    }
  }
  return { score: best, pv: bestPv };
}

async function alphaBetaAsync(position, depth, alpha, beta, perspective, ply, stats, token, preferredPv = []) {
  if (token !== analysisToken) {
    throw new Error("analysis cancelled");
  }
  stats.nodes += 1;
  if (stats.nodes % 800 === 0) {
    await waitForUi();
  }
  if (position.winner) {
    stats.terminalCuts += 1;
    return { score: terminalScore(position.winner, perspective, ply), pv: [] };
  }
  if (depth <= 0) {
    return quiescenceAsync(position, alpha, beta, perspective, ply, stats, token, EVAL_CONFIG.quiescence.maxDepth);
  }

  const alphaOriginal = alpha;
  const betaOriginal = beta;
  const cached = probeCachedAnalysis(position, depth, perspective, alpha, beta, stats);
  const preferredActions = [...preferredPv];
  if (cached) {
    alpha = cached.alpha;
    beta = cached.beta;
    if (cached.bestAction) preferredActions.unshift(cached.bestAction);
    if (cached.cutoff) {
      return { score: cached.score, pv: cached.pv };
    }
  }

  const actions = generateActions(position, perspective, preferredActions);
  const maximizing = position.turn === perspective;

  if (maximizing) {
    let best = -Infinity;
    let bestPv = [];
    for (const action of actions) {
      const childPreferred = preferredPv.length > 1 && sameAction(preferredPv[0], action) ? preferredPv.slice(1) : [];
      const undo = makeActionInPlace(position, action);
      const winner = position.winner;
      let result;
      try {
        result = winner
          ? { score: terminalScore(winner, perspective, ply + 1), pv: [] }
          : await alphaBetaAsync(position, depth - 1, alpha, beta, perspective, ply + 1, stats, token, childPreferred);
      } finally {
        undoActionInPlace(position, undo);
      }
      if (winner) {
        stats.terminalCuts += 1;
      }
      if (result.score > best) {
        best = result.score;
        bestPv = [action, ...result.pv];
      }
      alpha = Math.max(alpha, best);
      if (alpha >= beta) {
        stats.alphaBetaCuts += 1;
        break;
      }
    }
    if (storeCachedAnalysis(position, depth, perspective, best, bestPv, ttFlagForScore(best, alphaOriginal, betaOriginal))) {
      stats.cacheStores += 1;
    }
    return { score: best, pv: bestPv };
  }

  let best = Infinity;
  let bestPv = [];
  for (const action of actions) {
    const childPreferred = preferredPv.length > 1 && sameAction(preferredPv[0], action) ? preferredPv.slice(1) : [];
    const undo = makeActionInPlace(position, action);
    const winner = position.winner;
    let result;
    try {
      result = winner
        ? { score: terminalScore(winner, perspective, ply + 1), pv: [] }
        : await alphaBetaAsync(position, depth - 1, alpha, beta, perspective, ply + 1, stats, token, childPreferred);
    } finally {
      undoActionInPlace(position, undo);
    }
    if (winner) {
      stats.terminalCuts += 1;
    }
    if (result.score < best) {
      best = result.score;
      bestPv = [action, ...result.pv];
    }
    beta = Math.min(beta, best);
    if (alpha >= beta) {
      stats.alphaBetaCuts += 1;
      break;
    }
  }
  if (storeCachedAnalysis(position, depth, perspective, best, bestPv, ttFlagForScore(best, alphaOriginal, betaOriginal))) {
    stats.cacheStores += 1;
  }
  return { score: best, pv: bestPv };
}

function formatScore(score) {
  if (Math.abs(score) > WIN_SCORE / 2) {
    const ply = Math.max(0, Math.round((WIN_SCORE - Math.abs(score)) / WIN_DEPTH_BONUS));
    const moves = Math.ceil(ply / 2);
    return `${score >= 0 ? "" : "-"}M${moves}`;
  }
  const normalized = Math.abs(score / 100) < 0.005 ? 0 : score / 100;
  return `${normalized >= 0 ? "+" : ""}${normalized.toFixed(2)}`;
}

function scoreToRailHeight(score) {
  if (Math.abs(score) > WIN_SCORE / 2) {
    return score > 0 ? 100 : 0;
  }
  const normalized = Math.tanh(score / 850);
  return Math.max(4, Math.min(96, 50 + normalized * 44));
}

function scoreFavorClass(score) {
  if (score > 0.5) return "white-favored";
  if (score < -0.5) return "black-favored";
  return "balanced";
}

function boardScoreFromResult(position, score) {
  return position.turn === 1 ? score : -score;
}

function topBoardScore(position, results) {
  const ordered = orderedAnalysisResults(results);
  return ordered[0] ? boardScoreFromResult(position, ordered[0].score) : null;
}

function setScoreRail(score) {
  if (score !== null) {
    lastDisplayedScore = score;
  }
  const displayScore = score === null && lastDisplayedScore !== null ? lastDisplayedScore : score;
  scoreFillEl.style.height = `${displayScore === null ? 50 : scoreToRailHeight(displayScore)}%`;
  scoreValueEl.textContent = displayScore === null ? "..." : formatScore(displayScore);
  scoreValueEl.classList.toggle("negative", displayScore !== null && displayScore < 0);
  scoreValueEl.classList.toggle("mate", displayScore !== null && Math.abs(displayScore) > WIN_SCORE / 2);
  scoreValueEl.classList.toggle("pending", displayScore === null);
  scoreFillEl.parentElement.classList.remove("white-favored", "black-favored", "balanced");
  scoreFillEl.parentElement.classList.add(displayScore === null ? "balanced" : scoreFavorClass(displayScore));
}

function actionText(action, position) {
  if (action.type === "pass") return "수 넘김";
  if (action.type === "drop") {
    return notationForDrop(action.base, action.row, action.col);
  }

  const piece = position.board[action.fromRow][action.fromCol];
  if (!piece) return "?";
  const captured = position.board[action.toRow][action.toCol];
  return notationForMove(piece, captured, action.fromRow, action.fromCol, action.toRow, action.toCol);
}

function pvText(pv, position) {
  if (!pv || pv.length === 0) return "";
  let current = makePositionFromState(position);
  const parts = [];
  for (const action of pv) {
    const text = actionText(action, current);
    if (text === "?") break;
    parts.push(text);
    current = applyActionToPosition(current, action);
    if (current.winner) break;
  }
  return parts.join(" ");
}

function isValidOpeningTreePayload(payload) {
  return Boolean(
    payload &&
    payload.game === "yangmyeon-janggi" &&
    payload.kind === "opening-tree" &&
    payload.root &&
    Array.isArray(payload.root.lines),
  );
}

async function fetchOpeningTreePayload(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`${url} HTTP ${response.status}`);
  }
  const payload = await response.json();
  if (!isValidOpeningTreePayload(payload)) {
    throw new Error(`${url} is not an opening tree`);
  }
  return payload;
}

async function openingTreeCandidateUrls() {
  const urls = [];
  try {
    const response = await fetch(OPENING_TREE_MANIFEST_URL, { cache: "no-store" });
    if (response.ok) {
      const manifest = await response.json();
      if (manifest && typeof manifest.latestJson === "string") {
        urls.push(manifest.latestJson);
      }
      if (manifest && Array.isArray(manifest.items)) {
        for (const item of manifest.items) {
          if (item && typeof item.json === "string") {
            urls.push(item.json);
          }
        }
      }
    }
  } catch {
    // The manifest is optional; fall back to known generated filenames.
  }
  return [...new Set([...urls, ...OPENING_TREE_FALLBACK_DATA_URLS])];
}

function ensureOpeningTreeLoaded() {
  if (openingTreeData || openingTreeLoadPromise) return openingTreeLoadPromise;
  if (openingTreeStatusEl) {
    openingTreeStatusEl.textContent = "오프닝 데이터를 불러오는 중";
  }
  openingTreeLoadPromise = (async () => {
    let lastError = null;
    for (const url of await openingTreeCandidateUrls()) {
      try {
        const payload = await fetchOpeningTreePayload(url);
        openingTreeData = payload;
        openingTreeSourceUrl = url;
        openingTreePath = [];
        openingTreeRedoStack = [];
        applyOpeningTreePosition();
        return payload;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error("opening tree data not found");
  })()
    .catch((error) => {
      if (openingTreeTitleEl) openingTreeTitleEl.textContent = "오프닝 데이터 없음";
      if (openingTreeDepthEl) openingTreeDepthEl.textContent = "depth -";
      if (openingTreeStatusEl) {
        openingTreeStatusEl.textContent = "오프닝 tree JSON을 불러오지 못했습니다.";
      }
      if (openingMoveListEl) {
        openingMoveListEl.innerHTML = '<p class="empty-analysis">outputs/opening_tree 폴더의 JSON을 확인하세요.</p>';
      }
      console.error(error);
      return null;
    })
    .finally(() => {
      openingTreeLoadPromise = null;
      renderOpeningTreePanel();
    });
  renderOpeningTreePanel();
  return openingTreeLoadPromise;
}

function openingActionFromKey(key) {
  if (!key || key === "p") return { type: "pass" };
  const parts = String(key).split(":");
  if (parts[0] === "d" && parts.length === 4) {
    return {
      type: "drop",
      base: parts[1],
      row: Number(parts[2]),
      col: Number(parts[3]),
    };
  }
  if (parts[0] === "m" && parts.length === 5) {
    return {
      type: "move",
      fromRow: Number(parts[1]),
      fromCol: Number(parts[2]),
      toRow: Number(parts[3]),
      toCol: Number(parts[4]),
    };
  }
  return null;
}

function openingTreeRoot() {
  return openingTreeData ? openingTreeData.root : null;
}

function openingTreeNodeForPath(path = openingTreePath) {
  let node = openingTreeRoot();
  if (!node) return null;
  for (const index of path) {
    const line = node.lines && node.lines[index];
    if (!line || !line.child) return null;
    node = line.child;
  }
  return node;
}

function openingTreeLinesForPath(path = openingTreePath) {
  const lines = [];
  let node = openingTreeRoot();
  if (!node) return lines;
  for (const index of path) {
    const line = node.lines && node.lines[index];
    if (!line) break;
    lines.push(line);
    node = line.child || null;
    if (!node) break;
  }
  return lines;
}

function openingTreeLastLine(path = openingTreePath) {
  const lines = openingTreeLinesForPath(path);
  return lines.length ? lines[lines.length - 1] : null;
}

function snapshotFromStateData(source) {
  return JSON.stringify({
    board: source.board,
    hands: source.hands,
    turn: source.turn,
    selected: null,
    winner: source.winner,
    status: source.status,
    log: source.log,
  });
}

function makeOpeningStateForPath(path = openingTreePath) {
  const nextState = makeInitialStateData();
  nextState.status = "오프닝 트리 · 시작 포지션";
  let node = openingTreeRoot();
  const pathMoves = [];

  if (!node) return nextState;

  for (const index of path) {
    const line = node.lines && node.lines[index];
    const action = line ? openingActionFromKey(line.actionKey) : null;
    if (!line || !action) break;

    const before = makePositionFromState(nextState);
    const notation = actionText(action, before);
    nextState.history.push(snapshotFromStateData(nextState));
    const after = applyActionToPosition(before, action);
    nextState.board = after.board;
    nextState.hands = after.hands;
    nextState.turn = after.turn;
    nextState.winner = after.winner;
    nextState.log.push(notation === "?" ? line.move : notation);
    pathMoves.push(line.move);

    if (after.winner) {
      nextState.turn = after.winner.player;
      nextState.status = `${resultNotationForWinner(after.winner.player)} · ${winnerSideName(after.winner.player)} 승리: ${after.winner.reason}`;
      nextState.log.push(resultNotationForWinner(after.winner.player));
      break;
    }

    nextState.status = `오프닝 트리 · ${pathMoves.join(" ")}`;
    node = line.child || null;
    if (!node) break;
  }

  return nextState;
}

function applyOpeningTreePosition() {
  if (!openingTreeData) return;
  stopAiGame({ update: false, restoreStatus: false });
  if (analysisAbortController) {
    analysisAbortController.abort();
    analysisAbortController = null;
  }
  analysisToken += 1;
  setAnalysisRunning(false);
  state = makeOpeningStateForPath();
  render();
  clearAnalysis("오프닝 트리");
  const lastLine = openingTreeLastLine();
  const currentNode = openingTreeNodeForPath();
  const previewIndex = openingTreeRedoStack.length > 0 ? openingTreeRedoStack[0] : 0;
  const previewLine = currentNode && currentNode.lines ? currentNode.lines[previewIndex] || currentNode.lines[0] : null;
  const displayLine = lastLine || previewLine;
  if (!displayLine) {
    lastDisplayedScore = null;
  }
  setScoreRail(displayLine ? displayLine.boardScore : null);
}

function compactOpeningTreeSource() {
  if (!openingTreeData) return "";
  const options = openingTreeData.options || {};
  const stats = openingTreeData.stats || {};
  const depth = options.depth || openingTreeData.root?.depth || 0;
  const plies = options.plies || 0;
  const positions = stats.positions || 0;
  const source = openingTreeSourceUrl ? openingTreeSourceUrl.split("/").pop() : "";
  return `${source || "opening tree"} · d${depth} · ${plies} ply · ${positions} positions`;
}

function renderOpeningPath(lines) {
  if (!openingTreePathEl) return;
  openingTreePathEl.innerHTML = "";
  const rootButton = document.createElement("button");
  rootButton.type = "button";
  rootButton.className = `opening-path-chip${lines.length === 0 ? " active" : ""}`;
  rootButton.textContent = "Start";
  rootButton.addEventListener("click", () => {
    openingTreePath = [];
    openingTreeRedoStack = [];
    applyOpeningTreePosition();
    renderOpeningTreePanel();
  });
  openingTreePathEl.appendChild(rootButton);

  lines.forEach((line, index) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = `opening-path-chip${index === lines.length - 1 ? " active" : ""}`;
    chip.textContent = `${index + 1}. ${line.move}`;
    chip.addEventListener("click", () => {
      openingTreePath = openingTreePath.slice(0, index + 1);
      openingTreeRedoStack = [];
      applyOpeningTreePosition();
      renderOpeningTreePanel();
    });
    openingTreePathEl.appendChild(chip);
  });
}

function renderOpeningTreePanel() {
  if (!openingTreeTitleEl || !openingMoveListEl) return;
  if (!openingTreeData) {
    openingTreeTitleEl.textContent = openingTreeLoadPromise ? "오프닝 로딩 중" : "오프닝 데이터 없음";
    if (openingTreeDepthEl) openingTreeDepthEl.textContent = "depth -";
    if (!openingTreeLoadPromise) {
      openingMoveListEl.innerHTML = '<p class="empty-analysis">오프닝 tree JSON을 찾지 못했습니다.</p>';
    }
    if (openingStartButton) openingStartButton.disabled = true;
    if (openingBackButton) openingBackButton.disabled = true;
    if (openingForwardButton) openingForwardButton.disabled = true;
    return;
  }

  const currentNode = openingTreeNodeForPath();
  const pathLines = openingTreeLinesForPath();
  const lastLine = openingTreeLastLine();
  const options = openingTreeData.options || {};
  const depth = currentNode ? currentNode.depth : (lastLine ? lastLine.depth : options.depth);
  const side = currentNode && currentNode.turn === 2 ? "흑" : "백";
  openingTreeTitleEl.textContent = currentNode ? `${side} 차례 후보` : "오프닝 leaf";
  if (openingTreeDepthEl) openingTreeDepthEl.textContent = `depth ${depth || "-"}`;
  if (openingTreeStatusEl) openingTreeStatusEl.textContent = compactOpeningTreeSource();
  renderOpeningPath(pathLines);

  const canStepBack = openingTreePath.length > 0;
  const canStepForward = Boolean(
    currentNode &&
    Array.isArray(currentNode.lines) &&
    currentNode.lines.length > 0 &&
    (openingTreeRedoStack.length === 0 || currentNode.lines[openingTreeRedoStack[0]]),
  );
  if (openingStartButton) openingStartButton.disabled = !canStepBack;
  if (openingBackButton) openingBackButton.disabled = !canStepBack;
  if (openingForwardButton) openingForwardButton.disabled = !canStepForward;

  openingMoveListEl.innerHTML = "";
  if (!currentNode || !Array.isArray(currentNode.lines) || currentNode.lines.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-analysis";
    empty.textContent = lastLine && lastLine.pv ? lastLine.pv : "더 깊은 tree 후보가 없습니다.";
    openingMoveListEl.appendChild(empty);
    return;
  }

  currentNode.lines.forEach((line, index) => {
    const row = document.createElement("button");
    const score = Number(line.boardScore || 0);
    const active = openingTreeRedoStack.length > 0 && openingTreeRedoStack[0] === index;
    row.type = "button";
    row.className = `opening-move-row ${scoreFavorClass(score)}${active ? " active" : ""}`;
    row.addEventListener("click", () => {
      openingTreePath = [...openingTreePath, index];
      openingTreeRedoStack = [];
      applyOpeningTreePosition();
      renderOpeningTreePanel();
    });

    const scoreEl = document.createElement("span");
    scoreEl.className = "opening-score";
    scoreEl.textContent = line.boardScoreText || formatScore(score);

    const body = document.createElement("span");
    body.className = "opening-move-body";
    const move = document.createElement("strong");
    move.textContent = line.move;
    const pv = document.createElement("small");
    pv.textContent = line.pv || "";
    body.append(move, pv);

    const meta = document.createElement("span");
    meta.className = "opening-meta";
    meta.textContent = `d${line.depth || depth || "-"}`;

    row.append(scoreEl, body, meta);
    openingMoveListEl.appendChild(row);
  });
}

function openingTreeStepBack() {
  if (!openingTreeData || openingTreePath.length === 0) return false;
  const previous = openingTreePath.pop();
  openingTreeRedoStack.unshift(previous);
  applyOpeningTreePosition();
  renderOpeningTreePanel();
  return true;
}

function openingTreeStepForward() {
  const currentNode = openingTreeNodeForPath();
  if (!currentNode || !Array.isArray(currentNode.lines) || currentNode.lines.length === 0) return false;
  const index = openingTreeRedoStack.length > 0 ? openingTreeRedoStack.shift() : 0;
  if (!currentNode.lines[index]) return false;
  openingTreePath.push(index);
  applyOpeningTreePosition();
  renderOpeningTreePanel();
  return true;
}

function openingTreeGoStart() {
  if (!openingTreeData || openingTreePath.length === 0) return false;
  openingTreePath = [];
  openingTreeRedoStack = [];
  applyOpeningTreePosition();
  renderOpeningTreePanel();
  return true;
}

function cloneActionData(action) {
  return action ? { ...action } : action;
}

function cloneAnalysisResults(results) {
  return orderedAnalysisResults(results).map((result) => ({
    action: cloneActionData(result.action),
    score: result.score,
    pv: (result.pv || []).map(cloneActionData),
    order: result.order || 0,
  }));
}

function cloneAnalysisStats(stats) {
  return {
    nodes: stats && stats.nodes ? stats.nodes : 0,
    terminalCuts: stats && stats.terminalCuts ? stats.terminalCuts : 0,
    alphaBetaCuts: stats && stats.alphaBetaCuts ? stats.alphaBetaCuts : 0,
    cacheHits: stats && stats.cacheHits ? stats.cacheHits : 0,
    cacheStores: stats && stats.cacheStores ? stats.cacheStores : 0,
    qNodes: stats && stats.qNodes ? stats.qNodes : 0,
    nps: stats && stats.nps ? stats.nps : 0,
    engine: stats && stats.engine ? stats.engine : "",
  };
}

function rememberGameAnalysis(position, results, depth, stats, options = {}) {
  if (!results || results.length === 0 || position.winner) return;
  const key = gameAnalysisKey(position);
  const existing = gameAnalysisRecords.get(key);
  if (existing && existing.depth > depth) return;
  const boardScore = topBoardScore(position, results);
  gameAnalysisRecords.set(key, {
    depth,
    label: options.label || `depth ${depth}`,
    source: options.source || "js",
    results: cloneAnalysisResults(results),
    stats: cloneAnalysisStats(stats),
    boardScore,
    savedAt: Date.now(),
  });
  pruneGameAnalysisRecords();
  renderLog();
  updateResumeAnalysisButton();
}

function forgetGameAnalysis(position) {
  gameAnalysisRecords.delete(gameAnalysisKey(position));
  renderLog();
  updateResumeAnalysisButton();
}

function recordedStatsText(record) {
  const stats = record.stats || {};
  const source = record.source === "fairy" ? "fairy" : "JS";
  const nodes = (stats.nodes || 0).toLocaleString("ko-KR");
  const nps = stats.nps ? ` · nps ${stats.nps.toLocaleString("ko-KR")}` : "";
  return `기보 저장 · ${source} · nodes ${nodes}${nps}`;
}

function restoreGameAnalysis(position, message = "기보 저장") {
  const record = gameAnalysisRecords.get(gameAnalysisKey(position));
  if (!record) return false;
  const results = cloneAnalysisResults(record.results);
  if (results.length === 0) return false;

  if (analysisAbortController) {
    analysisAbortController.abort();
    analysisAbortController = null;
  }
  analysisToken += 1;
  setAnalysisRunning(false);
  renderAnalysisResults(results, position, record.depth, record.stats, {
    label: record.label,
    source: record.source,
    remember: false,
    progressText: `저장된 분석 · ${record.label} · ${formatScore(record.boardScore)}`,
    statsText: recordedStatsText(record),
  });
  analysisStateLabel.textContent = message;
  updateResumeAnalysisButton();
  return true;
}

function fairyPieceChar(piece) {
  const frontChars = {
    king: "K",
    pawn: "P",
    tokin: "T",
    gold: "G",
    silver: "S",
  };
  const char = piece.owner === 1 ? frontChars[piece.base] : frontChars[piece.base].toLowerCase();
  return `${piece.face === "back" ? "+" : ""}${char}`;
}

function fairyBoardFen(board) {
  return board.map((row) => {
    let text = "";
    let empty = 0;
    for (const piece of row) {
      if (!piece) {
        empty += 1;
        continue;
      }
      if (empty > 0) {
        text += String(empty);
        empty = 0;
      }
      text += fairyPieceChar(piece);
    }
    if (empty > 0) text += String(empty);
    return text || String(SIZE);
  }).join("/");
}

function fairyHandFen(hands) {
  const frontChars = {
    pawn: "P",
    tokin: "T",
    gold: "G",
    silver: "S",
  };
  let text = "";
  for (const player of [1, 2]) {
    for (const base of BASES) {
      const char = player === 1 ? frontChars[base] : frontChars[base].toLowerCase();
      text += char.repeat(hands[player][base] || 0);
    }
  }
  return `[${text}]`;
}

function fairyFenFromPosition(position) {
  const turn = position.turn === 1 ? "w" : "b";
  return `${fairyBoardFen(position.board)}${fairyHandFen(position.hands)} ${turn} - - 0 1`;
}

function fairySquareFromCoord(text) {
  const file = text[0].toUpperCase();
  const rank = Number(text[1]);
  return {
    row: SIZE - rank,
    col: FILES.indexOf(file),
  };
}

function fairyBaseFromChar(char) {
  const baseByChar = {
    P: "pawn",
    T: "tokin",
    G: "gold",
    S: "silver",
  };
  return baseByChar[char.toUpperCase()] || null;
}

function fairyActionFromMove(move) {
  if (!move || move === "(none)") return null;
  const clean = move.trim();
  const dropIndex = clean.indexOf("@");
  if (dropIndex > 0) {
    const pieceChar = clean[0] === "+" ? clean[1] : clean[0];
    const base = fairyBaseFromChar(pieceChar);
    const target = fairySquareFromCoord(clean.slice(dropIndex + 1, dropIndex + 3));
    if (!base || target.col < 0 || Number.isNaN(target.row)) return null;
    return { type: "drop", base, row: target.row, col: target.col };
  }

  const from = fairySquareFromCoord(clean.slice(0, 2));
  const to = fairySquareFromCoord(clean.slice(2, 4));
  if (from.col < 0 || to.col < 0 || Number.isNaN(from.row) || Number.isNaN(to.row)) return null;
  return {
    type: "move",
    fromRow: from.row,
    fromCol: from.col,
    toRow: to.row,
    toCol: to.col,
  };
}

function pvTerminalScore(position, pv) {
  let current = makePositionFromState(position);
  const perspective = position.turn;
  for (let index = 0; index < pv.length; index += 1) {
    const action = pv[index];
    const legal = generateActions(current, current.turn).some((candidate) => sameAction(candidate, action));
    if (!legal) break;
    current = applyActionToPosition(current, action);
    if (current.winner) {
      return terminalScore(current.winner, perspective, index + 1);
    }
  }
  return null;
}

function scoreFromUciMate(line) {
  const sign = line.score >= 0 ? 1 : -1;
  const mateMoves = Math.max(1, Math.min(100, Math.abs(Number(line.score) || 1)));
  const ply = sign > 0 ? mateMoves * 2 - 1 : mateMoves * 2;
  return sign * (WIN_SCORE - ply * WIN_DEPTH_BONUS);
}

function scoreFromFairyLine(line, position, pv) {
  const terminal = pvTerminalScore(position, pv);
  if (terminal !== null) return terminal;
  if (line.scoreType === "mate") {
    return scoreFromUciMate(line);
  }
  return line.score || 0;
}

function orderedAnalysisResults(results) {
  return [...(results || [])].sort((left, right) => {
    const scoreDelta = (right.score || 0) - (left.score || 0);
    if (scoreDelta !== 0) return scoreDelta;
    return (left.order || 0) - (right.order || 0);
  });
}

function fairyResultsFromPayload(payload, position) {
  return orderedAnalysisResults((payload.lines || []).map((line, index) => {
    const pv = (line.pv || []).map(fairyActionFromMove).filter(Boolean);
    return {
      action: pv[0] || fairyActionFromMove(payload.bestmove),
      score: scoreFromFairyLine(line, position, pv),
      pv,
      order: Number(line.multipv || index + 1),
    };
  }).filter((result) => result.action));
}

function payloadDepth(payload, fallbackDepth = FAIRY_ANALYSIS_START_DEPTH) {
  const lineDepth = Math.max(0, ...(payload.lines || []).map((line) => line.depth || 0));
  return payload.depth || lineDepth || fallbackDepth;
}

async function tryRunFairyTimedAnalysis(position, token, options = {}) {
  const movetimeMs = Math.max(100, Math.min(120000, Number(options.movetimeMs) || analysisMovetimeMs()));
  const keepExisting = Boolean(options.keepExisting);
  const timeText = formatAnalysisTime(movetimeMs / 1000);

  analysisDepthLabel.textContent = keepExisting
    ? `${analysisDepthLabel.textContent || "fairy"}+`
    : `fairy ${timeText}s`;
  analysisStateLabel.textContent = keepExisting ? "시간 재개" : "시간 분석";
  analysisProgressBar.style.width = keepExisting ? "55%" : "8%";
  analysisProgressText.textContent = `${timeText}초 동안 Fairy-Stockfish 분석 중`;
  analysisStatsText.textContent = CAN_USE_FAIRY_BRIDGE ? "engine bridge" : "engine wasm";
  if (!keepExisting && !analysisLinesEl.querySelector(".analysis-line")) {
    analysisLinesEl.innerHTML = '<p class="empty-analysis">Fairy-Stockfish 시간 분석 중...</p>';
  }

  const fen = fairyFenFromPosition(position);
  const startedAt = Date.now();
  const progressTimer = window.setInterval(() => {
    if (token !== analysisToken) return;
    const elapsed = Date.now() - startedAt;
    const ratio = Math.min(0.96, elapsed / movetimeMs);
    const remaining = Math.max(0, (movetimeMs - elapsed) / 1000);
    analysisProgressBar.style.width = `${Math.max(8, Math.round(ratio * 100))}%`;
    analysisProgressText.textContent = `${timeText}초 분석 중 · ${remaining.toFixed(1)}초 남음`;
  }, 100);

  const controller = new AbortController();
  analysisAbortController = controller;

  try {
    const payload = await requestFairyAnalysisPayload({
      fen,
      movetimeMs,
      multipv: ANALYSIS_LINE_LIMIT,
    }, controller.signal);
    if (token !== analysisToken) return true;

    const results = fairyResultsFromPayload(payload, position);
    if (results.length === 0) {
      throw new Error("Fairy bridge returned no principal variation");
    }
    const resolvedDepth = payloadDepth(payload);
    const existingRecord = keepExisting ? currentGameAnalysisRecord() : null;
    if (existingRecord && existingRecord.depth > resolvedDepth) {
      restoreGameAnalysis(position, "기존 분석 유지");
      analysisProgressText.textContent = `${timeText}초 완료 · 기존 ${existingRecord.label} 유지`;
      return true;
    }
    const stats = {
      nodes: payload.nodes || 0,
      terminalCuts: 0,
      alphaBetaCuts: 0,
      cacheHits: 0,
      cacheStores: 0,
      qNodes: 0,
      nps: payload.nps || 0,
      engine: payload.engine || "stockfish",
    };
    const visibleBoardScore = topBoardScore(position, results);
    renderAnalysisResults(results, position, resolvedDepth, stats, {
      label: `fairy d${resolvedDepth}`,
      source: "fairy",
      progressText: `${timeText}초 완료 · d${resolvedDepth} · ${formatScore(visibleBoardScore)}`,
    });
    analysisDepthLabel.textContent = `fairy d${resolvedDepth}`;
    analysisStateLabel.textContent = "시간 완료";
    analysisProgressBar.style.width = "100%";
    analysisStatsText.textContent = `engine ${payload.engine || "stockfish"} · nodes ${(payload.nodes || 0).toLocaleString("ko-KR")} · nps ${(payload.nps || 0).toLocaleString("ko-KR")}`;
    return true;
  } catch (error) {
    if (error.name === "AbortError" || token !== analysisToken) {
      throw new Error("analysis cancelled");
    }
    if (!keepExisting) {
      console.warn("Fairy engine unavailable, falling back to JS analysis.", error);
      analysisStateLabel.textContent = "JS 분석";
      analysisProgressText.textContent = "엔진 없음 · JS 분석으로 전환";
      return false;
    }
    console.error("Fairy bridge stopped during timed analysis.", error);
    analysisStateLabel.textContent = "Fairy 중단";
    analysisProgressText.textContent = `${timeText}초 분석 중단`;
    return true;
  } finally {
    window.clearInterval(progressTimer);
    if (analysisAbortController === controller) {
      analysisAbortController = null;
    }
  }
}

async function tryRunFairyAnalysis(position, token, options = {}) {
  if (!CAN_USE_FAIRY_ENGINE) {
    if (!options.keepExisting) {
      analysisStateLabel.textContent = "JS 분석";
      analysisProgressText.textContent = "엔진 없음 · JS 분석으로 실행";
    }
    return false;
  }
  if (Number(options.movetimeMs) > 0) {
    return tryRunFairyTimedAnalysis(position, token, options);
  }

  const startDepth = Math.max(FAIRY_ANALYSIS_START_DEPTH, Math.floor(options.startDepth || FAIRY_ANALYSIS_START_DEPTH));
  const keepExisting = Boolean(options.keepExisting);
  const useMateStop = !options.ignoreMateStop;

  analysisDepthLabel.textContent = keepExisting ? `fairy d${startDepth}` : `fairy d${FAIRY_ANALYSIS_MIN_DISPLAY_DEPTH}+`;
  analysisStateLabel.textContent = keepExisting ? "분석 재개" : "엔진 연결";
  analysisProgressBar.style.width = "18%";
  analysisProgressText.textContent = keepExisting
    ? `Fairy-Stockfish depth ${startDepth} 재개 준비`
    : "Fairy-Stockfish 연결 중";
  analysisStatsText.textContent = CAN_USE_FAIRY_BRIDGE ? "engine bridge" : "engine wasm";
  if (!keepExisting && !analysisLinesEl.querySelector(".analysis-line")) {
    analysisLinesEl.innerHTML = '<p class="empty-analysis">Fairy-Stockfish 계산 중...</p>';
  }

  const fen = fairyFenFromPosition(position);
  let depth = startDepth;
  let completedAnyDepth = keepExisting;
  let mateStopDepth = null;
  let mateStopLabel = "";

  while (token === analysisToken) {
    const controller = new AbortController();
    analysisAbortController = controller;
    const waitingForDisplayDepth = depth < FAIRY_ANALYSIS_MIN_DISPLAY_DEPTH && !completedAnyDepth;
    analysisDepthLabel.textContent = waitingForDisplayDepth ? `fairy d${FAIRY_ANALYSIS_MIN_DISPLAY_DEPTH}+` : `fairy d${depth}`;
    analysisStateLabel.textContent = completedAnyDepth ? "Fairy 심화 중" : "Fairy 계산 중";
    analysisProgressBar.style.width = completedAnyDepth ? "55%" : `${Math.min(95, Math.round((depth / FAIRY_ANALYSIS_MIN_DISPLAY_DEPTH) * 100))}%`;
    analysisProgressText.textContent = waitingForDisplayDepth
      ? `표시는 d${FAIRY_ANALYSIS_MIN_DISPLAY_DEPTH}부터 · 현재 d${depth} 계산 중`
      : `Fairy-Stockfish depth ${depth} 계산 중`;

    try {
      const payload = await requestFairyAnalysisPayload({
        fen,
        depth,
        multipv: ANALYSIS_LINE_LIMIT,
      }, controller.signal);
      if (token !== analysisToken) return true;

      const results = fairyResultsFromPayload(payload, position);
      if (results.length === 0) {
        throw new Error("Fairy bridge returned no principal variation");
      }
      const stats = {
        nodes: payload.nodes || 0,
        terminalCuts: 0,
        alphaBetaCuts: 0,
        cacheHits: 0,
        cacheStores: 0,
        qNodes: 0,
        nps: payload.nps || 0,
        engine: payload.engine || "stockfish",
      };
      const resolvedDepth = payload.depth || depth;
      const bestLine = (payload.lines || []).find((line) => line.multipv === 1) || (payload.lines || [])[0];
      const bestLineIsMate = bestLine && bestLine.scoreType === "mate";
      const mateDistance = bestLineIsMate ? Math.abs(Number(bestLine.score) || 0) : 0;
      const bestMateLabel = bestLineIsMate ? `${bestLine.score < 0 ? "-M" : "M"}${mateDistance}` : "";
      if (useMateStop && bestLineIsMate && mateStopDepth === null) {
        mateStopDepth = mateDistance + FAIRY_ANALYSIS_MATE_CONFIRM_EXTRA_DEPTH;
        mateStopLabel = bestMateLabel;
      } else if (!bestLineIsMate) {
        mateStopDepth = null;
        mateStopLabel = "";
      }
      const reachedMateStop = useMateStop && bestLineIsMate && mateStopDepth !== null && resolvedDepth >= mateStopDepth;
      const nextDepth = useMateStop && mateStopDepth !== null
        ? Math.min(resolvedDepth + FAIRY_ANALYSIS_DEPTH_STEP, mateStopDepth)
        : resolvedDepth + FAIRY_ANALYSIS_DEPTH_STEP;
      if (resolvedDepth < FAIRY_ANALYSIS_MIN_DISPLAY_DEPTH && !bestLineIsMate) {
        if (completedAnyDepth) {
          completedAnyDepth = false;
          analysisLinesEl.innerHTML = '<p class="empty-analysis">Fairy-Stockfish 계산 중...</p>';
          forgetGameAnalysis(position);
        }
        analysisDepthLabel.textContent = `fairy d${FAIRY_ANALYSIS_MIN_DISPLAY_DEPTH}+`;
        analysisStateLabel.textContent = "Fairy 계산 중";
        analysisProgressBar.style.width = `${Math.min(95, Math.round((resolvedDepth / FAIRY_ANALYSIS_MIN_DISPLAY_DEPTH) * 100))}%`;
        analysisProgressText.textContent = `표시는 d${FAIRY_ANALYSIS_MIN_DISPLAY_DEPTH}부터 · d${resolvedDepth} 완료`;
        analysisStatsText.textContent = `engine ${payload.engine || "stockfish"} · nodes ${(payload.nodes || 0).toLocaleString("ko-KR")} · nps ${(payload.nps || 0).toLocaleString("ko-KR")}`;
        depth = nextDepth;
        await waitForUi();
        continue;
      }
      const visibleBoardScore = topBoardScore(position, results);
      renderAnalysisResults(results, position, resolvedDepth, stats, {
        label: `fairy d${resolvedDepth}`,
        source: "fairy",
      });
      analysisDepthLabel.textContent = `fairy d${resolvedDepth}`;
      analysisStateLabel.textContent = reachedMateStop
        ? "Mate 확인 완료"
        : bestLineIsMate && resolvedDepth < FAIRY_ANALYSIS_MIN_DISPLAY_DEPTH ? "Mate 감지" : "Fairy 심화 중";
      analysisProgressBar.style.width = "100%";
      analysisProgressText.textContent = reachedMateStop
        ? `${mateStopLabel} 최선 · d${resolvedDepth} · ${formatScore(visibleBoardScore)} · 확인 완료`
        : bestLineIsMate
          ? useMateStop
            ? `${mateStopLabel} 최선 · d${resolvedDepth} · ${formatScore(visibleBoardScore)} · d${mateStopDepth}까지 확인`
            : `${bestMateLabel} 최선 · d${resolvedDepth} · ${formatScore(visibleBoardScore)} 완료 · d${nextDepth} 준비`
          : `d${resolvedDepth} · ${formatScore(visibleBoardScore)} 완료 · d${nextDepth} 준비`;
      analysisStatsText.textContent = `engine ${payload.engine || "stockfish"} · nodes ${(payload.nodes || 0).toLocaleString("ko-KR")} · nps ${(payload.nps || 0).toLocaleString("ko-KR")}`;
      completedAnyDepth = true;
      if (reachedMateStop) {
        return true;
      }
      depth = nextDepth;
      await waitForUi();
    } catch (error) {
      if (error.name === "AbortError" || token !== analysisToken) {
        throw new Error("analysis cancelled");
      }
      if (!completedAnyDepth) {
        console.warn("Fairy engine unavailable, falling back to JS analysis.", error);
        analysisStateLabel.textContent = "JS 분석";
        analysisProgressText.textContent = "엔진 없음 · JS 분석으로 전환";
        return false;
      }
      console.error("Fairy bridge stopped during iterative analysis.", error);
      analysisStateLabel.textContent = "Fairy 중단";
      analysisProgressText.textContent = `depth ${depth}에서 중단`;
      return true;
    } finally {
      if (analysisAbortController === controller) {
        analysisAbortController = null;
      }
    }
  }

  return true;
}

function setAnalysisProgress(done, total, stats, message) {
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  const qText = stats.qNodes ? ` · q ${stats.qNodes}` : "";
  analysisProgressBar.style.width = `${percent}%`;
  analysisProgressText.textContent = message || `${done}/${total} (${percent}%)`;
  analysisStatsText.textContent = `nodes ${stats.nodes}${qText} · hit ${stats.cacheHits} · save ${stats.cacheStores} · cache ${analysisCache.size.toLocaleString("ko-KR")} · αβ ${stats.alphaBetaCuts}`;
  updateCacheStatus();
}

function renderAnalysisResults(results, position, depth, stats, options = {}) {
  const orderedResults = orderedAnalysisResults(results);
  analysisLinesEl.innerHTML = "";
  if (orderedResults.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-analysis";
    empty.textContent = "추천할 수가 없습니다.";
    analysisLinesEl.appendChild(empty);
    return;
  }

  for (const result of orderedResults.slice(0, ANALYSIS_LINE_LIMIT)) {
    const boardScore = boardScoreFromResult(position, result.score);
    const row = document.createElement("div");
    row.className = `analysis-line ${scoreFavorClass(boardScore)}${Math.abs(boardScore) > WIN_SCORE / 2 ? " mate" : ""}`;
    const score = document.createElement("strong");
    const move = document.createElement("span");
    const depthChip = document.createElement("small");
    score.textContent = formatScore(boardScore);
    move.textContent = pvText(result.pv, position);
    move.title = move.textContent;
    depthChip.textContent = `d${depth}`;
    row.append(score, move, depthChip);
    analysisLinesEl.appendChild(row);
  }

  const boardScore = boardScoreFromResult(position, orderedResults[0].score);
  setScoreRail(boardScore);
  setAnalysisProgress(orderedResults.length, orderedResults.length, stats, options.progressText || `완료 depth ${depth} · ${formatScore(boardScore)}`);
  analysisDepthLabel.textContent = options.label || `depth ${depth}`;
  if (options.statsText) {
    analysisStatsText.textContent = options.statsText;
  }
  if (options.remember !== false) {
    rememberGameAnalysis(position, orderedResults, depth, stats, {
      label: analysisDepthLabel.textContent,
      source: options.source,
    });
  }
}

function setAnalysisRunning(running) {
  analysisRunning = running;
  stopAnalysisButton.disabled = !running;
  updateResumeAnalysisButton();
}

function stopAnalysis(message = "중지됨") {
  if (!analysisRunning) return;
  if (analysisAbortController) {
    analysisAbortController.abort();
    analysisAbortController = null;
  }
  analysisToken += 1;
  setAnalysisRunning(false);
  analysisStateLabel.textContent = message;
  analysisProgressText.textContent = message;
  saveAnalysisCache();
}

function resumeStoredAnalysis() {
  if (analysisRunning || state.winner) return;
  const record = currentGameAnalysisRecord();
  if (!record) return;
  runAutoAnalysis({
    startDepth: record.depth + FAIRY_ANALYSIS_DEPTH_STEP,
    keepExisting: true,
    ignoreMateStop: true,
  });
}

function clearAnalysis(message = "대기 중") {
  if (analysisAbortController) {
    analysisAbortController.abort();
    analysisAbortController = null;
  }
  analysisToken += 1;
  setAnalysisRunning(false);
  analysisDepthLabel.textContent = `time ${formatAnalysisTime()}s`;
  analysisStateLabel.textContent = message;
  analysisProgressBar.style.width = "0%";
  analysisProgressText.textContent = message;
  analysisStatsText.textContent = `nodes 0 · cache ${analysisCache.size.toLocaleString("ko-KR")}`;
  updateCacheStatus();
  setScoreRail(state && state.winner ? (state.winner.player === 1 ? WIN_SCORE : -WIN_SCORE) : null);
  analysisLinesEl.innerHTML = '<p class="empty-analysis">착수 후 설정 시간만큼 자동 분석합니다.</p>';
  updateResumeAnalysisButton();
}

function waitForUi() {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 0);
  });
}

async function analyzeDepth(position, depth, token, preferredActions = []) {
  const perspective = position.turn;
  const rootActions = generateActions(position, perspective, preferredActions);
  const stats = {
    nodes: 0,
    terminalCuts: 0,
    alphaBetaCuts: 0,
    cacheHits: 0,
    cacheStores: 0,
    qNodes: 0,
  };
  const results = [];
  const cachedRoot = getCachedRootAnalysis(position, depth, perspective, stats);

  analysisDepthLabel.textContent = `depth ${depth}`;
  analysisStateLabel.textContent = "계산 중";
  if (!analysisLinesEl.querySelector(".analysis-line")) {
    analysisLinesEl.innerHTML = '<p class="empty-analysis">계산 중...</p>';
  }
  if (cachedRoot) {
    renderAnalysisResults(cachedRoot, position, depth, stats);
    setAnalysisProgress(rootActions.length, rootActions.length, stats, `depth ${depth} · cache hit`);
    return { results: cachedRoot, stats };
  }
  setAnalysisProgress(0, rootActions.length, stats, `depth ${depth} · 0/${rootActions.length}`);
  await waitForUi();

  for (let index = 0; index < rootActions.length; index += 1) {
    if (token !== analysisToken) {
      throw new Error("analysis cancelled");
    }
    const action = rootActions[index];
    const childPreferred = preferredActions.length > 1 && sameAction(preferredActions[0], action)
      ? preferredActions.slice(1)
      : [];
    const undo = makeActionInPlace(position, action);
    const winner = position.winner;
    let result;
    try {
      result = winner
        ? { score: terminalScore(winner, perspective, 1), pv: [] }
        : await alphaBetaAsync(position, depth - 1, -Infinity, Infinity, perspective, 1, stats, token, childPreferred);
    } finally {
      undoActionInPlace(position, undo);
    }
    if (winner) {
      stats.terminalCuts += 1;
    }
    results.push({ action, score: result.score, pv: [action, ...result.pv] });
    setAnalysisProgress(index + 1, rootActions.length, stats, `depth ${depth} · ${index + 1}/${rootActions.length}`);
    await waitForUi();
  }

  results.sort((left, right) => right.score - left.score);
  if (storeCachedRootAnalysis(position, depth, perspective, results)) {
    stats.cacheStores += 1;
  }
  renderAnalysisResults(results, position, depth, stats);
  return { results, stats };
}

async function runAutoAnalysis(options = {}) {
  if (state.winner) {
    clearAnalysis("게임 종료");
    return;
  }

  analysisToken += 1;
  const token = analysisToken;
  const position = makePositionFromState(state);
  const startDepth = Math.max(FAIRY_ANALYSIS_START_DEPTH, Math.floor(options.startDepth || FAIRY_ANALYSIS_START_DEPTH));
  const keepExisting = Boolean(options.keepExisting);

  try {
    setAnalysisRunning(true);
    analysisStateLabel.textContent = keepExisting ? "재개 중" : "계산 중";
    if (!keepExisting && !analysisLinesEl.querySelector(".analysis-line")) {
      analysisLinesEl.innerHTML = '<p class="empty-analysis">계산 중...</p>';
    }
    const fairyDone = await tryRunFairyAnalysis(position, token, {
      startDepth,
      keepExisting,
      ignoreMateStop: Boolean(options.ignoreMateStop),
      movetimeMs: analysisMovetimeMs(),
    });
    if (fairyDone) {
      if (token === analysisToken) {
        setAnalysisRunning(false);
      }
      return;
    }
    let preferredPv = [];
    for (const depth of AUTO_ANALYSIS_DEPTHS.filter((candidate) => candidate >= startDepth)) {
      const depthResult = await analyzeDepth(position, depth, token, preferredPv);
      preferredPv = depthResult.results[0] ? depthResult.results[0].pv : preferredPv;
      saveAnalysisCache();
      if (token !== analysisToken) {
        return;
      }
    }
    if (token === analysisToken) {
      analysisStateLabel.textContent = "완료";
      setAnalysisRunning(false);
    }
  } catch (error) {
    if (error.message === "analysis cancelled") {
      return;
    }
    if (token !== analysisToken) {
      return;
    }
    analysisLinesEl.innerHTML = '<p class="empty-analysis">분석 중 오류가 발생했습니다.</p>';
    analysisProgressText.textContent = "오류";
    analysisStateLabel.textContent = "오류";
    setAnalysisRunning(false);
    console.error(error);
  } finally {
    if (token === analysisToken && analysisRunning && analysisStateLabel.textContent !== "계산 중") {
      setAnalysisRunning(false);
    }
  }
}

function selectedTargets() {
  if (!state.selected || state.winner || isHumanInputLocked()) return [];
  if (state.selected.kind === "board") {
    return legalMovesFrom(state.board, state.selected.row, state.selected.col);
  }
  if (state.selected.kind === "hand") {
    return legalDrops(state.selected.base, state.turn);
  }
  return [];
}

function targetKey(row, col) {
  return `${row}:${col}`;
}

function handleCellClick(row, col) {
  if (state.winner || isHumanInputLocked()) return;
  const piece = state.board[row][col];
  const targets = new Set(selectedTargets().map((move) => targetKey(move.row, move.col)));
  const key = targetKey(row, col);

  if (state.selected && targets.has(key)) {
    prepareReviewBranch();
    if (state.selected.kind === "board") {
      movePiece(state.selected.row, state.selected.col, row, col);
    } else {
      dropPiece(state.selected.base, row, col);
    }
    return;
  }

  if (piece && piece.owner === state.turn) {
    state.selected = { kind: "board", row, col };
  } else {
    state.selected = null;
  }
  render();
}

function handleHandClick(player, base) {
  if (state.winner || isHumanInputLocked() || player !== state.turn || state.hands[player][base] <= 0) return;
  const alreadySelected =
    state.selected &&
    state.selected.kind === "hand" &&
    state.selected.player === player &&
    state.selected.base === base;
  state.selected = alreadySelected ? null : { kind: "hand", player, base };
  render();
}

function renderBoard() {
  const targets = new Set(selectedTargets().map((move) => targetKey(move.row, move.col)));
  boardEl.innerHTML = "";

  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      const cell = document.createElement("button");
      const piece = state.board[row][col];
      const key = targetKey(row, col);
      cell.type = "button";
      cell.className = "cell";
      cell.disabled = isHumanInputLocked();
      cell.setAttribute("role", "gridcell");
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);
      if (col === 0) {
        cell.dataset.rank = String(SIZE - row);
      }
      if (row === SIZE - 1) {
        cell.dataset.file = FILES[col].toLowerCase();
      }
      cell.setAttribute("aria-label", `${coord(row, col)}${piece ? ` ${pieceInfo(piece).name} Player ${piece.owner}` : ""}`);

      if (state.selected && state.selected.kind === "board" && state.selected.row === row && state.selected.col === col) {
        cell.classList.add("selected");
      }
      if (targets.has(key)) {
        cell.classList.add(state.selected.kind === "hand" ? "legal-drop" : "legal-move");
        const dot = document.createElement("span");
        dot.className = "legal-dot";
        cell.appendChild(dot);
      }

      if (piece) {
        const info = pieceInfo(piece);
        const pieceEl = document.createElement("span");
        const ownerMark = document.createElement("span");
        pieceEl.className = `piece p${piece.owner} ${piece.face} ${piece.base}`;
        pieceEl.title = `Player ${piece.owner} ${info.name}`;
        pieceEl.textContent = info.short;
        ownerMark.className = `owner-mark p${piece.owner}`;
        pieceEl.appendChild(ownerMark);
        cell.appendChild(pieceEl);
      }

      cell.addEventListener("click", () => handleCellClick(row, col));
      boardEl.appendChild(cell);
    }
  }
}

function renderHands() {
  for (const player of [2, 1]) {
    const handEl = handEls[player];
    handEl.innerHTML = "";
    for (const base of BASES) {
      const button = document.createElement("button");
      const count = state.hands[player][base];
      button.type = "button";
      button.className = "hand-piece";
      button.dataset.player = String(player);
      button.dataset.base = base;
      button.dataset.count = String(count);
      button.disabled = state.winner || isHumanInputLocked() || player !== state.turn || count <= 0;
      button.title = `Player ${player} ${frontName(base)} 포로`;
      button.setAttribute("aria-label", `Player ${player} ${frontName(base)} 포로 ${count}개`);
      const icon = document.createElement("span");
      const ownerMark = document.createElement("span");
      icon.className = `hand-piece-icon piece mini p${player} front ${base}${count <= 0 ? " empty" : ""}`;
      icon.textContent = PIECES[base].frontShort;
      ownerMark.className = `owner-mark p${player}`;
      icon.appendChild(ownerMark);
      button.appendChild(icon);
      if (count > 1) {
        const badge = document.createElement("span");
        badge.className = "hand-count";
        badge.textContent = String(count);
        button.appendChild(badge);
      }
      if (
        state.selected &&
        state.selected.kind === "hand" &&
        state.selected.player === player &&
        state.selected.base === base
      ) {
        button.classList.add("selected");
      }
      button.addEventListener("click", () => handleHandClick(player, base));
      handEl.appendChild(button);
    }
  }
}

function renderLog() {
  moveLogEl.innerHTML = "";
  const moves = [];
  let result = "";
  for (const entry of state.log) {
    if (isResultLogEntry(entry)) {
      result = formatResultNotation(entry);
    } else {
      moves.push(entry);
    }
  }

  for (let index = 0; index < moves.length; index += 2) {
    const li = document.createElement("li");
    const white = document.createElement("span");
    const black = document.createElement("span");
    white.className = "log-white";
    black.className = "log-black";
    white.textContent = moves[index] || "";
    black.textContent = moves[index + 1] || "";
    li.append(white, black);
    if (result && index + 2 >= moves.length) {
      const resultEl = document.createElement("span");
      resultEl.className = "log-result";
      resultEl.textContent = result;
      li.appendChild(resultEl);
    }
    moveLogEl.appendChild(li);
  }

  if (moves.length === 0 && result) {
    const li = document.createElement("li");
    li.textContent = result;
    moveLogEl.appendChild(li);
  }

  moveLogEl.scrollTop = moveLogEl.scrollHeight;
}

function renderStatus() {
  if (state.winner) {
    turnTitleEl.textContent = `${resultNotationForWinner(state.winner.player)} · ${winnerSideName(state.winner.player)} 승리`;
    turnTitleEl.classList.add("winner");
  } else {
    turnTitleEl.textContent = `Player ${state.turn} 차례`;
    turnTitleEl.classList.remove("winner");
  }

  if (state.selected && !state.winner) {
    if (state.selected.kind === "board") {
      const piece = state.board[state.selected.row][state.selected.col];
      statusTextEl.textContent = `선택: Player ${piece.owner} ${pieceInfo(piece).name} ${coord(state.selected.row, state.selected.col)}`;
    } else {
      statusTextEl.textContent = `선택: Player ${state.selected.player} ${frontName(state.selected.base)} 포로`;
    }
  } else {
    statusTextEl.textContent = state.status;
  }
}

function render() {
  document.body.dataset.turn = String(state.turn);
  for (const player of [1, 2]) {
    playerStrips[player].classList.toggle("active", !state.winner && state.turn === player);
  }
  renderStatus();
  renderBoard();
  renderHands();
  renderLog();
  if (state.winner) {
    setScoreRail(state.winner.player === 1 ? WIN_SCORE : -WIN_SCORE);
  }
  undoButton.disabled = state.history.length === 0;
  updateResumeAnalysisButton();
  updateGameTabState();
}

function fallbackCopyText(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  textArea.style.top = "0";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  textArea.setSelectionRange(0, text.length);
  const copied = document.execCommand("copy");
  textArea.remove();
  return copied;
}

async function copyCurrentPosition() {
  const text = `position fen ${fairyFenFromPosition(makePositionFromState(state))}`;
  let copied = false;
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch {
      copied = false;
    }
  }
  if (!copied) {
    copied = fallbackCopyText(text);
  }
  if (!copied) {
    throw new Error("copy failed");
  }
  return text;
}

function isTypingTarget(target) {
  if (!target) return false;
  const tagName = target.tagName ? target.tagName.toLowerCase() : "";
  return target.isContentEditable || ["input", "textarea", "select"].includes(tagName);
}

function handlePanelArrowKey(event) {
  if (isTypingTarget(event.target)) return;
  if (activePanelTab === "review" && reviewRecord) {
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      reviewUndo();
    } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      reviewRedo();
    }
    return;
  }

  if (activePanelTab === "opening" && openingTreeData) {
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      openingTreeStepBack();
    } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      openingTreeStepForward();
    }
  }
}

resetButton.addEventListener("click", resetGame);

for (const button of panelTabButtons) {
  button.addEventListener("click", () => setPanelTab(button.dataset.panelTab));
}

undoButton.addEventListener("click", () => {
  if (activePanelTab === "review" && reviewRecord) {
    reviewUndo();
    return;
  }
  if (state.history.length === 0) return;
  if (aiGameActive) {
    aiGameToken += 1;
    abortAiTurn();
  }
  const raw = state.history.pop();
  restoreSnapshot(raw);
  pruneGameAnalysisRecords();
  render();
  playMoveSound();
  const position = makePositionFromState(state);
  if (aiGameActive && state.turn === aiPlayer) {
    clearAnalysis("AI 계산 준비");
    maybeRunAiTurn();
  } else if (aiGameActive && !aiShowEvaluation) {
    clearAnalysis("평가치 표시 꺼짐");
    analysisDepthLabel.textContent = "AI 대국";
    analysisStateLabel.textContent = "표시 꺼짐";
    analysisProgressText.textContent = "평가치 표시가 꺼져 있습니다.";
    analysisLinesEl.innerHTML = '<p class="empty-analysis">AI 대국 중 평가치 표시가 꺼져 있습니다.</p>';
  } else if (!restoreGameAnalysis(position, "기보 저장")) {
    clearAnalysis("포지션 변경됨");
    runAutoAnalysis();
  }
});

resumeAnalysisButton.addEventListener("click", resumeStoredAnalysis);

stopAnalysisButton.addEventListener("click", () => {
  stopAnalysis();
});

if (analysisTimeInput) {
  analysisTimeInput.addEventListener("input", saveAnalysisTimeSetting);
  analysisTimeInput.addEventListener("change", saveAnalysisTimeSetting);
  analysisTimeInput.addEventListener("blur", saveAnalysisTimeSetting);
}

if (reviewExtraTimeInput) {
  reviewExtraTimeInput.addEventListener("input", saveReviewExtraTimeSetting);
  reviewExtraTimeInput.addEventListener("change", saveReviewExtraTimeSetting);
  reviewExtraTimeInput.addEventListener("blur", saveReviewExtraTimeSetting);
}

if (reviewAnalyzeButton) {
  reviewAnalyzeButton.addEventListener("click", runReviewExtraAnalysis);
}

if (openingStartButton) {
  openingStartButton.addEventListener("click", openingTreeGoStart);
}

if (openingBackButton) {
  openingBackButton.addEventListener("click", openingTreeStepBack);
}

if (openingForwardButton) {
  openingForwardButton.addEventListener("click", openingTreeStepForward);
}

saveKifuButton.addEventListener("click", () => {
  const previousText = saveKifuButton.textContent;
  const saved = saveKifuJson();
  saveKifuButton.textContent = saved ? "저장됨" : "실패";
  statusTextEl.textContent = saved ? "기보 JSON 저장됨" : "기보 저장 실패";
  window.setTimeout(() => {
    saveKifuButton.textContent = previousText;
    renderStatus();
  }, 1400);
});

loadKifuButton.addEventListener("click", () => {
  if (kifuFileInput) {
    kifuFileInput.click();
  }
});

if (kifuFileInput) {
  kifuFileInput.addEventListener("change", () => {
    importKifuFile(kifuFileInput.files[0]);
  });
}

if (reviewLoadButton && reviewFileInput) {
  reviewLoadButton.addEventListener("click", () => {
    reviewFileInput.click();
  });
}

if (reviewFileInput) {
  reviewFileInput.addEventListener("change", () => {
    importReviewKifuFile(reviewFileInput.files[0]);
  });
}

if (reviewStartButton) {
  reviewStartButton.addEventListener("click", () => {
    goToReviewPly(0);
  });
}

if (reviewUndoButton) {
  reviewUndoButton.addEventListener("click", reviewUndo);
}

if (reviewRedoButton) {
  reviewRedoButton.addEventListener("click", reviewRedo);
}

if (reviewEndButton) {
  reviewEndButton.addEventListener("click", () => {
    if (reviewRecord) {
      goToReviewPly(reviewRecord.moves.length);
    }
  });
}

if (aiGameButton) {
  aiGameButton.addEventListener("click", () => {
    if (aiGameActive) {
      stopAiGame();
      clearAnalysis("AI 대국 중지");
      if (!state.winner) {
        runAutoAnalysis();
      }
      render();
      return;
    }
    updateAiGameSettingsInput();
    setAiGameSettingsVisible(true);
    updateGameTabState();
  });
}

if (startAiGameButton) {
  startAiGameButton.addEventListener("click", startAiGame);
}

if (cancelAiGameButton) {
  cancelAiGameButton.addEventListener("click", () => {
    setAiGameSettingsVisible(false);
    updateGameTabState();
  });
}

if (aiTimeInput) {
  aiTimeInput.addEventListener("change", saveAiGameSettings);
  aiTimeInput.addEventListener("blur", saveAiGameSettings);
}

for (const input of aiFirstMoveInputs) {
  input.addEventListener("change", saveAiGameSettings);
}

if (aiEvalToggle) {
  aiEvalToggle.addEventListener("change", saveAiGameSettings);
}

if (gameRecordSaveButton) {
  gameRecordSaveButton.addEventListener("click", () => {
    if (!state.winner) return;
    const previousText = gameRecordSaveButton.textContent;
    const saved = saveKifuJson();
    gameRecordSaveButton.textContent = saved ? "저장됨" : "실패";
    if (gameTabStatusEl) {
      gameTabStatusEl.textContent = saved ? "전체 기록 JSON 저장됨" : "전체 기록 저장 실패";
    }
    window.setTimeout(() => {
      gameRecordSaveButton.textContent = previousText;
      updateGameTabState();
    }, 1400);
  });
}

if (saveCacheButton) {
  saveCacheButton.addEventListener("click", () => {
    downloadAnalysisCacheFile();
  });
}

if (loadCacheButton && cacheFileInput) {
  loadCacheButton.addEventListener("click", () => {
    cacheFileInput.click();
  });
}

if (cacheFileInput) {
  cacheFileInput.addEventListener("change", () => {
    importAnalysisCacheFile(cacheFileInput.files[0]);
  });
}

window.addEventListener("beforeunload", () => {
  saveAnalysisTimeSetting();
  saveReviewExtraTimeSetting();
  saveAiGameSettings();
  saveAnalysisCache();
});

window.addEventListener("keydown", handlePanelArrowKey);

loadAnalysisCache();
loadAnalysisTimeSetting();
loadReviewExtraTimeSetting();
loadAiGameSettings();
getMoveSoundTemplate().load();
setPanelTab("analysis");
resetGame();
