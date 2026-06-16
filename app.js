/**
 * Blokus Premium - メインアプリケーション & ゲームエンジン (blokus.js)
 */

// --- Firebase Config (ユーザー設定エリア) ---
const firebaseConfig = {
  apiKey: "AIzaSyBhQBZ5l5RoZguVf8am38q7Lpk90ldJJvk",
  authDomain: "blokus-premium.firebaseapp.com",
  databaseURL: "https://blokus-premium-default-rtdb.firebaseio.com",
  projectId: "blokus-premium",
  storageBucket: "blokus-premium.firebasestorage.app",
  messagingSenderId: "404760241859",
  appId: "1:404760241859:web:c39b146eec9384e171a476"
};

// Firebaseの初期化
let database = null;
let isFirebaseEnabled = false;

try {
    if (firebaseConfig && firebaseConfig.databaseURL) {
        firebase.initializeApp(firebaseConfig);
        database = firebase.database();
        isFirebaseEnabled = true;
        console.log("Firebase initialized successfully for Blokus.");
    } else {
        console.log("Firebase Config is empty. Running in Practice (offline) mode only.");
    }
} catch (e) {
    console.warn("Firebase initialization failed. Running in Practice mode.", e);
}

// --- 音響効果 (Web Audio API) ---
class SoundManager {
    constructor() {
        this.ctx = null;
        this.muted = false;
    }

    init() {
        try {
            if (!this.ctx) {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume().then(() => {
                    console.log("AudioContext resumed successfully.");
                }).catch(err => {
                    console.warn("Failed to resume AudioContext:", err);
                });
            }
        } catch (e) {
            console.error("AudioContext initialization failed:", e);
        }
    }

    // ピース配置音（ポコッという弾む感じの打音）
    playPlace() {
        if (this.muted) return;
        this.init();
        const ctx = this.ctx;
        if (!ctx) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(250, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.15);

        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
    }

    // ピース選択音（ピッ）
    playSelect() {
        if (this.muted) return;
        this.init();
        const ctx = this.ctx;
        if (!ctx) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, ctx.currentTime);

        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
    }

    // 回転・反転音（ピピッ）
    playTransform() {
        if (this.muted) return;
        this.init();
        const ctx = this.ctx;
        if (!ctx) return;

        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.frequency.setValueAtTime(700, ctx.currentTime);
        osc2.frequency.setValueAtTime(900, ctx.currentTime + 0.04);

        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start();
        osc2.start(ctx.currentTime + 0.04);
        osc1.stop(ctx.currentTime + 0.04);
        osc2.stop(ctx.currentTime + 0.12);
    }

    // エラー音（ブー）
    playError() {
        if (this.muted) return;
        this.init();
        const ctx = this.ctx;
        if (!ctx) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, ctx.currentTime);

        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
    }

    // ゲーム終了ファンファーレ（明るいメロディ）
    playGameOver() {
        if (this.muted) return;
        this.init();
        const ctx = this.ctx;
        if (!ctx) return;

        const notes = [523.25, 659.25, 783.99, 1046.50]; // ド・ミ・ソ・ド
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
            gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.12 + 0.5);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + i * 0.12);
            osc.stop(ctx.currentTime + i * 0.12 + 0.5);
        });
    }
}

const sounds = new SoundManager();

// --- ブロックス ピース定義 (21種類) ---
const PIECES_DEF = [
    // 1-polyomino
    { id: 0, size: 1, coords: [[0, 0]], name: "I1" },
    // 2-polyomino
    { id: 1, size: 2, coords: [[0, 0], [0, 1]], name: "I2" },
    // 3-polyomino
    { id: 2, size: 3, coords: [[0, 0], [0, 1], [0, 2]], name: "I3" },
    { id: 3, size: 3, coords: [[0, 0], [0, 1], [1, 0]], name: "V3" },
    // 4-polyomino
    { id: 4, size: 4, coords: [[0, 0], [0, 1], [0, 2], [0, 3]], name: "I4" },
    { id: 5, size: 4, coords: [[0, 0], [0, 1], [0, 2], [1, 1]], name: "T4" },
    { id: 6, size: 4, coords: [[0, 0], [0, 1], [0, 2], [1, 0]], name: "L4" },
    { id: 7, size: 4, coords: [[0, 0], [0, 1], [1, 0], [1, 1]], name: "O4" },
    { id: 8, size: 4, coords: [[0, 0], [0, 1], [1, 1], [1, 2]], name: "Z4" },
    // 5-polyomino (Pentominoes)
    { id: 9, size: 5, coords: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]], name: "I5" },
    { id: 10, size: 5, coords: [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]], name: "X5" },
    { id: 11, size: 5, coords: [[0, 0], [0, 1], [0, 2], [0, 3], [1, 0]], name: "L5" },
    { id: 12, size: 5, coords: [[0, 0], [0, 1], [0, 2], [1, 1], [1, 2]], name: "P5" },
    { id: 13, size: 5, coords: [[0, 0], [0, 1], [0, 2], [1, 0], [2, 0]], name: "V5" },
    { id: 14, size: 5, coords: [[0, 0], [0, 1], [1, 1], [1, 2], [2, 2]], name: "W5" },
    { id: 15, size: 5, coords: [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]], name: "U5" },
    { id: 16, size: 5, coords: [[0, 1], [0, 2], [1, 0], [1, 1], [2, 1]], name: "F5" },
    { id: 17, size: 5, coords: [[0, 0], [0, 1], [1, 1], [2, 1], [2, 2]], name: "Z5" },
    { id: 18, size: 5, coords: [[0, 0], [0, 1], [0, 2], [0, 3], [1, 1]], name: "Y5" },
    { id: 19, size: 5, coords: [[0, 0], [0, 1], [0, 2], [1, 2], [1, 3]], name: "N5" },
    { id: 20, size: 5, coords: [[0, 0], [0, 1], [1, 1], [1, 2], [2, 1]], name: "T5" }
];

// スタート隅の定義
const START_CORNERS = [
    { r: 0, c: 0 },     // 青 (Player 0) - 左上
    { r: 0, c: 19 },    // 黄 (Player 1) - 右上
    { r: 19, c: 19 },   // 赤 (Player 2) - 右下
    { r: 19, c: 0 }     // 緑 (Player 3) - 左下
];

