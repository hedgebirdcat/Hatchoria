// ======================================
// Hatchoria
// friends.js
// フレンド機能(申請 → 承認式)
// ======================================

import { getPlayerData } from "./save.js";

import {
    findByFriendCode,
    sendFriendRequest,
    acceptFriendRequest,
    getIncomingRequests,
    getFriends,
    getFriendPublicData
} from "./gameFirebase.js";

let els = {};

function cacheElements() {

    els = {
        codeInput: document.getElementById("friend-code-input"),
        requestBtn: document.getElementById("friend-request-btn"),
        requestMessage: document.getElementById("friend-request-message"),
        incomingList: document.getElementById("friend-incoming-list"),
        friendList: document.getElementById("friend-list")
    };

}

// ======================================
// モンスター画像(レベルに応じた進化段階)
// ======================================

function getMonsterImageSrc(monster, level) {

    let stage = 1;

    if (level >= 80) stage = 5;
    else if (level >= 50) stage = 4;
    else if (level >= 30) stage = 3;
    else if (level >= 10) stage = 2;

    return `assets/images/${monster || "leaf"}_${stage}.png`;

}

// ======================================
// フレンド申請を送る
// ======================================

async function handleSendRequest() {

    const code = els.codeInput.value.trim();
    els.requestMessage.innerText = "";

    if (!code) {
        els.requestMessage.innerText = "フレンドコードを入力してください。";
        return;
    }

    const me = getPlayerData();

    if (!me) {
        els.requestMessage.innerText = "読み込み中です。少し待ってから試してください。";
        return;
    }

    els.requestBtn.disabled = true;

    try {

        const target = await findByFriendCode(code);

        if (!target) {
            els.requestMessage.innerText = "そのフレンドコードのユーザーが見つかりません。";
            return;
        }

        const result = await sendFriendRequest(target.uid, me.accountName, target.accountName);

        if (result.ok) {

            els.requestMessage.style.color = "#2e7d32";
            els.requestMessage.innerText = `${target.accountName} さんに申請を送りました！`;
            els.codeInput.value = "";

        } else if (result.reason === "self") {

            els.requestMessage.style.color = "#e53935";
            els.requestMessage.innerText = "自分自身には申請できません。";

        } else if (result.reason === "already-sent") {

            els.requestMessage.style.color = "#e53935";
            els.requestMessage.innerText = "すでに申請済みです。";

        } else {

            els.requestMessage.style.color = "#e53935";
            els.requestMessage.innerText = "申請に失敗しました。もう一度お試しください。";

        }

    } catch (error) {

        console.error("フレンド申請エラー", error);
        els.requestMessage.style.color = "#e53935";
        els.requestMessage.innerText = "エラーが発生しました。もう一度お試しください。";

    } finally {

        els.requestBtn.disabled = false;

    }

}

// ======================================
// 届いている申請の一覧
// ======================================

async function renderIncomingRequests() {

    els.incomingList.innerHTML = "読み込み中...";

    try {

        const requests = await getIncomingRequests();

        if (requests.length === 0) {
            els.incomingList.innerHTML = `<div class="friend-list-empty">届いている申請はありません</div>`;
            return;
        }

        els.incomingList.innerHTML = "";

        requests.forEach((req) => {

            const card = document.createElement("div");
            card.className = "friend-card";

            card.innerHTML = `
                <div class="friend-card-info">
                    <div class="friend-card-name">${req.fromName || "プレイヤー"}</div>
                    <div class="friend-card-level">フレンド申請</div>
                </div>
                <button class="friend-approve-btn">承認する</button>
            `;

            card.querySelector(".friend-approve-btn").addEventListener("click", async () => {

                await acceptFriendRequest(req.id);
                renderIncomingRequests();
                renderFriendsList();

            });

            els.incomingList.appendChild(card);

        });

    } catch (error) {

        console.error("申請一覧の取得に失敗しました", error);
        els.incomingList.innerHTML = `<div class="friend-list-empty">読み込みに失敗しました</div>`;

    }

}

// ======================================
// フレンド一覧
// ======================================

async function renderFriendsList() {

    els.friendList.innerHTML = "読み込み中...";

    try {

        const friends = await getFriends();

        if (friends.length === 0) {
            els.friendList.innerHTML = `<div class="friend-list-empty">まだフレンドがいません</div>`;
            return;
        }

        els.friendList.innerHTML = "";

        for (const friend of friends) {

            const data = await getFriendPublicData(friend.uid);

            const card = document.createElement("div");
            card.className = "friend-card";

            const name = (data && data.accountName) || friend.name || "プレイヤー";
            const level = data ? data.level : "?";
            const imgSrc = data ? getMonsterImageSrc(data.monster, data.level) : "";

            card.innerHTML = `
                ${imgSrc ? `<img src="${imgSrc}" alt="monster">` : ""}
                <div class="friend-card-info">
                    <div class="friend-card-name">${name}</div>
                    <div class="friend-card-level">Lv.${level}</div>
                </div>
            `;

            els.friendList.appendChild(card);

        }

    } catch (error) {

        console.error("フレンド一覧の取得に失敗しました", error);
        els.friendList.innerHTML = `<div class="friend-list-empty">読み込みに失敗しました</div>`;

    }

}

// ======================================
// 初期化
// ======================================

window.addEventListener("DOMContentLoaded", () => {

    cacheElements();

    if (!els.requestBtn) {

        // フレンド画面が存在しないページでは何もしない
        return;

    }

    els.requestBtn.addEventListener("click", handleSendRequest);

});

// screenNav.js から「フレンド画面に入った」通知を受けたら一覧を更新
window.addEventListener("hatchoria:enterFriends", () => {

    renderIncomingRequests();
    renderFriendsList();

});
