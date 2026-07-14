// ======================================
// Hatchoria
// screenNav.js
// 画面切り替え専用
// ======================================
//
// 各画面(ホーム/アドベンチャー/ゲーム/ガチャ)の
// 表示切り替えだけを担当する。
//
// 他の機能(ゲーム本体・ガチャ・ホーム表示など)は
// それぞれ独立したファイルに任せ、ここからは
// CustomEvent で「今この画面に入った」ことだけを知らせる。
// これにより、screenNav.js は他のファイルの中身を
// 一切知らなくてよくなる。
//
//   window に発火するイベント一覧:
//     hatchoria:enterHome    ホーム画面に入った
//     hatchoria:enterGame    ゲーム画面に入った(クイズ開始)
//     hatchoria:enterGacha   ガチャ画面に入った

const SCREENS = {
    home:      document.getElementById("home-screen"),
    adventure: document.getElementById("story-adventure-screen"),
    game:      document.getElementById("game-screen"),
    gacha:     document.getElementById("gacha-screen")
};

function showScreen(name) {

    Object.values(SCREENS).forEach((el) => {
        if (el) el.style.display = "none";
    });

    if (SCREENS[name]) {
        SCREENS[name].style.display = "block";
    }

}

function goHome() {

    document.body.classList.remove("bonus-active");
    showScreen("home");

    window.dispatchEvent(new Event("hatchoria:enterHome"));

}

// ホーム → アドベンチャー選択画面
document.querySelector(".adventure")
    ?.addEventListener("click", () => {
        showScreen("adventure");
    });

// アドベンチャー → ホームに戻る
document.getElementById("home-btn")
    ?.addEventListener("click", goHome);

// アドベンチャー → ゲーム画面(クイズ開始)
document.querySelector(".adventure-choice")
    ?.addEventListener("click", () => {

        showScreen("game");
        window.dispatchEvent(new Event("hatchoria:enterGame"));

    });

// ゲーム画面 → ホームに戻る
document.getElementById("back-btn")
    ?.addEventListener("click", goHome);

// ホーム → ガチャ画面
document.getElementById("home-gacha-btn")
    ?.addEventListener("click", () => {

        showScreen("gacha");
        window.dispatchEvent(new Event("hatchoria:enterGacha"));

    });

// ガチャ画面 → ホームに戻る
document.getElementById("gacha-back-btn")
    ?.addEventListener("click", goHome);
