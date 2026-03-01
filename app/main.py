from collections import defaultdict
from hashlib import sha256
from typing import Dict, Set

from fastapi import FastAPI, Form, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.middleware.sessions import SessionMiddleware

from .db import create_user, get_user_password, init_db, last_messages, save_message

app = FastAPI(title="Telegram-like Messenger")
app.add_middleware(SessionMiddleware, secret_key="change-me-in-production")
app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")

active_connections: Dict[str, Set[WebSocket]] = defaultdict(set)


@app.on_event("startup")
def startup() -> None:
    init_db()


@app.get("/", response_class=HTMLResponse)
def root(request: Request):
    if request.session.get("user"):
        return RedirectResponse(url="/chat", status_code=302)
    return RedirectResponse(url="/login", status_code=302)


@app.get("/register", response_class=HTMLResponse)
def register_page(request: Request):
    return templates.TemplateResponse("register.html", {"request": request, "error": None})


@app.post("/register", response_class=HTMLResponse)
def register(request: Request, username: str = Form(...), password: str = Form(...)):
    password_hash = sha256(password.encode()).hexdigest()
    ok = create_user(username.strip(), password_hash)
    if not ok:
        return templates.TemplateResponse(
            "register.html",
            {"request": request, "error": "Пользователь уже существует"},
            status_code=400,
        )
    request.session["user"] = username.strip()
    return RedirectResponse(url="/chat", status_code=302)


@app.get("/login", response_class=HTMLResponse)
def login_page(request: Request):
    return templates.TemplateResponse("login.html", {"request": request, "error": None})


@app.post("/login", response_class=HTMLResponse)
def login(request: Request, username: str = Form(...), password: str = Form(...)):
    stored = get_user_password(username.strip())
    if not stored or stored != sha256(password.encode()).hexdigest():
        return templates.TemplateResponse(
            "login.html",
            {"request": request, "error": "Неверный логин или пароль"},
            status_code=401,
        )
    request.session["user"] = username.strip()
    return RedirectResponse(url="/chat", status_code=302)


@app.get("/logout")
def logout(request: Request):
    request.session.clear()
    return RedirectResponse(url="/login", status_code=302)


@app.get("/chat", response_class=HTMLResponse)
def chat_page(request: Request):
    user = request.session.get("user")
    if not user:
        return RedirectResponse(url="/login", status_code=302)
    history = list(last_messages(100))
    return templates.TemplateResponse(
        "chat.html",
        {"request": request, "user": user, "history": history},
    )


async def send_to_user(username: str, payload: str) -> None:
    for ws in list(active_connections[username]):
        await ws.send_text(payload)


@app.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    user = websocket.session.get("user")
    if not user:
        await websocket.close(code=1008)
        return

    await websocket.accept()
    active_connections[user].add(websocket)

    try:
        while True:
            text = (await websocket.receive_text()).strip()
            if not text:
                continue

            if text.startswith("/w "):
                parts = text.split(" ", 2)
                if len(parts) < 3:
                    await websocket.send_text("[system] Формат: /w username сообщение")
                    continue
                target, body = parts[1], parts[2]
                payload = f"[private] {user} → {target}: {body}"
                save_message(user, body, target)
                await send_to_user(user, payload)
                await send_to_user(target, payload)
            else:
                payload = f"{user}: {text}"
                save_message(user, text)
                for username in list(active_connections.keys()):
                    await send_to_user(username, payload)
    except WebSocketDisconnect:
        active_connections[user].discard(websocket)
        if not active_connections[user]:
            active_connections.pop(user, None)
