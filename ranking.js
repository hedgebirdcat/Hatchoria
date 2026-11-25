// ======================================
// Hatchoria
// ranking.js
// ランキング指標の切り替え
// ======================================

const METRICS = {
    coins: "コイン",
    exp: "経験値",
    levels: "レベル"
};

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

    document.querySelectorAll(".ranking-tab").forEach((button) => {
        button.addEventListener("click", () => {
            updateRankingPanel(button.dataset.rankingScope, button.dataset.rankingMetric);
        });
    });

});
