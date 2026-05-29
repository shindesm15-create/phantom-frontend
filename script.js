 ```javascript
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

let reconnecting = false;

let typingTimeout = null;

let onlineUsers = [];

let currentPage = 0;

const PAGE_SIZE = 50;

let loadingMessages = false;

const renderedMessages =
new Set();

const loadedMessageIds =
new Set();

/* =========================
   START APP
========================= */

window.onload = async () => {

    const meBox =
    document.getElementById("me");

    if (meBox) {

        meBox.innerText =
        "Logged as: " + me;
    }

    /* WAKE BACKEND */

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

    /* SET ONLINE */

    await setOnline();

    connectSocket();

    await loadOnlineUsers();

    await loadUsers();

    setupInputEvents();

    setupScrollPagination();
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
                method: "POST"
            }
        );

    } catch (e) {

        console.log(
            "Online error:",
            e
        );
    }
}

async function setOffline() {

    try {

        navigator.sendBeacon(

            API_BASE +
            "/offline?user=" + me
        );

    } catch (e) {

        console.log(
            "Offline error:",
            e
        );
    }
}

window.addEventListener(

    "beforeunload",

    () => {

        setOffline();
    }
);

window.addEventListener(

    "visibilitychange",

    async () => {

        if (document.hidden) {

            setOffline();

        } else {

            await setOnline();

            await loadOnlineUsers();

            await loadUsers();

            if (selectedUser) {

                updateChatStatus(
                    selectedUser
                );
            }
        }
    }
);

/* =========================
   SOCKET
========================= */

function connectSocket() {

    if (
        connected ||
        reconnecting
    ) {
        return;
    }

    reconnecting = true;

    console.log(
        "Connecting socket..."
    );

    try {

        const socket =

        new SockJS(
            API_BASE + "/chat"
        );

        stompClient =
        Stomp.over(socket);

        stompClient.debug = null;

        stompClient.heartbeat.outgoing =
        20000;

        stompClient.heartbeat.incoming =
        20000;

        stompClient.connect(

            {},

            () => {

                connected = true;

                reconnecting = false;

                console.log(
                    "Socket connected"
                );

                subscribeMessages();

                subscribeTyping();
            },

            (err) => {

                console.log(
                    "Socket failed:",
                    err
                );

                connected = false;

                reconnecting = false;

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

        connected = false;

        reconnecting = false;

        setTimeout(() => {

            connectSocket();

        }, 3000);
    }
}

/* =========================
   SUBSCRIBE MESSAGE
========================= */

function subscribeMessages() {

    stompClient.subscribe(

        "/topic/messages",

        (msg) => {

            const m =
            JSON.parse(msg.body);

            const isCurrentChat =

                (
                    m.from === me &&
                    m.to === selectedUser
                )

                ||

                (
                    m.from === selectedUser &&
                    m.to === me
                );

            if (!isCurrentChat) {

                loadUsers();

                return;
            }

            const key =

                m.id ||

                `${m.from}_${m.to}_${m.content}_${m.timestamp}`;

            if (
                renderedMessages.has(key)
            ) {
                return;
            }

            renderMessage(m);

            loadUsers();
        }
    );
}

/* =========================
   SUBSCRIBE TYPING
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

/* =========================
   LOAD ONLINE USERS
========================= */

async function loadOnlineUsers() {

    try {

        const res =

        await fetch(
            API_BASE +
            "/online-users"
        );

        onlineUsers =
        await res.json();

    } catch (e) {

        console.log(
            "Online users error:",
            e
        );
    }
}

/* =========================
   LOAD USERS
========================= */

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

        if (!box) return;

        box.innerHTML = "";

        users.forEach(username => {

            if (username === me)
                return;

            const online =

            onlineUsers.includes(
                username
            );

            const div =
            document.createElement(
                "div"
            );

            div.className =
            "user";

            div.onclick = () => {

                openChat(username);
            };

            div.innerHTML = `

                <div class="userRow">

                    <div>

                        <b>${username}</b>

                        <div
                        class="statusText"
                        style="
                        color:${online ? '#4ade80' : '#888'}
                        ">

                            ${online ? 'online' : 'offline'}

                        </div>

                    </div>

                    <div
                    class="statusDot"
                    style="
                    background:${online ? '#4ade80' : '#555'}
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

    currentPage = 0;

    renderedMessages.clear();

    loadedMessageIds.clear();

    const messagesBox =

    document.getElementById(
        "messages"
    );

    if (messagesBox) {

        messagesBox.innerHTML =
        "";
    }

    document.getElementById(
        "chatWith"
    ).innerText = username;

    document.getElementById(
        "avatarBox"
    ).innerText =

    username.charAt(0)
    .toUpperCase();

    updateChatStatus(username);

    document.querySelector(
        ".chat"
    ).classList.add(
        "active"
    );

    const sidebar =

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

    document.getElementById(
        "msg"
    ).focus();
}

