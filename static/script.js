import { createChat } from "./ui.js";

document.addEventListener('DOMContentLoaded', function () {
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('send_button');
    const newComEL = document.getElementById('new_com');
    const chatlogEL = document.getElementById('chatlog');
    const filelistEL = document.getElementById('filelist');
    const chatTitleEL = document.getElementById('chat_title');
    const languageSelect = document.getElementById('languageSelect');
    const chatlogScrollEL = document.getElementById('chatlog-scroll');
    const waveformCanvas = document.getElementById('waveformCanvas');
    const canvasContext = waveformCanvas.getContext('2d');
    const recordButton = document.getElementById('recordButton');

    const socket = io.connect('http://localhost:5500');

    let isRecording = false;
    let recorder;
    let analyser;
    // /** @type {MediaStreamAudioSourceNode} */
    let mediaStreamSource;

    function audioInput() {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(handleSuccess)
            .catch(handleError);
    }

    function handleSuccess(stream) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        mediaStreamSource = audioContext.createMediaStreamSource(stream);
        mediaStreamSource.connect(analyser);
        analyser.fftSize = 2048;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const WIDTH = waveformCanvas.width;
        const HEIGHT = waveformCanvas.height;
        const barWidth = (WIDTH / bufferLength) * 2.5;
        const draw = () => {
            analyser.getByteTimeDomainData(dataArray);
            canvasContext.clearRect(0, 0, WIDTH, HEIGHT);
            canvasContext.beginPath();

            let x = 0;
            for (let i = 0; i < bufferLength; i++) {
                const v = (dataArray[i]) / 128.0;
                const y = (v * HEIGHT) / 2;
                if (i === 0) {
                    canvasContext.moveTo(x, y);
                } else {
                    canvasContext.lineTo(x, y);
                }
                x += barWidth;
            }
            canvasContext.lineTo(WIDTH, HEIGHT / 2);
            canvasContext.stroke();
            requestAnimationFrame(draw);
        };
        draw();
    }

    function handleError(error) {
        console.error('마이크 액세스 에러:', error);
    }

    function toggleRecording() {
        if (!isRecording) {
            startRecording();
        } else {
            stopRecording();
        }
        isRecording = !isRecording;
        const buttonText = isRecording ? '녹음 종료' : '녹음 시작';
        recordButton.textContent = buttonText;
        // updateRecordButton();
    }

    function startRecording() {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(function (stream) {
                recorder = new Recorder(mediaStreamSource);
                recorder.record();
            })
            .catch(function (err) {
                console.error('Error accessing microphone:', err);
            });
        console.log('Recording started');
    }

    function stopRecording() {
        recorder.stop();
        recorder.exportWAV(function (blob) {
            // sendAudioToBackend(blob);

            // loading 메세지 띄우기
            const timenow = (new Date()).toISOString().replace(/-/g, '/').replace('T', '-').replace(/\.\d{3}Z$/, '');
            const newChat = createChat({ sender: "Other", timestamp: timenow, content: "Loading", translated: "Loading" });
            chatlogEL.appendChild(newChat);
            chatlogScrollEL.scrollTop = chatlogScrollEL.scrollHeight;

            socket.emit('audio_upload', { "audioBlob": blob });
        });
        console.log('Recording stopped');
    }

    // function sendAudioToBackend(audioBlob) {
    //     // 여기에 녹음된 파일을 전송하는 코드 추가 (예: Ajax 요청 등)
    //     const formData = new FormData();
    //     formData.append('audioData', audioBlob);
    //     formData.append("sid", socket.id);
    //     fetch('/upload', {
    //         method: 'POST',
    //         body: formData,
    //     })
    //         .then(response => response.json())
    //         .then(data => {
    //             console.log('Audio uploaded successfully:', data);
    //         })
    //         .catch(error => {
    //             console.error('Error uploading audio:', error);
    //         });

    //     updateRecordButton();
    // }

    // function updateRecordButton() {
    //     const buttonText = isRecording ? '녹음 종료' : '녹음 시작';
    //     recordButton.textContent = buttonText;
    // }

    // let pendingScrollOnDraw = false;
    let pendingUpdateChatlogJobs = [];
    let currentFile = undefined;
    let initialLoad = true;

    /**
     * @param {string} file_name 
     */
    function loadChat(file_name) {
        audioInput();
        currentFile = file_name;
        drawChat();
        socket.emit('req_update_chatlog', { file_name });
        console.log(file_name, "Clicked!");

        pendingUpdateChatlogJobs.push(() => {
            const chatlog_raw = localStorage.getItem(currentFile);
            console.log(currentFile);
            console.log(chatlog_raw);
            if (chatlog_raw != null) {
                const chat_log = JSON.parse(chatlog_raw);
                const selectedLanguage = chat_log["language"];
                console.log(selectedLanguage);
                languageSelect.value = selectedLanguage;
                if (selectedLanguage != "") {
                    socket.emit('load_tokenizer', { selectedLanguage });
                }
                loadFreqUsedScripts(selectedLanguage);
            };
        })

        if (!initialLoad) {
            document.getElementById('chat_title').style.display = 'block';
            document.getElementById('languageLabel').style.display = 'block';
            document.getElementById('languageSelect').style.display = 'block';
            document.getElementById('chatbox').style.visibility = 'visible';
            document.getElementById('mic_input_control').style.visibility = 'visible';
            document.getElementById('chatlog-scroll').style.visibility = 'visible';
        };
    };

    function drawChat() {
        const chatlog_raw = localStorage.getItem(currentFile);
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
        chatlogScrollEL.scrollTop = chatlogScrollEL.scrollHeight;
        // if (pendingScrollOnDraw) {
        //     pendingScrollOnDraw = false;
        //     chatlogScrollEL.scrollTop = chatlogScrollEL.scrollHeight;
        // }
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

    function sendMessage() {
        const message = messageInput.value;
        if (languageSelect.value == "") {
            alert("언어를 선택하십시오!");
            return;
        }
        if (message.trim() !== '') {
            // pendingScrollOnDraw = true;
            const timenow = (new Date()).toISOString().replace(/-/g, '/').replace('T', '-').replace(/\.\d{3}Z$/, '');
            const newChat = createChat({ sender: "R.O.K.N.", timestamp: timenow, content: message, translated: "Loading" });
            chatlogEL.appendChild(newChat);
            chatlogScrollEL.scrollTop = chatlogScrollEL.scrollHeight;
            socket.emit('message_from_frontend', { "file_name": currentFile, "language": languageSelect.value, "message": message });
            messageInput.value = '';
        }
    }

    function sendFreqMessage(content, translated, attachment) {
        socket.emit('freq_message', { "file_name": currentFile, "content": content, "translated": translated, "attachment": attachment });
    }

    function loadFreqUsedScripts(selectedLanguage) {
        const rightSidebarEL = document.getElementById('right_sidebar');
        rightSidebarEL.innerHTML = "";

        const freqUsedScriptTitleEL = document.createElement('h2');
        freqUsedScriptTitleEL.id = 'freq_used_script';
        freqUsedScriptTitleEL.innerText = '자주 사용하는 스크립트';
        rightSidebarEL.appendChild(freqUsedScriptTitleEL);

        if (selectedLanguage != "") {
            const freqScriptPath = 'static/freq_script.json';

            fetch(freqScriptPath)
                .then(response => response.json())
                .then(freqScript => {
                    const scripts = freqScript[selectedLanguage];

                    scripts.forEach((script, index) => {
                        const scriptDiv = document.createElement('div');
                        scriptDiv.innerText = script.content;
                        scriptDiv.addEventListener('click', () => {
                            // pendingScrollOnDraw = true;
                            sendFreqMessage(script.content, script.translated, script.attachment);
                        });
                        rightSidebarEL.appendChild(scriptDiv);
                    });
                });
        };
    };

    function handleKeyPress(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        };
    };

    function start_new_com() {
        socket.emit('new_com');
    };

    function select_language() {
        let selectedLanguage = languageSelect.value;
        socket.emit('load_tokenizer', { selectedLanguage })
        socket.emit('language_select', { "file_name": currentFile, "language": selectedLanguage });
        loadFreqUsedScripts(selectedLanguage);
    };

    socket.on('file_list_update', function (data) {
        if (initialLoad) {
            document.getElementById('chat_title').style.display = 'none';
            document.getElementById('languageLabel').style.display = 'none';
            document.getElementById('languageSelect').style.display = 'none';
            document.getElementById('chatbox').style.visibility = 'hidden';
            document.getElementById('mic_input_control').style.visibility = 'hidden';
            document.getElementById('chatlog-scroll').style.visibility = 'hidden';
            initialLoad = false;
        };

        const { file_list } = data;

        filelistEL.innerHTML = "";

        file_list.forEach((file, i) => {
            const file_div = document.createElement('div');
            file_div.innerText = file["chat_title"];
            file_div.addEventListener('click', () => loadChat(file["file_name"]));
            filelistEL.appendChild(file_div);
        });
    });

    socket.on('load_new_com', function (fn) {
        loadChat(fn);
    });

    socket.on('update_chatlog', function (data) {
        localStorage.setItem(data["file_name"], data["content"]);
        pendingUpdateChatlogJobs.forEach(v => v())
        pendingUpdateChatlogJobs = [];
        if (currentFile == data["file_name"]) drawChat();
    });

    socket.on('chat_title_bug', function () {
        chatTitleEL.click();
        chatTitleEL.blur();
    });

    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keydown', handleKeyPress);
    newComEL.addEventListener('click', start_new_com);
    chatTitleEL.addEventListener('click', editChatTitle);
    languageSelect.addEventListener('change', select_language);
    recordButton.addEventListener('click', toggleRecording);
});