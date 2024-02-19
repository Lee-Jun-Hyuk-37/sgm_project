import { createChat } from "./ui.js";

document.addEventListener('DOMContentLoaded', function () {
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('send_button');
    const newComEL = document.getElementById('new_com');
    const chatlogEL = document.getElementById('chatlog');
    const filelistEL = document.getElementById('filelist');
    const chatTitleEL = document.getElementById('chat_title');

    let currentFile = undefined;

    const socket = io.connect('http://localhost:5500');

    /**
     * 
     * @param {string} file_name 
     */
    function loadChat(file_name) {
        currentFile = file_name;
        drawChat();
        socket.emit('req_update_chatlog', { file_name });
        console.log(file_name, "Clicked!")
    }

    function drawChat() {
        const chatlog_raw = localStorage.getItem(currentFile)
        if (chatlog_raw == null) return;
        else {
            const chat_log = JSON.parse(chatlog_raw);
            chatTitleEL.innerText = chat_log["chat_title"]
            chatlogEL.innerHTML = ""
            chat_log["messages"].forEach((v, i) => {
                const newChat = createChat(v)
                chatlogEL.appendChild(newChat);
            })
        }
    }

    function sendMessage() {
        const message = messageInput.value;
        if (message.trim() !== '') {
            const timenow = (new Date()).toISOString();
            const newChat = createChat({ sender: "R.O.K.N.", timestamp: timenow, content: message, translated: "Loading" })
            chatlogEL.appendChild(newChat);
            socket.emit('message_from_frontend', { "file_name": currentFile, "message": message });
            messageInput.value = '';
        }
    }

    function handleKeyPress(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    }

    function start_new_com() {
        socket.emit('new_com');
    }

    //여기로 백엔드로부터 데이터 받기 가능
    socket.on('message_from_backend', function (data) {
        console.log('받은 메시지:', data);
        // 이벤트에 대한 처리를 여기에 추가할 수 있습니다.
    });

    socket.on('file_list_update', function (data) {
        console.info('받은 메시지:', data);
        const { file_list } = data;

        filelistEL.innerHTML = "";

        file_list.forEach((v, i) => {
            const file_div = document.createElement('div');
            file_div.innerText = v["chat_title"];
            file_div.addEventListener('click', () => loadChat(v["file_name"]))
            filelistEL.appendChild(file_div);
        })
    })

    socket.on('update_chatlog', function (data) {
        localStorage.setItem(data["file_name"], data["content"])
        if (currentFile == data["file_name"]) drawChat();
    })

    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keydown', handleKeyPress);
    newComEL.addEventListener('click', start_new_com);
});