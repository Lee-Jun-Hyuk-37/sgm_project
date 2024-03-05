from flask import Flask, render_template
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import datetime as dt
import secrets
from pathlib import Path
import json
import re
import wave
import io
import torch
from scipy.io.wavfile import write as write_wav
import numpy as np
from nossl import no_ssl_verification
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
from bark.bark import SAMPLE_RATE, generate_audio, preload_models
import whisper


app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", max_http_buffer_size=10000000)  # max_size: 10mb


@app.route('/')
def index():
    return render_template('index.html')


def load_models():
    whisper_ = whisper.load_model("base", device='cpu')
    with no_ssl_verification():
        nllb_ = AutoModelForSeq2SeqLM.from_pretrained("facebook/nllb-200-distilled-600M", device_map="cpu")
        preload_models()
    print("====================")
    print("model load complete!")
    print("====================")
    return whisper_, nllb_


@socketio.on('load_tokenizer')
def load_tokenizer(data):
    language = data["selectedLanguage"]
    global tokenizer_kor, tokenizer_opp, opp_lang
    opp_lang = lang_li.index(language)
    lang = lang_li_nllb[opp_lang]
    with no_ssl_verification():
        tokenizer_kor = AutoTokenizer.from_pretrained("facebook/nllb-200-distilled-600M", src_lang="kor_Hang")
        tokenizer_opp = AutoTokenizer.from_pretrained("facebook/nllb-200-distilled-600M", src_lang=lang)
    print("====================")
    print(language)
    print("tokenizer load complete!")
    print("====================")


def translate_song(text, opp_lang):
    language = lang_li_nllb[opp_lang]
    inputs = tokenizer_kor(text, return_tensors="pt").to(device)
    translated_tokens = nllb_model.generate(**inputs, forced_bos_token_id=tokenizer_kor.lang_code_to_id[language], max_length=512)
    output = tokenizer_opp.batch_decode(translated_tokens, skip_special_tokens=True)[0]
    return output


def tts(texts, opp_lang):
    language = lang_li_bark[opp_lang]
    file_name = secrets.token_urlsafe(8) + ".wav"
    res = []
    with no_ssl_verification():
        for text in texts:
            audio_array = generate_audio(text, history_prompt=f"v2/{language}_speaker_0")
            res.append(audio_array)
        write_wav("static/audios/" + file_name, SAMPLE_RATE, np.concatenate(res))
    return file_name


def song(text, opp_lang):
    nllb_model.to(device)
    outputs = []
    for txt in re.split("[.?,。]", text):
        if txt.rstrip() == "" or txt.rstrip() == "\n":
            continue
        output = translate_song(txt, opp_lang)
        outputs.append(output)
    nllb_model.cpu()
    with no_ssl_verification():
        file_name = tts(outputs, opp_lang)
    torch.cuda.empty_cache()
    return text, outputs, file_name


@socketio.on('message_from_frontend')
def handle_message(data):
    global fn
    message = data["message"]
    fn = data["file_name"]
    lang = data["language"]
    opp_lang = lang_li.index(lang)
    timenow = dt.datetime.now().isoformat(timespec="seconds").replace("-", "/").replace("T", "-")
    _, outputs, attachment = song(message, opp_lang)
    output = " ".join(outputs)
    obj=json.loads((chat_root/f"{fn}.json").read_text('u8'))
    obj["messages"].append(
        {
        "timestamp": timenow,
        "sender": "R.O.K.N.",
        "content": message,
        "translated": output,
        "attachment": attachment
        })
    (chat_root/f"{fn}.json").write_text(json.dumps(obj,ensure_ascii=False,indent=2),'u8')
    handle_update_chatlog({"file_name":fn})


def stt(audio_file):
    result = whisper_model.transcribe(audio_file)
    language = result["language"]
    return result, language


def translate_soo(text):
    inputs = tokenizer_opp(text, return_tensors="pt").to(device)
    translated_tokens = nllb_model.generate(**inputs, forced_bos_token_id=tokenizer_opp.lang_code_to_id["kor_Hang"], max_length=512)
    output = tokenizer_kor.batch_decode(translated_tokens, skip_special_tokens=True)[0]
    return output


