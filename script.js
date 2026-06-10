const API_BASE = "https://phantom-backend05-1.onrender.com";

/* =========================
   USER
========================= */

const me = localStorage.getItem("user");

if (!me) window.location.href = "login.html";

/* =========================
   STATE
========================= */

let selectedUser = "";
let stompClient = null;
let connected = false;

let typingTimeout = null;

let onlineUsers = [];
const renderedMessages = new Map(); // better than Set (prevents leaks)

let messageSub = null;
let typingSub = null;

/* =========================
   INIT
========================= */

window.onload = async () => {

    document.getElementById("me").innerText = "Logged as: " + me;

    await setOnline();
    connectSocket();

    await loadOnlineUsers();
    await loadUsers();

    setupInput();

    setInterval(syncUsers, 4000);
};

/* =========================
   ONLINE
========================= */

async function setOnline() {
    try {
        await fetch(API_BASE + "/api/online?user=" + me, { method: "POST" });
    } catch (e) {}
}

function setOffline() {
    navigator.sendBeacon(API_BASE + "/api/offline?user=" + me);
}

window.addEventListener("beforeunload", setOffline);

/* =========================
   SOCKET
========================= */

function connectSocket() {

    const socket = new SockJS(API_BASE + "/ws");
    stompClient = Stomp.over(socket);
    stompClient.debug = null;

    stompClient.connect({}, () => {

        connected = true;

        subscribeMessages();
        subscribeTyping();

    }, () => {

        connected = false;

        setTimeout(connectSocket, 3000);
    });
}

/* =========================
   MESSAGE SOCKET
========================= */

function subscribeMessages() {

    if (messageSub) messageSub.unsubscribe();

    messageSub = stompClient.subscribe("/topic/messages", (msg) => {

        const m = JSON.parse(msg.body);

        if (!selectedUser) return;

        const valid =
            (m.from === me && m.to === selectedUser) ||
            (m.from === selectedUser && m.to === me);

        if (!valid) return;

        const key = m.id || `${m.from}_${m.timestamp}`;

        if (renderedMessages.has(key)) return;

        renderedMessages.set(key, true);

        renderMessage(m);
        scrollBottom();
    });
}

/* =========================
   TYPING SOCKET
========================= */

function subscribeTyping() {

    if (typingSub) typingSub.unsubscribe();

    typingSub = stompClient.subscribe("/topic/typing", (msg) => {

        const d = JSON.parse(msg.body);

        const box = document.getElementById("typing");
        if (!box) return;

        if (d.from === selectedUser && d.to === me) {
            box.innerText = d.isTyping ? "typing..." : "";
        }
    });
}

/* =========================
   USERS
========================= */

async function loadUsers() {

    const res = await fetch(API_BASE + "/api/users");
    const users = await res.json();

    const box = document.getElementById("users");
    box.innerHTML = "";

    users.forEach(u => {

        if (!u || u === me) return;

        const online = onlineUsers.includes(u);

        const div = document.createElement("div");
        div.className = "user";

        div.onclick = () => openChat(u);

        div.innerHTML = `
            <div class="userRow">
                <div class="snapAvatar">${online ? "🟢" : "⚪"}</div>
                <div>
                    <div class="userName">${u}</div>
                    <div class="userStatus">${online ? "online" : "offline"}</div>
                </div>
            </div>
        `;

        box.appendChild(div);
    });
}

/* =========================
   ONLINE USERS SYNC
========================= */

async function loadOnlineUsers() {
    try {
        const res = await fetch(API_BASE + "/api/online-users");
        onlineUsers = await res.json();
    } catch {
        onlineUsers = [];
    }
}

async function syncUsers() {

    if (document.hidden) return;

    await loadOnlineUsers();
    await loadUsers();
    updateStatus();
}

/* =========================
   OPEN CHAT
========================= */

async function openChat(user) {

    selectedUser = user;

    renderedMessages.clear();

    document.getElementById("chatWith").innerText = user;
    document.getElementById("messages").innerHTML = "";

    updateStatus();

    await loadMessages();

    // MOBILE FIX
    if (window.innerWidth <= 700) {
        document.querySelector(".sidebar").style.display = "none";
        document.querySelector(".chat").classList.add("active");
    }
}

/* =========================
   CLOSE CHAT
========================= */

function closeChat() {

    if (window.innerWidth <= 700) {
        document.querySelector(".sidebar").style.display = "block";
        document.querySelector(".chat").classList.remove("active");
    }
}

/* =========================
   STATUS
========================= */

function updateStatus() {

    if (!selectedUser) return;

    const online = onlineUsers.includes(selectedUser);

    document.getElementById("chatStatus").innerText =
        online ? "online" : "offline";

    document.getElementById("avatarBox").innerText =
        online ? "🟢" : "💀";
}

/* =========================
   LOAD MESSAGES
========================= */

async function loadMessages() {

    const res = await fetch(
        `${API_BASE}/api/messages?user1=${me}&user2=${selectedUser}`
    );

    const data = await res.json();

    data.forEach(renderMessage);

    scrollBottom();
}

/* =========================
   SEND MESSAGE (TEXT + IMAGE)
========================= */

function send() {

    const input = document.getElementById("msg");
    const file = document.getElementById("imageInput");

    if (!selectedUser || !connected) return;

    // IMAGE
    if (file.files.length > 0) {

        const reader = new FileReader();

        reader.onload = () => {

            sendMsg({
                id: crypto.randomUUID(),
                from: me,
                to: selectedUser,
                type: "image",
                content: reader.result,
                timestamp: Date.now()
            });
        };

        reader.readAsDataURL(file.files[0]);
        file.value = "";
        return;
    }

    // TEXT
    const text = input.value.trim();
    if (!text) return;

    sendMsg({
        id: crypto.randomUUID(),
        from: me,
        to: selectedUser,
        type: "text",
        content: text,
        timestamp: Date.now()
    });

    input.value = "";
}

/* =========================
   SEND SOCKET
========================= */

function sendMsg(msg) {

    renderedMessages.set(msg.id, true);

    renderMessage(msg);
    scrollBottom();

    stompClient.send("/app/send", {}, JSON.stringify(msg));

    sendTyping(false);
}

/* =========================
   TYPING
========================= */

function sendTyping(status) {

    if (!connected || !selectedUser) return;

    stompClient.send("/app/typing", {}, JSON.stringify({
        from: me,
        to: selectedUser,
        isTyping: status
    }));
}

/* =========================
   INPUT
========================= */

function setupInput() {

    const input = document.getElementById("msg");

    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") send();
    });

    input.addEventListener("input", () => {

        sendTyping(true);

        clearTimeout(typingTimeout);

        typingTimeout = setTimeout(() => {
            sendTyping(false);
        }, 1000);
    });
}

/* =========================
   RENDER MESSAGE
========================= */

function renderMessage(m) {

    const box = document.getElementById("messages");

    const div = document.createElement("div");

    const mine = m.from === me;

    div.className = mine ? "myMsg" : "otherMsg";

    let html = "";

    if (m.type === "image") {
        html = `<img class="chatImage" src="${m.content}" />`;
    } else {
        html = `<div>${m.content}</div>`;
    }

    div.innerHTML = html;

    box.appendChild(div);
}

/* =========================
   SCROLL
========================= */

function scrollBottom() {

    const box = document.getElementById("messages");

    setTimeout(() => {
        box.scrollTop = box.scrollHeight;
    }, 80);
}