// --- プレイヤー基本定義 ---
const PLAYER_NAMES = ["プレイヤー1", "プレイヤー2", "プレイヤー3", "プレイヤー4"];
const PLAYER_CLASSES = ["color-blue", "color-yellow", "color-red", "color-green"];

// --- 状態管理 ---
let myUid = "user_" + Math.random().toString(36).substring(2, 8);
let myName = "プレイヤー";
let mySeat = 0; // 0:青, 1:黄, 2:赤, 3:緑
let currentRoomId = null;
let isHost = false;
let gameMode = "online"; // 'online' or 'practice'
let roomRef = null;

// ローカルゲームステート (同期される対象)
let localGameState = {
    status: "waiting", // 'waiting', 'playing', 'gameover'
    rules: { comCount: 3 },
    players: [],
    board: Array(20).fill(null).map(() => Array(20).fill(-1)), // 20x20ボード (-1は空)
    currentTurn: 0,
    scores: [0, 0, 0, 0],
    playerPieces: {
        0: Array(21).fill(true), // 各プレイヤーがピースを保持しているか
        1: Array(21).fill(true),
        2: Array(21).fill(true),
        3: Array(21).fill(true)
    },
    passStates: [false, false, false, false],
    lastPlacement: null // アニメーションエフェクト用 { seat, pieceId, coords }
};

// UI操作中の一時状態
let selectedPieceId = -1;
let currentRotation = 0; // 0: 0, 1: 90, 2: 180, 3: 270
let currentFlip = false; // 左右反転
let hoverR = -1;
let hoverC = -1;
let lockedR = -1; // ロックされた基準セルの行位置
let lockedC = -1; // ロックされた基準セルの列位置

// --- DOM 要素 ---
const gameModeSelect = document.getElementById("game-mode");
const ruleComCountSelect = document.getElementById("rule-com-count");
const onlineRoomGroup = document.getElementById("online-room-group");
const practiceStartBtn = document.getElementById("btn-practice-start");

const lobbyInitView = document.getElementById("online-init-view");
const lobbyWaitingView = document.getElementById("online-waiting-view");
const lobbyActiveView = document.getElementById("online-active-view");
const createRoomBtn = document.getElementById("btn-create-room");
const joinRoomBtn = document.getElementById("btn-join-room");
const inputRoomId = document.getElementById("input-room-id");
const displayRoomId = document.getElementById("display-room-id");
const copyRoomBtn = document.getElementById("btn-copy-room");
const cancelRoomBtn = document.getElementById("btn-cancel-room");
const leaveRoomBtn = document.getElementById("btn-leave-room");
const startGameBtn = document.getElementById("btn-start-game");

const welcomeScreen = document.getElementById("game-welcome-screen");
const blokusTable = document.getElementById("blokus-table");
const blokusBoardEl = document.getElementById("blokus-board");
const myPiecesPaletteEl = document.getElementById("my-pieces-palette");
const previewContainerEl = document.getElementById("current-piece-preview");

const rotateCwBtn = document.getElementById("btn-rotate-cw");
const flipBtn = document.getElementById("btn-flip");

const resultModal = document.getElementById("result-modal");
const finalRankingsEl = document.getElementById("final-rankings");
const resultCloseBtn = document.getElementById("btn-result-close");

// スマホ対応トグル & 決定ボタン
const btnTogglePanel = document.getElementById("btn-toggle-panel");
const drawerOverlay = document.getElementById("drawer-overlay");
const controlPanel = document.querySelector(".control-panel");
const btnPlacePiece = document.getElementById("btn-place-piece");

// ローカルストレージからプレイヤー名を取得・設定
let storedName = localStorage.getItem("blokus_player_name");
if (!storedName) {
    storedName = "プレイヤー" + Math.floor(Math.random() * 900 + 100);
    localStorage.setItem("blokus_player_name", storedName);
}
myName = storedName;

// --- 初期ロード処理 ---
window.addEventListener("DOMContentLoaded", () => {
    setupUIHandlers();
    
    if (!isFirebaseEnabled) {
        gameModeSelect.value = "practice";
        gameModeSelect.dispatchEvent(new Event("change"));
        gameModeSelect.disabled = true;
    }

    // 初回のユーザーインタラクション時にAudioContextをアクティベートする
    const unlockAudio = () => {
        sounds.init();
        
        // 完全にアンロックするために無音のバッファを一瞬再生する
        if (sounds.ctx) {
            try {
                const buffer = sounds.ctx.createBuffer(1, 1, 22050);
                const source = sounds.ctx.createBufferSource();
                source.buffer = buffer;
                source.connect(sounds.ctx.destination);
                source.start(0);
                console.log("AudioContext unlocked with silent buffer.");
            } catch (e) {
                console.warn("Failed to play silent buffer for unlocking:", e);
            }
        }

        const events = ['click', 'touchstart', 'mousedown', 'keydown'];
        events.forEach(e => document.removeEventListener(e, unlockAudio));
    };
    ['click', 'touchstart', 'mousedown', 'keydown'].forEach(e => {
        document.addEventListener(e, unlockAudio);
    });
});

