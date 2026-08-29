// ======================================
// Hatchoria
// equipment.js
// 装備機能(ガチャアイテムを1つ装備して効果を得る)
// ======================================

import { getPlayerData, saveGame } from "./save.js";

// アイテムごとの効果(レベルに比例させておくことで、
// 将来アイテムのレベルアップ機能を追加しても自然に対応できる)
// 今はどのアイテムもlevel: 1なので、そのまま以下の数値が適用される。
export const ITEM_EFFECTS = {
    "道化師の仮面 🎭": { coinBonus: 0.05, xpBonus: 0 },
    "神秘の果実 🍋":   { coinBonus: 0.02, xpBonus: 0.05 },
    "聖なる遺体 💀":   { coinBonus: 0.10, xpBonus: 0.12 },
    "賢者の石 🪨":     { coinBonus: 0.20, xpBonus: 0.20 }
};

// 所持アイテムの1件を { id, name, level } の形に揃える
// (以前はアイテム名の文字列だけを保存していたため、古いデータにも対応する)
export function normalizeItem(item, index) {

    if (typeof item === "string") {
        return { id: "legacy-" + index, name: item, level: 1 };
    }

    return {
        id: item.id || ("legacy-" + index),
        name: item.name,
        level: item.level || 1
    };

}

// 装備中アイテムの効果を計算する(未装備なら効果なし)
export function getEquippedBonus(player) {

    if (!player || !player.equippedItemId || !player.inventory) {
        return { xpBonus: 0, coinBonus: 0 };
    }

    const items = player.inventory.map(normalizeItem);
    const equipped = items.find((it) => it.id === player.equippedItemId);

    if (!equipped) {
        return { xpBonus: 0, coinBonus: 0 };
    }

    const base = ITEM_EFFECTS[equipped.name];

    if (!base) {
        return { xpBonus: 0, coinBonus: 0 };
    }

    return {
        xpBonus: base.xpBonus * equipped.level,
        coinBonus: base.coinBonus * equipped.level
    };

}

let els = {};

function cacheElements() {

    els = {
        equipBtn: document.getElementById("home-equipment-btn"),
        overlay: document.getElementById("equipment-overlay"),
        closeBtn: document.getElementById("equipment-close-btn"),
        current: document.getElementById("equipment-current"),
        inventoryList: document.getElementById("equipment-inventory-list")
    };

}

function effectText(name, level) {

    const base = ITEM_EFFECTS[name];
    if (!base) return "効果なし";

    const xp = Math.round(base.xpBonus * level * 100);
    const coin = Math.round(base.coinBonus * level * 100);

    const parts = [];
    if (xp > 0) parts.push(`獲得XP +${xp}%`);
    if (coin > 0) parts.push(`獲得コイン +${coin}%`);

    return parts.length > 0 ? parts.join(" / ") : "効果なし";

}

function openEquipment() {

    const player = getPlayerData();
    if (!player) return;

    renderEquipment(player);

    els.overlay.classList.add("show");

}

function closeEquipment() {
    els.overlay.classList.remove("show");
}

function renderEquipment(player) {

    const items = (player.inventory || []).map(normalizeItem);
    const equipped = items.find((it) => it.id === player.equippedItemId);

    if (equipped) {

        els.current.querySelector(".friend-item-name").innerText = equipped.name;
        els.current.querySelector(".friend-item-level").innerText = effectText(equipped.name, equipped.level);

    } else {

        els.current.querySelector(".friend-item-name").innerText = "なし";
        els.current.querySelector(".friend-item-level").innerText = "効果なし";

    }

    if (items.length === 0) {
        els.inventoryList.innerHTML = `<div class="friend-empty-text">まだアイテムを持っていません(ガチャで手に入ります)</div>`;
        return;
    }

    els.inventoryList.innerHTML = "";

    items.forEach((item) => {

        const isEquipped = item.id === player.equippedItemId;

        const card = document.createElement("div");
        card.className = "friend-item-card";

        card.innerHTML = `
            <div class="friend-item-info">
                <div class="friend-item-name">${item.name}(Lv.${item.level})</div>
                <div class="friend-item-level">${effectText(item.name, item.level)}</div>
            </div>
            <button class="${isEquipped ? "equip-unequip-btn" : "friend-approve-btn"}">
                ${isEquipped ? "解除する" : "装備する"}
            </button>
        `;

        card.querySelector("button").addEventListener("click", async () => {

            const current = getPlayerData();
            if (!current) return;

            current.equippedItemId = isEquipped ? null : item.id;

            await saveGame();
            renderEquipment(current);

        });

        els.inventoryList.appendChild(card);

    });

}

// ======================================
// 初期化
// ======================================

window.addEventListener("DOMContentLoaded", () => {

    cacheElements();

    if (!els.overlay) {

        // 装備UIが存在しないページでは何もしない
        return;

    }

    els.equipBtn?.addEventListener("click", openEquipment);
    els.closeBtn.addEventListener("click", closeEquipment);

});
