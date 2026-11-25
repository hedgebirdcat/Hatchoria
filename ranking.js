// ======================================
// Hatchoria
// ranking.js
// ランキング指標と週次期間の表示
// ======================================

const METRICS = {
    coins: "コイン",
    exp: "経験値",
    levels: "レベル"
};

const JAPAN_TIME_ZONE = "Asia/Tokyo";
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function getJapanDate() {

    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: JAPAN_TIME_ZONE,
        year: "numeric",
        month: "numeric",
        day: "numeric"
    }).formatToParts(new Date());

    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return new Date(Date.UTC(
        Number(values.year),
        Number(values.month) - 1,
        Number(values.day)
    ));

}

function formatDate(date) {
    return `${date.getUTCMonth() + 1}月${date.getUTCDate()}日`;
}

function getWeeklyPeriodText() {

    const japanDate = getJapanDate();
    const dayOfWeek = japanDate.getUTCDay();
    const daysSinceMonday = (dayOfWeek + 6) % 7;

    const monday = new Date(japanDate);
    monday.setUTCDate(monday.getUTCDate() - daysSinceMonday);

    const sunday = new Date(monday);
    sunday.setUTCDate(sunday.getUTCDate() + 6);

    return `集計期間：${formatDate(monday)}0時00分（${WEEKDAYS[monday.getUTCDay()]}）〜${formatDate(sunday)}23時59分59秒（${WEEKDAYS[sunday.getUTCDay()]}）`;

}

function updateWeeklyPeriod() {

    const text = getWeeklyPeriodText();
    const friendPeriod = document.getElementById("friend-ranking-period");
    const overallPeriod = document.getElementById("overall-ranking-period");

    if (friendPeriod) friendPeriod.innerText = text;
    if (overallPeriod) overallPeriod.innerText = text;

}

function updateRankingPanel(scope, metric) {

    const list = document.getElementById(`${scope}-ranking-list`);
    if (!list) return;

    list.innerHTML = `<li class="ranking-empty">今週の${METRICS[metric]}ランキングを表示します。</li>`;

    document.querySelectorAll(`.ranking-tab[data-ranking-scope="${scope}"]`).forEach((button) => {
        const active = button.dataset.rankingMetric === metric;
        button.classList.toggle("active", active);
        button.setAttribute("aria-selected", String(active));
    });

}

window.addEventListener("DOMContentLoaded", () => {

    updateWeeklyPeriod();

    document.querySelectorAll(".ranking-tab").forEach((button) => {
        button.addEventListener("click", () => {
            updateRankingPanel(button.dataset.rankingScope, button.dataset.rankingMetric);
        });
    });

});

// ランキング画面を開くたびに日本時間で期間を再計算する。
window.addEventListener("hatchoria:screenChanged", (event) => {
    if (event.detail && event.detail.screen === "ranking") {
        updateWeeklyPeriod();
    }
});