function setupUIHandlers() {
    // ゲームモード切り替え
    gameModeSelect.addEventListener("change", (e) => {
        gameMode = e.target.value;
        if (gameMode === "practice") {
            onlineRoomGroup.classList.add("hidden");
            practiceStartBtn.classList.remove("hidden");
            ruleComCountSelect.value = "3";
            ruleComCountSelect.disabled = true;
        } else {
            onlineRoomGroup.classList.remove("hidden");
            practiceStartBtn.classList.add("hidden");
            ruleComCountSelect.disabled = false;
        }
    });
    gameModeSelect.dispatchEvent(new Event("change"));

    // COM人数変更 (ホストのみ)
    ruleComCountSelect.addEventListener("change", (e) => {
        if (isHost && roomRef) {
            roomRef.child("rules/comCount").set(parseInt(e.target.value));
        }
    });

    // 練習戦開始
    practiceStartBtn.addEventListener("click", () => {
        startPracticeGame();
    });

    // ミュートボタン
    const muteBtn = document.getElementById("btn-mute");
    muteBtn.addEventListener("click", () => {
        sounds.muted = !sounds.muted;
        document.getElementById("svg-sound-on").classList.toggle("hidden", sounds.muted);
        document.getElementById("svg-sound-off").classList.toggle("hidden", !sounds.muted);
    });

    // オンラインルーム作成
    createRoomBtn.addEventListener("click", () => {
        if (!isFirebaseEnabled) return;
        const roomId = Math.floor(100000 + Math.random() * 900000).toString();
        createOnlineRoom(roomId);
    });

    // オンラインルーム入室
    joinRoomBtn.addEventListener("click", () => {
        if (!isFirebaseEnabled) return;
        const roomId = inputRoomId.value.trim();
        if (roomId.length === 6) {
            joinOnlineRoom(roomId);
        } else {
            alert("6桁のルームIDを入力してください。");
        }
    });

    // コピーボタン
    copyRoomBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(currentRoomId).then(() => {
            alert("ルームIDをコピーしました！: " + currentRoomId);
        });
    });

    // 退出・解散
    cancelRoomBtn.addEventListener("click", () => leaveCurrentRoom());
    leaveRoomBtn.addEventListener("click", () => leaveCurrentRoom());

    // ホストによるゲーム開始
    startGameBtn.addEventListener("click", () => {
        if (isHost && roomRef) {
            setupBotsAndStartOnlineGame();
        }
    });

    // ピース操作ボタン
    rotateCwBtn.addEventListener("click", () => {
        if (selectedPieceId === -1) return;
        sounds.playTransform();
        currentRotation = (currentRotation + 1) % 4;
        updatePreview();
        updateBoardHighlight();
    });

    flipBtn.addEventListener("click", () => {
        if (selectedPieceId === -1) return;
        sounds.playTransform();
        currentFlip = !currentFlip;
        updatePreview();
        updateBoardHighlight();
    });

    // キーボード操作サポート
    document.addEventListener("keydown", (e) => {
        if (selectedPieceId === -1) return;
        if (e.key === "r" || e.key === "R") {
            sounds.playTransform();
            currentRotation = (currentRotation + 1) % 4;
            updatePreview();
            updateBoardHighlight();
        } else if (e.key === "f" || e.key === "F") {
            sounds.playTransform();
            currentFlip = !currentFlip;
            updatePreview();
            updateBoardHighlight();
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            moveLockedCoords(-1, 0);
        } else if (e.key === "ArrowDown") {
            e.preventDefault();
            moveLockedCoords(1, 0);
        } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            moveLockedCoords(0, -1);
        } else if (e.key === "ArrowRight") {
            e.preventDefault();
            moveLockedCoords(0, 1);
        } else if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (btnPlacePiece && !btnPlacePiece.classList.contains("hidden") && !btnPlacePiece.disabled) {
                btnPlacePiece.click();
            }
        }
    });

    // 結果モーダルを閉じる
    resultCloseBtn.addEventListener("click", () => {
        resultModal.classList.add("hidden");
        resetToLobby();
    });

    // 設定パネルの開閉トグル（スマホ）
    if (btnTogglePanel) {
        btnTogglePanel.addEventListener("click", () => {
            controlPanel.classList.toggle("open");
            drawerOverlay.classList.toggle("hidden", !controlPanel.classList.contains("open"));
        });
    }

    // マスク背景タップ時に設定を閉じる
    if (drawerOverlay) {
        drawerOverlay.addEventListener("click", () => {
            controlPanel.classList.remove("open");
            drawerOverlay.classList.add("hidden");
        });
    }

    // ピース配置決定ボタン
    if (btnPlacePiece) {
        btnPlacePiece.addEventListener("click", () => {
            if (selectedPieceId === -1 || localGameState.currentTurn !== mySeat || lockedR === -1 || lockedC === -1) return;
            const board = localGameState.board;
            const coords = getTransformedCoords(selectedPieceId, currentRotation, currentFlip);
            const isFirstMove = localGameState.scores[mySeat] === 0;

            if (isValidMove(board, mySeat, coords, lockedR, lockedC, isFirstMove)) {
                placePiece(mySeat, selectedPieceId, coords, lockedR, lockedC);
            } else {
                sounds.playError();
            }
        });
    }

    // 十字キー (D-Pad) イベントハンドラ
    const dpadUp = document.getElementById("btn-dpad-up");
    const dpadDown = document.getElementById("btn-dpad-down");
    const dpadLeft = document.getElementById("btn-dpad-left");
    const dpadRight = document.getElementById("btn-dpad-right");

    if (dpadUp) dpadUp.addEventListener("click", () => moveLockedCoords(-1, 0));
    if (dpadDown) dpadDown.addEventListener("click", () => moveLockedCoords(1, 0));
    if (dpadLeft) dpadLeft.addEventListener("click", () => moveLockedCoords(0, -1));
    if (dpadRight) dpadRight.addEventListener("click", () => moveLockedCoords(0, 1));

    // ボードのタッチ操作イベント (スワイプドラッグによるピース移動)
    if (blokusBoardEl) {
        let isTouchingBoard = false;
        
        blokusBoardEl.addEventListener("touchstart", (e) => {
            if (selectedPieceId === -1 || localGameState.currentTurn !== mySeat) return;
            isTouchingBoard = true;
            handleBoardTouch(e);
        }, { passive: false });

        blokusBoardEl.addEventListener("touchmove", (e) => {
            if (!isTouchingBoard) return;
            e.preventDefault(); // ゲーム中の誤スクロールを防止
            handleBoardTouch(e);
        }, { passive: false });

        blokusBoardEl.addEventListener("touchend", () => {
            isTouchingBoard = false;
            updateBoardHighlight();
        });
    }
}

// 基準座標（ロック位置）を移動させるヘルパー
function moveLockedCoords(dr, dc) {
    if (selectedPieceId === -1 || localGameState.currentTurn !== mySeat) return;

    if (lockedR === -1 || lockedC === -1) {
        // まだ選択されていない場合は、自分のスタート位置から開始
        const startCorner = START_CORNERS[mySeat];
        lockedR = startCorner.r;
        lockedC = startCorner.c;
    } else {
        lockedR = Math.max(0, Math.min(19, lockedR + dr));
        lockedC = Math.max(0, Math.min(19, lockedC + dc));
    }
    hoverR = lockedR;
    hoverC = lockedC;
    sounds.playSelect();
    updateBoardHighlight();
}

