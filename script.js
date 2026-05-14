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

/* Message cache */

const renderedMessages =
new Set();

const loadedMessageIds =
new Set();

/* Pagination */

let currentPage = 0;

const PAGE_SIZE = 50;

let loadingMessages = false;

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

    /* Wake backend */

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

    connectSocket();

    loadOnlineUsers();

    loadUsers();
};

/* =========================
   SOCKET
========================= */

function connectSocket() {

    if (connected || reconnecting)
        return;

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

        stompClient.connect(

            {},

            () => {

                connected = true;

                reconnecting = false;

                console.log(
                    "Socket connected"
                );

                /* =====================
                   RECEIVE MESSAGE
                ===================== */

               stompClient.subscribe(

    "/topic/messages",

    (msg) => {

        const m =
        JSON.parse(
            msg.body
        );

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

        loadUsers();
    }
);
                /* =====================
                   TYPING
                ===================== */

                stompClient.subscribe(

                    "/topic/typing",

                    (msg) => {

                        const data =
                        JSON.parse(
                            msg.body
                        );

                        const typingBox =

                        document.getElementById(
                            "typing"
                        );

                        if (
                            !typingBox
                        ) return;

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

            const wrapper =
            document.createElement(
                "div"
            );

            wrapper.style.display =
            "flex";

            wrapper.style.justifyContent =
            "space-between";

            wrapper.style.alignItems =
            "center";

            wrapper.style.width =
            "100%";

            const left =
            document.createElement(
                "div"
            );

            const name =
            document.createElement(
                "b"
            );

            name.innerText =
            username;

            const status =
            document.createElement(
                "div"
            );

            status.style.fontSize =
            "12px";

            status.style.marginTop =
            "4px";

            status.style.color =

                online
                ? "#4ade80"
                : "#888";

            status.innerText =

                online
                ? "online"
                : "offline";

            left.appendChild(name);

            left.appendChild(status);

            const dot =
            document.createElement(
                "div"
            );

            dot.style.width =
            "10px";

            dot.style.height =
            "10px";

            dot.style.borderRadius =
            "50%";

            dot.style.background =

                online
                ? "#4ade80"
                : "#555";

            dot.style.boxShadow =

                online
                ? "0 0 8px #4ade80"
                : "0 0 8px #555";

            wrapper.appendChild(left);

            wrapper.appendChild(dot);

            div.appendChild(wrapper);

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

    document.querySelector(
        ".chat"
    ).classList.add(
        "active"
    );

    /* MOBILE */

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

    if (!content) return;

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

    input.value = "";

    sendTyping(false);
}


/* =========================
   ENTER + TYPING
========================= */

document.addEventListener(

    "DOMContentLoaded",

    () => {

        const input =

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

        const data = await res.json();

        const box =
        document.getElementById(
            "messages"
        );

        if (!box) return;

        /* first page clear */

        if (currentPage === 0) {

            box.innerHTML = "";
        }

        /* IMPORTANT */
        /* remove reverse() */

        data.forEach(m => {

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

        /* auto scroll only first load */

        if (currentPage === 0) {

            requestAnimationFrame(() => {

                box.scrollTop =
                box.scrollHeight;
            });
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

    if (!box) return;

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

    const content =
    document.createElement(
        "div"
    );

    content.innerText =
    m.content;

    const timeDiv =
    document.createElement(
        "div"
    );

    timeDiv.className =
    "msgTime";

    timeDiv.innerText =
    time;

    msgDiv.appendChild(
        content
    );

    msgDiv.appendChild(
        timeDiv
    );

    /* prepend old msgs */

    if (prepend) {

        box.prepend(msgDiv);

    } else {

        box.appendChild(msgDiv);
    }

    /* auto scroll only new msg */

    if (!prepend) {

        requestAnimationFrame(() => {

            box.scrollTop =
            box.scrollHeight;
        });
    }
}

/* =========================
   SCROLL PAGINATION
========================= */

document.addEventListener(

    "DOMContentLoaded",

    () => {

        const box =

        document.getElementById(
            "messages"
        );

        if (!box) return;

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
);

/* =========================
   AUTO REFRESH USERS
========================= */

setInterval(() => {

    if (!document.hidden) {

        loadOnlineUsers();

        loadUsers();
    }

}, 15000);

/* =========================
   OFFLINE
========================= */

window.addEventListener(

    "beforeunload",

    () => {

        navigator.sendBeacon(

            API_BASE +

            "/offline?user=" + me
        );
    }
);
