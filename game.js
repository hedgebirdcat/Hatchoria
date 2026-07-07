// ======================================
// Hatchoria
// game.js
// ゲーム本体
// ======================================

import { auth, db } from "./firebase.js";

import {
    loadPlayerData,
    saveAll
} from "./gameFirebase.js";

console.log("game.js 読み込み成功");