// タッチ座標からセルを特定して移動させるヘルパー
function handleBoardTouch(e) {
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!element) return;

    const cell = element.closest(".board-cell");
    if (cell) {
        const r = parseInt(cell.dataset.r);
        const c = parseInt(cell.dataset.c);
        if (!isNaN(r) && !isNaN(c)) {
            if (lockedR !== r || lockedC !== c) {
                lockedR = r;
                lockedC = c;
                hoverR = r;
                hoverC = c;
                updateBoardHighlight();
            }
        }
    }
}

// --- ピースの回転・反転変形ヘルパー ---
function getTransformedCoords(pieceId, rotation, flip) {
    const piece = PIECES_DEF[pieceId];
    if (!piece) return [];
    let coords = piece.coords.map(c => [c[0], c[1]]); // ディープコピー

    // 1. 左右反転
    if (flip) {
        coords = coords.map(c => [c[0], -c[1]]);
    }

    // 2. 回転 (90度単位)
    for (let r = 0; r < rotation; r++) {
        coords = coords.map(c => [c[1], -c[0]]);
    }

    // 3. 正規化 (原点を左上に寄せる)
    let minR = Infinity;
    let minC = Infinity;
    coords.forEach(c => {
        if (c[0] < minR) minR = c[0];
        if (c[1] < minC) minC = c[1];
    });

    return coords.map(c => [c[0] - minR, c[1] - minC]);
}

// --- 配置ルールバリデーション ---
function isValidMove(board, seat, transformedCoords, rOffset, cOffset, isFirstMove) {
    let hasCornerContact = false;
    let hasEdgeContact = false;

    for (let i = 0; i < transformedCoords.length; i++) {
        const r = rOffset + transformedCoords[i][0];
        const c = cOffset + transformedCoords[i][1];

        // 1. 境界チェック
        if (r < 0 || r >= 20 || c < 0 || c >= 20) return false;

        // 2. すでにピースが置かれているかチェック
        if (board[r][c] !== -1) return false;

        // 3. 1手目の特別ルール: スタート位置の隅をカバーしているか
        if (isFirstMove) {
            const startCorner = START_CORNERS[seat];
            if (r === startCorner.r && c === startCorner.c) {
                hasCornerContact = true; // スタート位置自体を接点とする
            }
        } else {
            // 4. 2手目以降: 自分の他のブロックと辺で接していないか ＆ 角で接しているか
            const dirEdges = [[-1, 0], [1, 0], [0, -1], [0, 1]];
            for (let d = 0; d < dirEdges.length; d++) {
                const adjR = r + dirEdges[d][0];
                const adjC = c + dirEdges[d][1];
                if (adjR >= 0 && adjR < 20 && adjC >= 0 && adjC < 20) {
                    if (board[adjR][adjC] === seat) {
                        hasEdgeContact = true;
                    }
                }
            }

            const dirCorners = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
            for (let d = 0; d < dirCorners.length; d++) {
                const adjR = r + dirCorners[d][0];
                const adjC = c + dirCorners[d][1];
                if (adjR >= 0 && adjR < 20 && adjC >= 0 && adjC < 20) {
                    if (board[adjR][adjC] === seat) {
                        hasCornerContact = true;
                    }
                }
            }
        }
    }

    if (isFirstMove) {
        return hasCornerContact;
    } else {
        return hasCornerContact && !hasEdgeContact;
    }
}

// --- 配置可能かチェック (パス判定用) ---
function canPlayerPlaceAnyPiece(board, seat, remainingPieces, isFirstMove) {
    for (let pieceId = 0; pieceId < 21; pieceId++) {
        if (!remainingPieces[pieceId]) continue; // すでに使用済みならスキップ

        // すべての向き (回転4パターン × 反転2パターン)
        for (let rot = 0; rot < 4; rot++) {
            for (let flip = 0; flip < 2; flip++) {
                const coords = getTransformedCoords(pieceId, rot, flip === 1);
                
                // ボード上の全マスをスキャン
                for (let r = 0; r < 20; r++) {
                    for (let c = 0; c < 20; c++) {
                        if (isValidMove(board, seat, coords, r, c, isFirstMove)) {
                            return true; // 1つでも置ける場所があればOK
                        }
                    }
                }
            }
        }
    }
    return false;
}

// --- COM (AI) の思考 & 最善手検索 ---
function findBestMove(board, seat, remainingPieces, isFirstMove) {
    const possibleMoves = [];

    for (let pieceId = 0; pieceId < 21; pieceId++) {
        if (!remainingPieces[pieceId]) continue;

        const pieceDef = PIECES_DEF[pieceId];

        for (let rot = 0; rot < 4; rot++) {
            for (let flip = 0; flip < 2; flip++) {
                const coords = getTransformedCoords(pieceId, rot, flip === 1);

                for (let r = 0; r < 20; r++) {
                    for (let c = 0; c < 20; c++) {
                        if (isValidMove(board, seat, coords, r, c, isFirstMove)) {
                            // 評価値の算出
                            let score = 0;

                            // 1. ピースのサイズ (大きいほど優先的に消費)
                            score += pieceDef.size * 100;

                            // 2. ボード中央への近さ (中央を制圧する)
                            let sumR = 0, sumC = 0;
                            coords.forEach(coord => {
                                sumR += (r + coord[0]);
                                sumC += (c + coord[1]);
                            });
                            const avgR = sumR / coords.length;
                            const avgC = sumC / coords.length;
                            const distFromCenter = Math.sqrt(Math.pow(avgR - 9.5, 2) + Math.pow(avgC - 9.5, 2));
                            score += (15 - distFromCenter) * 10; // 近いほどプラス

                            // 3. 次の手のための角の創出数 (簡易評価: 置いた後の自分の角の数を概算)
                            let futureCorners = 0;
                            coords.forEach(coord => {
                                const pr = r + coord[0];
                                const pc = c + coord[1];
                                const dirCorners = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
                                dirCorners.forEach(dc => {
                                    const cr = pr + dc[0];
                                    const cc = pc + dc[1];
                                    if (cr >= 0 && cr < 20 && cc >= 0 && cc < 20) {
                                        if (board[cr][cc] === -1) {
                                            futureCorners++;
                                        }
                                    }
                                });
                            });
                            score += futureCorners * 5;

                            possibleMoves.push({
                                pieceId: pieceId,
                                rotation: rot,
                                flip: flip === 1,
                                r: r,
                                c: c,
                                coords: coords,
                                score: score
                            });
                        }
                    }
                }
            }
        }
    }

    if (possibleMoves.length === 0) return null;

    // 評価値でソート (降順)
    possibleMoves.sort((a, b) => b.score - a.score);

    // 少しだけランダム性を加味するため、上位数件からランダムで選択する
    const candidatesCount = Math.min(3, possibleMoves.length);
    const randomIndex = Math.floor(Math.random() * candidatesCount);
    return possibleMoves[randomIndex];
}

