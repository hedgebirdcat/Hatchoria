// ======================================
// Hatchoria
// game.js
// Version 3.0 (作り直し版)
// クイズゲーム本体
// ======================================

import { auth } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    loadSaveData,
    saveGame,
    getPlayerData
} from "./save.js";

// ======================================
// 単語データ (実験用に3単語のみ)
// ======================================

const quizData = [
    { q: "apple", a: ["りんご", "リンゴ", "林檎"] },
    { q: "sun",   a: ["太陽", "たいよう"] },
    { q: "water", a: ["水", "みず"] }
];

// ======================================
// ゲーム内定数
// ======================================

const MAX_LIFE = 3;
const BONUS_STAGE_RATE = 0.1;   // ボーナスステージの出現率
const BONUS_XP = 40;            // ボーナスステージ正解時の追加XP
const BASE_XP = 10;             // 通常正解のXP
const COMBO_BONUS_STEP = 5;     // このコンボ数ごとにXPボーナスが増える
const COMBO_BONUS_XP = 5;       // コンボボーナスの増加量
const LEVELUP_COIN_REWARD = 10; // レベルアップ時のコイン報酬
const DEFAULT_GOAL = 50;        // 初期の必要XP(Firestoreに未設定の場合)
const DEFAULT_MONSTER = "leaf"; // モンスター種類が未設定の場合のデフォルト

// レベルに応じた進化段階(home.jsのupdateMonster()と同じ基準)
function getMonsterStage(level) {

    if (level >= 70) return 5;
    if (level >= 40) return 4;
    if (level >= 20) return 3;
    if (level >= 10) return 2;
    return 1;

}

// ======================================
// ゲーム状態(このセッションのみ・保存対象外)
// ======================================

let player = null;

let currentQuiz = null;
let combo = 0;
let life = MAX_LIFE;
let correctAnswersCount = 0;
let isBonusStage = false;
let isWaiting = false;

// ======================================
// DOM要素
// ======================================

let els = {};

function cacheElements() {

    els = {
        lifeContainer: document.getElementById("life-container"),
        comboDisplay: document.getElementById("combo-display"),
        lvNum: document.getElementById("game-lv-num"),
        xpFill: document.getElementById("game-xp-fill"),
        xpText: document.getElementById("game-xp-text"),
        coinText: document.getElementById("game-coin-text-play"),
        xpPopupArea: document.getElementById("game-xp-popup-area"),
        charDisplay: document.getElementById("char-display"),
        qDisplay: document.getElementById("q-display"),
        ansInput: document.getElementById("ans-input"),
        checkBtn: document.getElementById("check-btn"),
        nextBtn: document.getElementById("next-btn"),
        judgeOverlay: document.getElementById("judge-overlay"),
        judgeMark: document.getElementById("judge-mark"),
        bonusStartLogo: document.getElementById("bonus-start-logo")
    };

}

// ======================================
// 初期化
// ======================================

// onAuthStateChanged は複数回呼ばれることがあるため、
// ゲームの初期化・イベント登録は最初の1回だけ行う
let hasInitialized = false;

window.addEventListener("DOMContentLoaded", () => {

    console.log("game.js 起動");

    cacheElements();

    if (!els.qDisplay) {

        // ゲーム画面が存在しないページ(このモジュールは game-screen 前提)
        console.log("ゲーム画面が見つかりません。game.jsを終了します。");
        return;

    }

    // Firebaseの認証状態が確定するまで待つ
    // (ページ遷移直後は auth.currentUser がまだ null のことがあるため、
    //  onAuthStateChanged を使わずに直接読みに行くとログイン画面に
    //  戻されてしまう)
    onAuthStateChanged(auth, async (user) => {

        if (!user) {

            console.log("未ログインです。ログイン画面に戻ります。");

            if (hasInitialized) {
                // ゲーム中にログアウトされた場合のみ遷移
                window.location.href = "index.html";
            }

            return;

        }

        if (hasInitialized) return;
        hasInitialized = true;

        // Firebaseからロード
        player = await loadSaveData();

        if (!player) {

            console.log("プレイヤーデータ取得失敗。ログイン画面に戻ります。");
            window.location.href = "index.html";
            return;

        }

        // 必要XP(goal)が未設定の場合は初期値を補う
        if (!player.goal) {
            player.goal = DEFAULT_GOAL;
        }

        // モンスターの種類が未設定の場合は初期値を補う
        if (!player.monster) {
            player.monster = DEFAULT_MONSTER;
        }

        // monsterLevelが未設定の場合はlevelに合わせておく
        // (Firestoreへのupdateはundefinedの値があるとエラーになるため)
        if (!player.monsterLevel) {
            player.monsterLevel = player.level;
        }

        console.log("プレイヤーデータ取得成功");

        // home.html側の(まだFirebase化されていない)スクリプトが
        // コイン・レベル等を同じデータとして参照・保存できるように、
        // プレイヤーデータと保存関数を window 経由で公開する。
        // これにより「ゲーム画面のコイン」と「ホーム画面のコイン」が
        // 常に同じ数字になる(同じオブジェクトを見ているだけなので)。
        window.HatchoriaPlayer = player;
        window.HatchoriaSave = { save: saveGame };
        window.dispatchEvent(new Event("hatchoria:playerReady"));

        initializeGame();

        // イベント登録
        els.checkBtn.addEventListener("click", handleCheck);
        els.nextBtn.addEventListener("click", handleNext);

        window.addEventListener("keydown", (e) => {

            if (e.key !== "Enter") return;

            if (isWaiting) {
                handleNext();
            } else {
                handleCheck();
            }

        });

    });

});

