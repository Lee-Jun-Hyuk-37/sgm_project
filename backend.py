from flask import Flask, render_template
from flask_socketio import SocketIO, emit
from flask_cors import CORS
from time import sleep
import datetime as dt
import secrets
from pathlib import Path
import json
import base64


chat_root=Path('chat_logs')

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")


@app.route('/')
def index():
    return render_template('index.html')


@socketio.on('message_from_frontend')
def handle_message(data):
    message = data["message"]
    fn = data["file_name"]

    print('받은 메시지:', message,fn)

    # 여기서 메시지를 처리하거나 다른 동작을 수행가능
    # 이걸로 프론트엔드로 통신 가능

    timenow = dt.datetime.now().isoformat(timespec="seconds").replace("-", "/").replace("T", "-")

    sleep(1)
    output=base64.b64encode(message.encode('u8')).decode('u8')

    obj=json.loads((chat_root/f"{fn}.json").read_text('u8'))
    obj["messages"].append(
        {
        "timestamp": timenow,
        "sender": "R.O.K.N.",
        "content": message,
        "translated": output,
        "attachment": None
        })
    (chat_root/f"{fn}.json").write_text(json.dumps(obj,ensure_ascii=False,indent=2),'u8')
    handle_update_chatlog({"file_name":fn})
    emit('message_from_backend', {'status': 'success','msg':output})


@socketio.on('update_chat_title')
def update_chat_title(data):
    fn = data["file_name"]
    new_title = data["chat_title"]
    obj=json.loads((chat_root/f"{fn}.json").read_text('u8'))
    obj["chat_title"] = new_title
    (chat_root/f"{fn}.json").write_text(json.dumps(obj, indent=2, ensure_ascii=False), 'utf-8')
    socket_send_current_file_list()


@socketio.on('req_update_chatlog')
def handle_update_chatlog(data):
    fn = data["file_name"]
    emit('update_chatlog',
         {"file_name":fn,"content":(chat_root/f"{fn}.json").read_text("u8")})


@socketio.on('new_com')
def handle_new_com():
    time = dt.datetime.now().isoformat(timespec="seconds").replace("-", "_").replace(":","_")
    fn = time + "_" + secrets.token_urlsafe(8)
    (chat_root/f"{fn}.json").write_text(f'{{"chat_title": "{time}", "language": "", "messages":[]}}')

    def callback():
        socketio.emit('load_new_com', fn, namespace='/')
    
    socket_send_current_file_list()
    socketio.start_background_task(callback)


@socketio.on('language_select')
def language_select(data):
    fn = data["file_name"]
    lang = data["language"]
    obj=json.loads((chat_root/f"{fn}.json").read_text('u8'))
    obj["language"] = lang
    (chat_root/f"{fn}.json").write_text(json.dumps(obj, indent=2, ensure_ascii=False), 'utf-8')


@socketio.on('connect')
def handle_connection():
    socket_send_current_file_list()
    emit('chat_title_bug')


def socket_send_current_file_list():
    res=list(map(lambda x:{
            "file_name":x.stem,
            "chat_title":json.loads(x.read_bytes())["chat_title"]
        },
        chat_root.glob("*.json")))
    res = sorted(res, key=lambda x: x['file_name'], reverse=True)
    emit('file_list_update', {'file_list':res})


if __name__ == '__main__':
    socketio.run(app, debug=True, port=5500)