// --- 練習戦 (オフライン対戦) ---
function startPracticeGame() {
    gameMode = "practice";
    isHost = true;
    mySeat = 0; // 自分がプレイヤー1 (青)

    const initialBoard = Array(20).fill(null).map(() => Array(20).fill(-1));
    const initialPieces = {};
    for (let s = 0; s < 4; s++) {
        initialPieces[s] = Array(21).fill(true);
    }

    localGameState = {
        status: "playing",
        rules: { comCount: 3 },
        players: [
            { uid: myUid, name: myName, seat: 0, isBot: false },
            { uid: "bot_1", name: "COM1", seat: 1, isBot: true },
            { uid: "bot_2", name: "COM2", seat: 2, isBot: true },
            { uid: "bot_3", name: "COM3", seat: 3, isBot: true }
        ],
        board: initialBoard,
        currentTurn: 0,
        scores: [0, 0, 0, 0],
        playerPieces: initialPieces,
        passStates: [false, false, false, false],
        lastPlacement: null
    };

    welcomeScreen.classList.add("hidden");
    blokusTable.classList.remove("hidden");

    selectedPieceId = -1;
    currentRotation = 0;
    currentFlip = false;
    lockedR = -1;
    lockedC = -1;
    if (btnPlacePiece) btnPlacePiece.classList.add("hidden");

    // スマホ表示時に設定パネルを自動で折りたたむ
    if (controlPanel && window.innerWidth <= 1024) {
        controlPanel.classList.remove("open");
        if (drawerOverlay) drawerOverlay.classList.add("hidden");
    }

    renderBoard();
    renderPalette();
    renderPlayerCards();
    updatePreview();

    // 最初のプレイヤーのパスチェックをして開始
    checkTurnAndAI();
}

// --- ロード・描画処理 ---
function renderBoard() {
    blokusBoardEl.innerHTML = "";
    const board = localGameState.board;

    for (let r = 0; r < 20; r++) {
        for (let c = 0; c < 20; c++) {
            const cell = document.createElement("div");
            cell.className = "board-cell";
            cell.dataset.r = r;
            cell.dataset.c = c;

            // 置かれたピース
            const val = board[r][c];
            if (val !== -1) {
                cell.classList.add("placed-p" + val);
            }

            // スタート地点
            if (r === 0 && c === 0) cell.classList.add("start-corner-0");
            if (r === 0 && c === 19) cell.classList.add("start-corner-1");
            if (r === 19 && c === 19) cell.classList.add("start-corner-2");
            if (r === 19 && c === 0) cell.classList.add("start-corner-3");

            // マウスホバー・クリックイベント
            cell.addEventListener("mouseenter", () => handleCellMouseEnter(r, c));
            cell.addEventListener("mouseleave", () => handleCellMouseLeave());
            cell.addEventListener("click", () => handleCellClick(r, c));

            blokusBoardEl.appendChild(cell);
        }
    }
}

function renderPalette() {
    myPiecesPaletteEl.innerHTML = "";
    const remaining = localGameState.playerPieces[mySeat];
    let remainingCount = 0;

    for (let pieceId = 0; pieceId < 21; pieceId++) {
        const item = document.createElement("div");
        item.className = "palette-item";
        item.dataset.pieceId = pieceId;

        if (!remaining[pieceId]) {
            item.classList.add("used");
        } else {
            remainingCount++;
            item.addEventListener("click", () => handlePaletteItemClick(pieceId));
            if (selectedPieceId === pieceId) {
                item.classList.add("selected");
            }
        }

        // ピースのミニグリッド描画
        const piece = PIECES_DEF[pieceId];
        const minigrid = document.createElement("div");
        minigrid.className = "palette-grid";
        
        // 最大サイズを測る
        let maxR = 0, maxC = 0;
        piece.coords.forEach(c => {
            if (c[0] > maxR) maxR = c[0];
            if (c[1] > maxC) maxC = c[1];
        });

        minigrid.style.gridTemplateRows = `repeat(${maxR + 1}, 8px)`;
        minigrid.style.gridTemplateColumns = `repeat(${maxC + 1}, 8px)`;

        // 各セル
        for (let r = 0; r <= maxR; r++) {
            for (let c = 0; c <= maxC; c++) {
                const cell = document.createElement("div");
                cell.className = "palette-cell";
                const isFilled = piece.coords.some(co => co[0] === r && co[1] === c);
                if (isFilled) {
                    cell.classList.add("filled");
                }
                minigrid.appendChild(cell);
            }
        }

        item.appendChild(minigrid);
        myPiecesPaletteEl.appendChild(item);
    }

    document.getElementById("my-remaining-pieces-count").textContent = remainingCount;
}

function renderPlayerCards() {
    const scores = localGameState.scores;
    const currentTurn = localGameState.currentTurn;
    const passStates = localGameState.passStates;
    const players = localGameState.players;

    for (let seat = 0; seat < 4; seat++) {
        const card = document.getElementById("card-p" + seat);
        const nameEl = document.getElementById("name-p" + seat);
        const scoreEl = document.getElementById("score-p" + seat);

        if (!card) continue;

        // プレイヤー名の表示
        const playerObj = players.find(p => p.seat === seat);
        if (playerObj) {
            nameEl.textContent = playerObj.name + (playerObj.uid === myUid ? " (あなた)" : "");
        } else {
            nameEl.textContent = PLAYER_NAMES[seat];
        }

        scoreEl.textContent = scores[seat];

        // ターン、パスのクラス処理
        card.classList.toggle("active-turn", currentTurn === seat);
        card.classList.toggle("pass-status", passStates[seat]);
    }
}

