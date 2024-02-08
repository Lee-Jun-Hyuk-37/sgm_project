document.addEventListener('DOMContentLoaded', function () {
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('send_button');

    // const socket = io.connect('http://' + document.domain + ':' + location.port);
    // const socket = io.connect('http://localhost:5500');

    function sendMessage() {
        const message = messageInput.value;
        if (message.trim() !== '') {
            // socket.emit('message_from_frontend', message);
            console.log(`전송: ${message}`);
            messageInput.value = '';
        }
    }

    function handleKeyPress(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    }

    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keydown', handleKeyPress);
});