import { auth } from "./firebase.js";
import {
    collection,
    getDocs,
    query
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { db } from "./firebase.js";
import { getFriends, getFriendPublicData } from "./gameFirebase.js";

const TABS = {
    overall: "総合",
    weekly: "今週",
    friends: "フレンド"
};
const METRICS = {
    correct: { label: "累計正解数", unit: "問", field: "totalCorrectAnswers", weeklyField: "weeklyCorrectAnswers" },
    xp: { label: "累計XP", unit: "XP", field: "totalXpEarned", weeklyField: "weeklyXpEarned" },
    level: { label: "レベル", unit: "Lv.", field: "level", weeklyField: "level" }
};

function getRankingWeekKey(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

let currentTab = "overall";
let currentMetric = "correct";
let elements = {};

function cacheElements() {
    elements = {
        screen: document.getElementById("ranking-screen"),
        list: document.getElementById("ranking-list"),
        status: document.getElementById("ranking-status"),
        back: document.getElementById("ranking-back-btn"),
        tabs: [...document.querySelectorAll("[data-ranking-tab]")],
        metrics: [...document.querySelectorAll("[data-ranking-metric]")]
    };
}

function escapeHtml(value) {
    return String(value ?? "プレイヤー").replace(/[&<>'"]/g, (char) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    }[char]));
}

function renderRows(rows) {
    if (!rows.length) {
        elements.list.innerHTML = '<div class="ranking-empty">表示できるプレイヤーがいません</div>';
        return;
    }

    const metric = METRICS[currentMetric];
    elements.list.innerHTML = rows.map((row, index) => {
        const score = Number(row[metric.displayField] ?? row[metric.field] ?? 0);
        const isMe = row.uid === auth.currentUser?.uid;
        return `
            <div class="ranking-row${isMe ? " me" : ""}">
                <div class="ranking-position">${index + 1}</div>
                <div>
                    <div class="ranking-name">${escapeHtml(row.accountName || "プレイヤー")}${isMe ? "（自分）" : ""}</div>
                    <div class="ranking-level">Lv.${Number(row.level || 1)}</div>
                </div>
                <div class="ranking-score">${score.toLocaleString()} ${metric.unit}</div>
            </div>`;
    }).join("");
}

async function loadOverallRows() {
    const metric = METRICS[currentMetric];
    const field = currentTab === "weekly" ? metric.weeklyField : metric.field;
    const snap = await getDocs(query(collection(db, "users")));
    const week = getRankingWeekKey();
    return snap.docs.map((doc) => {
        const data = doc.data();
        if (currentTab === "weekly" && data.rankingWeek !== week) {
            data.weeklyCorrectAnswers = 0;
            data.weeklyXpEarned = 0;
        }
        return { uid: doc.id, ...data, displayField: field };
    }).sort((a, b) => Number(b[field] || 0) - Number(a[field] || 0)).slice(0, 50);
}

async function loadFriendRows() {
    const friends = await getFriends();
    const me = auth.currentUser;
    const friendRows = [];

    if (me) {
        const own = window.HatchoriaPlayer;
        if (own) friendRows.push({ uid: me.uid, ...own });
    }

    for (const friend of friends) {
        const data = await getFriendPublicData(friend.uid);
        if (data) friendRows.push({ uid: friend.uid, ...data });
    }

    const metric = METRICS[currentMetric];
    const field = currentTab === "weekly" ? metric.weeklyField : metric.field;
    const week = getRankingWeekKey();
    return friendRows
        .map((row) => {
            const normalized = { ...row, displayField: field };
            if (currentTab === "weekly" && normalized.rankingWeek !== week) {
                normalized.weeklyCorrectAnswers = 0;
                normalized.weeklyXpEarned = 0;
            }
            return normalized;
        })
        .sort((a, b) => Number(b[field] || 0) - Number(a[field] || 0));
}

async function refreshRanking() {
    if (!elements.list) return;
    elements.list.innerHTML = "";
    elements.status.textContent = `${TABS[currentTab]} / ${METRICS[currentMetric].label} を読み込み中…`;

    try {
        const rows = currentTab === "friends" ? await loadFriendRows() : await loadOverallRows();
        renderRows(rows);
        elements.status.textContent = `${TABS[currentTab]} / ${METRICS[currentMetric].label}`;
    } catch (error) {
        console.error("ランキングの取得に失敗しました", error);
        elements.list.innerHTML = '<div class="ranking-empty">ランキングを取得できませんでした</div>';
        elements.status.textContent = "通信またはFirestore権限を確認してください";
    }
}

function updateButtonStates() {
    elements.tabs.forEach((button) => button.classList.toggle("active", button.dataset.rankingTab === currentTab));
    elements.metrics.forEach((button) => button.classList.toggle("active", button.dataset.rankingMetric === currentMetric));
}

function openRanking() {
    window.HatchoriaNav?.showScreen("ranking");
    updateButtonStates();
    refreshRanking();
}

window.addEventListener("DOMContentLoaded", () => {
    cacheElements();
    if (!elements.screen) return;

    document.getElementById("home-ranking-diamond")?.addEventListener("click", openRanking);
    elements.back?.addEventListener("click", () => window.HatchoriaNav?.goHome());
    elements.tabs.forEach((button) => button.addEventListener("click", () => {
        currentTab = button.dataset.rankingTab;
        updateButtonStates();
        refreshRanking();
    }));
    elements.metrics.forEach((button) => button.addEventListener("click", () => {
        currentMetric = button.dataset.rankingMetric;
        updateButtonStates();
        refreshRanking();
    }));
});
