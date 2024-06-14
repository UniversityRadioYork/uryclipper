from flask import Flask, send_file, request, redirect, session, render_template
from datetime import datetime
from pydub import AudioSegment
import jwt
import os
import re
import secrets

unix_timestamp = (datetime.now() - datetime(1970, 1, 1)).total_seconds()
print(unix_timestamp)

app = Flask(__name__)
app.secret_key = secrets.token_urlsafe(16)  

clipper_url = os.environ.get('CLIPPER_URL', "http://127.0.0.1:5000/")
myradio_key = os.environ.get('MYRADIO_SIGNING_KEY', "whoops thats secret")
log_location = os.environ.get('LOG_LOCATION', "/logs/")
clips_location = os.environ.get('CLIP_LOCATION', "./clips/")

def verifyKey(key):
    pattern = re.compile('^[ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789]+$')
    return re.search(pattern, key)

def verifySession(session):
    print(('name' in session and 'uid' in session))
    return ('name' in session and 'uid' in session)

def getAudioBetween(start,end,location):
    date_dir = datetime.utcfromtimestamp(start).strftime('%Y-%m-%d')
    if datetime.utcfromtimestamp(end).strftime('%Y-%m-%d') != date_dir:
        return Exception("gap between times too large")
    files = []
    start_file = 0
    end_file = 0
    for i in os.listdir(log_location+date_dir):
        files.append(int(i[:-4]))
    files = sorted(files)
    for i in range(0,len(files)):
        if start_file==0:
            if i == len(files)-1:
                start_file=i
            elif files[i] < start and files[i+1] > start:
                start_file=i
        if end_file==0:
            if i == len(files)-1:
                end_file=i
            elif files[i] < end and files[i+1] > end:
                end_file=i
    if start_file == end_file:
        audio_file = files[start_file]
        start_time = start-audio_file
        end_time = end-audio_file
        clip = AudioSegment.from_mp3(log_location+date_dir+"/"+str(audio_file)+".mp3")
        clip = clip[(start_time*1000):(end_time*1000)]
    else:
        clip = AudioSegment.from_mp3(log_location+date_dir+"/"+str(files[start_file])+".mp3")
        clip = clip[(start-files[start_file])*1000:]
        for i in files[start_file+1:end_file]:
            section = AudioSegment.from_mp3(log_location+date_dir+"/"+str(i)+".mp3")
            clip = clip + section
        end_clip = AudioSegment.from_mp3(log_location+date_dir+"/"+str(files[end_file])+".mp3")
        end_clip = end_clip[:((end-files[end_file])*1000)]
        clip = clip + end_clip
    clip.export(location, format="mp3")
    return {"status": "complete"}


@app.route("/")
def index():
    if verifySession(session):
        return render_template('index.html')
    else:
        return redirect("https://ury.org.uk/myradio/MyRadio/jwt?redirectto="+clipper_url+"auth/", code=302)

@app.route('/makeaudio/<key>/<start>/<end>')
def makeaudio(key,start,end):
    if verifyKey(key) and verifySession(session):
        return getAudioBetween(int(start),int(end),clips_location+str(key)+"cl.mp3")

@app.route('/getaudio/<key>/')
def getaudio(key):
    if verifyKey(key) and verifySession(session):
        return send_file(clips_location+str(key)+"cl.mp3")

@app.route('/makeclip/<key>/<start>/<end>')
def makeclip(key,start,end):
    if verifyKey(key) and verifySession(session):
        clip = AudioSegment.from_mp3(clips_location+str(key)+"cl.mp3")
        clip = clip[(int(start)*1000):(int(end)*1000)]
        clip.export(clips_location+str(key)+"clip.mp3", format="mp3")
        return {"status": "complete"}

@app.route('/getclip/<key>/')
def getclip(key):
    if verifyKey(key) and verifySession(session):
        return send_file(clips_location+str(key)+"clip.mp3")

@app.route('/auth/', methods=['GET'])
def auth( ):
    args = request.args
    userinfo = jwt.decode(args['jwt'], myradio_key, algorithms=["HS256"])
    print(userinfo)
    session['name'] = userinfo['name']
    session['uid'] = userinfo['uid']
    return redirect(clipper_url, code=302)

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=False, host='0.0.0.0', port=port)