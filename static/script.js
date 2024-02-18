document.addEventListener('DOMContentLoaded', function () {
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('send_button');
    const new_com = document.getElementById('new_com');

    const socket = io.connect('http://localhost:5500');

    function sendMessage() {
        const message = messageInput.value;
        if (message.trim() !== '') {
            socket.emit('message_from_frontend', message);
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
    socket.on('message_from_backend', function(data) {
        console.log('받은 메시지:', data);
        // 이벤트에 대한 처리를 여기에 추가할 수 있습니다.
    });

    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keydown', handleKeyPress);
    new_com.addEventListener('click', start_new_com);
});