// screenNav.js から「ゲーム画面に入った」通知を受けたら
// 新しいラウンドを開始する
window.addEventListener("hatchoria:enterGame", () => {

    if (!hasInitialized || !player) return;

    initializeGame();

});

// ======================================
// 初期設定
// ======================================

function initializeGame() {

    life = MAX_LIFE;
    combo = 0;
    correctAnswersCount = 0;

    nextQuestion();
    updateDisplay();

}

// ======================================
// 出題
// ======================================

function nextQuestion() {

    isBonusStage = Math.random() < BONUS_STAGE_RATE;

    if (isBonusStage) {
        showBonusLogo();
    }

    currentQuiz = quizData[Math.floor(Math.random() * quizData.length)];

    els.qDisplay.innerText =
        (isBonusStage ? "★BONUS★ " : "") + currentQuiz.q + " の意味は？";

    els.ansInput.value = "";
    els.ansInput.focus();

    els.checkBtn.style.display = "inline-block";
    els.nextBtn.style.display = "none";

    isWaiting = false;

}

// ======================================
// 「次へ進む」ボタン
// ======================================

function handleNext() {

    if (life <= 0) return;

    nextQuestion();
    updateDisplay();

}

// ======================================
// 回答判定
// ======================================

function handleCheck() {

    if (isWaiting) return;

    const value = els.ansInput.value.trim();

    if (!value) return;

    if (currentQuiz.a.includes(value)) {

        handleCorrect();

    } else {

        handleWrong();

    }

    els.checkBtn.style.display = "none";

    if (life > 0) {
        els.nextBtn.style.display = "inline-block";
    }

    isWaiting = true;

    updateDisplay();
    persist();

}

// ======================================
// 正解時の処理
// ======================================

function handleCorrect() {

    showJudgeMark("○");

    combo++;
    correctAnswersCount++;

    const comboBonus = Math.floor(combo / COMBO_BONUS_STEP) * COMBO_BONUS_XP;
    let gainedXP = BASE_XP + comboBonus;

    let popupText = `+${gainedXP} XP`;
    let isSpecialPopup = false;

    if (isBonusStage) {

        gainedXP += BONUS_XP;
        popupText = `★BONUS★ +${gainedXP} XP`;
        isSpecialPopup = true;

    } else if (combo % COMBO_BONUS_STEP === 0) {

        popupText += ` (🔥${combo}コンボ！)`;

    }

    player.exp += gainedXP;

    showXpPopup(popupText, isSpecialPopup);

    // レベルアップ判定
    while (player.exp >= player.goal) {

        player.exp -= player.goal;
        player.level++;
        player.goal += 10;
        player.coins += LEVELUP_COIN_REWARD;

    }

}

// ======================================
// 不正解時の処理
// ======================================

function handleWrong() {

    showJudgeMark("×");

    combo = 0;
    life--;

    shakeLife();

    if (life <= 0) {

        handleGameOver();

    }

}

// ======================================
// ゲームオーバー
// ======================================

function handleGameOver() {

    els.qDisplay.innerText = "GAME OVER";
    els.nextBtn.style.display = "none";

    setTimeout(() => {

        initializeGame();

    }, 2000);

}

// ======================================
// Firebaseへ保存
// ======================================

async function persist() {

    await saveGame();

}

// ======================================
// 画面表示更新
// ======================================

function updateDisplay() {

    els.lifeContainer.innerText =
        "❤️".repeat(life) + "💔".repeat(MAX_LIFE - life);

    els.comboDisplay.innerText = `🔥×${combo} COMBO!`;

    els.lvNum.innerText = "Lv." + player.level;
    els.xpFill.style.width = (player.exp / player.goal * 100) + "%";
    els.xpText.innerText = `${player.exp}/${player.goal}`;
    els.coinText.innerText = "🪙 " + player.coins;

    const stage = getMonsterStage(player.level);
    els.charDisplay.innerHTML =
        `<img src="assets/images/${player.monster}_${stage}.png" alt="character">`;

}

// ======================================
// 演出まわり
// ======================================

function showJudgeMark(mark) {

    els.judgeOverlay.style.display = "block";
    els.judgeMark.innerText = mark;
    els.judgeMark.style.color = mark === "○" ? "red" : "#3399ff";

    els.judgeOverlay.classList.remove("show");
    void els.judgeOverlay.offsetWidth;
    els.judgeOverlay.classList.add("show");

    setTimeout(() => {

        els.judgeOverlay.classList.remove("show");
        els.judgeOverlay.style.display = "none";

    }, 1000);

}

function showXpPopup(text, isSpecial) {

    if (!els.xpPopupArea) return;

    els.xpPopupArea.innerHTML = "";

    const pop = document.createElement("div");
    pop.className = isSpecial ? "xp-gain-popup special-bonus" : "xp-gain-popup";
    pop.innerText = text;

    els.xpPopupArea.appendChild(pop);

    setTimeout(() => {
        pop.remove();
    }, 1800);

}

function shakeLife() {

    els.lifeContainer.classList.add("shake-anim");

    setTimeout(() => {
        els.lifeContainer.classList.remove("shake-anim");
    }, 500);

}

function showBonusLogo() {

    if (!els.bonusStartLogo) return;

    document.body.classList.add("bonus-active");

    els.bonusStartLogo.classList.remove("bonus-anime-active");
    void els.bonusStartLogo.offsetWidth;
    els.bonusStartLogo.classList.add("bonus-anime-active");

    setTimeout(() => {

        els.bonusStartLogo.classList.remove("bonus-anime-active");
        document.body.classList.remove("bonus-active");

    }, 2500);

}
