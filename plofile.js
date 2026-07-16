// ======================================
// Hatchoria
// profile.js
// プロフィール・設定・アカウント作成(Firebase統一版)
// ======================================
//
// アカウント名・フレンドコードは save.js が管理する
// Firestore上のプレイヤーデータ(accountName / friendCode)を
// そのまま読み書きする。ここではローカルの username/usercode は持たない。

import { getPlayerData, saveGame } from "./save.js";

const DEFAULT_MONSTER = "leaf";
const DEFAULT_GOAL = 50;

let els = {};

function cacheElements() {

    els = {
        settingBtn: document.getElementById("setting-btn"),
        settingMenuOverlay: document.getElementById("setting-menu-overlay"),
        settingMenuCloseBtn: document.getElementById("setting-menu-close-btn"),
        menuProfileBtn: document.getElementById("menu-profile-btn"),
        menuResetBtn: document.getElementById("menu-reset-btn"),

        profileOverlay: document.getElementById("profile-overlay"),
        profileCloseBtn: document.getElementById("profile-close-btn"),
        profileCopyBtn: document.getElementById("profile-copy-btn"),
        profileNameDisplay: document.getElementById("profile-name-display"),
        profileCodeDisplay: document.getElementById("profile-code-display"),

        accountCreationOverlay: document.getElementById("account-creation-overlay"),
        accountNameInput: document.getElementById("account-name-input"),
        accountSubmitBtn: document.getElementById("account-submit-btn")
    };

}

// ======================================
// フレンドコード生成
// ======================================

function generateFriendCode() {

    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";

    for (let i = 0; i < 10; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;

}

// ======================================
// 初回アカウント名設定(フレンドコード未発行の場合のみ)
// ======================================

function checkAccountSetup() {

    const player = getPlayerData();

    if (!player) return;

    if (!player.friendCode) {
        els.accountCreationOverlay.classList.add("show");
    }

}

function submitAccountName() {

    const player = getPlayerData();

    if (!player) return;

    const inputName = els.accountNameInput.value.trim();

    if (!inputName) {
        alert("アカウント名を入力してください！");
        return;
    }

    player.accountName = inputName;
    player.friendCode = generateFriendCode();

    saveGame();

    els.accountCreationOverlay.classList.remove("show");

    // ホーム画面の表示更新・ログインボーナス確認をトリガーする
    window.dispatchEvent(new Event("hatchoria:playerReady"));

}

// ======================================
// 設定メニュー
// ======================================

function openSettingMenu() {
    els.settingMenuOverlay.classList.add("show");
}

function closeSettingMenu() {
    els.settingMenuOverlay.classList.remove("show");
}

// ======================================
// プロフィール確認
// ======================================

function openProfile() {

    const player = getPlayerData();

    els.settingMenuOverlay.classList.remove("show");

    els.profileNameDisplay.innerText = player ? player.accountName : "---";
    els.profileCodeDisplay.innerText = player ? player.friendCode : "----------";

    els.profileCopyBtn.innerText = "コピー";
    els.profileCopyBtn.classList.remove("copied");

    els.profileOverlay.classList.add("show");

}

function closeProfile() {
    els.profileOverlay.classList.remove("show");
}

function copyFriendCode() {

    const player = getPlayerData();

    if (!player) return;

    navigator.clipboard.writeText(player.friendCode).then(() => {

        els.profileCopyBtn.innerText = "コピー完了！";
        els.profileCopyBtn.classList.add("copied");

        setTimeout(() => {
            els.profileCopyBtn.innerText = "コピー";
            els.profileCopyBtn.classList.remove("copied");
        }, 2000);

    }).catch(() => {

        alert("コピーに失敗しました。お使いのブラウザを手動で選択してください。");

    });

}

// ======================================
// セーブデータのリセット
// ======================================
//
// アカウント名・フレンドコードはそのままに、
// レベル・XP・コイン・モンスター・所持アイテムを初期状態に戻す。

function resetSaveData() {

    const player = getPlayerData();

    if (!player) return;

    const ok = confirm(

        "本当に最初からやり直しますか？\n" +
        "（レベル・コイン・アイテムなどのゲーム進行データが削除されます）"

    );

    if (!ok) return;

    player.level = 1;
    player.exp = 0;
    player.coins = 0;
    player.goal = DEFAULT_GOAL;
    player.monster = DEFAULT_MONSTER;
    player.monsterLevel = 1;
    player.inventory = [];

    saveGame().then(() => {
        location.reload();
    });

}

// ======================================
// 初期化
// ======================================

window.addEventListener("DOMContentLoaded", () => {

    cacheElements();

    if (!els.settingBtn) {

        // 設定・プロフィールのUIが存在しないページでは何もしない
        return;

    }

    els.settingBtn.addEventListener("click", openSettingMenu);
    els.settingMenuCloseBtn.addEventListener("click", closeSettingMenu);
    els.menuProfileBtn.addEventListener("click", openProfile);
    els.menuResetBtn.addEventListener("click", resetSaveData);

    els.profileCloseBtn.addEventListener("click", closeProfile);
    els.profileCopyBtn.addEventListener("click", copyFriendCode);

    els.accountSubmitBtn.addEventListener("click", submitAccountName);

});

// game.js がFirestoreからプレイヤーデータを読み込み終えたら、
// アカウント未設定(フレンドコード未発行)なら作成画面を出す
window.addEventListener("hatchoria:playerReady", checkAccountSetup);