def soo(file_name):
    whisper_model.to(device)
    result, language = stt(file_name)
    whisper_model.cpu()
    # if lang_li_whisper.index(language) != opp_lang:
    #     st.write(f"{lang_li[opp_lang]}가 아닌 다른 언어가 감지됨. \n번역 성능이 저하됩니다. \n올바른 언어를 선택하십시오. ")
    txts = []
    for txt in re.split("[.?,。]", result["text"]):
        if txt.rstrip() == "" or txt.rstrip() == "\n":
            continue
        txts.append(txt)
    nllb_model.to(device)
    outputs = []
    for txt in txts:
        output = translate_soo(txt)
        outputs.append(output)
    nllb_model.cpu()
    torch.cuda.empty_cache()
    return txts, outputs


@socketio.on('audio_upload')
def handle_audio_upload(data):
    audio_blob = data["audioBlob"]
    global fn
    file_name = secrets.token_urlsafe(8) + ".wav"

    audio_bytes = io.BytesIO(audio_blob)
    with wave.open('static/audios/' + file_name, 'wb') as wave_file:
        wave_file.setnchannels(2)
        wave_file.setsampwidth(2)
        wave_file.setframerate(48000)
        wave_file.writeframes(audio_bytes.read())

    timenow = dt.datetime.now().isoformat(timespec="seconds").replace("-", "/").replace("T", "-")
    message, outputs = soo('static/audios/' + file_name)
    output = " ".join(outputs)
    obj=json.loads((chat_root/f"{fn}.json").read_text('u8'))
    obj["messages"].append(
        {
        "timestamp": timenow,
        "sender": "Other",
        "content": message,
        "translated": output,
        "attachment": file_name
        })
    (chat_root/f"{fn}.json").write_text(json.dumps(obj,ensure_ascii=False,indent=2),'u8')
    handle_update_chatlog({"file_name":fn})


@socketio.on('freq_message')
def handle_freq_message(data):
    global fn
    fn = data["file_name"]
    content = data["content"]
    translated = data["translated"]
    attachment = data["attachment"]

    timenow = dt.datetime.now().isoformat(timespec="seconds").replace("-", "/").replace("T", "-")
    obj=json.loads((chat_root/f"{fn}.json").read_text('u8'))
    obj["messages"].append(
        {
        "timestamp": timenow,
        "sender": "R.O.K.N.",
        "content": content,
        "translated": translated,
        "attachment": attachment
        })
    (chat_root/f"{fn}.json").write_text(json.dumps(obj,ensure_ascii=False,indent=2),'u8')
    handle_update_chatlog({"file_name":fn})


@socketio.on('update_chat_title')
def update_chat_title(data):
    global fn
    fn = data["file_name"]
    new_title = data["chat_title"]
    obj=json.loads((chat_root/f"{fn}.json").read_text('u8'))
    obj["chat_title"] = new_title
    (chat_root/f"{fn}.json").write_text(json.dumps(obj, indent=2, ensure_ascii=False), 'utf-8')
    socket_send_current_file_list()


@socketio.on('req_update_chatlog')
def handle_update_chatlog(data):
    global fn
    fn = data["file_name"]
    emit('update_chatlog', {"file_name":fn,"content":(chat_root/f"{fn}.json").read_text("u8")})


@socketio.on('new_com')
def handle_new_com():
    global fn
    time = dt.datetime.now().isoformat(timespec="seconds").replace("-", "_").replace(":","_")
    fn = time + "_" + secrets.token_urlsafe(8)
    (chat_root/f"{fn}.json").write_text(f'{{"chat_title": "{time}", "language": "", "messages":[]}}')
    socketio.emit('load_new_com', fn)
    socket_send_current_file_list()


@socketio.on('language_select')
def language_select(data):
    global fn
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
    lang_li = ("korean", "english", "chinese", "japanese", "russian", "etc")
    lang_li_whisper = ["ko", "en", "zh", "ja", "ru"]
    lang_li_nllb = ["kor_Hang", "eng_Latn", "zho_Hans", "jpn_Jpan", "rus_Cyrl"]
    lang_li_bark = ["ko", "en", "zh", "ja", 'ru']

    chat_root=Path('chat_logs')
    whisper_model, nllb_model = load_models()
    tokenizer_kor, tokenizer_opp = None, None
    opp_lang = None
    fn = None
    device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")

    socketio.run(app, debug=True, port=5500)
