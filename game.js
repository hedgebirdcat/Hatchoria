// ======================================
// Hatchoria
// game.js
// Version 2.0
// ゲーム本体
// ======================================

import { auth } from "./firebase.js";

import {
    loadSaveData,
    saveGame,
    addXP,
    addCoins,
    levelUp,
    getPlayerData
} from "./save.js";

// ======================================
// ゲーム変数
// ======================================

let player = null;

let currentQuestion = null;
let currentAnswer = "";

let combo = 0;
let maxCombo = 0;

let bonusMode = false;

let gameStarted = false;

// ======================================
// 初期化
// ======================================

window.addEventListener("DOMContentLoaded", async () => {

    console.log("game.js 起動");

    // Firebaseからロード
    player = await loadSaveData();

    if (!player) {

        console.log("プレイヤーデータ取得失敗");

        return;

    }

    console.log("プレイヤーデータ取得成功");

    initializeGame();

});

// ======================================
// 初期設定
// ======================================

function initializeGame() {

    gameStarted = true;

    updateDisplay();

}

// ======================================
// 画面更新
// ======================================

function updateDisplay() {

    console.log("画面更新");

}
