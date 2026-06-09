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

let selectedMessage = null;
let replyingTo = null;

const renderedMessages =
new Set();
let messageSubscription = null;
let typingSubscription = null;


function getAvatar(user) {

    const emojiRegex =
    /\p{Extended_Pictographic}/u;

    const chars =
    [...user.trim()];

    if (
        chars.length &&
        emojiRegex.test(chars[0])
    ) {
        return chars[0];
    }

    return chars[0]
        ?.toUpperCase() || "?";
}

/* =========================
   START
========================= */

window.onload = async () => {

    const meBox =
    document.getElementById(
        "me"
    );

    if (meBox) {

        meBox.innerText =
        "Logged as: " + me;
    }

    await setOnline();

    connectSocket();

    await loadOnlineUsers();

    await loadUsers();

    setupInputEvents();
};

/* =========================
   ONLINE
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

        setOffline();
    }
);

/* =========================
   VISIBILITY
========================= */

document.addEventListener(

    "visibilitychange",

    async () => {

        if (document.hidden) {

            setOffline();

        } else {

            await setOnline();

            await loadOnlineUsers();

            await loadUsers();

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
   RECEIVE MESSAGE
========================= */


function subscribeMessages() {

    if (messageSubscription) {
        messageSubscription.unsubscribe();
    }

    messageSubscription = stompClient.subscribe(

        "/topic/messages",

        (msg) => {

            const m =
            JSON.parse(msg.body);

            /* MY MESSAGE ALREADY SHOWN IN send() */

            if (m.from === me) {
                return;
            }

            /* ONLY SHOW CURRENT CHAT */

            if (
                m.from !== selectedUser ||
                m.to !== me
            ) {
                return;
            }

            const key =
                m.id ||
                `${m.from}_${m.content}_${m.timestamp}`;

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

    if (typingSubscription) {
        typingSubscription.unsubscribe();
    }

    typingSubscription = stompClient.subscribe(

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
   USERS
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

    } catch(e){}
}

async function loadUsers() {
    try {
        const res = await fetch(API_BASE + "/users");
        const users = await res.json();

        console.log("Users:", users);
        console.log("Me:", me);

        const box = document.getElementById("users");
        console.log("Box:", box);

        box.innerHTML = "";

        users.forEach(user => {
            console.log("User:", user);

            if (user === me) return;

            box.innerHTML += `<div>${user}</div>`;
        });

    } catch(e) {
        console.error("loadUsers error", e);
    }
}
                        ${
    online
    ? "💀"
    : getAvatar(user)
                        }

                    </div>

                    <div>

                        <div class="userName">
                            ${user}
                        </div>

                        <div class="userStatus"
                        style="
                            color:
                            ${
                                online
                                ? "#4ade80"
                                : "#888"
                            };
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

    renderedMessages.clear();

    document.getElementById(
        "chatWith"
    ).innerText = user;

    document.getElementById(
        "avatarBox"
    ).innerText = "💀";

    document.getElementById(
        "messages"
    ).innerHTML = "";

    updateChatStatus();

    await loadMessages();

    if (
        window.innerWidth <= 700
    ) {

        document.querySelector(
            ".sidebar"
        ).style.display =
        "none";

        const chat =

        document.querySelector(
            ".chat"
        );

        chat.style.display =
        "flex";

        chat.classList.add(
            "active"
        );
    }
}

/* =========================
   CLOSE CHAT
========================= */

function closeChat() {

    if (
        window.innerWidth <= 700
    ) {

        document.querySelector(
            ".chat"
        ).style.display =
        "none";

        document.querySelector(
            ".sidebar"
        ).style.display =
        "block";
    }
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

    const statusBox =
    document.getElementById(
        "chatStatus"
    );

    const avatarBox =
    document.getElementById(
        "avatarBox"
    );

    statusBox.innerText =
        online
        ? "online"
        : "offline";

    statusBox.style.color =
        online
        ? "#4ade80"
        : "#888";

    avatarBox.innerText =
        online
        ? "💀"
        : getAvatar(selectedUser);

}


/* =========================
   SEND
========================= */
function send() {

    const input =
        document.getElementById("msg");

    if (!input) return;

    const content =
        input.value.trim();

    if (!content) return;

    if (!selectedUser) {

        alert("Select a user first");
        return;
    }

    if (!connected || !stompClient) {

        alert("Socket not connected");
        return;
    }

    const msg = {

        id: crypto.randomUUID(),

        from: me,

        to: selectedUser,

        content: content,

        replyTo:
            replyingTo
                ? replyingTo.content
                : null,

        timestamp: Date.now()
    };

    // Prevent duplicate rendering
    renderedMessages.add(msg.id);

    // Show instantly in UI
    renderMessage(msg);

    smoothScrollBottom();

    try {

        stompClient.send(
            "/app/send",
            {},
            JSON.stringify(msg)
        );

    } catch (e) {

        console.error(
            "Send Error:",
            e
        );

        return;
    }

    // Clear input
    input.value = "";

    // Stop typing indicator
    sendTyping(false);

    // Clear typing timer
    clearTimeout(typingTimeout);

    // Reset reply state
    replyingTo = null;

    const replyBox =
        document.getElementById("replyBox");

    if (replyBox) {

        replyBox.style.display =
            "none";
    }

    const replyText =
        document.getElementById("replyText");

    if (replyText) {

        replyText.innerText = "";
    }
}



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
   LOAD MESSAGES
========================= */

async function loadMessages() {

    try {

        const res = await fetch(

            `${API_BASE}/messages?user1=${me}&user2=${selectedUser}`
        );

        const data =
        await res.json();

        data.forEach(m => {

            const key =

                m.id ||

                `${m.from}_${m.content}_${m.timestamp}`;

            if (
                renderedMessages.has(key)
            ) {
                return;
            }

            renderedMessages.add(key);

            renderMessage(m);
        });

        smoothScrollBottom();

    } catch(e){

        console.log(
            "Load message error",
            e
        );
    }
}

/* =========================
   RENDER
========================= */

function renderMessage(m) {

    const box =
        document.getElementById("messages");

    if (!box) return;

    const key =
        m.id ||
        `${m.from}_${m.content}_${m.timestamp}`;

    if (document.getElementById("msg_" + key)) {
        return;
    }

    const mine = m.from === me;

    const div = document.createElement("div");

    div.id = "msg_" + key;

    div.dataset.id = m.id;

    div.className =
        mine ? "myMsg" : "otherMsg";

    let time = "";

    if (m.timestamp) {

        const d = new Date(m.timestamp);

        time =
            d.getHours() +
            ":" +
            String(
                d.getMinutes()
            ).padStart(2, "0");
    }

    
div.innerHTML = `
    ${
        m.replyTo
        ? `
        <div style="
            background:rgba(255,255,255,.08);
            padding:8px;
            border-radius:10px;
            margin-bottom:8px;
            color:#d8b4fe;
            font-size:12px;
        ">
            ${escapeHtml(m.replyTo ?? "")}
        </div>`
        : ""
    }

    ${
        m.messageType === "IMAGE"
        ? `
        <img
            src="${API_BASE}${m.imageUrl}"
            class="chatImage"
            onerror="this.style.display='none'"
        >
        `
        : `
        <div>${escapeHtml(m.content ?? "")}</div>
        `
    }

    <div class="msgTime">
        ${time}
    </div>
`;




   function escapeHtml(text) {
    return text
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
   }

    div.addEventListener(
        "dblclick",
        (e) => {

            selectedMessage = m;

            const bar =
                document.getElementById(
                    "actionBar"
                );

            bar.style.display = "block";

            bar.style.left =
                Math.min(
                    e.pageX,
                    window.innerWidth - 240
                ) + "px";

            bar.style.top =
                Math.min(
                    e.pageY,
                    window.innerHeight - 220
                ) + "px";
        }
    );

    box.appendChild(div);
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

    setTimeout(() => {

        box.scrollTop =
        box.scrollHeight;

    },50);
}

/* =========================
   AUTO REFRESH
========================= */

setInterval(

    async () => {

        if (!document.hidden) {

            await loadOnlineUsers();

            await loadUsers();

            updateChatStatus();
        }

    },

    3000
);   

document.addEventListener(
    "click",
    (e) => {

        if (
            !e.target.closest(
                "#actionBar"
            )
        ) {

            document.getElementById(
                "actionBar"
            ).style.display = "none";
        }
    }
);

function replyMessage() {

    if (!selectedMessage)
        return;

    replyingTo = selectedMessage;

    document.getElementById(
        "replyBox"
    ).style.display = "block";

    document.getElementById(
        "replyText"
    ).innerText =
        selectedMessage.content;

    document.getElementById(
        "actionBar"
    ).style.display = "none";
}

function cancelReply() {

    replyingTo = null;

    document.getElementById(
        "replyBox"
    ).style.display = "none";
}
function reactMessage(emoji) {

    if (!selectedMessage)
        return;

    const msgElement =
        document.querySelector(
            `[data-id="${selectedMessage.id}"]`
        );

    if (!msgElement)
        return;

    let oldReaction =
        msgElement.querySelector(
            ".reaction"
        );

    if (oldReaction) {
        oldReaction.remove();
    }

    const reaction =
        document.createElement("div");

    reaction.className =
        "reaction";

    reaction.innerHTML = emoji;

    msgElement.appendChild(
        reaction
    );

    document.getElementById(
        "actionBar"
    ).style.display = "none";
}

document
.getElementById("imageInput")
.addEventListener(
    "change",
    async (e) => {

        const file = e.target.files[0];

        if (!file) return;

        const formData = new FormData();

        formData.append("file", file);

        const res = await fetch(
            API_BASE + "/upload",
            {
                method: "POST",
                body: formData
            }
        );

        const imageUrl = await res.text();

        stompClient.send(
            "/app/send",
            {},
            JSON.stringify({
                id: crypto.randomUUID(),
                from: me,
                to: selectedUser,
                imageUrl: imageUrl,
                messageType: "IMAGE",
                timestamp: Date.now()
            })
        );
    }
);
