// ======================================
// Hatchoria
// ranking.js
// 週間ランキング表示
// ======================================

import { db, auth } from "./firebase.js";
import {
    collection,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { sendFriendRequest } from "./gameFirebase.js";
import { getPlayerData } from "./save.js";

const METRICS = {
    coins: { label: "コイン", field: "weeklyCoins", unit: "コイン" },
    exp: { label: "経験値", field: "weeklyExp", unit: "XP" },
    levels: { label: "レベル", field: "weeklyLevels", unit: "回" }
};

const TITLES = {
    beginner: "ハッチョリア見習い",
    apprentice: "見習い調教師",
    skilled: "一人前の調教師",
    veteran: "熟練の調教師",
    legend: "伝説の調教師"
};

const JAPAN_TIME_ZONE = "Asia/Tokyo";
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
let loadedPeriodKey = "";
let requestSerial = 0;
let friendRequestTarget = null;

function getJapanDate() {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: JAPAN_TIME_ZONE,
        year: "numeric", month: "numeric", day: "numeric"
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day)));
}

function getWeeklyPeriodKey() {
    const monday = getJapanDate();
    monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
    return `${monday.getUTCFullYear()}-${String(monday.getUTCMonth() + 1).padStart(2, "0")}-${String(monday.getUTCDate()).padStart(2, "0")}`;
}

function formatDate(date) {
    return `${date.getUTCMonth() + 1}月${date.getUTCDate()}日`;
}

function getWeeklyPeriodText() {
    const monday = getJapanDate();
    monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
    const sunday = new Date(monday);
    sunday.setUTCDate(sunday.getUTCDate() + 6);
    return `集計期間：${formatDate(monday)}0時00分（${WEEKDAYS[monday.getUTCDay()]}）〜${formatDate(sunday)}23時59分59秒（${WEEKDAYS[sunday.getUTCDay()]}）`;
}

function updateWeeklyPeriod() {
    const text = getWeeklyPeriodText();
    ["friend-ranking-period", "overall-ranking-period"].forEach((id) => {
        const element = document.getElementById(id);
        if (element) element.innerText = text;
    });
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    }[character]));
}

function setActiveTab(scope, metric) {
    document.querySelectorAll(`.ranking-tab[data-ranking-scope="${scope}"]`).forEach((button) => {
        const active = button.dataset.rankingMetric === metric;
        button.classList.toggle("active", active);
        button.setAttribute("aria-selected", String(active));
    });
}

function renderMessage(scope, message) {
    const list = document.getElementById(`${scope}-ranking-list`);
    if (list) list.innerHTML = `<li class="ranking-empty">${escapeHtml(message)}</li>`;
}

function renderRows(scope, users, metric) {
    const list = document.getElementById(`${scope}-ranking-list`);
    if (!list) return;

    const rows = Array.from({ length: 20 }, (_, index) => {
        const rank = index + 1;
        const user = users[index];

        if (!user) {
            return `<li class="ranking-row rank-${rank} ranking-no-record-row">
                <span class="ranking-rank">${rank}</span>
                <span class="ranking-no-record">記録なし</span>
                <span></span>
                <span></span>
            </li>`;
        }

        const title = TITLES[user.title] || user.title || "称号なし";
        const value = Number(user[METRICS[metric].field]) || 0;
        return `<li class="ranking-row rank-${rank}">
            <span class="ranking-rank">${rank}</span>
            <button type="button" class="ranking-name ranking-name-button" data-ranking-uid="${escapeHtml(user.uid)}" data-ranking-name="${escapeHtml(user.accountName || "名前未設定")}">${escapeHtml(user.accountName || "名前未設定")}</button>
            <span class="ranking-title">${escapeHtml(title)}</span>
            <span class="ranking-value">${value.toLocaleString()} ${METRICS[metric].unit}</span>
        </li>`;
    });

    list.innerHTML = rows.join("");
    list.querySelectorAll(".ranking-name-button").forEach((button) => {
        button.addEventListener("click", () => openFriendRequestModal(
            button.dataset.rankingUid,
            button.dataset.rankingName
        ));
    });
}