function updatePreview() {
    previewContainerEl.innerHTML = "";
    if (selectedPieceId === -1) {
        previewContainerEl.style.display = "none";
        return;
    }
    previewContainerEl.style.display = "grid";

    const coords = getTransformedCoords(selectedPieceId, currentRotation, currentFlip);
    let maxR = 0, maxC = 0;
    coords.forEach(c => {
        if (c[0] > maxR) maxR = c[0];
        if (c[1] > maxC) maxC = c[1];
    });

    const gridDim = Math.max(maxR, maxC) + 1;
    previewContainerEl.style.gridTemplateRows = `repeat(${gridDim}, 18px)`;
    previewContainerEl.style.gridTemplateColumns = `repeat(${gridDim}, 18px)`;

    for (let r = 0; r < gridDim; r++) {
        for (let c = 0; c < gridDim; c++) {
            const cell = document.createElement("div");
            cell.className = "preview-cell";
            const isFilled = coords.some(co => co[0] === r && co[1] === c);
            if (isFilled) {
                cell.classList.add("filled");
                cell.classList.add("color-p" + mySeat);
            }
            previewContainerEl.appendChild(cell);
        }
    }
}

// --- 操作ハンドラ ---
function handlePaletteItemClick(pieceId) {
    if (localGameState.currentTurn !== mySeat) return;
    sounds.playSelect();
    if (selectedPieceId === pieceId) {
        selectedPieceId = -1;
        lockedR = -1;
        lockedC = -1;
    } else {
        selectedPieceId = pieceId;
        currentRotation = 0;
        currentFlip = false;
        lockedR = -1;
        lockedC = -1;
    }
    if (btnPlacePiece) btnPlacePiece.classList.add("hidden");
    renderPalette();
    updatePreview();
    updateBoardHighlight();
}

function handleCellMouseEnter(r, c) {
    if (selectedPieceId === -1 || localGameState.currentTurn !== mySeat) return;
    if (lockedR === -1) {
        hoverR = r;
        hoverC = c;
        updateBoardHighlight();
    }
}

function handleCellMouseLeave() {
    if (lockedR === -1) {
        hoverR = -1;
        hoverC = -1;
        clearBoardHighlight();
    }
}

function clearBoardHighlight() {
    const cells = blokusBoardEl.querySelectorAll(".board-cell");
    cells.forEach(cell => {
        cell.classList.remove("preview-valid", "preview-invalid");
    });
}

function updateBoardHighlight() {
    clearBoardHighlight();
    
    const activeR = lockedR !== -1 ? lockedR : hoverR;
    const activeC = lockedC !== -1 ? lockedC : hoverC;

    if (selectedPieceId === -1 || activeR === -1 || activeC === -1) {
        if (btnPlacePiece) btnPlacePiece.classList.add("hidden");
        return;
    }

    const board = localGameState.board;
    const coords = getTransformedCoords(selectedPieceId, currentRotation, currentFlip);
    
    // 最初の配置かどうか
    const isFirstMove = localGameState.scores[mySeat] === 0;
    
    const isValid = isValidMove(board, mySeat, coords, activeR, activeC, isFirstMove);

    coords.forEach(coord => {
        const targetR = activeR + coord[0];
        const targetC = activeC + coord[1];
        if (targetR >= 0 && targetR < 20 && targetC >= 0 && targetC < 20) {
            const cell = blokusBoardEl.querySelector(`.board-cell[data-r="${targetR}"][data-c="${targetC}"]`);
            if (cell) {
                cell.classList.add(isValid ? "preview-valid" : "preview-invalid");
            }
        }
    });

    // 決定ボタンの状態更新
    if (btnPlacePiece) {
        if (localGameState.currentTurn === mySeat && lockedR !== -1) {
            btnPlacePiece.classList.remove("hidden");
            if (isValid) {
                btnPlacePiece.classList.remove("invalid");
                btnPlacePiece.classList.add("valid");
                btnPlacePiece.disabled = false;
            } else {
                btnPlacePiece.classList.remove("valid");
                btnPlacePiece.classList.add("invalid");
                btnPlacePiece.disabled = true;
            }
        } else {
            btnPlacePiece.classList.add("hidden");
        }
    }
}

function handleCellClick(r, c) {
    if (selectedPieceId === -1 || localGameState.currentTurn !== mySeat) return;

    const board = localGameState.board;
    const coords = getTransformedCoords(selectedPieceId, currentRotation, currentFlip);
    const isFirstMove = localGameState.scores[mySeat] === 0;

    // すでに同じセルがロックされており、配置が有効なら確定する（ダブルタップ確定）
    if (lockedR === r && lockedC === c) {
        if (isValidMove(board, mySeat, coords, r, c, isFirstMove)) {
            placePiece(mySeat, selectedPieceId, coords, r, c);
        } else {
            sounds.playError();
        }
    } else {
        // そうでなければ、タップした位置をロック
        lockedR = r;
        lockedC = c;
        hoverR = r;
        hoverC = c;
        updateBoardHighlight();
    }
}

// --- ピース配置の処理 ---
function placePiece(seat, pieceId, coords, rOffset, cOffset) {
    sounds.playPlace();
    // 1. ボードの更新
    const board = localGameState.board;
    coords.forEach(coord => {
        const r = rOffset + coord[0];
        const c = cOffset + coord[1];
        board[r][c] = seat;
    });

    // 2. 残りピースの更新
    localGameState.playerPieces[seat][pieceId] = false;

    // 3. スコアの更新 (置いたマス数をスコアとして加算)
    const pieceSize = PIECES_DEF[pieceId].size;
    localGameState.scores[seat] += pieceSize;

    // すべて置ききった場合の特別ボーナス
    const hasRemaining = localGameState.playerPieces[seat].some(r => r);
    if (!hasRemaining) {
        // すべて置いたら +15
        localGameState.scores[seat] += 15;
        // 最後に置いたのが1マスのピース (id: 0) だった場合はさらに +20
        if (pieceId === 0) {
            localGameState.scores[seat] += 20;
        }
    }

    localGameState.lastPlacement = { seat, pieceId, rOffset, cOffset };

    // 手動操作時のクリーンアップ
    if (seat === mySeat) {
        selectedPieceId = -1;
        lockedR = -1;
        lockedC = -1;
        if (btnPlacePiece) btnPlacePiece.classList.add("hidden");
    }

    // ターンを回す
    nextTurn();
}

