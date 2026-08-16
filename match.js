// ======================================
// Hatchoria
// match.js
// マッチ(フレンドとのリアルタイム対戦)機能
// ======================================
//
// ステージ1: 対戦の申し込み・承認・辞退までの土台。
// 実際に同時に問題を解くゲーム本体は次のステージで作る。
//
// 届いている対戦の誘いは、マッチ画面を開いていなくても
// (ゲーム画面以外なら)ポップアップで通知する。
// 申し込んだ側も、相手に拒否されたらポップアップで知らされる。

import {
    getFriends,
    getFriendPublicData,
    sendMatchInvite,
    acceptMatchInvite,
    declineMatchInvite,
    deleteMatch,
    listenIncomingMatchInvites,
    listenDeclinedMatches
} from "./gameFirebase.js";

let els = {};

// 診断用: alertの代わりに画面上部に文字を出す(iPadのSafariで
// alertが連続すると抑制されることがあるための回避策)
function debugLog(text) {

    const banner = document.getElementById("debug-banner");
    if (!banner) return;

    const time = new Date().toLocaleTimeString();
    banner.style.display = "block";
    banner.innerText = "[" + time + "] " + text + "\n" + banner.innerText;

    // 長くなりすぎないように直近10件だけ残す
    const lines = banner.innerText.split("\n");
    if (lines.length > 10) {
        banner.innerText = lines.slice(0, 10).join("\n");
    }

}

// 現在届いている pending の誘い一覧(リアルタイム監視の結果)
let incomingInvites = [];

// まだ通知していない「拒否された」マッチのキュー
let declinedQueue = [];

function cacheElements() {

    els = {
        matchDiamond: document.getElementById("home-match-diamond"),
        invitesList: document.getElementById("match-invites-list"),
        friendsList: document.getElementById("match-friends-list"),

        invitePopup: document.getElementById("match-invite-popup"),
        invitePopupName: document.getElementById("match-invite-popup-name"),
        inviteAcceptBtn: document.getElementById("match-invite-accept-btn"),
        inviteDeclineBtn: document.getElementById("match-invite-decline-btn"),

        declinedPopup: document.getElementById("match-declined-popup"),
        declinedMessage: document.getElementById("match-declined-popup-message"),
        declinedOkBtn: document.getElementById("match-declined-ok-btn")
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

    renderInvitesList();
    renderFriendsForInvite();

}

// ======================================
// 対戦の誘いへの応答(承諾・辞退で共通の処理)
// ======================================

async function respondAccept(invite) {

    await acceptMatchInvite(invite.id);
    alert(`${invite.inviterName}さんとの対戦が始まります！(対戦ゲーム本体は近日実装予定です)`);

}

async function respondDecline(invite) {

    await declineMatchInvite(invite.id);

}

// ======================================
// グローバル通知ポップアップ(誘いが来た)
// ======================================

function updateGlobalInvitePopup() {

    const currentScreen = window.HatchoriaNav?.getCurrentScreen();
    const invite = incomingInvites[0];

    // 診断用: 判定に使っている値を直接確認する
    debugLog("updateGlobalInvitePopup 実行: currentScreen=" + currentScreen + " / invite=" + (invite ? invite.inviterName : "なし") + " / invitePopup要素=" + (els.invitePopup ? "あり" : "なし"));

    // ゲーム中は絶対に出さない。誘いが無ければ出さない。
    if (!invite || currentScreen === "game") {
        debugLog("ポップアップ非表示: invite無し=" + !invite + " / game中=" + (currentScreen === "game"));
        els.invitePopup.classList.remove("show");
        return;
    }

    debugLog("ポップアップ表示処理を実行します");
    els.invitePopupName.innerText = invite.inviterName || "プレイヤー";
    els.invitePopup.classList.add("show");

}

// ======================================
// グローバル通知ポップアップ(拒否された)
// ======================================

function updateDeclinedPopup() {

    const match = declinedQueue[0];

    if (!match) {
        els.declinedPopup.classList.remove("show");
        return;
    }

    els.declinedMessage.innerText = `${match.opponentName || "相手"}さんに拒否されました`;
    els.declinedPopup.classList.add("show");

}

// ======================================
// マッチ画面内の「届いている誘い」一覧
// ======================================

function renderInvitesList() {

    if (!els.invitesList) return;

    if (incomingInvites.length === 0) {
        els.invitesList.innerHTML = `<div class="friend-empty-text">届いている対戦の誘いはありません</div>`;
        return;
    }

    els.invitesList.innerHTML = "";

    incomingInvites.forEach((invite) => {

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

        card.querySelector(".match-invite-btn").addEventListener("click", () => respondAccept(invite));
        card.querySelector(".match-decline-btn").addEventListener("click", () => respondDecline(invite));

        els.invitesList.appendChild(card);

    });

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

    // グローバル通知ポップアップのボタン
    els.inviteAcceptBtn.addEventListener("click", async () => {

        const invite = incomingInvites[0];
        if (!invite) return;

        els.invitePopup.classList.remove("show");
        await respondAccept(invite);

    });

    els.inviteDeclineBtn.addEventListener("click", async () => {

        const invite = incomingInvites[0];
        if (!invite) return;

        els.invitePopup.classList.remove("show");
        await respondDecline(invite);

    });

    els.declinedOkBtn.addEventListener("click", async () => {

        const match = declinedQueue.shift();
        els.declinedPopup.classList.remove("show");

        if (match) {
            await deleteMatch(match.id);
        }

        updateDeclinedPopup();

    });

    // 画面が切り替わるたびに、通知ポップアップを出すべきか判定し直す
    window.addEventListener("hatchoria:screenChanged", updateGlobalInvitePopup);

});

// game.js がプレイヤーデータを読み込み終えたら、
// 対戦の誘い・拒否通知をリアルタイムで監視し始める
window.addEventListener("hatchoria:playerReady", () => {

    // 診断用: 監視が実際に開始されたことを確認する
    debugLog("対戦の誘いのリアルタイム監視を開始");

    let firstSnapshot = true;

    listenIncomingMatchInvites((invites) => {

        try {

            if (!firstSnapshot && invites.length > 0) {
                debugLog("新しい対戦の誘いを受信(" + invites.length + "件)");
            }
            firstSnapshot = false;

            incomingInvites = invites;
            debugLog("updateGlobalInvitePopupを呼び出します(直前ログ)");
            updateGlobalInvitePopup();
            debugLog("updateGlobalInvitePopupの呼び出しが完了しました(直後ログ)");
            renderInvitesList();

        } catch (e) {

            debugLog("callback内で例外発生: " + (e && e.message));

        }

    }, (error) => {

        debugLog("対戦の誘いの監視でエラー: " + (error && (error.code || error.message)));

    });

    listenDeclinedMatches((declined) => {

        // まだキューに無いものだけ追加する(同じ内容で何度も
        // 通知イベントが来ても、二重に並ばないようにする)
        declined.forEach((match) => {

            if (!declinedQueue.some((m) => m.id === match.id)) {
                declinedQueue.push(match);
            }

        });

        updateDeclinedPopup();

    }, (error) => {

        debugLog("拒否通知の監視でエラー: " + (error && (error.code || error.message)));

    });

});
