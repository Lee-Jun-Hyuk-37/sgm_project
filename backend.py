from flask import Flask, render_template
from flask_socketio import SocketIO, emit
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('message_from_frontend')
def handle_message(message):
    print('받은 메시지:', message)
    
    # 여기서 메시지를 처리하거나 다른 동작을 수행가능

    # 이걸로 프론트엔드로 통신 가능
    emit('message_from_backend', {'status': 'success'})

@socketio.on('new_com')
def handle_new_com():
    print("새로운 통신 함수 실행")
    # new_com 함수 동작

    emit('message_from_backend', {'status': 'new_com_success'})

if __name__ == '__main__':
    socketio.run(app, debug=True, port=5500)
