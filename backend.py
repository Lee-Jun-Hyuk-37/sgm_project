from flask import Flask, render_template
from flask_socketio import SocketIO, emit

app = Flask(__name__)
socketio = SocketIO(app)

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('message_from_frontend')
def handle_message(message):
    print('받은 메시지:', message)
    
    # 여기서 메시지를 처리하거나 다른 동작을 수행할 수 있습니다.

    emit('message_from_backend', {'status': 'success'})

if __name__ == '__main__':
    socketio.run(app, debug=True)
