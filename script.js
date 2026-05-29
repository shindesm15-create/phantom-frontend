
const API_BASE =
"https://phantom-backend05-1.onrender.com";

/* =========================
   USER
========================= */

const me =
localStorage.getItem("user");

if (!me) {
    window.location.href =
    "login.html";
}

/* =========================
   GLOBALS
========================= */

let selectedUser = "";
let stompClient = null;
let connected = false;
let typingTimeout = null;

let onlineUsers = [];
let usersInChat = [];

const renderedMessages =
new Set();

/* =========================
   START
========================= */

window.onload = async () => {

    const meBox =
    document.getElementById("me");

    if (meBox) {
        meBox.innerText =
        "Logged as: " + me;
    }

    await setOnline();

    connectSocket();

    await refreshUsers();

    setupInputEvents();
};

/* =========================
   ONLINE / OFFLINE
========================= */

async function setOnline() {

    try {

        await fetch(
            API_BASE +
            "/online?user=" + me,
            {
                method:"POST"
            }
        );

    } catch(e){}
}

function setOffline() {

    navigator.sendBeacon(
        API_BASE +
        "/offline?user=" + me
    );
}

window.addEventListener(
    "beforeunload",
    () => {

        sendChatPresence(false);

        setOffline();
    }
);

document.addEventListener(
    "visibilitychange",

    async () => {

        if (document.hidden) {

            sendChatPresence(false);

            setOffline();

        } else {

            await setOnline();

            await refreshUsers();

            updateChatStatus();
        }
    }
);

/* =========================
   SOCKET
========================= */

function connectSocket() {

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
                "Socket Connected"
            );

            subscribeMessages();
            subscribeTyping();
            subscribeChatPresence();
        },

        () => {

            connected = false;

            console.log(
                "Socket Disconnected"
            );

            setTimeout(() => {

                connectSocket();

            },3000);
        }
    );
}

/* =========================
   CHAT PRESENCE
========================= */

function sendChatPresence(inChat) {

    if (!connected)
        return;

    stompClient.send(

        "/app/chat-presence",

        {},

        JSON.stringify({

            user: me,

            inChat: inChat
        })
    );
}

function subscribeChatPresence() {

    stompClient.subscribe(

        "/topic/chat-presence",

        (msg) => {

            const data =
            JSON.parse(msg.body);

            if (data.inChat) {

                if (
                    !usersInChat.includes(
                        data.user
                    )
                ) {

                    usersInChat.push(
                        data.user
                    );
                }

            } else {

                usersInChat =
                usersInChat.filter(

                    u => u !== data.user
                );
            }

            updateChatStatus();
            loadUsers();
        }
    );
}

/* =========================
   RECEIVE MESSAGE
========================= */

function subscribeMessages() {

    stompClient.subscribe(

        "/topic/messages",

        (msg) => {

            const m =
            JSON.parse(msg.body);

            const currentChat =

                (
                    m.from === me &&
                    m.to === selectedUser
                )

                ||

                (
                    m.from === selectedUser &&
                    m.to === me
                );

            if (!currentChat)
                return;

            const key =
            m.id;

            if (
                renderedMessages.has(key)
            ) {
                return;
            }

            renderedMessages.add(key);

            renderMessage(m);

            smoothScrollBottom();
        }
    );
}

/* =========================
   TYPING
========================= */

