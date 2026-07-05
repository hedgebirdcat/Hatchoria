// ======================================
// Hatchoria
// home.js
// ホーム画面
// ======================================

import { auth, db } from "./firebase.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const playerName = document.getElementById("playerName");
const level = document.getElementById("level");
const exp = document.getElementById("exp");
const coins = document.getElementById("coins");
const monsterImage = document.getElementById("monsterImage");

onAuthStateChanged(auth, async (user) => {

    // Firebaseがログイン状態を確認中は待つ
    if (!user) {
        console.log("ログイン状態を確認中、または未ログインです。");
        return;
    }

    try {

        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
            console.log("ユーザーデータがありません");
            return;
        }

        const data = snap.data();

        // プレイヤー情報
        if (playerName) playerName.textContent = data.accountName || "";
        if (level) level.textContent = "Lv." + (data.level || 1);
        if (exp) exp.textContent = (data.exp || 0) + " XP";
        if (coins) coins.textContent = (data.coins || 0) + " Coins";

        // モンスター表示
        updateMonster(
            data.monster || "leaf",
            data.monsterLevel || 1
        );

    } catch (error) {

        console.error("読み込みエラー:", error);

    }

});


// モンスター画像変更
function updateMonster(type, level){

    let stage = 1;

    if(level >= 70){

        stage = 5;

    }else if(level >= 40){

        stage = 4;

    }else if(level >= 20){

        stage = 3;

    }else if(level >= 10){

        stage = 2;

    }

    monsterImage.src =
        `assets/images/${type}_${stage}.png`;

}
