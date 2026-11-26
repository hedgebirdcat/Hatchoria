// ======================================
// Hatchoria
// gift.js
// ギフト表示と週間フレンドランキング報酬
// ======================================

import { auth, db } from "./firebase.js";
import { getPlayerData } from "./save.js";
import { getFriends } from "./gameFirebase.js";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    runTransaction
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const JAPAN_TIME_ZONE = "Asia/Tokyo";
let currentGifts = [];

function getJapanDate() {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: JAPAN_TIME_ZONE,
        year: "numeric", month: "numeric", day: "numeric"
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day)));
}

function getWeeklyPeriodKey(date = getJapanDate()) {
    const monday = new Date(date);
    monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
    return `${monday.getUTCFullYear()}-${String(monday.getUTCMonth() + 1).padStart(2, "0")}-${String(monday.getUTCDate()).padStart(2, "0")}`;
}

function getPreviousWeeklyPeriodKey() {
    const monday = getJapanDate();
    monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7) - 7);
    return `${monday.getUTCFullYear()}-${String(monday.getUTCMonth() + 1).padStart(2, "0")}-${String(monday.getUTCDate()).padStart(2, "0")}`;
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    }[character]));
}

function getPreviousWeeklyCoins(data, periodKey) {
    if (data.previousWeeklyPeriodKey === periodKey) return Number(data.previousWeeklyCoins) || 0;
    if (data.weeklyPeriodKey === periodKey) return Number(data.weeklyCoins) || 0;
    return null;
}

async function getFriendRankingUsers(periodKey) {
    const user = auth.currentUser;
    if (!user) return [];

    const ownSnapshot = await getDoc(doc(db, "users", user.uid));
    const ownData = ownSnapshot.exists() ? ownSnapshot.data() : null;
    const friends = await getFriends();
    const uniqueFriends = [...new Map(friends.map((friend) => [friend.uid, friend])).values()];
    const friendSnapshots = await Promise.all(uniqueFriends.map((friend) => getDoc(doc(db, "users", friend.uid))));
    const users = [];

    if (ownData) users.push({ uid: user.uid, ...ownData });
    friendSnapshots.forEach((snapshot) => {
        if (snapshot.exists()) users.push({ uid: snapshot.id, ...snapshot.data() });
    });

    return [...new Map(users.map((item) => [item.uid, item])).values()]
        .map((item) => ({ ...item, weeklyCoinsForReward: getPreviousWeeklyCoins(item, periodKey) }))
        .filter((item) => item.weeklyCoinsForReward !== null)
        .sort((a, b) => {
            const difference = b.weeklyCoinsForReward - a.weeklyCoinsForReward;
            return difference || String(a.accountName || "").localeCompare(String(b.accountName || ""), "ja");
        });
}

function getRewardCoins(rank) {
    if (rank === 1) return 1000;
    if (rank === 2) return 800;
    if (rank === 3) return 500;
    return 100;
}

async function createWeeklyFriendReward() {
    const user = auth.currentUser;
    if (!user) return;

    const periodKey = getPreviousWeeklyPeriodKey();
    const users = await getFriendRankingUsers(periodKey);
    const rank = users.findIndex((item) => item.uid === user.uid) + 1;
    if (rank <= 0) return;

    const rewardCoins = getRewardCoins(rank);
    const userRef = doc(db, "users", user.uid);

    await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(userRef);
        if (!snapshot.exists()) return;
        const data = snapshot.data();
        if (data.weeklyFriendRewardPeriod === periodKey) return;

        const gifts = Array.isArray(data.pendingGifts) ? data.pendingGifts : [];
        const giftId = `friend-ranking-${periodKey}`;
        if (!gifts.some((gift) => gift.id === giftId)) {
            gifts.push({
                id: giftId,
                type: "coins",
                amount: rewardCoins,
                title: "週間フレンドランキング報酬",
                message: `前週のフレンドランキング${rank}位の報酬です。`,
                createdAt: Date.now()
            });
        }

        transaction.update(userRef, {
            pendingGifts: gifts,
            weeklyFriendRewardPeriod: periodKey
        });
    });
}

function updateGiftBadge(gifts) {
    const badge = document.getElementById("gift-badge");
    if (!badge) return;
    badge.innerText = String(gifts.length);
    badge.classList.toggle("show", gifts.length > 0);
}

function renderGifts() {
    const list = document.getElementById("gift-list");
    if (!list) return;
    updateGiftBadge(currentGifts);

    if (!currentGifts.length) {
        list.innerHTML = `<div class="gift-empty-text">受け取れるギフトはありません。</div>`;
        return;
    }

    list.innerHTML = currentGifts.map((gift) => `<div class="gift-card" data-gift-id="${escapeHtml(gift.id)}">
        <div class="gift-card-title">${escapeHtml(gift.title || "ギフト")}</div>
        <div class="gift-card-message">${escapeHtml(gift.message || "ギフトが届いています。")}</div>
        <div class="gift-card-reward">🪙 ${Number(gift.amount) || 0}コイン</div>
        <button class="primary-btn gift-receive-btn" type="button">受け取る</button>
    </div>`).join("");

    list.querySelectorAll(".gift-card").forEach((card) => {
        card.querySelector(".gift-receive-btn").addEventListener("click", () => claimGift(card.dataset.giftId));
    });
}

async function loadGifts() {
    const user = auth.currentUser;
    if (!user) return;
    const snapshot = await getDoc(doc(db, "users", user.uid));
    currentGifts = snapshot.exists() && Array.isArray(snapshot.data().pendingGifts)
        ? snapshot.data().pendingGifts
        : [];
    renderGifts();
}

async function claimGift(giftId) {
    const user = auth.currentUser;
    if (!user) return;
    const userRef = doc(db, "users", user.uid);

    try {
        const result = await runTransaction(db, async (transaction) => {
            const snapshot = await transaction.get(userRef);
            if (!snapshot.exists()) throw new Error("プレイヤーデータが見つかりません。");
            const data = snapshot.data();
            const gifts = Array.isArray(data.pendingGifts) ? data.pendingGifts : [];
            const gift = gifts.find((item) => item.id === giftId);
            if (!gift) return null;

            transaction.update(userRef, {
                coins: (Number(data.coins) || 0) + (Number(gift.amount) || 0),
                pendingGifts: gifts.filter((item) => item.id !== giftId)
            });
            return gift;
        });

        if (result) {
            const player = window.HatchoriaPlayer || getPlayerData();
            if (player) player.coins = (Number(player.coins) || 0) + (Number(result.amount) || 0);
            currentGifts = currentGifts.filter((gift) => gift.id !== giftId);
            renderGifts();
            window.dispatchEvent(new Event("hatchoria:playerReady"));
        }
    } catch (error) {
        console.error("ギフトの受取に失敗しました。", error);
        alert("ギフトを受け取れませんでした。もう一度お試しください。");
    }
}

window.addEventListener("DOMContentLoaded", () => {
    const giftButton = document.getElementById("home-gift-btn");
    const overlay = document.getElementById("gift-overlay");
    const closeButton = document.getElementById("gift-close-btn");

    giftButton?.addEventListener("click", async () => {
        overlay?.classList.add("show");
        await loadGifts();
    });
    closeButton?.addEventListener("click", () => overlay?.classList.remove("show"));

    window.addEventListener("hatchoria:playerReady", async () => {
        try {
            await createWeeklyFriendReward();
            await loadGifts();
        } catch (error) {
            console.error("週間フレンドランキング報酬の準備に失敗しました。", error);
        }
    });
});