/* =========================
   CHAT STATUS
========================= */

function updateChatStatus(username) {

    const statusBox =

    document.getElementById(
        "chatStatus"
    );

    if (!statusBox)
        return;

    const online =

    onlineUsers.includes(
        username
    );

    statusBox.innerText =

        online
        ? "online"
        : "offline";

    statusBox.style.color =

        online
        ? "#4ade80"
        : "#888";
}

/* =========================
   CLOSE CHAT
========================= */

function closeChat() {

    document.querySelector(
        ".chat"
    ).classList.remove(
        "active"
    );

    const sidebar =

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

    const input =

    document.getElementById(
        "msg"
    );

    if (!input) return;

    const content =
    input.value.trim();

    if (!content)
        return;

    if (!selectedUser) {

        alert(
            "Select user"
        );

        return;
    }

    if (!connected) {

        alert(
            "Socket not connected"
        );

        return;
    }

    const msg = {

        id:
        crypto.randomUUID(),

        from: me,

        to: selectedUser,

        content: content,

        timestamp:
        Date.now()
    };

    stompClient.send(

        "/app/send",

        {},

        JSON.stringify(msg)
    );

    renderMessage(msg);

    input.value = "";

    sendTyping(false);
}

/* =========================
   TYPING
========================= */

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

            }, 1000);
        }
    );
}

/* =========================
   LOAD MESSAGES
========================= */

async function loadMessages() {

    if (
        !selectedUser ||
        loadingMessages
    ) {
        return;
    }

    loadingMessages = true;

    try {

        const res = await fetch(

            `${API_BASE}/messages?user1=${me}&user2=${selectedUser}&page=${currentPage}&size=${PAGE_SIZE}`
        );

        const data =
        await res.json();

        const box =

        document.getElementById(
            "messages"
        );

        if (!box)
            return;

        if (currentPage === 0) {

            box.innerHTML = "";
        }

        data.reverse().forEach(m => {

            const key =

                m.id ||

                `${m.from}_${m.to}_${m.content}_${m.timestamp}`;

            if (
                loadedMessageIds.has(key)
            ) {
                return;
            }

            loadedMessageIds.add(key);

            renderMessage(
                m,
                currentPage !== 0
            );
        });

        if (currentPage === 0) {

            smoothScrollBottom();
        }

    } catch (e) {

        console.log(
            "Load messages error:",
            e
        );

    } finally {

        loadingMessages = false;
    }
}

/* =========================
   RENDER MESSAGE
========================= */

function renderMessage(
    m,
    prepend = false
) {

    const box =

    document.getElementById(
        "messages"
    );

    if (!box)
        return;

    const key =

        m.id ||

        `${m.from}_${m.to}_${m.content}_${m.timestamp}`;

    if (
        renderedMessages.has(key)
    ) {
        return;
    }

    renderedMessages.add(key);

    const mine =
    m.from === me;

    const msgDiv =
    document.createElement(
        "div"
    );

    msgDiv.className =

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
            ).padStart(2, "0");
    }

    msgDiv.innerHTML = `

        <div class="msgContent">

            ${m.content}

        </div>

        <div class="msgTime">

            ${time}

        </div>
    `;

    if (prepend) {

        const oldHeight =
        box.scrollHeight;

        box.prepend(msgDiv);

        const newHeight =
        box.scrollHeight;

        box.scrollTop +=

            newHeight -
            oldHeight;

    } else {

        box.appendChild(msgDiv);

        smoothScrollBottom();
    }
}

/* =========================
   SMOOTH SCROLL
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
   PAGINATION
========================= */

function setupScrollPagination() {

    const box =

    document.getElementById(
        "messages"
    );

    if (!box)
        return;

    box.addEventListener(

        "scroll",

        async () => {

            if (

                box.scrollTop <= 0 &&

                !loadingMessages
            ) {

                currentPage++;

                await loadMessages();
            }
        }
    );
}

/* =========================
   AUTO REFRESH USERS
========================= */

setInterval(

    async () => {

        if (!document.hidden) {

            await loadOnlineUsers();

            await loadUsers();

            if (selectedUser) {

                updateChatStatus(
                    selectedUser
                );
            }
        }

    },

    5000
);
```
