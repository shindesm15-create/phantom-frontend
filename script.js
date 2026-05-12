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

let loadedMessageIds = new Set();

/* Online users */

let onlineUsers = new Set();

/* =========================
   START APP
========================= */

window.onload = async () => {

    let meBox =
        document.getElementById("me");

    if (meBox) {

        meBox.innerText =
            "Logged as: " + me;
    }

    /* Wake Render backend */

    try {

        await fetch(
            API_BASE + "/users"
        );

    } catch (e) {

        console.log(
            "Wake backend error:",
            e
        );
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

    try {

        const socket =
            new SockJS(
                API_BASE + "/chat"
            );

        stompClient =
            Stomp.over(socket);

        stompClient.debug = null;

        stompClient.connect(
            {},

            () => {

                connected = true;

                console.log(
                    "Socket connected"
                );

                /* ONLINE */

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
                            JSON.parse(
                                msg.body
                            );

                        let key =
                            m.id ||
                            `${m.from}_${m.to}_${m.content}_${m.timestamp}`;

                        /* Prevent duplicates */

                        if (
                            renderedMessages.has(key)
                        ) {
                            return;
                        }

                        renderedMessages.add(key);

                        if (

                            (
                                m.from === me &&
                                m.to === selectedUser
                            )

                            ||

                            (
                                m.from === selectedUser &&
                                m.to === me
                            )
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
                            JSON.parse(
                                msg.body
                            );

                        let typingBox =
                            document.getElementById(
                                "typing"
                            );

                        if (

                            data.from === selectedUser &&

                            data.to === me
                        ) {

                            typingBox.innerText =

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
                                JSON.parse(
                                    msg.body
                                )
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

                /* Auto reconnect */

                setTimeout(() => {

                    connectSocket();

                }, 3000);
            }
        );

    } catch (e) {

        console.log(
            "Socket error:",
            e
        );

        setTimeout(() => {

            connectSocket();

        }, 3000);
    }
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
            document.getElementById(
                "users"
            );

        if (!box) return;

        box.innerHTML = "";

        users.forEach(username => {

            if (username === me)
                return;

            /* TEMP ONLINE */

            let online = true;

            let div =
                document.createElement(
                    "div"
                );

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
                                : '#888'
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
                            : '#555'
                        };

                        box-shadow:
                        0 0 8px ${
                            online
                            ? '#4ade80'
                            : '#555'
                        };
                    ">

                    </div>

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

    let chatWith =
        document.getElementById(
            "chatWith"
        );

    if (chatWith) {

        chatWith.innerText =
            username;
    }

    let avatar =
        document.getElementById(
            "avatarBox"
        );

    if (avatar) {

        avatar.innerText =
            username.charAt(0)
            .toUpperCase();
    }

    let chat =
        document.querySelector(
            ".chat"
        );

    if (chat) {

        chat.classList.add(
            "active"
        );
    }

    /* Hide sidebar mobile */

    let sidebar =
        document.querySelector(
            ".sidebar"
        );

    if (

        window.innerWidth < 900 &&

        sidebar
    ) {

        sidebar.style.display =
            "none";
    }

    loadMessages();

    let input =
        document.getElementById(
            "msg"
        );

    if (input) {

        input.focus();
    }
}

/* =========================
   CLOSE CHAT
========================= */

function closeChat() {

    let chat =
        document.querySelector(
            ".chat"
        );

    if (chat) {

        chat.classList.remove(
            "active"
        );
    }

    let sidebar =
        document.querySelector(
            ".sidebar"
        );

    if (sidebar) {

        sidebar.style.display =
            "block";
    }
}

/* =========================
   SEND MESSAGE
========================= */

function send() {

    let input =
        document.getElementById(
            "msg"
        );

    if (!input) return;

    let content =
        input.value.trim();

    if (!content) return;

    if (!selectedUser) {

        alert("Select user");

        return;
    }

    if (!connected) {

        alert(
            "Socket not connected"
        );

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
   ENTER + TYPING
========================= */

document.addEventListener(
    "DOMContentLoaded",

    () => {

        let input =
            document.getElementById(
                "msg"
            );

        if (!input) return;

        input.addEventListener(
            "keypress",

            (e) => {

                if (
                    e.key === "Enter"
                ) {

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
   SEND TYPING
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
            document.getElementById(
                "messages"
            );

        if (!box) return;

        box.innerHTML = "";

        data.forEach(m => {

            let key =
                m.id ||
                `${m.from}_${m.to}_${m.content}_${m.timestamp}`;

            /* Prevent reload duplicates */

            if (
                loadedMessageIds.has(key)
            ) {
                return;
            }

            loadedMessageIds.add(key);

            renderedMessages.add(key);

            renderMessage(m);
        });

    } catch (e) {

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
        document.getElementById(
            "messages"
        );

    if (!box) return;

    let mine =
        m.from === me;

    let time = "";

    if (m.timestamp) {

        let d =
            new Date(
                m.timestamp
            );

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

            <div>

                ${m.content}

            </div>

            <div class="msgTime">

                ${time}

            </div>

        </div>
    `;

    box.scrollTop =
        box.scrollHeight;
}

/* =========================
   AUTO REFRESH USERS
========================= */

setInterval(() => {

    loadUsers();

}, 5000);
