// ======================================
// Hatchoria
// match.js
// マッチ(フレンドとのリアルタイム対戦)機能
// ======================================
//
// ステージ1: 対戦の申し込み・承認・辞退までの土台を実装する。
// 実際に同時に問題を解くゲーム本体は次のステージで作る。

import {
    getFriends,
    getFriendPublicData,
    sendMatchInvite,
    getIncomingMatchInvites,
    acceptMatchInvite,
    declineMatchInvite
} from "./gameFirebase.js";

let els = {};

function cacheElements() {

    els = {
        matchDiamond: document.getElementById("home-match-diamond"),
        invitesList: document.getElementById("match-invites-list"),
        friendsList: document.getElementById("match-friends-list")
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
// マッチ画面を開く
// ======================================

function openMatchScreen() {

    window.HatchoriaNav?.showScreen("match");

    renderInvites();
    renderFriendsForInvite();

}

// ======================================
// 届いている対戦の誘い
// ======================================

async function renderInvites() {

    els.invitesList.innerHTML = "読み込み中...";

    try {

        const invites = await getIncomingMatchInvites();

        if (invites.length === 0) {
            els.invitesList.innerHTML = `<div class="friend-empty-text">届いている対戦の誘いはありません</div>`;
            return;
        }

        els.invitesList.innerHTML = "";

        invites.forEach((invite) => {

            const card = document.createElement("div");
            card.className = "friend-item-card";

            card.innerHTML = `
                <div class="friend-item-info">
                    <div class="friend-item-name">${invite.inviterName || "プレイヤー"}</div>
                    <div class="friend-item-level">対戦の誘い</div>
                </div>
                <button class="match-invite-btn">承諾</button>
                <button class="match-decline-btn">辞退</button>
            `;

            card.querySelector(".match-invite-btn").addEventListener("click", async () => {

                await acceptMatchInvite(invite.id);
                alert(`${invite.inviterName}さんとの対戦が始まります！(対戦ゲーム本体は近日実装予定です)`);
                renderInvites();

            });

            card.querySelector(".match-decline-btn").addEventListener("click", async () => {

                await declineMatchInvite(invite.id);
                renderInvites();

            });

            els.invitesList.appendChild(card);

        });

    } catch (error) {

        console.error("対戦の誘い一覧の取得に失敗しました", error);
        els.invitesList.innerHTML = `<div class="friend-empty-text">読み込みに失敗しました</div>`;

    }

}

// ======================================
// フレンドに対戦を申し込む
// ======================================

async function renderFriendsForInvite() {

    els.friendsList.innerHTML = "読み込み中...";

    try {

        const friends = await getFriends();

        if (friends.length === 0) {
            els.friendsList.innerHTML = `<div class="friend-empty-text">まだフレンドがいません</div>`;
            return;
        }

        els.friendsList.innerHTML = "";

        for (const friend of friends) {

            const data = await getFriendPublicData(friend.uid);

            const card = document.createElement("div");
            card.className = "friend-item-card";

            const name = (data && data.accountName) || friend.name || "プレイヤー";
            const level = data ? data.level : "?";
            const imgSrc = data ? getMonsterImageSrc(data.monster, data.level) : "";

            card.innerHTML = `
                ${imgSrc ? `<img src="${imgSrc}" alt="monster">` : ""}
                <div class="friend-item-info">
                    <div class="friend-item-name">${name}</div>
                    <div class="friend-item-level">Lv.${level}</div>
                </div>
                <button class="match-invite-btn">対戦を申し込む</button>
            `;

            card.querySelector(".match-invite-btn").addEventListener("click", async (e) => {

                e.target.disabled = true;
                e.target.innerText = "送信中...";

                const result = await sendMatchInvite(friend.uid, name);

                if (result.ok) {
                    e.target.innerText = "申し込み済み";
                } else {
                    e.target.disabled = false;
                    e.target.innerText = "対戦を申し込む";
                    alert("申し込みに失敗しました。もう一度お試しください。");
                }

            });

            els.friendsList.appendChild(card);

        }

    } catch (error) {

        console.error("フレンド一覧の取得に失敗しました", error);
        els.friendsList.innerHTML = `<div class="friend-empty-text">読み込みに失敗しました</div>`;

    }

}

// ======================================
// 初期化
// ======================================

window.addEventListener("DOMContentLoaded", () => {

    cacheElements();

    if (!els.matchDiamond) {

        // マッチUIが存在しないページでは何もしない
        return;

    }

    els.matchDiamond.addEventListener("click", openMatchScreen);

});
