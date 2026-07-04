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

const playerName = document.getElementById("playerName");
const level = document.getElementById("level");
const exp = document.getElementById("exp");
const coins = document.getElementById("coins");
const monsterImage = document.getElementById("monsterImage");

loadPlayer();

async function loadPlayer() {

    const user = auth.currentUser;

    if (!user) {

        window.location.href = "index.html";
        return;

    }

    const ref = doc(db, "users", user.uid);

    const snap = await getDoc(ref);

    if (!snap.exists()) {

        console.log("ユーザーデータがありません");
        return;

    }

    const data = snap.data();

    // プレイヤー情報
    playerName.textContent = data.accountName;
    level.textContent = "Lv." + data.level;
    exp.textContent = data.exp + " XP";
    coins.textContent = data.coins + " Coins";

    // モンスター表示
    updateMonster(
        data.monster || "leaf",
        data.monsterLevel || 1
    );

}


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