function nextTurn() {
    let nextSeat = localGameState.currentTurn;
    let loopCount = 0;

    while (loopCount < 4) {
        nextSeat = (nextSeat + 1) % 4;
        loopCount++;

        // すでにパスしているかチェック
        if (localGameState.passStates[nextSeat]) continue;

        // 次のプレイヤーが置けるか検証
        const isFirstMove = localGameState.scores[nextSeat] === 0;
        const canPlace = canPlayerPlaceAnyPiece(
            localGameState.board, 
            nextSeat, 
            localGameState.playerPieces[nextSeat], 
            isFirstMove
        );

        if (canPlace) {
            localGameState.currentTurn = nextSeat;
            saveGameState();
            checkTurnAndAI();
            return;
        } else {
            // 置けないのでパス扱いにする
            localGameState.passStates[nextSeat] = true;
        }
    }

    // 全員パスした場合はゲーム終了
    endGame();
}

function saveGameState() {
    if (gameMode === "practice") {
        renderBoard();
        renderPalette();
        renderPlayerCards();
        updatePreview();
    } else {
        // オンライン対戦時はFirebaseを更新
        if (isHost && roomRef) {
            roomRef.set(localGameState);
        } else if (roomRef) {
            // 自分の番の更新のみ同期
            roomRef.set(localGameState);
        }
    }
}

// --- COM思考の実行トリガー ---
let isComThinking = false;
function checkTurnAndAI() {
    const state = localGameState;
    if (state.status !== "playing") return;

    const currentTurn = state.currentTurn;
    const playerObj = state.players.find(p => p.seat === currentTurn);

    if (playerObj && playerObj.isBot) {
        // CPU の思考（ホストのみが実行を代行する）
        if (isHost && !isComThinking) {
            isComThinking = true;
            setTimeout(() => {
                const isFirstMove = state.scores[currentTurn] === 0;
                const botMove = findBestMove(
                    state.board, 
                    currentTurn, 
                    state.playerPieces[currentTurn], 
                    isFirstMove
                );

                isComThinking = false;
                if (botMove) {
                    placePiece(currentTurn, botMove.pieceId, botMove.coords, botMove.r, botMove.c);
                } else {
                    // 置ける場所がないためパス
                    state.passStates[currentTurn] = true;
                    nextTurn();
                }
            }, 800); // 思考時間演出のディレイ
        }
    }
}

function endGame() {
    sounds.playGameOver();
    localGameState.status = "gameover";
    saveGameState();

    if (gameMode === "practice") {
        showGameOverScreen();
    }
}

function showGameOverScreen() {
    resultModal.classList.remove("hidden");
    
    // スコアボードの順位計算
    const rankings = [];
    for (let seat = 0; seat < 4; seat++) {
        const playerObj = localGameState.players.find(p => p.seat === seat);
        rankings.push({
            seat: seat,
            name: playerObj ? playerObj.name : PLAYER_NAMES[seat],
            score: localGameState.scores[seat]
        });
    }

    // スコア降順ソート
    rankings.sort((a, b) => b.score - a.score);

    finalRankingsEl.innerHTML = "";
    const rankClasses = ["rank-1st", "rank-2nd", "rank-3rd", "rank-other"];

    rankings.forEach((r, idx) => {
        const row = document.createElement("div");
        row.className = `ranking-row ${rankClasses[idx]}`;

        const colorDot = document.createElement("span");
        colorDot.className = `ranking-color ${PLAYER_CLASSES[r.seat]}`;

        const rankNum = document.createElement("span");
        rankNum.className = "ranking-num";
        rankNum.textContent = (idx + 1) + (idx === 0 ? "ST" : idx === 1 ? "ND" : idx === 2 ? "RD" : "TH");

        const nameEl = document.createElement("span");
        nameEl.className = "ranking-name";
        nameEl.textContent = r.name + (r.seat === mySeat && gameMode === "online" ? " (あなた)" : "");

        const scoreEl = document.createElement("span");
        scoreEl.className = "ranking-score";
        scoreEl.textContent = r.score + " pts";

        row.appendChild(colorDot);
        row.appendChild(rankNum);
        row.appendChild(nameEl);
        row.appendChild(scoreEl);

        finalRankingsEl.appendChild(row);
    });
}

function resetToLobby() {
    welcomeScreen.classList.remove("hidden");
    blokusTable.classList.add("hidden");
    
    if (gameMode === "online") {
        lobbyActiveView.classList.add("hidden");
        lobbyInitView.classList.remove("hidden");
        if (roomRef) {
            roomRef.off();
            roomRef = null;
        }
    }
}

// --- オンラインマルチプレイ同期 (Firebase) ---
function createOnlineRoom(roomId) {
    currentRoomId = roomId;
    isHost = true;
    mySeat = 0; // 青プレイヤー

    roomRef = database.ref("blokus/rooms/" + roomId);

    const initialRoomData = {
        status: "waiting",
        rules: { comCount: parseInt(ruleComCountSelect.value) },
        players: [
            { uid: myUid, name: myName, isReady: true, isHost: true, seat: 0 }
        ]
    };

    roomRef.set(initialRoomData).then(() => {
        displayRoomId.textContent = roomId;
        lobbyInitView.classList.add("hidden");
        lobbyWaitingView.classList.remove("hidden");
        welcomeScreen.classList.add("hidden");
        blokusTable.classList.add("hidden");

        listenToRoomChanges();
    });
}

