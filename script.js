const API_BASE =
"https://phantom-backend05-1.onrender.com";

/* =========================
   USER
========================= */

let me = localStorage.getItem("user");

if (!me) {
    window.location.href = "login.html";
}

/* =========================
   GLOBALS
========================= */

let selectedUser = "";

let stompClient = null;

let connected = false;

let typingTimeout = null;

/* Prevent repeated messages */

let renderedMessages = new Set();

/* Online users */

let onlineUsers = new Set();

/* =========================
   START
========================= */

window.onload = async () => {

    document.getElementById("me")
    .innerText = "Logged as: " + me;

    /* Wake backend first */

    try {
        await fetch(API_BASE + "/users");
    } catch(e) {
        console.log(e);
    }

    setTimeout(() => {

        connectSocket();

        loadUsers();

    }, 2000);
};

/* =========================
   SOCKET
========================= */

function connectSocket() {

    if (connected) return;

    console.log("Connecting socket...");

    const socket =
        new SockJS(API_BASE + "/chat");

    stompClient =
        Stomp.over(socket);

    stompClient.debug = null;

    stompClient.connect(
        {},
        () => {

            connected = true;

            console.log("Socket connected");

            /* USER ONLINE */

            stompClient.send(
                "/app/online",
                {},
                me
            );

            /* RECEIVE MESSAGE */

            stompClient.subscribe(
                "/topic/messages",
                (msg) => {

                    let m =
                        JSON.parse(msg.body);

                    let key =
                        m.id ||
                        `${m.from}_${m.to}_${m.content}_${m.timestamp}`;

                    /* Prevent repeat */

                    if (
                        renderedMessages.has(key)
                    ) {
                        return;
                    }

                    renderedMessages.add(key);

                    if (
                        (m.from === me &&
                         m.to === selectedUser)
                        ||
                        (m.from === selectedUser &&
                         m.to === me)
                    ) {
                        renderMessage(m);
                    }
                }
            );

            /* TYPING */

            stompClient.subscribe(
                "/topic/typing",
                (msg) => {

                    let data =
                        JSON.parse(msg.body);

                    let typing =
                        document.getElementById("typing");

                    if (
                        data.from === selectedUser &&
                        data.to === me
                    ) {

                        typing.innerText =
                            data.isTyping
                            ? "typing..."
                            : "";
                    }
                }
            );

            /* ONLINE USERS */

            stompClient.subscribe(
                "/topic/online",
                (msg) => {

                    onlineUsers =
                        new Set(
                            JSON.parse(msg.body)
                        );

                    loadUsers();
                }
            );
        },

        (err) => {

            connected = false;

            console.log(
                "Socket failed:",
                err
            );

            /* reconnect */

            setTimeout(() => {

                connectSocket();

            }, 3000);
        }
    );
}

/* =========================
   LOAD USERS
========================= */

async function loadUsers() {

    try {

        let res =
            await fetch(
                API_BASE + "/users"
            );

        let users =
            await res.json();

        let box =
            document.getElementById("users");

        box.innerHTML = "";

        users.forEach(username => {

            if (username === me) return;

            let online =
                onlineUsers.has(username);

            let div =
                document.createElement("div");

            div.className = "user";

            div.onclick = () => {
                openChat(username);
            };

            div.innerHTML = `

                <div style="
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                    width:100%;
                ">

                    <div>

                        <b>${username}</b>

                        <div style="
                            font-size:12px;
                            margin-top:4px;
                            color:${
                                online
                                ? '#4ade80'
                                : '#999'
                            };
                        ">

                            ${
                                online
                                ? 'online'
                                : 'offline'
                            }

                        </div>

                    </div>

                    <div style="
                        width:10px;
                        height:10px;
                        border-radius:50%;
                        background:${
                            online
                            ? '#4ade80'
                            : '#666'
                        };
                    "></div>

                </div>
            `;

            box.appendChild(div);
        });

    } catch (e) {

        console.log(
            "Load users error:",
            e
        );
    }
}

/* =========================
   OPEN CHAT
========================= */

function openChat(username) {

    selectedUser = username;

    document.getElementById(
        "chatWith"
    ).innerText = username;

    document.getElementById(
        "avatarBox"
    ).innerText =
        username.charAt(0)
        .toUpperCase();

    document.querySelector(
        ".chat"
    ).classList.add("active");

    loadMessages();

    document.getElementById(
        "msg"
    ).focus();
}

/* =========================
   CLOSE CHAT
========================= */

function closeChat() {

    document.querySelector(
        ".chat"
    ).classList.remove("active");
}

/* =========================
   SEND MESSAGE
========================= */

function send() {

    let input =
        document.getElementById("msg");

    let content =
        input.value.trim();

    if (!content) return;

    if (!selectedUser) {

        alert("Select user");

        return;
    }

    if (!connected) {

        alert("Socket not connected");

        return;
    }

    let msg = {

        id: crypto.randomUUID(),

        from: me,

        to: selectedUser,

        content: content,

        timestamp: Date.now()
    };

    stompClient.send(
        "/app/send",
        {},
        JSON.stringify(msg)
    );

    input.value = "";

    sendTyping(false);
}

/* =========================
   ENTER SEND
========================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        let input =
            document.getElementById("msg");

        input.addEventListener(
            "keypress",
            (e) => {

                if (e.key === "Enter") {
                    send();
                }
            }
        );

        input.addEventListener(
            "input",
            () => {

                sendTyping(true);

                clearTimeout(
                    typingTimeout
                );

                typingTimeout =
                    setTimeout(() => {

                        sendTyping(false);

                    }, 1000);
            }
        );
    }
);

/* =========================
   TYPING
========================= */

function sendTyping(status) {

    if (!selectedUser) return;

    if (!connected) return;

    stompClient.send(
        "/app/typing",
        {},
        JSON.stringify({

            from: me,

            to: selectedUser,

            isTyping: status
        })
    );
}

/* =========================
   LOAD MESSAGES
========================= */

async function loadMessages() {

    if (!selectedUser) return;

    try {

        let res =
            await fetch(
                `${API_BASE}/messages?user1=${me}&user2=${selectedUser}`
            );

        let data =
            await res.json();

        let box =
            document.getElementById("messages");

        box.innerHTML = "";

        renderedMessages.clear();

        data.forEach(m => {

            let key =
                m.id ||
                `${m.from}_${m.to}_${m.content}_${m.timestamp}`;

            renderedMessages.add(key);

            renderMessage(m);
        });

    } catch(e) {

        console.log(
            "Load messages error:",
            e
        );
    }
}

/* =========================
   RENDER MESSAGE
========================= */

function renderMessage(m) {

    let box =
        document.getElementById("messages");

    let mine =
        m.from === me;

    let time = "";

    if (m.timestamp) {

        let d =
            new Date(m.timestamp);

        time =
            d.getHours() +
            ":" +
            String(
                d.getMinutes()
            ).padStart(2, "0");
    }

    box.innerHTML += `

        <div class="${
            mine
            ? "myMsg"
            : "otherMsg"
        }">

            <div>${m.content}</div>

            <div class="msgTime">
                ${time}
            </div>

        </div>
    `;

    box.scrollTop =
        box.scrollHeight;
}

/* =========================
   AUTO USERS REFRESH
========================= */

setInterval(() => {

    loadUsers();

}, 5000);
