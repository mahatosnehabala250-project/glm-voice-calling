\# OutboundAI — Complete One-Shot Build Specification

\> \*\*Instructions for the AI reading this:\*\*  
\> Build this system exactly as described. Every file, every function, every line of config is specified below.  
\> Do not skip anything. Do not simplify. Do not substitute libraries. Build it precisely.  
\> This document is complete and self-contained — no external repo is required.

\---

\#\# 0\. What You Are Building

A \*\*production-grade AI outbound voice calling SaaS platform\*\* that:

\- Dials phone numbers automatically via SIP telephony (Vobiz)  
\- Connects each call to a \*\*Gemini Live real-time AI voice agent\*\* (sub-100ms latency, zero separate STT/TTS)  
\- Books appointments into Supabase and optionally into \*\*Cal.com\*\*  
\- Runs mass \*\*campaign calling\*\* with APScheduler (once / daily / weekdays at a scheduled time)  
\- Maintains a \*\*CRM\*\* with per-contact history, editable notes, and AI-extracted memory  
\- Remembers key facts about each lead across calls using Gemini Flash compression  
\- Records calls to S3-compatible storage via LiveKit Egress  
\- Provides a \*\*full-stack single-page dashboard\*\*: single call, batch CSV, campaigns, AI prompt editor, appointments, call logs, CRM, agent profiles, settings (BYOK), live logs, charts  
\- Persists everything to \*\*Supabase\*\* (zero local SQLite in production)  
\- Supports \*\*named agent profiles\*\* (different voice \+ model \+ prompt \+ tools per campaign or call)  
\- Deploys to \*\*Coolify\*\* (self-hosted PaaS on a VPS) via Docker