function joinOnlineRoom(roomId) {
    currentRoomId = roomId;
    isHost = false;

    roomRef = database.ref("blokus/rooms/" + roomId);
    roomRef.once("value").then(snapshot => {
        if (!snapshot.exists()) {
            alert("ルームが見つかりません。");
            return;
        }

        const roomData = snapshot.val();
        if (roomData.status !== "waiting") {
            alert("すでにゲームが開始されています。");
            return;
        }

        const comCount = roomData.rules ? (roomData.rules.comCount || 3) : 3;
        const players = roomData.players || [];
        if (players.length + comCount >= 4) {
            alert("ルームが満員です。");
            return;
        }

        // 空席を見つける
        const seatsUsed = players.map(p => p.seat);
        let assignedSeat = -1;
        for (let seat = 0; seat < 4; seat++) {
            if (!seatsUsed.includes(seat)) {
                // COM用の予約席は避ける
                let isReservedForBot = false;
                for (let i = 0; i < comCount; i++) {
                    if (seat === (3 - i)) isReservedForBot = true;
                }
                if (!isReservedForBot) {
                    assignedSeat = seat;
                    break;
                }
            }
        }

        if (assignedSeat === -1) {
            for (let seat = 0; seat < 4; seat++) {
                if (!seatsUsed.includes(seat)) {
                    assignedSeat = seat;
                    break;
                }
            }
        }

        mySeat = assignedSeat;
        const newPlayer = {
            uid: myUid,
            name: myName,
            isReady: true,
            isHost: false,
            seat: mySeat
        };

        players.push(newPlayer);

        roomRef.child("players").set(players).then(() => {
            displayRoomId.textContent = roomId;
            lobbyInitView.classList.add("hidden");
            lobbyWaitingView.classList.remove("hidden");
            startGameBtn.classList.add("hidden"); // ゲストなので非表示

            welcomeScreen.classList.add("hidden");
            blokusTable.classList.add("hidden");

            listenToRoomChanges();
        });
    });
}

function listenToRoomChanges() {
    roomRef.on("value", snapshot => {
        if (!snapshot.exists()) {
            resetToLobby();
            return;
        }

        const roomData = snapshot.val();
        localGameState = roomData;

        if (roomData.rules) {
            ruleComCountSelect.value = roomData.rules.comCount !== undefined ? roomData.rules.comCount.toString() : "3";
        }

        const shouldDisableSettings = !isHost || roomData.status !== "waiting";
        ruleComCountSelect.disabled = shouldDisableSettings;

        updateLobbyUI(roomData.players || []);

        if (roomData.status === "waiting") {
            if (isHost) {
                const comCount = roomData.rules ? (roomData.rules.comCount || 3) : 3;
                const total = (roomData.players || []).length + comCount;
                if (total >= 4) {
                    startGameBtn.classList.remove("hidden");
                } else {
                    startGameBtn.classList.add("hidden");
                }
            }
        } else if (roomData.status === "playing") {
            lobbyWaitingView.classList.add("hidden");
            lobbyActiveView.classList.remove("hidden");
            welcomeScreen.classList.add("hidden");
            blokusTable.classList.remove("hidden");

            // スマホ表示時に設定パネルを自動で折りたたむ
            if (controlPanel && window.innerWidth <= 1024) {
                controlPanel.classList.remove("open");
                if (drawerOverlay) drawerOverlay.classList.add("hidden");
            }

            renderBoard();
            renderPalette();
            renderPlayerCards();

            if (isHost) {
                checkTurnAndAI();
            }
        } else if (roomData.status === "gameover") {
            showGameOverScreen();
        }
    });
}

function updateLobbyUI(players) {
    for (let i = 0; i < 4; i++) {
        const slotEl = document.querySelector(`.player-slot[data-slot="${i}"] .slot-name`);
        if (slotEl) slotEl.textContent = "空きスロット (待機中)";
    }

    players.forEach(p => {
        const slotEl = document.querySelector(`.player-slot[data-slot="${p.seat}"] .slot-name`);
        if (slotEl) {
            slotEl.textContent = p.name + (p.uid === myUid ? " (あなた)" : "");
        }
    });

    const comCount = localGameState.rules ? (localGameState.rules.comCount || 3) : 3;
    for (let i = 0; i < comCount; i++) {
        const botSeat = 3 - i;
        const hasPlayer = players.some(p => p.seat === botSeat);
        if (!hasPlayer) {
            const slotEl = document.querySelector(`.player-slot[data-slot="${botSeat}"] .slot-name`);
            if (slotEl) slotEl.textContent = "COM" + botSeat + " (CPU)";
        }
    }
}

function setupBotsAndStartOnlineGame() {
    const players = localGameState.players || [];
    const filledPlayers = [...players];
    const seatsUsed = players.map(p => p.seat);
    const comCount = localGameState.rules ? (localGameState.rules.comCount || 3) : 3;

    for (let i = 0; i < comCount; i++) {
        const botSeat = 3 - i;
        if (!seatsUsed.includes(botSeat)) {
            filledPlayers.push({
                uid: "bot_" + botSeat,
                name: "COM" + botSeat,
                isBot: true,
                seat: botSeat,
                isReady: true
            });
        }
    }

    // 4人未満のフォールバック
    const finalSeatsUsed = filledPlayers.map(p => p.seat);
    for (let seat = 0; seat < 4; seat++) {
        if (!finalSeatsUsed.includes(seat)) {
            filledPlayers.push({
                uid: "bot_" + seat,
                name: "COM" + seat,
                isBot: true,
                seat: seat,
                isReady: true
            });
        }
    }

    filledPlayers.sort((a, b) => a.seat - b.seat);

    const initialBoard = Array(20).fill(null).map(() => Array(20).fill(-1));
    const initialPieces = {};
    for (let s = 0; s < 4; s++) {
        initialPieces[s] = Array(21).fill(true);
    }

    const startPayload = {
        status: "playing",
        rules: localGameState.rules,
        players: filledPlayers,
        board: initialBoard,
        currentTurn: 0,
        scores: [0, 0, 0, 0],
        playerPieces: initialPieces,
        passStates: [false, false, false, false],
        lastPlacement: null
    };

    roomRef.set(startPayload);
}

function leaveCurrentRoom() {
    if (roomRef) {
        if (isHost) {
            roomRef.remove(); // 部屋の削除
        } else {
            // プレイヤーリストから削除
            const players = (localGameState.players || []).filter(p => p.uid !== myUid);
            roomRef.child("players").set(players);
        }
        resetToLobby();
    }
}
