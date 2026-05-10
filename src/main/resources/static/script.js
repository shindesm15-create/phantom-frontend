/* =======================
   INIT USER
======================= */

let me = localStorage.getItem("user");
let selectedUser = "";
let typingTimeout;

if (!me) {
    window.location.href = "/login.html";
}

document.getElementById("me").innerText = "Logged as: " + me;

/* =======================
   ONLINE STATUS
======================= */

fetch(`/online?user=${me}`, { method: "POST" });

window.addEventListener("beforeunload", () => {
    navigator.sendBeacon(`/offline?user=${me}`);
});

/* =======================
   SOCKET SETUP
======================= */

let socket = new SockJS("/chat");
let stompClient = Stomp.over(socket);

/* =======================
   CONNECT SOCKET
======================= */

stompClient.connect({}, () => {

    /* -------- MESSAGE -------- */
    stompClient.subscribe("/topic/messages", (message) => {

        let m = JSON.parse(message.body);

        let match =
            (m.from === me && m.to === selectedUser) ||
            (m.from === selectedUser && m.to === me);

        if (match) {
            renderMessage(m);
        }
    });

    /* -------- TYPING -------- */
    stompClient.subscribe("/topic/typing", (msg) => {

        let data = JSON.parse(msg.body);

        if (data.from === selectedUser && data.to === me) {

            let typingBox = document.getElementById("typing");

            if (typingBox) {
                typingBox.innerText = data.isTyping ? "typing..." : "";
            }
        }
    });

    loadUsers();
});

/* =======================
   LOAD USERS
======================= */

async function loadUsers() {

    let users = await (await fetch("/users")).json();
    let online = await (await fetch("/online-users")).json();

    let box = document.getElementById("users");
    box.innerHTML = "";

    users.forEach(u => {

        if (u !== me) {

            let isOnline = online.includes(u);

            box.innerHTML += `
                <div class="user" onclick="selectUser('${u}')">
                    ${u}
                    <span style="float:right;color:${isOnline ? '#00ff66' : '#555'};">
                        ${isOnline ? '●' : '○'}
                    </span>
                </div>
            `;
        }
    });
}

/* =======================
   SELECT USER
======================= */

function selectUser(u) {

    selectedUser = u;

    document.getElementById("chatWith").innerText = u;

    document.querySelector(".chat").classList.add("active");

    loadMessages();

    document.getElementById("msg").focus();

    // mark seen
    fetch(`/seen?from=${u}&to=${me}`, { method: "POST" });
}

/* =======================
   CLOSE CHAT
======================= */

function closeChat() {
    document.querySelector(".chat").classList.remove("active");
}

/* =======================
   SEND MESSAGE
======================= */

function send() {

    let input = document.getElementById("msg");
    let content = input.value.trim();

    if (!content || !selectedUser) return;

    stompClient.send("/app/send", {}, JSON.stringify({
        from: me,
        to: selectedUser,
        content: content
    }));

    input.value = "";

    sendTyping(false);
}

/* =======================
   ENTER KEY SEND
======================= */

document.getElementById("msg").addEventListener("keypress", (e) => {
    if (e.key === "Enter") send();
});

/* =======================
   TYPING EVENT
======================= */

document.getElementById("msg").addEventListener("input", () => {

    sendTyping(true);

    clearTimeout(typingTimeout);

    typingTimeout = setTimeout(() => {
        sendTyping(false);
    }, 1000);
});

function sendTyping(status) {

    if (!selectedUser) return;

    stompClient.send("/app/typing", {}, JSON.stringify({
        from: me,
        to: selectedUser,
        isTyping: status
    }));
}

/* =======================
   RENDER MESSAGE
======================= */

function renderMessage(m) {

    let box = document.getElementById("messages");

    let mine = m.from === me;

    let status = "";

    if (mine) {
        if (m.status === "sent") status = "✓ Sent";
        if (m.status === "delivered") status = "✓✓ Delivered";
        if (m.status === "seen") status = "✓✓ Seen";
    }

    let time = "";
    if (m.timestamp) {
        let d = new Date(m.timestamp);
        time =
            String(d.getHours()).padStart(2, "0") +
            ":" +
            String(d.getMinutes()).padStart(2, "0");
    }

    box.innerHTML += `
        <div class="${mine ? 'myMsg' : 'otherMsg'}">

            <div>${m.content}</div>

            <div style="font-size:11px;margin-top:5px;opacity:0.7;text-align:right;">
                ${time} ${status}
            </div>

        </div>
    `;

    autoScroll();
}

/* =======================
   AUTO SCROLL
======================= */

function autoScroll() {

    let box = document.getElementById("messages");

    let shouldScroll =
        box.scrollTop + box.clientHeight >= box.scrollHeight - 80;

    if (shouldScroll) {
        box.scrollTop = box.scrollHeight;
    }
}

/* =======================
   LOAD MESSAGES
======================= */

async function loadMessages() {

    if (!selectedUser) return;

    let res = await fetch(`/messages?user1=${me}&user2=${selectedUser}`);
    let data = await res.json();

    let box = document.getElementById("messages");
    box.innerHTML = "";

    data.forEach(m => renderMessage(m));
}

/* =======================
   AUTO REFRESH USERS
======================= */

setInterval(loadUsers, 3000);