\*\*Tech stack:\*\*  
\- Python 3.11  
\- LiveKit Agents 1.x (voice AI orchestration)  
\- Google Gemini Live API (\`gemini-3.1-flash-live-preview\`)  
\- Vobiz SIP trunk (telephony — dial out)  
\- FastAPI \+ Uvicorn (REST API)  
\- Supabase (PostgreSQL database)  
\- APScheduler (campaign cron scheduling)  
\- Chart.js (dashboard charts, via CDN)  
\- Vanilla HTML/CSS/JS (single-file dashboard, no build step)  
\- Docker \+ Coolify (deployment)

\---

\#\# 1\. File Structure

Create every file listed here. No extras needed.

\`\`\`  
/  
├── agent.py              ← LiveKit worker — Gemini Live voice AI entrypoint  
├── server.py             ← FastAPI backend — all REST endpoints \+ APScheduler  
├── db.py                 ← All Supabase async DB operations  
├── tools.py              ← LLM function tools (9 total)  
├── prompts.py            ← System prompt template \+ build\_prompt()  
├── start.sh              ← Production startup: uvicorn port 8000 \+ agent worker  
├── Dockerfile            ← CMD: sh start.sh  
├── requirements.txt      ← All Python dependencies  
├── supabase\_schema.sql   ← Run once in Supabase SQL Editor  
├── .env                  ← Secrets — never commit, always .gitignore  
├── .gitignore  
└── ui/  
    └── index.html        ← Single-file dashboard (all CSS \+ JS inline)  
\`\`\`

\---

\#\# 2\. Environment Variables

\#\#\# \`.env\` file (local development):

\`\`\`env  
\# ── LiveKit Cloud ── cloud.livekit.io → Project → Keys  
LIVEKIT\_URL=wss://your-project.livekit.cloud  
LIVEKIT\_API\_KEY=APIxxxxxxxxxxxxxxxxx  
LIVEKIT\_API\_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

\# ── Google Gemini ── aistudio.google.com/app/apikey  
GOOGLE\_API\_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  
GEMINI\_MODEL=gemini-3.1-flash-live-preview  
GEMINI\_TTS\_VOICE=Aoede  
USE\_GEMINI\_REALTIME=true

\# ── Vobiz SIP telephony ── vobiz.ai  
VOBIZ\_SIP\_DOMAIN=xxxxxxxx.sip.vobiz.ai  
VOBIZ\_USERNAME=your\_username  
VOBIZ\_PASSWORD=your\_password  
VOBIZ\_OUTBOUND\_NUMBER=+919876543210  
OUTBOUND\_TRUNK\_ID=ST\_xxxxxxxxxxxxxxxx  
DEFAULT\_TRANSFER\_NUMBER=+919876543210

\# ── Supabase ── supabase.com → Project Settings → API  
SUPABASE\_URL=https://xxxxxxxxxxxxxxxx.supabase.co  
SUPABASE\_SERVICE\_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

\# ── S3 / Supabase Storage (call recordings — optional) ──  
S3\_ACCESS\_KEY\_ID=  
S3\_SECRET\_ACCESS\_KEY=  
S3\_ENDPOINT\_URL=https://xxxxxxxxxxxxxxxx.supabase.co/storage/v1/s3  
S3\_REGION=ap-northeast-1  
S3\_BUCKET=call-recordings

\# ── Cal.com (calendar booking sync — optional) ──  
CALCOM\_API\_KEY=cal\_live\_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  
CALCOM\_EVENT\_TYPE\_ID=123456  
CALCOM\_TIMEZONE=Asia/Kolkata

\# ── Twilio SMS (confirmation texts — optional) ──  
TWILIO\_ACCOUNT\_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  
TWILIO\_AUTH\_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  
TWILIO\_FROM\_NUMBER=+1234567890

\# ── Deepgram (pipeline fallback STT — optional) ──  
DEEPGRAM\_API\_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  
\`\`\`

\#\#\# \`.gitignore\`:

\`\`\`  
.env  
\_\_pycache\_\_/  
\*.pyc  
\*.pyo  
\*.db  
\*.sqlite  
\*.log  
venv/  
.venv/  
node\_modules/  
\*.egg-info/  
dist/  
build/  
.DS\_Store  
\`\`\`

\---

\#\# 3\. Supabase Schema

Run this \*\*once\*\* in Supabase Dashboard → SQL Editor. Every statement uses \`IF NOT EXISTS\` — safe to re-run.

\`\`\`sql  
\-- ═══════════════════════════════════════════════════════  
\-- OutboundAI — Complete Database Schema  
\-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS appointments (  
    id TEXT PRIMARY KEY,  
    name TEXT NOT NULL,  
    phone TEXT NOT NULL,  
    date TEXT NOT NULL,  
    time TEXT NOT NULL,  
    service TEXT NOT NULL,  
    status TEXT NOT NULL DEFAULT 'booked',  
    created\_at TEXT NOT NULL  
);

CREATE TABLE IF NOT EXISTS call\_logs (  
    id TEXT PRIMARY KEY,  
    phone\_number TEXT NOT NULL,  
    lead\_name TEXT,  
    outcome TEXT,  
    reason TEXT,  
    duration\_seconds INTEGER,  
    timestamp TEXT NOT NULL  
);

CREATE TABLE IF NOT EXISTS settings (  
    key TEXT PRIMARY KEY,  
    value TEXT NOT NULL,  
    updated\_at TEXT NOT NULL  
);

CREATE TABLE IF NOT EXISTS error\_logs (  
    id TEXT PRIMARY KEY,  
    source TEXT NOT NULL,  
    level TEXT NOT NULL DEFAULT 'error',  
    message TEXT NOT NULL,  
    detail TEXT,  
    timestamp TEXT NOT NULL  
);

ALTER TABLE appointments  DISABLE ROW LEVEL SECURITY;  
ALTER TABLE call\_logs     DISABLE ROW LEVEL SECURITY;  
ALTER TABLE settings      DISABLE ROW LEVEL SECURITY;  
ALTER TABLE error\_logs    DISABLE ROW LEVEL SECURITY;

ALTER TABLE call\_logs ADD COLUMN IF NOT EXISTS recording\_url TEXT;  
ALTER TABLE call\_logs ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE TABLE IF NOT EXISTS campaigns (  
    id TEXT PRIMARY KEY,  
    name TEXT NOT NULL,  
    status TEXT NOT NULL DEFAULT 'active',  
    contacts\_json TEXT NOT NULL DEFAULT '\[\]',  
    schedule\_type TEXT NOT NULL DEFAULT 'once',  
    schedule\_time TEXT DEFAULT '09:00',  
    call\_delay\_seconds INTEGER DEFAULT 3,  
    system\_prompt TEXT,  
    created\_at TEXT NOT NULL,  
    last\_run\_at TEXT,  
    total\_dispatched INTEGER DEFAULT 0,  
    total\_failed INTEGER DEFAULT 0  
);  
ALTER TABLE campaigns DISABLE ROW LEVEL SECURITY;

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS calcom\_booking\_uid TEXT;

CREATE TABLE IF NOT EXISTS contact\_memory (  
    id TEXT PRIMARY KEY,  
    phone\_number TEXT NOT NULL,  
    insight TEXT NOT NULL,  
    created\_at TEXT NOT NULL  
);  
ALTER TABLE contact\_memory DISABLE ROW LEVEL SECURITY;  
CREATE INDEX IF NOT EXISTS idx\_contact\_memory\_phone ON contact\_memory (phone\_number);

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS agent\_profile\_id TEXT;

CREATE TABLE IF NOT EXISTS agent\_profiles (  
    id TEXT PRIMARY KEY,  
    name TEXT NOT NULL,  
    voice TEXT NOT NULL DEFAULT 'Aoede',  
    model TEXT NOT NULL DEFAULT 'gemini-3.1-flash-live-preview',  
    system\_prompt TEXT,  
    enabled\_tools TEXT DEFAULT '\[\]',  
    is\_default INTEGER DEFAULT 0,  
    created\_at TEXT NOT NULL  
);  
ALTER TABLE agent\_profiles DISABLE ROW LEVEL SECURITY;  
\`\`\`

\---

\#\# 4\. \`requirements.txt\`

\`\`\`  
livekit-agents\>=1.0.0  
livekit-api\>=0.8.0  
livekit-plugins-google\>=1.0.0  
livekit-plugins-deepgram\>=0.8.0  
livekit-plugins-silero\>=0.8.0  
livekit-plugins-noise-cancellation  
fastapi\>=0.110.0  
uvicorn\[standard\]\>=0.29.0  
python-multipart\>=0.0.9  
supabase\>=2.0.0  
httpx\>=0.25.0  
python-dotenv\>=1.0.0  
apscheduler\>=3.10.0  
google-api-python-client\>=2.100.0  
google-auth-oauthlib\>=1.0.0  
twilio\>=8.0.0  
certifi\>=2024.0.0  
\`\`\`

\---

\#\# 5\. \`Dockerfile\`

\`\`\`dockerfile  
FROM python:3.11-slim

RUN apt-get update && apt-get install \-y \--no-install-recommends \\  
        libgomp1 \\  
        libglib2.0-0 \\  
        libsndfile1 \\  
        curl \\  
    && rm \-rf /var/lib/apt/lists/\*

WORKDIR /app

COPY requirements.txt .  
RUN pip install \--no-cache-dir \--upgrade pip \\  
 && pip install \--no-cache-dir \-r requirements.txt

COPY . .

RUN mkdir \-p /data  
ENV DB\_PATH=/data/appointments.db

EXPOSE 8000

CMD \["sh", "start.sh"\]  
\`\`\`

\---

\#\# 6\. \`start.sh\`

\`\`\`bash  
\#\!/bin/bash  
set \-e  
cd "$(dirname "$0")"

echo "🚀 Starting Outbound Mass Caller..."

if \[ \-f ".env" \]; then  
    export $(cat .env | grep \-v '^\#' | xargs)  
fi

echo "📋 Configuration:"  
echo "   LiveKit: ${LIVEKIT\_URL}"  
echo "   Gemini: ${GEMINI\_MODEL:-gemini-3.1-flash-live-preview}"  
echo "   Supabase: ${SUPABASE\_URL}"

echo "🌐 Starting FastAPI server on port 8000..."  
uvicorn server:app \--host 0.0.0.0 \--port 8000 &  
SERVER\_PID=$\!

sleep 2

echo "🤖 Starting LiveKit agent worker..."  
python agent.py start

kill $SERVER\_PID 2\>/dev/null || true  
\`\`\`

\---

\#\# 7\. \`prompts.py\`

\`\`\`python  
DEFAULT\_SYSTEM\_PROMPT \= """\\  
You are Priya, a sharp, warm, and professional appointment booking assistant calling on behalf of {business\_name}.

Your single goal: book a {service\_type} appointment for {lead\_name}.

━━━ CRITICAL: SPEAK FIRST ━━━  
The moment the call connects, you speak immediately. Do NOT wait for the lead to say anything.  
Open with: "Hi, am I speaking with {lead\_name}?"

━━━ CALL FLOW ━━━

STEP 1 — CONFIRM IDENTITY  
"Hi, am I speaking with {lead\_name}?"  
• Wrong person  → apologise briefly → end\_call(outcome='wrong\_number', reason='wrong person answered')  
• Voicemail/IVR → leave message: "Hi {lead\_name}, this is Priya from {business\_name} regarding your {service\_type}. Please call us back — have a great day\!" → end\_call(outcome='voicemail', reason='left voicemail')  
• No answer / silence for 5 s → end\_call(outcome='no\_answer', reason='no response')

STEP 2 — INTRODUCE  
"Great\! I'm Priya from {business\_name}. We have some slots open this week for {service\_type} and I wanted to get you booked in — takes less than a minute."

STEP 3 — QUALIFY INTEREST  
Ask one short question. If yes → STEP 4\.  
If no → ask once if a different time works. Second refusal → end\_call(outcome='not\_interested', reason='lead declined twice').

STEP 4 — FIND A SLOT  
Ask: "What day and time works best for you?"  
ALWAYS call check\_availability(date, time) before confirming anything.  
If slot unavailable → "That one's taken — how about \[next available\]?"

STEP 5 — BOOK  
Once lead verbally agrees to date \+ time:  
1\. Call book\_appointment(name, phone, date, time, service)  
2\. Call send\_sms\_confirmation(phone, "Your {service\_type} at {business\_name} is confirmed for \[date\] at \[time\]. See you then\!")

STEP 6 — CLOSE  
"Perfect, you're all set for \[date\] at \[time\]\! Is there anything else before I let you go?"  
→ end\_call(outcome='booked', reason='appointment confirmed')

━━━ OBJECTION HANDLING ━━━

"I'm busy right now"      → "Completely fine — I'll be quick. We have a slot tomorrow morning, would that work?"  
"Not interested"          → "No worries at all. If anything changes, feel free to call us. Have a great day\!" → end\_call(outcome='not\_interested')  
"Who gave you my number?" → "We have you on file from a previous inquiry with {business\_name}. Apologies if the timing is off."  
"Stop calling"            → "Absolutely, I'll make a note right now. Sorry for the interruption\!" → end\_call(outcome='not\_interested', reason='requested removal')  
"Transfer to a human"     → transfer\_to\_human(reason='lead requested human agent')  
"Are you a bot/AI?"       → "I'm a virtual assistant for {business\_name} — I can still get you fully booked in though\! Shall we find a time?"  
"Call me later"           → "Of course — what time works best for a callback?" → remember\_details("Requested callback") → end\_call(outcome='callback\_requested', reason='will call back')

━━━ STYLE RULES ━━━

• Maximum 1–2 short sentences per turn. Cut every filler word.  
• NEVER start with "Certainly\!", "Of course\!", "Absolutely\!" or any filler opener.  
• NEVER say "As an AI" unless directly and persistently asked.  
• Match the lead's language — Hindi/English code-switching is fine.  
• If lead says "hold on" or goes quiet, wait silently — do not fill silence.  
• Always sound like a real person: casual, warm, confident.  
• Respond in under 10 words where possible.  
• Use the lookup\_contact tool at the start of every call to retrieve prior history.  
• Use remember\_details any time the lead shares something useful (preferences, objections, timing).

━━━ TOOL USAGE RULES ━━━

• lookup\_contact  → call at call start ONLY (before any conversation)  
• check\_availability → ALWAYS before confirming a slot  
• book\_appointment → only after verbal confirmation  
• end\_call → ALWAYS call this at call end (never just hang up silently)  
• remember\_details → use freely throughout — more context \= better future calls  
"""

def build\_prompt(  
    lead\_name: str \= "there",  
    business\_name: str \= "our company",  
    service\_type: str \= "our service",  
    custom\_prompt: str \= None,  
) \-\> str:  
    """Interpolate lead/business details into the prompt template."""  
    template \= custom\_prompt if custom\_prompt else DEFAULT\_SYSTEM\_PROMPT  
    try:  
        return template.format(  
            lead\_name=lead\_name,  
            business\_name=business\_name,  
            service\_type=service\_type,  
        )  
    except KeyError:  
        return template  
\`\`\`

\---

\#\# 8\. \`db.py\` — Complete

\`\`\`python  
import os  
import uuid  
from datetime import datetime, timedelta  
from typing import Optional  
from collections import defaultdict

\# \---------------------------------------------------------------------------  
\# DEFAULTS — all loaded from environment variables only.  
\# Never hardcode real credentials here. Use Coolify env vars or .env file.  
\# \---------------------------------------------------------------------------  
DEFAULTS \= {  
    "LIVEKIT\_URL":             os.getenv("LIVEKIT\_URL", ""),  
    "LIVEKIT\_API\_KEY":         os.getenv("LIVEKIT\_API\_KEY", ""),  
    "LIVEKIT\_API\_SECRET":      os.getenv("LIVEKIT\_API\_SECRET", ""),  
    "GOOGLE\_API\_KEY":          os.getenv("GOOGLE\_API\_KEY", ""),  
    "GEMINI\_MODEL":            os.getenv("GEMINI\_MODEL", "gemini-3.1-flash-live-preview"),  
    "GEMINI\_TTS\_VOICE":        os.getenv("GEMINI\_TTS\_VOICE", "Aoede"),  
    "USE\_GEMINI\_REALTIME":     os.getenv("USE\_GEMINI\_REALTIME", "true"),  
    "VOBIZ\_SIP\_DOMAIN":        os.getenv("VOBIZ\_SIP\_DOMAIN", ""),  
    "VOBIZ\_USERNAME":          os.getenv("VOBIZ\_USERNAME", ""),  
    "VOBIZ\_PASSWORD":          os.getenv("VOBIZ\_PASSWORD", ""),  
    "VOBIZ\_OUTBOUND\_NUMBER":   os.getenv("VOBIZ\_OUTBOUND\_NUMBER", ""),  
    "OUTBOUND\_TRUNK\_ID":       os.getenv("OUTBOUND\_TRUNK\_ID", ""),  
    "DEFAULT\_TRANSFER\_NUMBER": os.getenv("DEFAULT\_TRANSFER\_NUMBER", ""),  
    "SUPABASE\_URL":            os.getenv("SUPABASE\_URL", ""),  
    "SUPABASE\_SERVICE\_KEY":    os.getenv("SUPABASE\_SERVICE\_KEY", ""),  
    "DEEPGRAM\_API\_KEY":        os.getenv("DEEPGRAM\_API\_KEY", ""),  
}

def \_default(key: str) \-\> str:  
    return os.getenv(key, DEFAULTS.get(key, ""))

SUPABASE\_URL \= \_default("SUPABASE\_URL")  
SUPABASE\_KEY \= \_default("SUPABASE\_SERVICE\_KEY")

SENSITIVE\_KEYS \= {  
    "LIVEKIT\_API\_KEY", "LIVEKIT\_API\_SECRET", "GOOGLE\_API\_KEY",  
    "VOBIZ\_PASSWORD", "TWILIO\_AUTH\_TOKEN", "SUPABASE\_SERVICE\_KEY",  
    "AWS\_SECRET\_ACCESS\_KEY", "S3\_SECRET\_ACCESS\_KEY", "CALCOM\_API\_KEY",  
    "DEEPGRAM\_API\_KEY",  
}

def \_sdb():  
    from supabase import create\_client  
    return create\_client(\_default("SUPABASE\_URL"), \_default("SUPABASE\_SERVICE\_KEY"))

async def \_adb():  
    from supabase.\_async.client import create\_client  
    return await create\_client(\_default("SUPABASE\_URL"), \_default("SUPABASE\_SERVICE\_KEY"))

def init\_db() \-\> None:  
    url \= os.getenv("SUPABASE\_URL", SUPABASE\_URL)  
    key \= os.getenv("SUPABASE\_SERVICE\_KEY", SUPABASE\_KEY)  
    if not url or not key:  
        print("⚠️  SUPABASE\_URL or SUPABASE\_SERVICE\_KEY not set.")  
        return  
    try:  
        db \= \_sdb()  
        db.table("settings").select("key").limit(1).execute()  
        print("✅ Supabase connected")  
    except Exception as exc:  
        print(f"⚠️  Supabase connection failed: {exc}")  
        print("   Run supabase\_schema.sql in your Supabase Dashboard → SQL Editor")

\# ── Settings ─────────────────────────────────────────────────────────────────

async def get\_all\_settings() \-\> dict:  
    db \= await \_adb()  
    result \= await db.table("settings").select("key, value").execute()  
    KNOWN\_KEYS \= \[  
        "LIVEKIT\_URL", "LIVEKIT\_API\_KEY", "LIVEKIT\_API\_SECRET",  
        "GOOGLE\_API\_KEY", "GEMINI\_MODEL", "GEMINI\_TTS\_VOICE", "USE\_GEMINI\_REALTIME",  
        "VOBIZ\_SIP\_DOMAIN", "VOBIZ\_USERNAME", "VOBIZ\_PASSWORD",  
        "VOBIZ\_OUTBOUND\_NUMBER", "OUTBOUND\_TRUNK\_ID", "DEFAULT\_TRANSFER\_NUMBER",  
        "DEEPGRAM\_API\_KEY", "TWILIO\_ACCOUNT\_SID", "TWILIO\_AUTH\_TOKEN", "TWILIO\_FROM\_NUMBER",  
        "S3\_ACCESS\_KEY\_ID", "S3\_SECRET\_ACCESS\_KEY", "S3\_ENDPOINT\_URL", "S3\_REGION", "S3\_BUCKET",  
        "CALCOM\_API\_KEY", "CALCOM\_EVENT\_TYPE\_ID", "CALCOM\_TIMEZONE",  
        "ENABLED\_TOOLS",  
    \]  
    out: dict \= {}  
    for k in KNOWN\_KEYS:  
        env\_val \= \_default(k)  
        if k in SENSITIVE\_KEYS:  
            out\[k\] \= {"value": "", "configured": bool(env\_val)}  
        else:  
            out\[k\] \= {"value": env\_val, "configured": bool(env\_val)}  
    for row in (result.data or \[\]):  
        k, v \= row\["key"\], row\["value"\]  
        if k \== "TEST\_KEY":  
            continue  
        if k in SENSITIVE\_KEYS:  
            out\[k\] \= {"value": "", "configured": bool(v)}  
        else:  
            out\[k\] \= {"value": v, "configured": bool(v)}  
    return out

async def save\_settings(data: dict) \-\> None:  
    db \= await \_adb()  
    updated\_at \= datetime.now().isoformat()  
    rows \= \[  
        {"key": k, "value": str(v), "updated\_at": updated\_at}  
        for k, v in data.items()  
        if v is not None and v \!= ""  
    \]  
    if rows:  
        await db.table("settings").upsert(rows, on\_conflict="key").execute()

async def get\_setting(key: str, default: str \= "") \-\> str:  
    db \= await \_adb()  
    result \= await db.table("settings").select("value").eq("key", key).maybe\_single().execute()  
    if result and result.data:  
        return result.data\["value"\]  
    return \_default(key) or default

async def set\_setting(key: str, value: str) \-\> None:  
    db \= await \_adb()  
    await db.table("settings").upsert(  
        {"key": key, "value": value, "updated\_at": datetime.now().isoformat()},  
        on\_conflict="key",  
    ).execute()

async def get\_enabled\_tools() \-\> list:  
    raw \= await get\_setting("ENABLED\_TOOLS", "")  
    if not raw:  
        return \[\]  
    try:  
        import json  
        result \= json.loads(raw)  
        return result if isinstance(result, list) else \[\]  
    except Exception:  
        return \[\]

\# ── Error logs ────────────────────────────────────────────────────────────────

async def log\_error(source: str, message: str, detail: str \= "", level: str \= "error") \-\> None:  
    try:  
        db \= await \_adb()  
        await db.table("error\_logs").insert({  
            "id": str(uuid.uuid4()),  
            "source": source,  
            "level": level,  
            "message": message\[:500\],  
            "detail": detail\[:2000\],  
            "timestamp": datetime.now().isoformat(),  
        }).execute()  
    except Exception:  
        pass

async def get\_errors(limit: int \= 100\) \-\> list:  
    db \= await \_adb()  
    result \= await db.table("error\_logs").select("\*").order("timestamp", desc=True).limit(limit).execute()  
    return result.data or \[\]

async def get\_logs(level: Optional\[str\] \= None, source: Optional\[str\] \= None, limit: int \= 200\) \-\> list:  
    db \= await \_adb()  
    query \= db.table("error\_logs").select("\*").order("timestamp", desc=True).limit(limit)  
    if level:  
        query \= query.eq("level", level)  
    if source:  
        query \= query.eq("source", source)  
    result \= await query.execute()  
    return result.data or \[\]

async def clear\_errors() \-\> None:  
    db \= await \_adb()  
    await db.table("error\_logs").delete().neq("id", "").execute()

\# ── Appointments ──────────────────────────────────────────────────────────────

async def insert\_appointment(name: str, phone: str, date: str, time: str, service: str) \-\> str:  
    full\_id \= str(uuid.uuid4())  
    booking\_id \= full\_id\[:8\].upper()  
    db \= await \_adb()  
    await db.table("appointments").insert({  
        "id": full\_id, "name": name, "phone": phone,  
        "date": date, "time": time, "service": service,  
        "status": "booked", "created\_at": datetime.now().isoformat(),  
    }).execute()  
    return booking\_id

async def check\_slot(date: str, time: str) \-\> bool:  
    """Returns True if slot is available (no existing booking)."""  
    db \= await \_adb()  
    result \= await (  
        db.table("appointments").select("id")  
        .eq("date", date).eq("time", time).eq("status", "booked")  
        .maybe\_single().execute()  
    )  
    return result.data is None

async def get\_next\_available(date: str, time: str) \-\> str:  
    try:  
        dt \= datetime.strptime(f"{date} {time}", "%Y-%m-%d %H:%M")  
    except ValueError:  
        dt \= datetime.now().replace(minute=0, second=0, microsecond=0) \+ timedelta(hours=1)  
    for \_ in range(7 \* 24):  
        dt \+= timedelta(hours=1)  
        if 9 \<= dt.hour \< 18:  
            if await check\_slot(dt.strftime("%Y-%m-%d"), dt.strftime("%H:%M")):  
                return f"{dt.strftime('%Y-%m-%d')} at {dt.strftime('%H:%M')}"  
    return "no open slots found in the next 7 days"

async def get\_all\_appointments(date\_filter: Optional\[str\] \= None) \-\> list:  
    db \= await \_adb()  
    query \= db.table("appointments").select("\*").order("date").order("time")  
    if date\_filter:  
        query \= query.eq("date", date\_filter)  
    result \= await query.execute()  
    return result.data or \[\]

async def cancel\_appointment(appointment\_id: str) \-\> bool:  
    db \= await \_adb()  
    result \= await (  
        db.table("appointments").update({"status": "cancelled"})  
        .eq("id", appointment\_id).eq("status", "booked").execute()  
    )  
    return len(result.data or \[\]) \> 0

async def get\_appointments\_by\_phone(phone: str) \-\> list:  
    db \= await \_adb()  
    result \= await db.table("appointments").select("\*").eq("phone", phone).order("date", desc=True).execute()  
    return result.data or \[\]

\# ── Call logs ─────────────────────────────────────────────────────────────────

async def log\_call(  
    phone\_number: str, lead\_name: Optional\[str\], outcome: str, reason: str,  
    duration\_seconds: int, recording\_url: Optional\[str\] \= None, notes: Optional\[str\] \= None,  
) \-\> None:  
    db \= await \_adb()  
    row: dict \= {  
        "id": str(uuid.uuid4()), "phone\_number": phone\_number, "lead\_name": lead\_name,  
        "outcome": outcome, "reason": reason, "duration\_seconds": duration\_seconds,  
        "timestamp": datetime.now().isoformat(),  
    }  
    if recording\_url:  
        row\["recording\_url"\] \= recording\_url  
    if notes:  
        row\["notes"\] \= notes  
    await db.table("call\_logs").insert(row).execute()

async def get\_all\_calls(page: int \= 1, limit: int \= 20\) \-\> list:  
    db \= await \_adb()  
    offset \= (page \- 1\) \* limit  
    result \= await db.table("call\_logs").select("\*").order("timestamp", desc=True).range(offset, offset \+ limit \- 1).execute()  
    return result.data or \[\]

async def get\_calls\_by\_phone(phone: str) \-\> list:  
    db \= await \_adb()  
    result \= await db.table("call\_logs").select("\*").eq("phone\_number", phone).order("timestamp", desc=True).execute()  
    return result.data or \[\]

async def update\_call\_notes(call\_id: str, notes: str) \-\> bool:  
    db \= await \_adb()  
    result \= await db.table("call\_logs").update({"notes": notes}).eq("id", call\_id).execute()  
    return len(result.data or \[\]) \> 0

async def get\_contacts() \-\> list:  
    db \= await \_adb()  
    result \= await db.table("call\_logs").select("\*").order("timestamp", desc=True).execute()  
    rows \= result.data or \[\]  
    contacts: dict \= {}  
    for row in rows:  
        phone \= row\["phone\_number"\]  
        if phone not in contacts:  
            contacts\[phone\] \= {  
                "phone\_number": phone, "lead\_name": row.get("lead\_name"),  
                "total\_calls": 0, "booked": 0,  
                "last\_call": row\["timestamp"\], "last\_outcome": row.get("outcome"),  
            }  
        contacts\[phone\]\["total\_calls"\] \+= 1  
        if row.get("outcome") \== "booked":  
            contacts\[phone\]\["booked"\] \+= 1  
    return sorted(contacts.values(), key=lambda c: c\["last\_call"\], reverse=True)

\# ── Stats ─────────────────────────────────────────────────────────────────────

async def get\_stats() \-\> dict:  
    db \= await \_adb()  
    rows \= (await db.table("call\_logs").select("outcome, duration\_seconds, timestamp").execute()).data or \[\]  
    total\_calls    \= len(rows)  
    booked         \= sum(1 for r in rows if r.get("outcome") \== "booked")  
    not\_interested \= sum(1 for r in rows if r.get("outcome") \== "not\_interested")  
    durations      \= \[r\["duration\_seconds"\] for r in rows if r.get("duration\_seconds")\]  
    avg\_dur        \= sum(durations) / len(durations) if durations else 0  
    booking\_rate   \= round((booked / total\_calls \* 100\) if total\_calls else 0, 1\)  
    \# Outcomes breakdown  
    outcomes: dict \= {}  
    for r in rows:  
        o \= r.get("outcome") or "unknown"  
        outcomes\[o\] \= outcomes.get(o, 0\) \+ 1  
    \# Timeline: calls per day last 14 days  
    daily: dict \= defaultdict(int)  
    for r in rows:  
        ts \= (r.get("timestamp") or "")\[:10\]  
        if ts:  
            daily\[ts\] \+= 1  
    today \= datetime.now().date()  
    timeline \= \[{"date": (today \- timedelta(days=i)).isoformat(), "count": daily.get((today \- timedelta(days=i)).isoformat(), 0)} for i in range(13, \-1, \-1)\]  
    \# Avg duration by outcome  
    dur\_sum: dict \= defaultdict(float)  
    dur\_cnt: dict \= defaultdict(int)  
    for r in rows:  
        o \= r.get("outcome") or "unknown"  
        sec \= r.get("duration\_seconds")  
        if sec:  
            dur\_sum\[o\] \+= sec  
            dur\_cnt\[o\] \+= 1  
    duration\_by\_outcome \= {o: dur\_sum\[o\] / dur\_cnt\[o\] for o in dur\_sum}  
    return {  
        "total\_calls": total\_calls, "booked": booked, "not\_interested": not\_interested,  
        "avg\_duration\_seconds": round(avg\_dur, 1), "booking\_rate\_percent": booking\_rate,  
        "outcomes": outcomes, "timeline": timeline, "duration\_by\_outcome": duration\_by\_outcome,  
    }

\# ── Campaigns ─────────────────────────────────────────────────────────────────

async def create\_campaign(  
    name: str, contacts\_json: str, schedule\_type: str \= "once",  
    schedule\_time: str \= "09:00", call\_delay\_seconds: int \= 3,  
    system\_prompt: Optional\[str\] \= None, agent\_profile\_id: Optional\[str\] \= None,  
) \-\> str:  
    campaign\_id \= str(uuid.uuid4())  
    db \= await \_adb()  
    row: dict \= {  
        "id": campaign\_id, "name": name, "status": "active",  
        "contacts\_json": contacts\_json, "schedule\_type": schedule\_type,  
        "schedule\_time": schedule\_time, "call\_delay\_seconds": call\_delay\_seconds,  
        "created\_at": datetime.now().isoformat(), "total\_dispatched": 0, "total\_failed": 0,  
    }  
    if system\_prompt:  
        row\["system\_prompt"\] \= system\_prompt  
    if agent\_profile\_id:  
        row\["agent\_profile\_id"\] \= agent\_profile\_id  
    await db.table("campaigns").insert(row).execute()  
    return campaign\_id

async def get\_all\_campaigns() \-\> list:  
    db \= await \_adb()  
    result \= await db.table("campaigns").select("\*").order("created\_at", desc=True).execute()  
    return result.data or \[\]

async def get\_campaign(campaign\_id: str) \-\> Optional\[dict\]:  
    db \= await \_adb()  
    result \= await db.table("campaigns").select("\*").eq("id", campaign\_id).maybe\_single().execute()  
    return result.data if result else None

async def update\_campaign\_status(campaign\_id: str, status: str) \-\> bool:  
    db \= await \_adb()  
    result \= await db.table("campaigns").update({"status": status}).eq("id", campaign\_id).execute()  
    return len(result.data or \[\]) \> 0

async def update\_campaign\_run\_stats(campaign\_id: str, dispatched: int, failed: int) \-\> None:  
    db \= await \_adb()  
    await db.table("campaigns").update({  
        "last\_run\_at": datetime.now().isoformat(),  
        "total\_dispatched": dispatched, "total\_failed": failed, "status": "completed",  
    }).eq("id", campaign\_id).execute()

async def delete\_campaign(campaign\_id: str) \-\> bool:  
    db \= await \_adb()  
    result \= await db.table("campaigns").delete().eq("id", campaign\_id).execute()  
    return len(result.data or \[\]) \> 0

\# ── Contact Memory ────────────────────────────────────────────────────────────

async def add\_contact\_memory(phone: str, insight: str) \-\> None:  
    db \= await \_adb()  
    await db.table("contact\_memory").insert({  
        "id": str(uuid.uuid4()), "phone\_number": phone,  
        "insight": insight\[:1000\], "created\_at": datetime.now().isoformat(),  
    }).execute()

async def get\_contact\_memory(phone: str) \-\> list:  
    db \= await \_adb()  
    result \= await (  
        db.table("contact\_memory").select("insight, created\_at")  
        .eq("phone\_number", phone).order("created\_at", desc=True).limit(20).execute()  
    )  
    return result.data or \[\]

async def compress\_contact\_memory(phone: str, compressed: str) \-\> None:  
    db \= await \_adb()  
    await db.table("contact\_memory").delete().eq("phone\_number", phone).execute()  
    await db.table("contact\_memory").insert({  
        "id": str(uuid.uuid4()), "phone\_number": phone,  
        "insight": compressed\[:2000\], "created\_at": datetime.now().isoformat(),  
    }).execute()

\# ── Agent Profiles ────────────────────────────────────────────────────────────

async def get\_all\_agent\_profiles() \-\> list:  
    db \= await \_adb()  
    result \= await db.table("agent\_profiles").select("\*").order("created\_at").execute()  
    return result.data or \[\]

async def get\_agent\_profile(profile\_id: str) \-\> Optional\[dict\]:  
    db \= await \_adb()  
    result \= await db.table("agent\_profiles").select("\*").eq("id", profile\_id).maybe\_single().execute()  
    return result.data if result else None

async def create\_agent\_profile(  
    name: str, voice: str \= "Aoede", model: str \= "gemini-3.1-flash-live-preview",  
    system\_prompt: Optional\[str\] \= None, enabled\_tools: str \= "\[\]", is\_default: bool \= False,  
) \-\> str:  
    profile\_id \= str(uuid.uuid4())  
    db \= await \_adb()  
    if is\_default:  
        await db.table("agent\_profiles").update({"is\_default": 0}).neq("id", "placeholder").execute()  
    await db.table("agent\_profiles").insert({  
        "id": profile\_id, "name": name, "voice": voice, "model": model,  
        "system\_prompt": system\_prompt, "enabled\_tools": enabled\_tools,  
        "is\_default": 1 if is\_default else 0, "created\_at": datetime.now().isoformat(),  
    }).execute()  
    return profile\_id

async def update\_agent\_profile(profile\_id: str, updates: dict) \-\> bool:  
    db \= await \_adb()  
    result \= await db.table("agent\_profiles").update(updates).eq("id", profile\_id).execute()  
    return len(result.data or \[\]) \> 0

async def delete\_agent\_profile(profile\_id: str) \-\> bool:  
    db \= await \_adb()  
    result \= await db.table("agent\_profiles").delete().eq("id", profile\_id).execute()  
    return len(result.data or \[\]) \> 0

async def set\_default\_agent\_profile(profile\_id: str) \-\> None:  
    db \= await \_adb()  
    await db.table("agent\_profiles").update({"is\_default": 0}).neq("id", "placeholder").execute()  
    await db.table("agent\_profiles").update({"is\_default": 1}).eq("id", profile\_id).execute()  
\`\`\`

\---

\#\# 9\. \`tools.py\` — Complete (9 Tools)

\`\`\`python  
import asyncio  
import logging  
import os  
import time  
from typing import Optional

from livekit import agents, api  
from livekit.agents import llm

from db import (  
    check\_slot, get\_next\_available, insert\_appointment, log\_call, log\_error,  
    get\_calls\_by\_phone, get\_appointments\_by\_phone,  
    add\_contact\_memory, get\_contact\_memory, compress\_contact\_memory,  
)

logger \= logging.getLogger("appointment-tools")

async def \_log(msg: str, detail: str \= "", level: str \= "info") \-\> None:  
    try:  
        await log\_error("agent", msg, detail, level)  
    except Exception:  
        pass

class AppointmentTools(llm.ToolContext):  
    """All function tools available to the appointment-booking agent."""

    def \_\_init\_\_(self, ctx: agents.JobContext, phone\_number: Optional\[str\] \= None, lead\_name: Optional\[str\] \= None):  
        self.ctx \= ctx  
        self.phone\_number \= phone\_number  
        self.lead\_name \= lead\_name  
        self.\_call\_start\_time \= time.time()  
        self.\_sip\_domain \= os.getenv("VOBIZ\_SIP\_DOMAIN", "")  
        self.recording\_url: Optional\[str\] \= None  
        super().\_\_init\_\_(tools=\[\])

    def build\_tool\_list(self, enabled: list) \-\> list:  
        """Return tool methods filtered by the enabled list. Empty list \= all enabled."""  
        all\_methods \= \[  
            self.check\_availability, self.book\_appointment, self.end\_call,  
            self.transfer\_to\_human, self.send\_sms\_confirmation, self.lookup\_contact,  
            self.remember\_details, self.book\_calcom, self.cancel\_calcom,  
        \]  
        if not enabled:  
            return all\_methods  
        name\_map \= {m.\_\_name\_\_: m for m in all\_methods}  
        return \[name\_map\[n\] for n in enabled if n in name\_map\]

    @llm.function\_tool  
    async def check\_availability(self, date: str, time: str) \-\> str:  
        """  
        Check whether a date/time slot is available for booking.  
        Call this BEFORE attempting to book whenever the lead proposes a date/time.  
        date format: YYYY-MM-DD  |  time format: HH:MM (24-hour)  
        Returns 'available' or 'unavailable: next available slot is \<slot\>'.  
        """  
        try:  
            if await check\_slot(date, time):  
                return "available"  
            next\_slot \= await get\_next\_available(date, time)  
            return f"unavailable: next available slot is {next\_slot}"  
        except Exception as exc:  
            return "Unable to check availability right now — please suggest a date and I will confirm."

    @llm.function\_tool  
    async def book\_appointment(self, name: str, phone: str, date: str, time: str, service: str) \-\> str:  
        """  
        Book an appointment after the lead has verbally confirmed date, time, and service.  
        Call ONLY after the lead confirms all details.  
        name: lead's full name | phone: with country code | date: YYYY-MM-DD | time: HH:MM | service: type  
        """  
        try:  
            booking\_id \= await insert\_appointment(name, phone, date, time, service)  
            return f"Confirmed\! Booking ID: {booking\_id}. See you on {date} at {time} for {service}."  
        except Exception as exc:  
            return "Technical issue saving the booking. Our team will confirm shortly."

    @llm.function\_tool  
    async def end\_call(self, outcome: str, reason: str \= "") \-\> str:  
        """  
        End the call and log the outcome. ALWAYS call this before the call ends.  
        outcome: 'booked' | 'not\_interested' | 'wrong\_number' | 'voicemail' | 'no\_answer' | 'callback\_requested'  
        reason: brief description  
        """  
        duration \= int(time.time() \- self.\_call\_start\_time)  
        try:  
            await log\_call(  
                phone\_number=self.phone\_number or "unknown",  
                lead\_name=self.lead\_name, outcome=outcome, reason=reason,  
                duration\_seconds=duration, recording\_url=self.recording\_url,  
            )  
        except Exception as exc:  
            logger.error("Failed to log call: %s", exc)  
        try:  
            await self.ctx.room.disconnect()  
        except Exception:  
            pass  
        return "Call ended."

    @llm.function\_tool  
    async def transfer\_to\_human(self, reason: str) \-\> str:  
        """  
        Transfer the call to a human agent via SIP REFER.  
        Call when lead requests a human, is angry, or has a complex issue.  
        reason: why you're transferring  
        """  
        destination \= os.getenv("DEFAULT\_TRANSFER\_NUMBER", "")  
        if not destination:  
            return "Transfer unavailable: no fallback number configured."  
        if "@" not in destination:  
            clean \= destination.replace("tel:", "").replace("sip:", "")  
            destination \= f"sip:{clean}@{self.\_sip\_domain}" if self.\_sip\_domain else f"tel:{clean}"  
        elif not destination.startswith("sip:"):  
            destination \= f"sip:{destination}"  
        participant\_identity \= f"sip\_{self.phone\_number}" if self.phone\_number else None  
        if not participant\_identity:  
            for p in self.ctx.room.remote\_participants.values():  
                participant\_identity \= p.identity  
                break  
        if not participant\_identity:  
            return "Transfer failed: could not identify caller."  
        try:  
            await self.ctx.api.sip.transfer\_sip\_participant(  
                api.TransferSIPParticipantRequest(  
                    room\_name=self.ctx.room.name,  
                    participant\_identity=participant\_identity,  
                    transfer\_to=destination, play\_dialtone=False,  
                )  
            )  
            return "Transferring you to a human agent now. Please hold."  
        except Exception as exc:  
            return "Transfer failed. Please call us back directly."

    @llm.function\_tool  
    async def send\_sms\_confirmation(self, phone: str, message: str) \-\> str:  
        """  
        Send SMS confirmation after a successful booking. Skips silently if Twilio not configured.  
        phone: lead's phone | message: text to send  
        """  
        sid \= os.getenv("TWILIO\_ACCOUNT\_SID", "")  
        token \= os.getenv("TWILIO\_AUTH\_TOKEN", "")  
        from\_num \= os.getenv("TWILIO\_FROM\_NUMBER", "")  
        if not (sid and token and from\_num):  
            return "SMS skipped: Twilio not configured."  
        try:  
            from twilio.rest import Client  
            loop \= asyncio.get\_event\_loop()  
            client \= Client(sid, token)  
            await loop.run\_in\_executor(None, lambda: client.messages.create(body=message, from\_=from\_num, to=phone))  
            return f"SMS sent to {phone}."  
        except Exception as exc:  
            return "SMS delivery failed, but booking is confirmed."

    @llm.function\_tool  
    async def lookup\_contact(self, phone: str) \-\> str:  
        """  
        Look up a contact's full history. Call at the START of every call before engaging.  
        phone: the lead's phone number with country code  
        Returns call history, appointments, and remembered details.  
        """  
        try:  
            calls \= await get\_calls\_by\_phone(phone)  
            appointments \= await get\_appointments\_by\_phone(phone)  
            memories \= await get\_contact\_memory(phone)  
            if not calls and not appointments and not memories:  
                return f"No history for {phone}. First-time contact."  
            lines \= \[f"Contact history for {phone}:"\]  
            if memories:  
                lines.append(f"\\nREMEMBERED ({len(memories)} notes):")  
                for m in memories\[:10\]:  
                    lines.append(f"  • {m\['insight'\]}")  
            if calls:  
                lines.append(f"\\nCALL HISTORY ({len(calls)} calls):")  
                for c in calls\[:5\]:  
                    ts \= (c.get("timestamp") or "")\[:16\]  
                    lines.append(f"  • {ts} — {c.get('outcome','?')}: {c.get('reason','')}")  
            if appointments:  
                lines.append(f"\\nAPPOINTMENTS ({len(appointments)}):")  
                for a in appointments\[:3\]:  
                    lines.append(f"  • {a.get('date')} {a.get('time')} — {a.get('service')} \[{a.get('status')}\]")  
            return "\\n".join(lines)  
        except Exception as exc:  
            return "Unable to retrieve contact history."

    @llm.function\_tool  
    async def remember\_details(self, insight: str) \-\> str:  
        """  
        Store a key insight about this lead for future calls.  
        Use whenever you learn something useful: preferences, objections, timing, family info.  
        Examples: "Prefers morning calls", "Has 2 kids, interested in family plan", "Callback in 2 weeks"  
        insight: the detail to remember  
        """  
        if not self.phone\_number:  
            return "Cannot remember — no phone number for this call."  
        try:  
            await add\_contact\_memory(self.phone\_number, insight)  
            memories \= await get\_contact\_memory(self.phone\_number)  
            if len(memories) \>= 5:  
                asyncio.create\_task(self.\_compress\_memories())  
            return f"Remembered: {insight}"  
        except Exception:  
            return "Could not save detail."

    async def \_compress\_memories(self) \-\> None:  
        try:  
            memories \= await get\_contact\_memory(self.phone\_number)  
            if len(memories) \< 5:  
                return  
            import google.generativeai as genai  
            api\_key \= os.getenv("GOOGLE\_API\_KEY", "")  
            if not api\_key:  
                return  
            genai.configure(api\_key=api\_key)  
            model \= genai.GenerativeModel("gemini-2.0-flash")  
            bullet\_list \= "\\n".join(f"- {m\['insight'\]}" for m in memories)  
            prompt \= f"Compress these notes about a sales contact into 3-5 concise bullets. Keep all key facts.\\n\\n{bullet\_list}"  
            loop \= asyncio.get\_event\_loop()  
            response \= await loop.run\_in\_executor(None, lambda: model.generate\_content(prompt))  
            if response.text.strip():  
                await compress\_contact\_memory(self.phone\_number, response.text.strip())  
        except Exception as exc:  
            logger.warning("Memory compression failed: %s", exc)

    @llm.function\_tool  
    async def book\_calcom(self, name: str, email: str, date: str, start\_time: str, notes: str \= "") \-\> str:  
        """  
        Book in Cal.com calendar after book\_appointment succeeds.  
        name: full name | email: lead's email | date: YYYY-MM-DD | start\_time: HH:MM | notes: optional  
        """  
        api\_key \= os.getenv("CALCOM\_API\_KEY", "")  
        event\_type\_id \= os.getenv("CALCOM\_EVENT\_TYPE\_ID", "")  
        timezone \= os.getenv("CALCOM\_TIMEZONE", "Asia/Kolkata")  
        if not api\_key or not event\_type\_id:  
            return "Cal.com not configured — skipping. Add CALCOM\_API\_KEY and CALCOM\_EVENT\_TYPE\_ID."  
        try:  
            from datetime import datetime as \_dt  
            start\_dt \= \_dt.strptime(f"{date} {start\_time}", "%Y-%m-%d %H:%M")  
            start\_iso \= start\_dt.strftime("%Y-%m-%dT%H:%M:%S.000Z")  
            import httpx  
            async with httpx.AsyncClient(timeout=15) as client:  
                resp \= await client.post(  
                    "https://api.cal.com/v1/bookings",  
                    headers={"Authorization": f"Bearer {api\_key}", "Content-Type": "application/json"},  
                    json={"eventTypeId": int(event\_type\_id), "start": start\_iso, "timeZone": timezone,  
                          "responses": {"name": name, "email": email, "notes": notes},  
                          "metadata": {"source": "OutboundAI"}, "language": "en"},  
                )  
            data \= resp.json()  
            if resp.status\_code not in (200, 201):  
                raise ValueError(data.get("message") or str(data))  
            uid \= data.get("uid", "")  
            return f"Cal.com booked. UID: {uid}"  
        except Exception as exc:  
            return f"Cal.com booking failed: {exc}"

    @llm.function\_tool  
    async def cancel\_calcom(self, booking\_uid: str, reason: str \= "") \-\> str:  
        """  
        Cancel a Cal.com booking by UID.  
        booking\_uid: from book\_calcom | reason: optional  
        """  
        api\_key \= os.getenv("CALCOM\_API\_KEY", "")  
        if not api\_key:  
            return "Cal.com not configured."  
        try:  
            import httpx  
            async with httpx.AsyncClient(timeout=15) as client:  
                resp \= await client.delete(  
                    f"https://api.cal.com/v1/bookings/{booking\_uid}",  
                    headers={"Authorization": f"Bearer {api\_key}"},  
                    params={"reason": reason} if reason else {},  
                )  
            if resp.status\_code not in (200, 204):  
                raise ValueError(f"HTTP {resp.status\_code}")  
            return f"Cancelled Cal.com booking {booking\_uid}."  
        except Exception as exc:  
            return f"Cancellation failed: {exc}"  
\`\`\`

\---

\#\# 10\. \`agent.py\` — Complete

\`\`\`python  
import asyncio  
import json  
import logging  
import os  
import ssl  
import certifi  
from typing import Optional

from dotenv import load\_dotenv

\# Patch SSL before any network import  
\_orig\_ssl \= ssl.create\_default\_context  
def \_certifi\_ssl(purpose=ssl.Purpose.SERVER\_AUTH, \*\*kwargs):  
    if not kwargs.get("cafile") and not kwargs.get("capath") and not kwargs.get("cadata"):  
        kwargs\["cafile"\] \= certifi.where()  
    return \_orig\_ssl(purpose, \*\*kwargs)  
ssl.create\_default\_context \= \_certifi\_ssl

from livekit import agents, api, rtc  
from livekit.agents import Agent, AgentSession, RoomInputOptions  
try:  
    from livekit.agents import RoomOptions as \_RoomOptions  
    \_HAS\_ROOM\_OPTIONS \= True  
except ImportError:  
    \_HAS\_ROOM\_OPTIONS \= False  
from livekit.plugins import noise\_cancellation, silero

from db import init\_db, log\_error, get\_enabled\_tools  
from prompts import build\_prompt  
from tools import AppointmentTools

load\_dotenv(".env")  
logging.basicConfig(level=logging.INFO)  
logger \= logging.getLogger("outbound-agent")

SIP\_DOMAIN \= os.getenv("VOBIZ\_SIP\_DOMAIN", "")

async def \_log(level: str, msg: str, detail: str \= "") \-\> None:  
    if level \== "info":      logger.info(msg)  
    elif level \== "warning": logger.warning(msg)  
    else:                    logger.error(msg)  
    try:  
        await log\_error("agent", msg, detail, level)  
    except Exception:  
        pass

def load\_db\_settings\_to\_env() \-\> None:  
    """Load Supabase settings table into os.environ before worker starts."""  
    url \= os.getenv("SUPABASE\_URL", "")  
    key \= os.getenv("SUPABASE\_SERVICE\_KEY", "")  
    if not url or not key:  
        return  
    try:  
        from supabase import create\_client  
        client \= create\_client(url, key)  
        result \= client.table("settings").select("key, value").execute()  
        for row in (result.data or \[\]):  
            if row.get("value"):  
                os.environ\[row\["key"\]\] \= row\["value"\]  
    except Exception as exc:  
        logger.warning("Could not load settings from Supabase: %s", exc)

\# ── Import Google plugin paths ───────────────────────────────────────────────  
\_google\_realtime \= None  
\_google\_beta\_realtime \= None  
\_google\_llm \= None  
\_google\_tts \= None

try:  
    from livekit.plugins import google as \_gp  
    try:  
        \_google\_realtime \= \_gp.realtime.RealtimeModel  
        logger.info("Loaded google.realtime.RealtimeModel (stable path)")  
    except AttributeError:  
        pass  
    try:  
        \_google\_beta\_realtime \= \_gp.beta.realtime.RealtimeModel  
        logger.info("Loaded google.beta.realtime.RealtimeModel (beta path)")  
    except AttributeError:  
        pass  
    try:  
        \_google\_llm \= \_gp.LLM  
        \_google\_tts \= \_gp.TTS  
    except AttributeError:  
        pass  
except ImportError:  
    logger.warning("livekit-plugins-google not installed")

\_deepgram\_stt \= None  
try:  
    from livekit.plugins import deepgram as \_dg  
    \_deepgram\_stt \= \_dg.STT  
except ImportError:  
    pass

\# ── Session factory ──────────────────────────────────────────────────────────

def \_build\_session(tools: list, system\_prompt: str) \-\> AgentSession:  
    """  
    Build AgentSession with Gemini Live or pipeline fallback.

    CRITICAL SILENCE-PREVENTION CONFIG — all 3 required:  
    1\. SessionResumptionConfig(transparent=True) → auto-reconnects after timeout  
    2\. ContextWindowCompressionConfig → sliding window prevents token limit freeze  
    3\. RealtimeInputConfig(END\_SENSITIVITY\_LOW) → less aggressive VAD, 2s silence threshold

    ⚠️ EndSensitivity MUST use full string form: END\_SENSITIVITY\_LOW (not .LOW — AttributeError\!)  
    """  
    gemini\_model \= os.getenv("GEMINI\_MODEL", "gemini-3.1-flash-live-preview")  
    gemini\_voice \= os.getenv("GEMINI\_TTS\_VOICE", "Aoede")  
    use\_realtime \= os.getenv("USE\_GEMINI\_REALTIME", "true").lower() \!= "false"

    RealtimeClass \= \_google\_realtime or (\_google\_beta\_realtime if use\_realtime else None)

    if use\_realtime and RealtimeClass is not None:  
        logger.info("SESSION MODE: Gemini Live realtime (%s, voice=%s)", gemini\_model, gemini\_voice)  
        try:  
            from google.genai import types as \_gt  
            \_realtime\_input\_cfg \= \_gt.RealtimeInputConfig(  
                automatic\_activity\_detection=\_gt.AutomaticActivityDetection(  
                    end\_of\_speech\_sensitivity=\_gt.EndSensitivity.END\_SENSITIVITY\_LOW,  
                    silence\_duration\_ms=2000,  
                    prefix\_padding\_ms=200,  
                ),  
            )  
            \_session\_resumption\_cfg \= \_gt.SessionResumptionConfig(transparent=True)  
            \_ctx\_compression\_cfg \= \_gt.ContextWindowCompressionConfig(  
                trigger\_tokens=25600,  
                sliding\_window=\_gt.SlidingWindow(target\_tokens=12800),  
            )  
            logger.info("Silence-prevention config applied (VAD LOW, transparent resumption, context compression)")  
        except Exception as \_cfg\_err:  
            logger.warning("Could not build silence-prevention config: %s", \_cfg\_err)  
            \_realtime\_input\_cfg \= None  
            \_session\_resumption\_cfg \= None  
            \_ctx\_compression\_cfg \= None

        realtime\_kwargs: dict \= dict(model=gemini\_model, voice=gemini\_voice, instructions=system\_prompt)  
        if \_realtime\_input\_cfg is not None:  
            realtime\_kwargs\["realtime\_input\_config"\]      \= \_realtime\_input\_cfg  
            realtime\_kwargs\["session\_resumption"\]         \= \_session\_resumption\_cfg  
            realtime\_kwargs\["context\_window\_compression"\] \= \_ctx\_compression\_cfg

        return AgentSession(llm=RealtimeClass(\*\*realtime\_kwargs), tools=tools)

    if \_google\_llm is None:  
        raise RuntimeError("No Google AI backend. Run: pip install 'livekit-plugins-google\>=1.0'")

    logger.info("SESSION MODE: pipeline (Deepgram STT \+ Gemini LLM \+ Google TTS)")  
    stt \= \_deepgram\_stt(model="nova-3", language="multi") if \_deepgram\_stt else None  
    tts \= \_google\_tts() if \_google\_tts else None  
    return AgentSession(stt=stt, llm=\_google\_llm(model="gemini-2.0-flash"), tts=tts, vad=silero.VAD.load(), tools=tools)

class OutboundAssistant(Agent):  
    def \_\_init\_\_(self, instructions: str) \-\> None:  
        super().\_\_init\_\_(instructions=instructions)

async def entrypoint(ctx: agents.JobContext) \-\> None:  
    """  
    Main entrypoint. Called per job. Reads metadata JSON from ctx.job.metadata.

    DIAL-FIRST PATTERN — CRITICAL:  
    Start Gemini Live ONLY after create\_sip\_participant(wait\_until\_answered=True) completes.  
    If you start the session during ring time (\~20-30s), the Gemini idle timeout fires  
    and the session dies silently before the call is even answered.

    NO close\_on\_disconnect — SIP legs have brief audio dropouts that look like disconnects.  
    Instead, watch participant\_disconnected event for the specific SIP identity.  
    """  
    await \_log("info", f"Job started — room: {ctx.room.name}")

    phone\_number: Optional\[str\] \= None  
    lead\_name \= "there"  
    business\_name \= "our company"  
    service\_type \= "our service"  
    custom\_prompt: Optional\[str\] \= None  
    voice\_override: Optional\[str\] \= None  
    model\_override: Optional\[str\] \= None  
    tools\_override: Optional\[str\] \= None

    if ctx.job.metadata:  
        try:  
            data \= json.loads(ctx.job.metadata)  
            phone\_number   \= data.get("phone\_number")  
            lead\_name      \= data.get("lead\_name", lead\_name)  
            business\_name  \= data.get("business\_name", business\_name)  
            service\_type   \= data.get("service\_type", service\_type)  
            custom\_prompt  \= data.get("system\_prompt")  
            voice\_override \= data.get("voice\_override")  
            model\_override \= data.get("model\_override")  
            tools\_override \= data.get("tools\_override")  
        except (json.JSONDecodeError, AttributeError):  
            await \_log("warning", "Invalid JSON in job metadata")

    await \_log("info", f"Call job received — phone={phone\_number} lead={lead\_name} biz={business\_name}")

    system\_prompt \= build\_prompt(lead\_name=lead\_name, business\_name=business\_name,  
                                  service\_type=service\_type, custom\_prompt=custom\_prompt)  
    tool\_ctx \= AppointmentTools(ctx, phone\_number, lead\_name)

    if voice\_override:  
        os.environ\["GEMINI\_TTS\_VOICE"\] \= voice\_override  
    if model\_override:  
        os.environ\["GEMINI\_MODEL"\] \= model\_override

    if tools\_override:  
        try:  
            enabled\_tools \= json.loads(tools\_override)  
        except Exception:  
            enabled\_tools \= await get\_enabled\_tools()  
    else:  
        enabled\_tools \= await get\_enabled\_tools()

    \# ── Connect ──────────────────────────────────────────────────────────────  
    await ctx.connect()  
    await \_log("info", f"Connected to LiveKit room: {ctx.room.name}")

    \# ── Dial — MUST come before session.start() ──────────────────────────────  
    if phone\_number:  
        trunk\_id \= os.getenv("OUTBOUND\_TRUNK\_ID")  
        if not trunk\_id:  
            await \_log("error", "OUTBOUND\_TRUNK\_ID not set — cannot place outbound call")  
            ctx.shutdown()  
            return  
        await \_log("info", f"Dialing {phone\_number} via SIP trunk {trunk\_id}")  
        try:  
            await ctx.api.sip.create\_sip\_participant(  
                api.CreateSIPParticipantRequest(  
                    room\_name=ctx.room.name,  
                    sip\_trunk\_id=trunk\_id,  
                    sip\_call\_to=phone\_number,  
                    participant\_identity=f"sip\_{phone\_number}",  
                    wait\_until\_answered=True,  
                )  
            )  
        except Exception as exc:  
            await \_log("error", f"SIP dial FAILED for {phone\_number}: {exc}")  
            ctx.shutdown()  
            return  
        await \_log("info", f"Call ANSWERED — {phone\_number} picked up, starting AI session now")

    \# ── Build and start Gemini Live ──────────────────────────────────────────  
    gemini\_model \= os.getenv("GEMINI\_MODEL", "gemini-3.1-flash-live-preview")  
    await \_log("info", f"Building AI session — model={gemini\_model}")  
    active\_tools \= tool\_ctx.build\_tool\_list(enabled\_tools)  
    await \_log("info", f"Tools loaded: {\[t.\_\_name\_\_ for t in active\_tools\]}")  
    session \= \_build\_session(tools=active\_tools, system\_prompt=system\_prompt)

    \# Use RoomOptions if available (non-deprecated), else fall back  
    \# NEVER use close\_on\_disconnect=True with SIP — drops on any audio blip  
    if \_HAS\_ROOM\_OPTIONS:  
        from livekit.agents import RoomOptions as \_RO  
        \_session\_kwargs \= dict(  
            room=ctx.room,  
            agent=OutboundAssistant(instructions=system\_prompt),  
            room\_options=\_RO(input\_options=RoomInputOptions(noise\_cancellation=noise\_cancellation.BVCTelephony())),  
        )  
    else:  
        \_session\_kwargs \= dict(  
            room=ctx.room,  
            agent=OutboundAssistant(instructions=system\_prompt),  
            room\_input\_options=RoomInputOptions(noise\_cancellation=noise\_cancellation.BVCTelephony()),  
        )

    await session.start(\*\*\_session\_kwargs)  
    await \_log("info", "Agent session started — AI ready, generating greeting")

    \# ── Optional S3 recording ────────────────────────────────────────────────  
    if phone\_number:  
        \_aws\_key    \= os.getenv("S3\_ACCESS\_KEY\_ID") or os.getenv("AWS\_ACCESS\_KEY\_ID", "")  
        \_aws\_secret \= os.getenv("S3\_SECRET\_ACCESS\_KEY") or os.getenv("AWS\_SECRET\_ACCESS\_KEY", "")  
        \_aws\_bucket \= os.getenv("S3\_BUCKET") or os.getenv("AWS\_BUCKET\_NAME", "")  
        \_s3\_endpoint \= os.getenv("S3\_ENDPOINT\_URL") or os.getenv("S3\_ENDPOINT", "")  
        \_s3\_region  \= os.getenv("S3\_REGION") or os.getenv("AWS\_REGION", "ap-northeast-1")  
        if \_aws\_key and \_aws\_secret and \_aws\_bucket:  
            try:  
                \_recording\_path \= f"recordings/{ctx.room.name}.ogg"  
                \_egress\_req \= api.RoomCompositeEgressRequest(  
                    room\_name=ctx.room.name, audio\_only=True,  
                    file\_outputs=\[api.EncodedFileOutput(  
                        file\_type=api.EncodedFileType.OGG, filepath=\_recording\_path,  
                        s3=api.S3Upload(access\_key=\_aws\_key, secret=\_aws\_secret,  
                                        bucket=\_aws\_bucket, region=\_s3\_region, endpoint=\_s3\_endpoint),  
                    )\],  
                )  
                \_egress \= await ctx.api.egress.start\_room\_composite\_egress(\_egress\_req)  
                \_s3\_ep \= \_s3\_endpoint.rstrip("/")  
                tool\_ctx.recording\_url \= (f"{\_s3\_ep}/{\_aws\_bucket}/{\_recording\_path}"  
                                           if \_s3\_ep else f"s3://{\_aws\_bucket}/{\_recording\_path}")  
                await \_log("info", f"Recording started: egress={\_egress.egress\_id}")  
            except Exception as \_exc:  
                await \_log("warning", f"Recording start failed (non-fatal): {\_exc}")

    \# ── Greeting ─────────────────────────────────────────────────────────────  
    \# gemini-3.1 and gemini-2.5 native-audio speak autonomously from system prompt.  
    \# generate\_reply() is blocked by the plugin for these models — skip it entirely.  
    \_active\_model \= os.getenv("GEMINI\_MODEL", "")  
    if "3.1" in \_active\_model or "2.5" in \_active\_model:  
        await \_log("info", "Gemini native-audio: model will greet autonomously from system prompt")  
    else:  
        greeting \= (  
            f"The call just connected. Greet the lead and ask if you're speaking with {lead\_name}."  
            if phone\_number else "Greet the caller warmly."  
        )  
        try:  
            await session.generate\_reply(instructions=greeting)  
        except Exception as \_gr\_exc:  
            await \_log("warning", f"generate\_reply failed: {\_gr\_exc}")

    \# ── Keep session alive until SIP participant actually leaves ─────────────  
    \# Without this block, the entrypoint returns and the process spins down.  
    \# We watch participant\_disconnected for the specific SIP identity.  
    if phone\_number:  
        \_sip\_identity \= f"sip\_{phone\_number}"  
        \_disconnect\_event \= asyncio.Event()

        def \_on\_participant\_disconnected(participant: rtc.RemoteParticipant):  
            if participant.identity \== \_sip\_identity:  
                \_disconnect\_event.set()  
        def \_on\_disconnected():  
            \_disconnect\_event.set()

        ctx.room.on("participant\_disconnected", \_on\_participant\_disconnected)  
        ctx.room.on("disconnected", \_on\_disconnected)

        try:  
            await asyncio.wait\_for(\_disconnect\_event.wait(), timeout=3600)  
        except asyncio.TimeoutError:  
            await \_log("warning", "Call reached 1-hour safety timeout — shutting down")

        await \_log("info", f"SIP participant disconnected — ending session for {phone\_number}")  
        await session.aclose()  
    else:  
        \_done \= asyncio.Event()  
        ctx.room.on("disconnected", lambda: \_done.set())  
        try:  
            await asyncio.wait\_for(\_done.wait(), timeout=3600)  
        except asyncio.TimeoutError:  
            pass

if \_\_name\_\_ \== "\_\_main\_\_":  
    init\_db()  
    load\_db\_settings\_to\_env()  
    agents.cli.run\_app(  
        agents.WorkerOptions(entrypoint\_fnc=entrypoint, agent\_name="outbound-caller")  
    )  
\`\`\`

\---

\#\# 11\. \`server.py\` — Complete

\`\`\`python  
"""FastAPI backend for the OutboundAI dashboard."""

import asyncio  
import json  
import logging  
import os  
import random  
import ssl  
import certifi  
import aiohttp  
from pathlib import Path  
from typing import Optional

from dotenv import load\_dotenv  
from fastapi import FastAPI, HTTPException, Query, Request  
from fastapi.responses import HTMLResponse, JSONResponse  
from pydantic import BaseModel

\_orig\_ssl \= ssl.create\_default\_context  
def \_certifi\_ssl(purpose=ssl.Purpose.SERVER\_AUTH, \*\*kwargs):  
    if not kwargs.get("cafile") and not kwargs.get("capath") and not kwargs.get("cadata"):  
        kwargs\["cafile"\] \= certifi.where()  
    return \_orig\_ssl(purpose, \*\*kwargs)  
ssl.create\_default\_context \= \_certifi\_ssl

from db import (  
    SENSITIVE\_KEYS, cancel\_appointment, clear\_errors, create\_campaign, delete\_campaign,  
    get\_all\_appointments, get\_all\_calls, get\_all\_campaigns, get\_all\_settings,  
    get\_all\_agent\_profiles, get\_agent\_profile, create\_agent\_profile, update\_agent\_profile,  
    delete\_agent\_profile, set\_default\_agent\_profile, get\_calls\_by\_phone, get\_campaign,  
    get\_contacts, get\_errors, get\_logs, get\_setting, get\_stats, init\_db, log\_error,  
    save\_settings, set\_setting, update\_call\_notes, update\_campaign\_run\_stats, update\_campaign\_status,  
    delete\_campaign,  
)  
from prompts import DEFAULT\_SYSTEM\_PROMPT

load\_dotenv(".env", override=True)  
logging.basicConfig(level=logging.INFO)  
logger \= logging.getLogger("server")

init\_db()

try:  
    from apscheduler.schedulers.asyncio import AsyncIOScheduler  
    from apscheduler.triggers.cron import CronTrigger  
    \_scheduler \= AsyncIOScheduler()  
except ImportError:  
    \_scheduler \= None  
    logger.warning("APScheduler not installed — campaign scheduling disabled")

app \= FastAPI(title="OutboundAI Dashboard", version="1.0.0")

@app.on\_event("startup")  
async def \_startup():  
    if \_scheduler:  
        \_scheduler.start()  
        await \_reschedule\_all\_campaigns()

@app.on\_event("shutdown")  
async def \_shutdown():  
    if \_scheduler and \_scheduler.running:  
        \_scheduler.shutdown(wait=False)

async def eff(key: str) \-\> str:  
    val \= await get\_setting(key, "")  
    return val if val else os.getenv(key, "")

\# ── Request models ────────────────────────────────────────────────────────────

class CallRequest(BaseModel):  
    phone: str  
    lead\_name: str \= "there"  
    business\_name: str \= "our company"  
    service\_type: str \= "our service"  
    system\_prompt: Optional\[str\] \= None  
    agent\_profile\_id: Optional\[str\] \= None

class AgentProfileRequest(BaseModel):  
    name: str  
    voice: str \= "Aoede"  
    model: str \= "gemini-3.1-flash-live-preview"  
    system\_prompt: Optional\[str\] \= None  
    enabled\_tools: str \= "\[\]"  
    is\_default: bool \= False

class PromptRequest(BaseModel):  
    prompt: str

class SettingsRequest(BaseModel):  
    settings: dict

class NotesRequest(BaseModel):  
    notes: str

class CampaignRequest(BaseModel):  
    name: str  
    contacts: list  
    schedule\_type: str \= "once"  
    schedule\_time: str \= "09:00"  
    call\_delay\_seconds: int \= 3  
    system\_prompt: Optional\[str\] \= None  
    agent\_profile\_id: Optional\[str\] \= None

class StatusRequest(BaseModel):  
    status: str

\# ── Dashboard ─────────────────────────────────────────────────────────────────

@app.get("/", response\_class=HTMLResponse)  
async def serve\_dashboard():  
    html\_path \= Path(\_\_file\_\_).parent / "ui" / "index.html"  
    if html\_path.exists():  
        return HTMLResponse(content=html\_path.read\_text(encoding="utf-8"))  
    return HTMLResponse("\<h1\>Dashboard not found — place index.html in ui/\</h1\>", status\_code=404)

\# ── Call dispatch ─────────────────────────────────────────────────────────────

@app.post("/api/call")  
async def api\_dispatch\_call(req: CallRequest):  
    url    \= await eff("LIVEKIT\_URL")  
    key    \= await eff("LIVEKIT\_API\_KEY")  
    secret \= await eff("LIVEKIT\_API\_SECRET")

    if not all(\[url, key, secret\]):  
        raise HTTPException(400, "LiveKit credentials not configured. Go to Settings → LiveKit.")

    phone \= req.phone.strip()  
    if not phone.startswith("+"):  
        raise HTTPException(400, "Phone must be in E.164 format: \+919876543210")

    effective\_prompt \= req.system\_prompt  
    effective\_voice \= None  
    effective\_model \= None  
    effective\_tools \= None

    if req.agent\_profile\_id:  
        profile \= await get\_agent\_profile(req.agent\_profile\_id)  
        if profile:  
            if not effective\_prompt and profile.get("system\_prompt"):  
                effective\_prompt \= profile\["system\_prompt"\]  
            effective\_voice \= profile.get("voice")  
            effective\_model \= profile.get("model")  
            effective\_tools \= profile.get("enabled\_tools")

    if not effective\_prompt:  
        effective\_prompt \= await get\_setting("system\_prompt", "") or None

    room\_name \= f"call-{phone.replace('+', '')}-{random.randint(1000, 9999)}"  
    metadata: dict \= {  
        "phone\_number": phone,  
        "lead\_name": req.lead\_name,  
        "business\_name": req.business\_name,  
        "service\_type": req.service\_type,  
        "system\_prompt": effective\_prompt,  
    }  
    if effective\_voice:  metadata\["voice\_override"\] \= effective\_voice  
    if effective\_model:  metadata\["model\_override"\] \= effective\_model  
    if effective\_tools:  metadata\["tools\_override"\] \= effective\_tools

    try:  
        from livekit import api as lk\_api  
        ctx \= ssl.create\_default\_context()  
        ctx.check\_hostname \= False  
        ctx.verify\_mode \= ssl.CERT\_NONE  
        session \= aiohttp.ClientSession(connector=aiohttp.TCPConnector(ssl=ctx))  
        lk \= lk\_api.LiveKitAPI(url=url, api\_key=key, api\_secret=secret, session=session)  
        await lk.room.create\_room(lk\_api.CreateRoomRequest(name=room\_name, empty\_timeout=300, max\_participants=5))  
        await lk.agent\_dispatch.create\_dispatch(  
            lk\_api.CreateAgentDispatchRequest(  
                agent\_name="outbound-caller", room=room\_name, metadata=json.dumps(metadata)  
            )  
        )  
        await lk.aclose()  
        await session.close()  
        await log\_error("server", f"Call dispatched to {phone}", f"room={room\_name}", "info")  
        return {"status": "dispatched", "room": room\_name, "phone": phone}  
    except Exception as exc:  
        logger.error("Dispatch error: %s", exc)  
        raise HTTPException(500, f"Dispatch failed: {exc}")

\# ── Calls ─────────────────────────────────────────────────────────────────────

@app.get("/api/calls")  
async def api\_get\_calls(page: int \= 1, limit: int \= 20):  
    return await get\_all\_calls(page=page, limit=limit)

@app.patch("/api/calls/{call\_id}/notes")  
async def api\_update\_notes(call\_id: str, req: NotesRequest):  
    ok \= await update\_call\_notes(call\_id, req.notes)  
    if not ok:  
        raise HTTPException(404, "Call not found")  
    return {"status": "updated"}

\# ── Stats ─────────────────────────────────────────────────────────────────────

@app.get("/api/stats")  
async def api\_get\_stats():  
    return await get\_stats()

\# ── Appointments ──────────────────────────────────────────────────────────────

@app.get("/api/appointments")  
async def api\_get\_appointments(date: Optional\[str\] \= None):  
    return await get\_all\_appointments(date\_filter=date)

@app.delete("/api/appointments/{appointment\_id}")  
async def api\_cancel\_appointment(appointment\_id: str):  
    ok \= await cancel\_appointment(appointment\_id)  
    if not ok:  
        raise HTTPException(404, "Appointment not found or already cancelled")  
    return {"status": "cancelled"}

\# ── Prompt ────────────────────────────────────────────────────────────────────

@app.get("/api/prompt")  
async def api\_get\_prompt():  
    saved \= await get\_setting("system\_prompt", "")  
    return {"prompt": saved or DEFAULT\_SYSTEM\_PROMPT, "is\_custom": bool(saved)}

@app.post("/api/prompt")  
async def api\_save\_prompt(req: PromptRequest):  
    await set\_setting("system\_prompt", req.prompt)  
    return {"status": "saved"}

@app.delete("/api/prompt")  
async def api\_reset\_prompt():  
    await set\_setting("system\_prompt", "")  
    return {"status": "reset", "prompt": DEFAULT\_SYSTEM\_PROMPT}

\# ── Settings ──────────────────────────────────────────────────────────────────

@app.get("/api/settings")  
async def api\_get\_settings():  
    return await get\_all\_settings()

@app.post("/api/settings")  
async def api\_save\_settings(req: SettingsRequest):  
    filtered \= {k: v for k, v in req.settings.items() if v is not None and v \!= ""}  
    await save\_settings(filtered)  
    for k, v in filtered.items():  
        os.environ\[k\] \= str(v)  
    return {"status": "saved", "count": len(filtered)}

\# ── SIP trunk setup ───────────────────────────────────────────────────────────

@app.post("/api/setup/trunk")  
async def api\_setup\_trunk():  
    url    \= await eff("LIVEKIT\_URL")  
    key    \= await eff("LIVEKIT\_API\_KEY")  
    secret \= await eff("LIVEKIT\_API\_SECRET")  
    sip\_domain \= await eff("VOBIZ\_SIP\_DOMAIN")  
    username   \= await eff("VOBIZ\_USERNAME")  
    password   \= await eff("VOBIZ\_PASSWORD")  
    phone      \= await eff("VOBIZ\_OUTBOUND\_NUMBER")

    if not all(\[url, key, secret, sip\_domain, username, password, phone\]):  
        raise HTTPException(400, "Configure LiveKit and Vobiz credentials in Settings first.")

    try:  
        from livekit import api as lk\_api  
        ctx \= ssl.create\_default\_context()  
        ctx.check\_hostname \= False  
        ctx.verify\_mode \= ssl.CERT\_NONE  
        session \= aiohttp.ClientSession(connector=aiohttp.TCPConnector(ssl=ctx))  
        lk \= lk\_api.LiveKitAPI(url=url, api\_key=key, api\_secret=secret, session=session)  
        trunk \= await lk.sip.create\_sip\_outbound\_trunk(  
            lk\_api.CreateSIPOutboundTrunkRequest(  
                trunk=lk\_api.SIPOutboundTrunkInfo(  
                    name="Vobiz Outbound Trunk",  
                    address=sip\_domain,  
                    auth\_username=username,  
                    auth\_password=password,  
                    numbers=\[phone\],  
                )  
            )  
        )  
        trunk\_id \= trunk.sip\_trunk\_id  
        await set\_setting("OUTBOUND\_TRUNK\_ID", trunk\_id)  
        os.environ\["OUTBOUND\_TRUNK\_ID"\] \= trunk\_id  
        await lk.aclose()  
        await session.close()  
        return {"status": "created", "trunk\_id": trunk\_id}  
    except Exception as exc:  
        raise HTTPException(500, f"Trunk creation failed: {exc}")

\# ── Logs ──────────────────────────────────────────────────────────────────────

@app.get("/api/logs")  
async def api\_get\_logs(limit: int \= 200, level: Optional\[str\] \= None, source: Optional\[str\] \= None):  
    return await get\_logs(level=level, source=source, limit=limit)

@app.delete("/api/logs")  
async def api\_clear\_logs():  
    await clear\_errors()  
    return {"status": "cleared"}

\# ── CRM ───────────────────────────────────────────────────────────────────────

@app.get("/api/crm")  
async def api\_get\_contacts():  
    return {"data": await get\_contacts()}

@app.get("/api/crm/calls")  
async def api\_get\_contact\_calls(phone: str \= Query(...)):  
    return {"data": await get\_calls\_by\_phone(phone)}

\# ── Agent Profiles ────────────────────────────────────────────────────────────

@app.get("/api/agent-profiles")  
async def api\_list\_agent\_profiles():  
    try:  
        return await get\_all\_agent\_profiles()  
    except Exception as exc:  
        raise HTTPException(500, str(exc))

@app.post("/api/agent-profiles")  
async def api\_create\_agent\_profile(req: AgentProfileRequest):  
    try:  
        profile\_id \= await create\_agent\_profile(  
            name=req.name, voice=req.voice, model=req.model,  
            system\_prompt=req.system\_prompt, enabled\_tools=req.enabled\_tools, is\_default=req.is\_default,  
        )  
        return {"status": "created", "id": profile\_id}  
    except Exception as exc:  
        raise HTTPException(500, str(exc))

@app.get("/api/agent-profiles/{profile\_id}")  
async def api\_get\_agent\_profile(profile\_id: str):  
    profile \= await get\_agent\_profile(profile\_id)  
    if not profile:  
        raise HTTPException(404, "Profile not found")  
    return profile

@app.put("/api/agent-profiles/{profile\_id}")  
async def api\_update\_agent\_profile(profile\_id: str, req: AgentProfileRequest):  
    ok \= await update\_agent\_profile(profile\_id, {  
        "name": req.name, "voice": req.voice, "model": req.model,  
        "system\_prompt": req.system\_prompt, "enabled\_tools": req.enabled\_tools,  
        "is\_default": 1 if req.is\_default else 0,  
    })  
    if not ok:  
        raise HTTPException(404, "Profile not found")  
    return {"status": "updated"}

@app.delete("/api/agent-profiles/{profile\_id}")  
async def api\_delete\_agent\_profile(profile\_id: str):  
    ok \= await delete\_agent\_profile(profile\_id)  
    if not ok:  
        raise HTTPException(404, "Profile not found")  
    return {"status": "deleted"}

@app.post("/api/agent-profiles/{profile\_id}/set-default")  
async def api\_set\_default\_profile(profile\_id: str):  
    try:  
        await set\_default\_agent\_profile(profile\_id)  
        return {"status": "default set"}  
    except Exception as exc:  
        raise HTTPException(500, str(exc))

\# ── Campaigns ─────────────────────────────────────────────────────────────────

async def \_dispatch\_one(lk, lk\_api, contact: dict, room\_name: str,  
                         prompt: Optional\[str\], profile: Optional\[dict\] \= None) \-\> bool:  
    try:  
        saved\_prompt \= prompt or (await get\_setting("system\_prompt", "")) or None  
        metadata: dict \= {  
            "phone\_number": contact\["phone"\],  
            "lead\_name": contact.get("lead\_name", "there"),  
            "business\_name": contact.get("business\_name", "our company"),  
            "service\_type": contact.get("service\_type", "our service"),  
            "system\_prompt": saved\_prompt,  
        }  
        if profile:  
            if not metadata\["system\_prompt"\] and profile.get("system\_prompt"):  
                metadata\["system\_prompt"\] \= profile\["system\_prompt"\]  
            if profile.get("voice"):   metadata\["voice\_override"\] \= profile\["voice"\]  
            if profile.get("model"):   metadata\["model\_override"\] \= profile\["model"\]  
            if profile.get("enabled\_tools"): metadata\["tools\_override"\] \= profile\["enabled\_tools"\]  
        await lk.agent\_dispatch.create\_dispatch(  
            lk\_api.CreateAgentDispatchRequest(agent\_name="outbound-caller", room=room\_name, metadata=json.dumps(metadata))  
        )  
        return True  
    except Exception as exc:  
        logger.error("Campaign dispatch error for %s: %s", contact.get("phone"), exc)  
        return False

async def \_run\_campaign(campaign\_id: str) \-\> None:  
    campaign \= await get\_campaign(campaign\_id)  
    if not campaign:  
        return  
    contacts \= json.loads(campaign.get("contacts\_json") or "\[\]")  
    if not contacts:  
        return  
    delay \= int(campaign.get("call\_delay\_seconds") or 3\)  
    prompt \= campaign.get("system\_prompt")  
    agent\_profile\_id \= campaign.get("agent\_profile\_id")  
    profile \= None  
    if agent\_profile\_id:  
        profile \= await get\_agent\_profile(agent\_profile\_id)

    url    \= await eff("LIVEKIT\_URL")  
    key    \= await eff("LIVEKIT\_API\_KEY")  
    secret \= await eff("LIVEKIT\_API\_SECRET")  
    if not (url and key and secret):  
        logger.error("Campaign %s: LiveKit not configured", campaign\_id)  
        return

    from livekit import api as lk\_api\_module  
    ctx \= ssl.create\_default\_context()  
    ctx.check\_hostname \= False  
    ctx.verify\_mode \= ssl.CERT\_NONE  
    session \= aiohttp.ClientSession(connector=aiohttp.TCPConnector(ssl=ctx))

    ok\_count \= fail\_count \= 0  
    try:  
        lk \= lk\_api\_module.LiveKitAPI(url=url, api\_key=key, api\_secret=secret, session=session)  
        for i, contact in enumerate(contacts):  
            phone \= contact.get("phone", "")  
            if not phone.startswith("+"):  
                fail\_count \+= 1  
                continue  
            room\_name \= f"camp-{campaign\_id\[:8\]}-{phone.replace('+','')}-{random.randint(100,999)}"  
            success \= await \_dispatch\_one(lk, lk\_api\_module, contact, room\_name, prompt, profile)  
            if success:  
                ok\_count \+= 1  
            else:  
                fail\_count \+= 1  
            if i \< len(contacts) \- 1:  
                await asyncio.sleep(delay)  
        await lk.aclose()  
    except Exception as exc:  
        logger.error("Campaign run error: %s", exc)  
    finally:  
        await session.close()

    await update\_campaign\_run\_stats(campaign\_id, ok\_count, fail\_count)  
    logger.info("Campaign %s done — %d dispatched, %d failed", campaign\_id, ok\_count, fail\_count)

async def \_reschedule\_all\_campaigns() \-\> None:  
    if not \_scheduler:  
        return  
    try:  
        campaigns \= await get\_all\_campaigns()  
        for c in campaigns:  
            if c.get("status") \== "active" and c.get("schedule\_type") in ("daily", "weekdays"):  
                \_schedule\_campaign(c\["id"\], c\["schedule\_type"\], c.get("schedule\_time", "09:00"))  
    except Exception as exc:  
        logger.warning("Could not reschedule campaigns: %s", exc)

def \_schedule\_campaign(campaign\_id: str, schedule\_type: str, schedule\_time: str) \-\> None:  
    if not \_scheduler:  
        return  
    job\_id \= f"campaign\_{campaign\_id}"  
    if \_scheduler.get\_job(job\_id):  
        \_scheduler.remove\_job(job\_id)  
    try:  
        hour, minute \= map(int, schedule\_time.split(":"))  
    except (ValueError, AttributeError):  
        hour, minute \= 9, 0  
    if schedule\_type \== "daily":  
        trigger \= CronTrigger(hour=hour, minute=minute)  
    else:  
        trigger \= CronTrigger(day\_of\_week="mon-fri", hour=hour, minute=minute)  
    \_scheduler.add\_job(\_run\_campaign, trigger=trigger, args=\[campaign\_id\], id=job\_id, replace\_existing=True)  
    logger.info("Scheduled campaign %s (%s at %02d:%02d)", campaign\_id, schedule\_type, hour, minute)

@app.post("/api/campaigns")  
async def api\_create\_campaign(req: CampaignRequest):  
    if not req.contacts:  
        raise HTTPException(400, "contacts list cannot be empty")  
    if req.schedule\_type not in ("once", "daily", "weekdays"):  
        raise HTTPException(400, "schedule\_type must be: once | daily | weekdays")

    campaign\_id \= await create\_campaign(  
        name=req.name, contacts\_json=json.dumps(req.contacts),  
        schedule\_type=req.schedule\_type, schedule\_time=req.schedule\_time,  
        call\_delay\_seconds=req.call\_delay\_seconds, system\_prompt=req.system\_prompt,  
        agent\_profile\_id=req.agent\_profile\_id,  
    )  
    campaign \= await get\_campaign(campaign\_id)

    if req.schedule\_type \== "once":  
        asyncio.create\_task(\_run\_campaign(campaign\_id))  
    else:  
        \_schedule\_campaign(campaign\_id, req.schedule\_type, req.schedule\_time)

    return {"status": "created", "campaign\_id": campaign\_id, "campaign": campaign}

@app.get("/api/campaigns")  
async def api\_list\_campaigns():  
    return await get\_all\_campaigns()

@app.delete("/api/campaigns/{campaign\_id}")  
async def api\_delete\_campaign(campaign\_id: str):  
    ok \= await delete\_campaign(campaign\_id)  
    if not ok:  
        raise HTTPException(404, "Campaign not found")  
    job\_id \= f"campaign\_{campaign\_id}"  
    if \_scheduler and \_scheduler.get\_job(job\_id):  
        \_scheduler.remove\_job(job\_id)  
    return {"status": "deleted"}

@app.post("/api/campaigns/{campaign\_id}/run")  
async def api\_run\_campaign\_now(campaign\_id: str):  
    campaign \= await get\_campaign(campaign\_id)  
    if not campaign:  
        raise HTTPException(404, "Campaign not found")  
    asyncio.create\_task(\_run\_campaign(campaign\_id))  
    return {"status": "dispatching", "campaign\_id": campaign\_id}

@app.patch("/api/campaigns/{campaign\_id}/status")  
async def api\_update\_campaign\_status(campaign\_id: str, req: StatusRequest):  
    if req.status not in ("active", "paused", "completed"):  
        raise HTTPException(400, "status must be: active | paused | completed")  
    ok \= await update\_campaign\_status(campaign\_id, req.status)  
    if not ok:  
        raise HTTPException(404, "Campaign not found")  
    job\_id \= f"campaign\_{campaign\_id}"  
    if req.status \== "paused" and \_scheduler and \_scheduler.get\_job(job\_id):  
        \_scheduler.remove\_job(job\_id)  
    elif req.status \== "active":  
        campaign \= await get\_campaign(campaign\_id)  
        if campaign and campaign.get("schedule\_type") in ("daily", "weekdays"):  
            \_schedule\_campaign(campaign\_id, campaign\["schedule\_type"\], campaign.get("schedule\_time", "09:00"))  
    return {"status": req.status}  
\`\`\`

\---

\#\# 12\. \`ui/index.html\` — Dashboard Structure

Build a \*\*single-file HTML dashboard\*\* with all CSS and JS inline. No external dependencies except Chart.js CDN.

\#\#\# Head:  
\`\`\`html  
\<\!DOCTYPE html\>  
\<html lang="en"\>  
\<head\>  
\<meta charset="UTF-8" /\>  
\<meta name="viewport" content="width=device-width, initial-scale=1.0" /\>  
\<title\>OutboundAI — Dashboard\</title\>  
\<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"\>\</script\>  
\<style\>  
/\* Dark theme CSS variables \*/  
\*,\*::before,\*::after{box-sizing:border-box;margin:0;padding:0}  
:root{  
  \--bg:\#0d0d0d; \--card:\#161616; \--border:\#252525;  
  \--accent:\#00ff88; \--accent2:\#00ccff; \--danger:\#ff4d4d; \--warn:\#ffaa00;  
  \--muted:\#5a5a5a; \--text:\#e0e0e0; \--text2:\#aaa;  
  \--mono:'Courier New',monospace; \--sans:'Segoe UI',system-ui,sans-serif; \--r:8px;  
}  
body{background:var(--bg);color:var(--text);font-family:var(--sans);min-height:100vh;line-height:1.5;font-size:14px}  
/\* Full CSS for header, nav tabs, cards, forms, buttons, tables, badges, charts, etc. \*/  
\</style\>  
\</head\>  
\`\`\`

\#\#\# Navigation tabs (in order):  
\`\`\`  
📊 Stats | 📞 Single Call | 📋 Batch Call | 🚀 Campaigns | 🤖 Agents |  
✏️ AI Prompt | 📅 Appointments | 📝 Call Logs | 👥 CRM | ⚙️ Settings | 📋 Logs | 🔧 Setup  
\`\`\`

\#\#\# Tab panels to implement:

\*\*📊 Stats\*\* — KPI grid (Total Calls, Booked, Not Interested, Booking Rate %, Avg Duration), Live Config chips, 3 Chart.js charts (outcomes donut, 14-day timeline line, avg duration by outcome bar)

\*\*📞 Single Call\*\* — Form: phone (E.164), lead name, business name, service type, agent profile dropdown (populated from API), optional custom prompt textarea (hidden behind checkbox), Submit button

\*\*📋 Batch Call\*\* — Agent profile dropdown, CSV file input, delay input, Parse CSV button (shows preview table), Start Batch button with progress bar

\*\*🚀 Campaigns\*\* — Create form: name, schedule (once/daily/weekdays), time picker, delay, agent profile dropdown, custom prompt checkbox, CSV file \+ parse. Campaign list table with run/pause/delete actions.

\*\*🤖 Agents\*\* — Create/edit form: profile name, voice select (30 voices grouped by gender), model select, enabled tools input, system prompt textarea, is\_default checkbox. Profiles table with Edit/★ Default/Delete actions.

\*\*✏️ AI Prompt\*\* — Large textarea for global system prompt, Save/Reset buttons, character count.

\*\*📅 Appointments\*\* — Date filter, appointments table with Cancel button per row.

\*\*📝 Call Logs\*\* — Paginated table: phone, lead, outcome badge, duration, timestamp, recording link, inline notes editor.

\*\*👥 CRM\*\* — Contacts table aggregated by phone. Click row → drill-down to full call history \+ notes.

\*\*⚙️ Settings\*\* — BYOK groups: LiveKit, Gemini (model \+ voice \+ mode), Vobiz SIP \+ SIP trunk creation button, Twilio SMS, S3 Recordings, Cal.com, Tool Toggles. Each group has Save button. Sensitive fields have eye-toggle show/hide.

\*\*📋 Logs\*\* — Auto-refreshing log viewer with level filter (all/info/warning/error), source filter, Clear button, pause/resume auto-refresh.

\*\*🔧 Setup\*\* — Quick-start guide, cost breakdown card.

\#\#\# JavaScript functions to implement:

\`\`\`javascript  
// Core utilities  
const $ \= id \=\> document.getElementById(id);  
const api \= (path, opts) \=\> fetch(path, opts).then(r \=\> r.json());  
const apiPost \= (path, body) \=\> fetch(path, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});  
const apiDel  \= path \=\> fetch(path, {method:'DELETE'});  
function toast(msg, type='ok') { /\* show floating notification \*/ }  
function showErr(id, msg) { /\* show inline error \*/ }  
function switchTab(name) { /\* switch active tab \+ panel, load relevant data \*/ }

// Stats \+ Charts  
async function loadStats() { /\* fetch /api/stats, update KPIs, render 3 charts \*/ }  
async function loadLiveConfig() { /\* fetch /api/settings \+ /api/prompt, update Live Config chips \*/ }  
function \_mkChart(id, type, data, options) { /\* create/update Chart.js instance \*/ }  
function \_renderCharts(d) { /\* outcomes donut, timeline line, duration bar \*/ }

// Single Call  
// submit handler on \#call-form → POST /api/call with agent\_profile\_id

// Batch Call  
// parse CSV → dispatch loop with delay → progress bar

// Campaigns  
async function loadCampaigns() { /\* GET /api/campaigns, render table \*/ }  
async function createCampaign() { /\* POST /api/campaigns \*/ }  
window.runCampaign \= async (id, name) \=\> { /\* POST /api/campaigns/{id}/run \*/ }  
window.toggleCampaignStatus \= async (id, newStatus) \=\> { /\* PATCH /api/campaigns/{id}/status \*/ }  
window.deleteCampaign \= async (id, name) \=\> { /\* DELETE /api/campaigns/{id} \*/ }

// Agent Profiles  
async function loadAgentProfiles() {  
  const raw \= await api('/api/agent-profiles');  
  const profiles \= Array.isArray(raw) ? raw : \[\]; // guard against non-array (table not yet created)  
  // render table, populate all 3 dropdowns: f-agent-profile, bc-agent-profile, camp-agent-profile  
}  
window.saveAgentProfile \= async () \=\> { /\* POST or PUT /api/agent-profiles \*/ }  
window.editAgentProfile \= async (id) \=\> { /\* GET /api/agent-profiles/{id}, fill form \*/ }  
window.deleteAgentProfile \= async (id, name) \=\> { /\* DELETE \*/ }  
window.setDefaultAgentProfile \= async (id, name) \=\> { /\* POST /api/agent-profiles/{id}/set-default \*/ }  
window.resetAgentForm \= () \=\> { /\* clear form \*/ }

// Prompt  
async function loadPrompt() { /\* GET /api/prompt \*/ }  
window.savePrompt \= async () \=\> { /\* POST /api/prompt \*/ }  
window.resetPrompt \= async () \=\> { /\* DELETE /api/prompt \*/ }

// Appointments  
async function loadAppointments() { /\* GET /api/appointments \*/ }  
window.cancelAppointment \= async (id) \=\> { /\* DELETE /api/appointments/{id} \*/ }

// Call Logs (paginated)  
async function loadCalls(page=1) { /\* GET /api/calls?page=X\&limit=20 \*/ }  
window.saveNotes \= async (callId) \=\> { /\* PATCH /api/calls/{id}/notes \*/ }

// CRM  
async function loadCRM() { /\* GET /api/crm \*/ }  
window.loadContactDetail \= async (phone) \=\> { /\* GET /api/crm/calls?phone=X \*/ }

// Settings  
async function loadSettings() { /\* GET /api/settings, fill all fields \+ show configured badges \*/ }  
async function saveGroup(group) { /\* POST /api/settings with group fields \*/ }  
window.createSIPTrunk \= async () \=\> { /\* POST /api/setup/trunk \*/ }  
window.saveToolToggles \= async () \=\> { /\* POST /api/settings with ENABLED\_TOOLS JSON \*/ }

// Logs  
async function loadLogs() { /\* GET /api/logs with filters \*/ }  
function scheduleLogsRefresh() { /\* 5s interval with pause/resume \*/ }

// Init  
function init() {  
  loadStats();  
  loadCalls();  
  loadAppointments();  
  loadLogs();  
  loadAgentProfiles(); // populates all dropdowns  
  setInterval(loadStats, 10000);  
  scheduleLogsRefresh();  
}  
document.addEventListener('DOMContentLoaded', init);  
\`\`\`

\#\#\# Voice select options (use in both Settings tab and Agent Profile form):

\`\`\`html  
\<optgroup label="Female voices"\>  
  \<option value="Aoede"\>Aoede — warm, expressive ⭐\</option\>  
  \<option value="Achernar"\>Achernar — soft & clear\</option\>  
  \<option value="Autonoe"\>Autonoe — natural female\</option\>  
  \<option value="Callirrhoe"\>Callirrhoe — gentle female\</option\>  
  \<option value="Despina"\>Despina — bright female\</option\>  
  \<option value="Erinome"\>Erinome — smooth female\</option\>  
  \<option value="Gacrux"\>Gacrux — rich female\</option\>  
  \<option value="Kore"\>Kore — soft, calm\</option\>  
  \<option value="Laomedeia"\>Laomedeia — light female\</option\>  
  \<option value="Leda"\>Leda — clear female\</option\>  
  \<option value="Pulcherrima"\>Pulcherrima — warm female\</option\>  
  \<option value="Sulafat"\>Sulafat — smooth female\</option\>  
  \<option value="Vindemiatrix"\>Vindemiatrix — professional female\</option\>  
  \<option value="Zephyr"\>Zephyr — airy female\</option\>  
\</optgroup\>  
\<optgroup label="Male voices"\>  
  \<option value="Achird"\>Achird — clear male\</option\>  
  \<option value="Algenib"\>Algenib — strong male\</option\>  
  \<option value="Algieba"\>Algieba — rich male\</option\>  
  \<option value="Alnilam"\>Alnilam — deep male\</option\>  
  \<option value="Charon"\>Charon — calm, deep\</option\>  
  \<option value="Enceladus"\>Enceladus — expressive male\</option\>  
  \<option value="Fenrir"\>Fenrir — confident male\</option\>  
  \<option value="Iapetus"\>Iapetus — steady male\</option\>  
  \<option value="Orus"\>Orus — warm male\</option\>  
  \<option value="Perseus"\>Perseus — clear male\</option\>  
  \<option value="Puck"\>Puck — bright, energetic\</option\>  
  \<option value="Rasalgethi"\>Rasalgethi — bold male\</option\>  
  \<option value="Sadachbia"\>Sadachbia — natural male\</option\>  
  \<option value="Sadaltager"\>Sadaltager — smooth male\</option\>  
  \<option value="Schedar"\>Schedar — professional male\</option\>  
  \<option value="Umbriel"\>Umbriel — deep, calm\</option\>  
  \<option value="Zubenelgenubi"\>Zubenelgenubi — resonant male\</option\>  
\</optgroup\>  
\`\`\`

\---

\#\# 13\. Critical Architecture Rules (DO NOT DEVIATE)

\#\#\# Rule 1: Dial-First Pattern

\`\`\`python  
\# CORRECT — session starts AFTER call is answered  
await ctx.api.sip.create\_sip\_participant(..., wait\_until\_answered=True)  
\# call is now answered ↑  
session \= \_build\_session(...)  
await session.start(...)

\# WRONG — session starts before dialing (will timeout during ring)  
session \= \_build\_session(...)  
await session.start(...)  
await ctx.api.sip.create\_sip\_participant(...)  
\`\`\`

\#\#\# Rule 2: Never use \`close\_on\_disconnect=True\` with SIP

\`\`\`python  
\# WRONG — kills session on any brief SIP audio dropout  
room\_input\_options=RoomInputOptions(close\_on\_disconnect=True)

\# CORRECT — watch participant\_disconnected event manually  
\_disconnect\_event \= asyncio.Event()  
def \_on\_disconnect(participant):  
    if participant.identity \== f"sip\_{phone\_number}":  
        \_disconnect\_event.set()  
ctx.room.on("participant\_disconnected", \_on\_disconnect)  
await asyncio.wait\_for(\_disconnect\_event.wait(), timeout=3600)  
\`\`\`

\#\#\# Rule 3: EndSensitivity enum — exact string required

\`\`\`python  
\# WRONG — AttributeError, silently skips all 3 silence-prevention configs  
end\_of\_speech\_sensitivity=\_gt.EndSensitivity.LOW

\# CORRECT  
end\_of\_speech\_sensitivity=\_gt.EndSensitivity.END\_SENSITIVITY\_LOW  
\`\`\`

\#\#\# Rule 4: Gemini 3.1 and 2.5 speak autonomously

\`generate\_reply()\` is \*\*blocked\*\* by the livekit-plugins-google plugin for \`gemini-3.1-\*\` and \`gemini-2.5-\*\` native audio models. Calling it raises an error. These models speak automatically from the system prompt when audio starts flowing. The system prompt must instruct the model to speak first.

\`\`\`python  
\# CORRECT — check model name before calling generate\_reply  
if "3.1" in model or "2.5" in model:  
    pass  \# model speaks autonomously  
else:  
    await session.generate\_reply(instructions="Greet the caller...")  
\`\`\`

\#\#\# Rule 5: Model availability

| Model | Works? | Notes |  
|---|---|---|  
| \`gemini-3.1-flash-live-preview\` | ✅ YES | Recommended. Free tier. v1alpha API. |  
| \`gemini-2.5-flash-native-audio-preview-12-2025\` | ✅ YES | Alternative |  
| \`gemini-2.0-flash-live-001\` | ❌ NO | 1008 policy error on standard API keys |  
| \`gemini-3.1-flash-lite-preview\` | ❌ NO | No bidiGenerateContent support |  
| Any \`-lite\` model | ❌ NO | Lite models don't support Gemini Live |

\#\#\# Rule 6: All 3 silence-prevention configs are mandatory

\`\`\`python  
from google.genai import types as \_gt

\# 1\. Transparent session resumption — auto-reconnects on timeout instead of going silent  
session\_resumption=\_gt.SessionResumptionConfig(transparent=True)

\# 2\. Context window compression — prevents freeze when context fills up  
context\_window\_compression=\_gt.ContextWindowCompressionConfig(  
    trigger\_tokens=25600,  
    sliding\_window=\_gt.SlidingWindow(target\_tokens=12800),  
)

\# 3\. VAD tuning — 2 second silence threshold, low sensitivity  
realtime\_input\_config=\_gt.RealtimeInputConfig(  
    automatic\_activity\_detection=\_gt.AutomaticActivityDetection(  
        end\_of\_speech\_sensitivity=\_gt.EndSensitivity.END\_SENSITIVITY\_LOW,  
        silence\_duration\_ms=2000,  
        prefix\_padding\_ms=200,  
    ),  
)  
\`\`\`

Without all 3, calls will go silent within 30–90 seconds.

\#\#\# Rule 7: Never hardcode credentials in source code

\`\`\`python  
\# WRONG  
LIVEKIT\_API\_KEY \= "APIxxxxxxxxx"  
SUPABASE\_SERVICE\_KEY \= "eyJhbGci..."

\# CORRECT — always load from environment  
LIVEKIT\_API\_KEY \= os.getenv("LIVEKIT\_API\_KEY", "")  
\`\`\`

\#\#\# Rule 8: FastAPI server always runs on port 8000

LiveKit agent worker occupies port 8081 internally. Never run uvicorn on 8081\.

\`\`\`bash  
uvicorn server:app \--host 0.0.0.0 \--port 8000  
python agent.py start  \# uses port 8081 internally  
\`\`\`

\#\#\# Rule 9: Settings priority order

1\. Coolify / Docker env vars (set at container startup)  
2\. Supabase \`settings\` table (set via dashboard Settings tab)  
3\. Values in \`db.py\` DEFAULTS (empty strings — never real credentials)

DB settings override env vars at runtime via \`get\_setting()\` → \`\_default()\` fallback chain.

\#\#\# Rule 10: Agent profile override flow

When a call or campaign has an \`agent\_profile\_id\`:  
1\. Load profile from \`agent\_profiles\` table  
2\. Set \`voice\_override\`, \`model\_override\`, \`tools\_override\` in dispatch metadata  
3\. Agent reads overrides from metadata and sets \`os.environ\["GEMINI\_TTS\_VOICE"\]\` etc. before building session

\---

\#\# 14\. Deployment on Coolify

1\. \*\*VPS\*\* — Any Linux VPS, minimum 2GB RAM, 2 vCPU. Hetzner CX21 (€3.79/mo) works.  
2\. \*\*Install Coolify\*\* — \`curl \-fsSL https://cdn.coollabs.io/coolify/install.sh | bash\`  
3\. \*\*New Resource\*\* → GitHub → select repo → Dockerfile detected automatically  
4\. \*\*Set all environment variables\*\* (from Section 2\)  
5\. \*\*Set port to 8000\*\*  
6\. \*\*Deploy\*\*  
7\. After first deploy: open dashboard URL → Settings → fill in API keys → click ⚡ Create SIP Trunk

\#\#\# Successful startup log output:  
\`\`\`  
🚀 Starting Outbound Mass Caller...  
✅ Supabase connected  
🌐 Starting FastAPI server on port 8000...  
🤖 Starting LiveKit agent worker...  
{"message": "registered worker", "agent\_name": "outbound-caller", ...}  
\`\`\`

\---

\#\# 15\. Known Gotchas Table

| Symptom | Root Cause | Fix |  
|---|---|---|  
| Call drops exactly at 60s | \`close\_on\_disconnect=True\` fires on SIP audio dropout | Remove it; use \`participant\_disconnected\` event instead |  
| Agent goes silent after 30–90s | \`EndSensitivity.LOW\` causes AttributeError, all 3 silence configs skip silently | Use \`EndSensitivity.END\_SENSITIVITY\_LOW\` (full string) |  
| No initial greeting | Using 3.1/2.5 model but calling \`generate\_reply()\` | These models speak autonomously — skip \`generate\_reply()\` |  
| 1008 error on session start | Using \`gemini-2.0-flash-live-001\` on standard API key | Switch to \`gemini-3.1-flash-live-preview\` |  
| \`AgentSession isn't running\` | Session started before SIP call answered | Dial-first: \`wait\_until\_answered=True\` before \`session.start()\` |  
| Port 8081 in use | Old agent worker still running | \`pkill \-9 \-f "agent.py start"\` |  
| \`profiles.map is not a function\` | \`agent\_profiles\` table doesn't exist in Supabase | Run \`supabase\_schema.sql\` in Supabase SQL Editor |  
| Worker uses old model after Settings change | \`load\_db\_settings\_to\_env()\` only runs at startup | Redeploy after changing model in Settings |  
| \`DefaultCredentialsError\` on TTS | Using \`google.TTS\` (needs ADC) with Gemini Live models | Don't attach TTS to realtime models — it's built in |  
| Duplicate tool name error | Passing tools to both \`super().\_\_init\_\_()\` and \`AgentSession\` | Pass \`tools=\[\]\` to Agent \`super().\_\_init\_\_()\`, only to \`AgentSession\` |  
| \`SSL certificate verify failed\` | Missing certifi CA bundle | Patch \`ssl.create\_default\_context\` with certifi at top of agent.py and server.py |  
| Campaigns table not found | Schema not run on deployed Supabase | Run full \`supabase\_schema.sql\` in Supabase SQL Editor |

\---

\#\# 16\. Available Gemini Live Voices (30 total)

These are the only voice names that work with the Gemini Live API. Use them exactly as shown.

\*\*Female (14):\*\* Aoede, Achernar, Autonoe, Callirrhoe, Despina, Erinome, Gacrux, Kore, Laomedeia, Leda, Pulcherrima, Sulafat, Vindemiatrix, Zephyr

\*\*Male (16):\*\* Achird, Algenib, Algieba, Alnilam, Charon, Enceladus, Fenrir, Iapetus, Orus, Perseus, Puck, Rasalgethi, Sadachbia, Sadaltager, Schedar, Umbriel, Zubenelgenubi

Default: \*\*Aoede\*\* (warm female, works well for appointment booking persona)

\---

\#\# 17\. Cost Breakdown

| Service | Cost per minute | Notes |  
|---|---|---|  
| Vobiz SIP | ₹1.00/min | Fixed telephony cost |  
| LiveKit Cloud | ₹0.17/min ($0.002) | Free tier: 100k participant-minutes/mo |  
| Gemini Live | ₹0.03/min | Free tier covers most usage; \~$0.075/1M audio tokens |  
| Deepgram STT | ₹0.58/min | Pipeline mode only — not used in default setup |  
| \*\*Total (realtime)\*\* | \*\*≈ ₹1.20/min\*\* | Under ₹1.50 target |

A typical 2-minute call costs \*\*≈ ₹2.40\*\*.

\---

\#\# 18\. API Integrations Reference

\#\#\# LiveKit Agent Dispatch

\`\`\`python  
from livekit import api as lk\_api

lk \= lk\_api.LiveKitAPI(url=LIVEKIT\_URL, api\_key=API\_KEY, api\_secret=API\_SECRET, session=aiohttp\_session)

\# Create room  
await lk.room.create\_room(lk\_api.CreateRoomRequest(name=room\_name, empty\_timeout=300, max\_participants=5))

\# Dispatch agent job  
await lk.agent\_dispatch.create\_dispatch(  
    lk\_api.CreateAgentDispatchRequest(  
        agent\_name="outbound-caller",   \# MUST match agents.WorkerOptions(agent\_name=...)  
        room=room\_name,  
        metadata=json.dumps({"phone\_number": "+91...", "lead\_name": "...", ...})  
    )  
)

\# Outbound SIP dial (called from inside agent entrypoint, not server)  
await ctx.api.sip.create\_sip\_participant(  
    api.CreateSIPParticipantRequest(  
        room\_name=ctx.room.name,  
        sip\_trunk\_id=OUTBOUND\_TRUNK\_ID,  
        sip\_call\_to=phone\_number,  
        participant\_identity=f"sip\_{phone\_number}",  
        wait\_until\_answered=True,       \# BLOCKS until answered — required for dial-first pattern  
    )  
)

\# SIP REFER transfer  
await ctx.api.sip.transfer\_sip\_participant(  
    api.TransferSIPParticipantRequest(  
        room\_name=ctx.room.name,  
        participant\_identity=f"sip\_{phone\_number}",  
        transfer\_to=f"sip:{destination}@{sip\_domain}",  
        play\_dialtone=False,  
    )  
)  
\`\`\`

\#\#\# Cal.com API v1

\`\`\`python  
import httpx

\# Book  
resp \= await httpx.AsyncClient().post(  
    "https://api.cal.com/v1/bookings",  
    headers={"Authorization": f"Bearer {CALCOM\_API\_KEY}"},  
    json={  
        "eventTypeId": int(CALCOM\_EVENT\_TYPE\_ID),  
        "start": "2026-04-25T09:00:00.000Z",  
        "timeZone": "Asia/Kolkata",  
        "responses": {"name": "Shreyas Raj", "email": "test@test.com"},  
        "metadata": {"source": "OutboundAI"},  
    }  
)  
uid \= resp.json()\["uid"\]

\# Cancel  
await httpx.AsyncClient().delete(f"https://api.cal.com/v1/bookings/{uid}",  
    headers={"Authorization": f"Bearer {CALCOM\_API\_KEY}"})  
\`\`\`

\#\#\# Supabase (async)

\`\`\`python  
from supabase.\_async.client import create\_client

db \= await create\_client(SUPABASE\_URL, SUPABASE\_SERVICE\_KEY)

\# Insert  
await db.table("call\_logs").insert({...}).execute()

\# Select  
result \= await db.table("appointments").select("\*").eq("date", "2026-04-25").execute()  
rows \= result.data or \[\]

\# Upsert (insert or update by primary key)  
await db.table("settings").upsert({"key": "GEMINI\_MODEL", "value": "...", "updated\_at": "..."}, on\_conflict="key").execute()

\# Update  
await db.table("appointments").update({"status": "cancelled"}).eq("id", appointment\_id).execute()

\# Delete  
await db.table("contact\_memory").delete().eq("phone\_number", phone).execute()  
\`\`\`

\---

\#\# 19\. One-Time Setup Sequence

After deploying for the first time:

1\. Open dashboard URL  
2\. Go to \*\*SQL Editor\*\* in Supabase → run \`supabase\_schema.sql\`  
3\. Go to \*\*⚙️ Settings\*\* → fill in:  
   \- LiveKit URL, API Key, API Secret → Save  
   \- Google Gemini API Key, select Model, Voice → Save  
   \- Vobiz SIP Domain, Username, Password, Outbound Number → Save → click \*\*⚡ Create SIP Trunk in LiveKit\*\*  
4\. Go to \*\*✏️ AI Prompt\*\* → customise the prompt for your business name / service type → Save  
5\. Go to \*\*🤖 Agents\*\* → create at least one agent profile (give it a name and your business info in the prompt)  
6\. Go to \*\*📞 Single Call\*\* → test with your own number  
7\. Hear the AI speak within 5–10 seconds of the call connecting ✅

\---

\*This specification is complete. Build every file exactly as shown. Every function, every import, every config option matters.\*

