// ======================================
// Hatchoria
// gameFirebase.js
// Firebaseデータ管理
// ======================================

import { auth, db } from "./firebase.js";

import {
    doc,
    getDoc,
    updateDoc,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


// ------------------------------
// プレイヤーデータ読み込み
// ------------------------------
export async function loadPlayerData() {

    const user = auth.currentUser;

    if (!user) {
        return null;
    }

    const ref = doc(db, "users", user.uid);

    const snap = await getDoc(ref);

    if (!snap.exists()) {
        return null;
    }

    return snap.data();

}


// ------------------------------
// プレイヤーデータ保存
// ------------------------------
export async function savePlayerData(data) {

    const user = auth.currentUser;

    if (!user) {
        return;
    }

    const ref = doc(db, "users", user.uid);

    await updateDoc(ref, data);

}


// ------------------------------
// 初回データ作成
// ------------------------------
export async function createPlayerData(data) {

    const user = auth.currentUser;

    if (!user) {
        return;
    }

    const ref = doc(db, "users", user.uid);

    await setDoc(ref, data);

}


// ------------------------------
// XP保存
// ------------------------------
export async function saveXP(xp) {

    await savePlayerData({
        exp: xp
    });

}


// ------------------------------
// レベル保存
// ------------------------------
export async function saveLevel(level) {

    await savePlayerData({
        level: level
    });

}


// ------------------------------
// コイン保存
// ------------------------------
export async function saveCoins(coins) {

    await savePlayerData({
        coins: coins
    });

}


// ------------------------------
// 必要XP保存
// ------------------------------
export async function saveGoal(goal) {

    await savePlayerData({
        goal: goal
    });

}


// ------------------------------
// モンスター情報保存
// ------------------------------
export async function saveMonster(type, monsterLevel) {

    await savePlayerData({

        monster: type,
        monsterLevel: monsterLevel

    });

}


// ------------------------------
// 全データ保存
// ------------------------------
export async function saveAll({

    accountName,
    level,
    exp,
    coins,
    goal,
    monster,
    monsterLevel

}) {

    await savePlayerData({

        accountName,
        level,
        exp,
        coins,
        goal,
        monster,
        monsterLevel

    });

}