async function loadOverallRanking(metric) {
    const periodKey = getWeeklyPeriodKey();
    const serial = ++requestSerial;
    setActiveTab("overall", metric);
    renderMessage("overall", "ランキングを読み込んでいます…");

    try {
        const rankingQuery = query(collection(db, "users"), where("weeklyPeriodKey", "==", periodKey));
        const snapshot = await getDocs(rankingQuery);
        if (serial !== requestSerial) return;

        const users = snapshot.docs.map((doc) => ({ uid: doc.id, ...doc.data() }));
        users.sort((a, b) => {
            const difference = (Number(b[METRICS[metric].field]) || 0) - (Number(a[METRICS[metric].field]) || 0);
            return difference || String(a.accountName || "").localeCompare(String(b.accountName || ""), "ja");
        });
        renderRows("overall", users.slice(0, 20), metric);
        loadedPeriodKey = periodKey;
    } catch (error) {
        console.error("総合ランキングの取得に失敗しました。", error);
        renderMessage("overall", "ランキングを取得できませんでした。Firestoreルールを確認してください。");
    }
}

function updateRankingPanel(scope, metric) {
    setActiveTab(scope, metric);
    if (scope === "overall") loadOverallRanking(metric);
    else renderMessage(scope, "フレンドランキングは準備中です。");
}

function ensureFriendRequestModal() {
    let modal = document.getElementById("ranking-friend-request-modal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "ranking-friend-request-modal";
    modal.className = "ranking-friend-request-modal";
    modal.innerHTML = `<div class="ranking-friend-request-card" role="dialog" aria-modal="true">
        <div id="ranking-friend-request-message" class="ranking-friend-request-message"></div>
        <div id="ranking-friend-request-status" class="ranking-friend-request-status"></div>
        <div class="ranking-friend-request-actions">
            <button type="button" id="ranking-friend-request-yes">はい</button>
            <button type="button" id="ranking-friend-request-close">閉じる</button>
        </div>
    </div>`;
    document.body.appendChild(modal);

    modal.addEventListener("click", (event) => {
        if (event.target === modal) closeFriendRequestModal();
    });
    document.getElementById("ranking-friend-request-close").addEventListener("click", closeFriendRequestModal);
    document.getElementById("ranking-friend-request-yes").addEventListener("click", submitFriendRequest);
    return modal;
}

function openFriendRequestModal(uid, name) {
    const currentUser = auth.currentUser;
    const player = getPlayerData();
    if (!currentUser || !player) return;

    friendRequestTarget = { uid, name };
    const modal = ensureFriendRequestModal();
    document.getElementById("ranking-friend-request-message").innerText = `${name}にフレンド申請しますか？`;
    document.getElementById("ranking-friend-request-status").innerText = "";
    document.getElementById("ranking-friend-request-yes").disabled = currentUser.uid === uid;
    modal.classList.add("show");

    if (currentUser.uid === uid) {
        document.getElementById("ranking-friend-request-status").innerText = "自分自身には申請できません。";
    }
}

function closeFriendRequestModal() {
    document.getElementById("ranking-friend-request-modal")?.classList.remove("show");
    friendRequestTarget = null;
}

async function submitFriendRequest() {
    if (!friendRequestTarget || !auth.currentUser) return;
    const yesButton = document.getElementById("ranking-friend-request-yes");
    const status = document.getElementById("ranking-friend-request-status");
    const player = getPlayerData();
    if (!player) return;

    yesButton.disabled = true;
    status.className = "ranking-friend-request-status";
    status.innerText = "申請中…";

    try {
        const result = await sendFriendRequest(friendRequestTarget.uid, player.accountName, friendRequestTarget.name);
        if (result.ok) {
            status.classList.add("success");
            status.innerText = `${friendRequestTarget.name}さんに申請しました。`;
        } else if (result.reason === "self") {
            status.innerText = "自分自身には申請できません。";
        } else if (result.reason === "already-sent") {
            status.innerText = "すでに申請済みです。";
        } else {
            status.innerText = "申請できませんでした。";
        }
    } catch (error) {
        console.error("ランキングからのフレンド申請に失敗しました", error);
        status.innerText = "申請できませんでした。";
    } finally {
        yesButton.disabled = false;
    }
}

window.addEventListener("DOMContentLoaded", () => {
    updateWeeklyPeriod();
    document.querySelectorAll(".ranking-tab").forEach((button) => {
        button.addEventListener("click", () => updateRankingPanel(button.dataset.rankingScope, button.dataset.rankingMetric));
    });
});

window.addEventListener("hatchoria:playerReady", () => {
    if (document.getElementById("ranking-screen")?.style.display !== "none") loadOverallRanking("coins");
});

window.addEventListener("hatchoria:screenChanged", (event) => {
    if (event.detail?.screen !== "ranking") return;
    updateWeeklyPeriod();
    const metric = document.querySelector('.ranking-tab[data-ranking-scope="overall"].active')?.dataset.rankingMetric || "coins";
    if (loadedPeriodKey !== getWeeklyPeriodKey()) loadOverallRanking(metric);
    else setActiveTab("overall", metric);
});
