export function createChat({ sender, timestamp, content, translated, attachment }) {

    const container = document.createElement('div');
    const isMe = sender == "R.O.K.N.";

    container.setAttribute("class", `chat-container ${isMe ? "chat-me" : "chat-other"}`)

    const header = document.createElement('div');
    header.setAttribute("class", `chat-header`)
    header.innerText = `${sender}(${timestamp})`;
    container.appendChild(header);

    const chatcont = document.createElement('div');
    chatcont.setAttribute("class", `chat-content`)
    container.appendChild(chatcont)

    const content0 = document.createElement('div');
    const content1 = document.createElement('div');
    const content2 = document.createElement('div');

    chatcont.appendChild(content0)
    chatcont.appendChild(content1)
    chatcont.appendChild(content2)

    const audiofile = document.createElement('audio');
    audiofile.setAttribute('src', attachment);
    audiofile.setAttribute('controls', 'true');

    content0.innerText = content;
    content1.innerText = translated;
    content2.appendChild(audiofile);
    return container;
}