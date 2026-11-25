// ======================================
// Hatchoria
// ranking.js
// 週間ランキング表示
// ======================================

import { auth, db } from "./firebase.js";
import {
    collection,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

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

    if (!users.length) {
        renderMessage(scope, `今週の${METRICS[metric].label}記録はありません。`);
        return;
    }

    list.innerHTML = users.map((user, index) => {
        const title = TITLES[user.title] || user.title || "称号なし";
        const value = Number(user[METRICS[metric].field]) || 0;
        return `<li class="ranking-row">
            <span class="ranking-rank">${index + 1}</span>
            <span class="ranking-name">${escapeHtml(user.accountName || "名前未設定")}</span>
            <span class="ranking-title">${escapeHtml(title)}</span>
            <span class="ranking-value">${value.toLocaleString()} ${METRICS[metric].unit}</span>
        </li>`;
    }).join("");
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
