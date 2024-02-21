import { createChat } from "./ui.js";

document.addEventListener('DOMContentLoaded', function () {
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('send_button');
    const newComEL = document.getElementById('new_com');
    const chatlogEL = document.getElementById('chatlog');
    const filelistEL = document.getElementById('filelist');
    const chatTitleEL = document.getElementById('chat_title');
    // const freqscriptEL = document.getElementById('freq_used_script');
    const languageSelect = document.getElementById('languageSelect');

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

        const chatlog_raw = localStorage.getItem(currentFile);
        if (chatlog_raw != null) {
            const chat_log = JSON.parse(chatlog_raw);
            const selectedLanguage = chat_log["language"];

            if (selectedLanguage) {
                languageSelect.value = selectedLanguage;
                loadFreqUsedScripts(selectedLanguage);
            }
        }
    }

    function editChatTitle() {
        function handleKeyDown(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                chatTitleEL.blur();
            }
        }
        function handleBlur() {
            socket.emit("update_chat_title", { "file_name": currentFile, "chat_title": chatTitleEL.innerText });
            chatTitleEL.removeEventListener('keydown', handleKeyDown);
            chatTitleEL.removeEventListener('blur', handleBlur);
        }
        chatTitleEL.addEventListener('keydown', handleKeyDown);
        chatTitleEL.addEventListener('blur', handleBlur);
        chatTitleEL.contentEditable = true;
        chatTitleEL.focus();
    }

    function drawChat() {
        const chatlog_raw = localStorage.getItem(currentFile)
        if (chatlog_raw == null) return;
        else {
            const chat_log = JSON.parse(chatlog_raw);
            chatTitleEL.innerText = chat_log["chat_title"];
            chatlogEL.innerHTML = "";
            chat_log["messages"].forEach((v, i) => {
                const newChat = createChat(v);
                chatlogEL.appendChild(newChat);
            })
        }
    }

    function sendMessage() {
        const message = messageInput.value;
        if (message.trim() !== '') {
            const timenow = (new Date()).toISOString();
            const newChat = createChat({ sender: "R.O.K.N.", timestamp: timenow, content: message, translated: "Loading" });
            chatlogEL.appendChild(newChat);
            socket.emit('message_from_frontend', { "file_name": currentFile, "message": message });
            messageInput.value = '';
        }
    }

    function loadFreqUsedScripts(selectedLanguage) {
        const rightSidebarEL = document.getElementById('right_sidebar');
        rightSidebarEL.innerHTML = "";
    
        const freqScriptPath = 'static/freq_script.json';
    
        fetch(freqScriptPath)
            .then(response => response.json())
            .then(freqScript => {
                const scripts = freqScript[selectedLanguage];
    
                const freqUsedScriptTitleEL = document.createElement('h2');
                freqUsedScriptTitleEL.id = 'freq_used_script';
                freqUsedScriptTitleEL.innerText = '자주 사용하는 스크립트';
                rightSidebarEL.appendChild(freqUsedScriptTitleEL);
    
                scripts.forEach((script, index) => {
                    const scriptDiv = document.createElement('div');
                    scriptDiv.innerText = script.content;
                    rightSidebarEL.appendChild(scriptDiv);
                });
    
                const footerEL = document.createElement('footer');
                footerEL.id = 'footer';
                const creatorInfoEL = document.createElement('h2');
                creatorInfoEL.innerText = '제작자 정보, 문의 정보';
                footerEL.appendChild(creatorInfoEL);
                rightSidebarEL.appendChild(footerEL);
            });
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

    function select_language() {
        let selectedLanguage = languageSelect.value;
        socket.emit('language_select', { "file_name": currentFile, "language": selectedLanguage });
        loadChat(currentFile); // 얘 뭔가 두 번 눌러야 하는 오류 해결하기
    }

    socket.on('message_from_backend', function (data) {
        console.log('받은 메시지:', data);
    });

    socket.on('file_list_update', function (data) {
        console.info('받은 메시지:', data);
        const { file_list } = data;

        filelistEL.innerHTML = "";

        file_list.forEach((v, i) => {
            const file_div = document.createElement('div');
            file_div.innerText = v["chat_title"];
            file_div.addEventListener('click', () => loadChat(v["file_name"]));
            filelistEL.appendChild(file_div);
        })
    })

    socket.on('update_chatlog', function (data) {
        localStorage.setItem(data["file_name"], data["content"]);
        if (currentFile == data["file_name"]) drawChat();
    })

    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keydown', handleKeyPress);
    newComEL.addEventListener('click', start_new_com);
    chatTitleEL.addEventListener('click', editChatTitle);
    languageSelect.addEventListener('change', select_language);
});