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
    setDoc,
    deleteDoc,
    collection,
    query,
    where,
    getDocs
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
    monsterLevel,
    inventory,
    friendCode,
    combo,
    title,
    selfIntro,
    nameChangeCount

}) {

    await savePlayerData({

        accountName,
        level,
        exp,
        coins,
        goal,
        monster,
        monsterLevel,
        inventory,
        friendCode,
        combo,
        title,
        selfIntro,
        nameChangeCount

    });

}


// ======================================
// フレンド機能
// ======================================

// フレンドコード → uid の対応を誰でも引ける形で登録する
// (users コレクションは本人しか読めないため、検索用に別コレクションを使う)
export async function registerFriendCode(code, accountName) {

    const user = auth.currentUser;
    if (!user) return;

    const ref = doc(db, "friendCodeIndex", code);

    await setDoc(ref, {
        uid: user.uid,
        accountName: accountName
    });

}

// フレンドコードから相手のuid・名前を調べる
export async function findByFriendCode(code) {

    const ref = doc(db, "friendCodeIndex", code);
    const snap = await getDoc(ref);

    if (!snap.exists()) return null;

    return snap.data(); // { uid, accountName }

}

// フレンド申請を送る(fromUid_toUid というIDのドキュメントを作成)
export async function sendFriendRequest(toUid, fromName, toName) {

    const user = auth.currentUser;
    if (!user) return { ok: false, reason: "not-logged-in" };

    if (user.uid === toUid) {
        return { ok: false, reason: "self" };
    }

    const requestId = `${user.uid}_${toUid}`;
    const ref = doc(db, "friendRequests", requestId);

    const existing = await getDoc(ref);
    if (existing.exists()) {
        return { ok: false, reason: "already-sent" };
    }

    await setDoc(ref, {
        fromUid: user.uid,
        toUid: toUid,
        fromName: fromName,
        toName: toName,
        status: "pending",
        createdAt: Date.now()
    });

    return { ok: true };

}

// 届いている申請を承認する
export async function acceptFriendRequest(requestId) {

    const ref = doc(db, "friendRequests", requestId);
    await updateDoc(ref, { status: "accepted" });

}

// 申請の削除(拒否・キャンセル・フレンド解除に使う)
export async function deleteFriendRequest(requestId) {

    const ref = doc(db, "friendRequests", requestId);
    await deleteDoc(ref);

}

// 自分宛に届いている、承認待ちの申請一覧
export async function getIncomingRequests() {

    const user = auth.currentUser;
    if (!user) return [];

    const q = query(
        collection(db, "friendRequests"),
        where("toUid", "==", user.uid),
        where("status", "==", "pending")
    );

    const snap = await getDocs(q);

    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));

}

// 承認済みのフレンド一覧(自分が送った側・受けた側どちらも含む)
export async function getFriends() {

    const user = auth.currentUser;
    if (!user) return [];

    const sentQuery = query(
        collection(db, "friendRequests"),
        where("fromUid", "==", user.uid),
        where("status", "==", "accepted")
    );

    const receivedQuery = query(
        collection(db, "friendRequests"),
        where("toUid", "==", user.uid),
        where("status", "==", "accepted")
    );

    const [sentSnap, receivedSnap] = await Promise.all([
        getDocs(sentQuery),
        getDocs(receivedQuery)
    ]);

    const friends = [];

    sentSnap.forEach((d) => {
        friends.push({ uid: d.data().toUid, name: d.data().toName });
    });

    receivedSnap.forEach((d) => {
        friends.push({ uid: d.data().fromUid, name: d.data().fromName });
    });

    return friends;

}

// フレンドのレベル・モンスター情報を取得(フレンド同士のみ読める設定)
export async function getFriendPublicData(uid) {

    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) return null;

    const data = snap.data();

    return {
        accountName: data.accountName,
        level: data.level,
        monster: data.monster,
        monsterLevel: data.monsterLevel
    };

}