function subscribeTyping() {

    stompClient.subscribe(

        "/topic/typing",

        (msg) => {

            const data =
            JSON.parse(msg.body);

            const typingBox =
            document.getElementById(
                "typing"
            );

            if (!typingBox)
                return;

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
}

function sendTyping(status) {

    if (
        !selectedUser ||
        !connected
    ) {
        return;
    }

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
   USERS
========================= */

async function refreshUsers() {

    await loadOnlineUsers();
    await loadUsers();
}

async function loadOnlineUsers() {

    try {

        const res =
        await fetch(
            API_BASE +
            "/online-users"
        );

        onlineUsers =
        await res.json();

    } catch(e){}
}

async function loadUsers() {

    try {

        const res =
        await fetch(
            API_BASE + "/users"
        );

        const users =
        await res.json();

        const box =
        document.getElementById(
            "users"
        );

        if (!box)
            return;

        box.innerHTML = "";

        users.forEach(user => {

            if (user === me)
                return;

            const online =
            onlineUsers.includes(user);

            const inChat =
            usersInChat.includes(user);

            const div =
            document.createElement("div");

            div.className =
            "user";

            div.onclick = () => {

                openChat(user);
            };

            div.innerHTML = `

                <div style="
                    display:flex;
                    align-items:center;
                    gap:10px;
                ">

                    <div style="
                        width:42px;
                        height:42px;
                        border-radius:50%;
                        background:#222;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        font-size:20px;
                    ">

                        ${inChat ? "💀" : ""}

                    </div>

                    <div>

                        <div>
                            <b>${user}</b>
                        </div>

                        <div style="
                            font-size:12px;
                            color:
                            ${online ? '#4ade80' : '#888'};
                        ">

                            ${
                                online
                                ? "online"
                                : "offline"
                            }

                        </div>

                    </div>

                </div>
            `;

            box.appendChild(div);
        });

    } catch(e){}
}

/* =========================
   OPEN CHAT
========================= */

async function openChat(user) {

    selectedUser = user;

    sendChatPresence(true);

    renderedMessages.clear();

    document.getElementById(
        "messages"
    ).innerHTML = "";

    document.getElementById(
        "chatWith"
    ).innerText = user;

    document.getElementById(
        "avatarBox"
    ).innerText =

    user.charAt(0)
    .toUpperCase();

    updateChatStatus();

    await loadMessages();

    if (window.innerWidth <= 700) {

        document.querySelector(
            ".sidebar"
        ).style.display =
        "none";

        document.querySelector(
            ".chat"
        ).style.display =
        "flex";
    }
}

/* =========================
   CLOSE CHAT
========================= */

function closeChat() {

    sendChatPresence(false);

    selectedUser = "";

    document.querySelector(
        ".chat"
    ).style.display =
    "none";

    document.querySelector(
        ".sidebar"
    ).style.display =
    "block";
}

/* =========================
   STATUS
========================= */

function updateChatStatus() {

    if (!selectedUser)
        return;

    const online =
    onlineUsers.includes(
        selectedUser
    );

    const inChat =
    usersInChat.includes(
        selectedUser
    );

    const statusBox =
    document.getElementById(
        "chatStatus"
    );

    if (!statusBox)
        return;

    if (inChat) {

        statusBox.innerHTML =
        "💀 in chat";

        statusBox.style.color =
        "#4ade80";

    } else {

        statusBox.innerHTML =
        online
        ? "online"
        : "offline";

        statusBox.style.color =
        online
        ? "#4ade80"
        : "#888";
    }
}

/* =========================
   SEND MESSAGE
========================= */

function send() {

    const input =
    document.getElementById(
        "msg"
    );

    if (!input)
        return;

    const content =
    input.value.trim();

    if (!content)
        return;

    if (!selectedUser)
        return;

    if (!connected)
        return;

    const msg = {

        id:
        crypto.randomUUID(),

        from: me,

        to: selectedUser,

        content: content,

        timestamp:
        Date.now()
    };

    if (
        renderedMessages.has(
            msg.id
        )
    ) {
        return;
    }

    renderedMessages.add(
        msg.id
    );

    renderMessage(msg);

    smoothScrollBottom();

    stompClient.send(

        "/app/send",

        {},

        JSON.stringify(msg)
    );

    input.value = "";

    sendTyping(false);
}

/* =========================
   LOAD MESSAGES
========================= */

async function loadMessages() {

    try {

        const res =
        await fetch(

            `${API_BASE}/messages?user1=${me}&user2=${selectedUser}`
        );

        const data =
        await res.json();

        data.forEach(m => {

            if (
                renderedMessages.has(
                    m.id
                )
            ) {
                return;
            }

            renderedMessages.add(
                m.id
            );

            renderMessage(m);
        });

        smoothScrollBottom();

    } catch(e){

        console.log(
            "Load error",
            e
        );
    }
}

/* =========================
   RENDER MESSAGE
========================= */

function renderMessage(m) {

    const box =
    document.getElementById(
        "messages"
    );

    if (!box)
        return;

    const mine =
    m.from === me;

    const div =
    document.createElement(
        "div"
    );

    div.className =

        mine
        ? "myMsg"
        : "otherMsg";

    let time = "";

    if (m.timestamp) {

        const d =
        new Date(m.timestamp);

        time =

            d.getHours() +

            ":" +

            String(
                d.getMinutes()
            ).padStart(2,"0");
    }

    div.innerHTML = `

        <div>
            ${m.content}
        </div>

        <div class="msgTime">
            ${time}
        </div>
    `;

    box.appendChild(div);
}

/* =========================
   INPUT EVENTS
========================= */

function setupInputEvents() {

    const input =
    document.getElementById(
        "msg"
    );

    if (!input)
        return;

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

            },1000);
        }
    );
}

/* =========================
   SCROLL
========================= */

function smoothScrollBottom() {

    const box =
    document.getElementById(
        "messages"
    );

    if (!box)
        return;

    requestAnimationFrame(() => {

        box.scrollTo({

            top:
            box.scrollHeight,

            behavior:
            "smooth"
        });

    });
}

/* =========================
   AUTO REFRESH
========================= */

setInterval(

    async () => {

        if (!document.hidden) {

            await refreshUsers();

            updateChatStatus();
        }

    },

    3000
);

