from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from shared.auth import verify_token
import json
import logging

app = FastAPI(title="Dr. Lingua Streaming API")
logger = logging.getLogger("uvicorn.error")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "dr-lingua-streaming"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    try:
        # 1. Wait for auth message
        auth_msg_raw = await websocket.receive_text()
        try:
            auth_msg = json.loads(auth_msg_raw)
        except json.JSONDecodeError:
            logger.error("Invalid JSON received for auth.")
            await websocket.close(code=4001, reason="Expected JSON auth message")
            return
            
        if auth_msg.get("type") != "auth" or not auth_msg.get("token"):
            logger.error(f"Invalid auth message structure: {auth_msg}")
            await websocket.close(code=4001, reason="Invalid auth message structure")
            return
            
        token = auth_msg.get("token")
        
        # 2. Verify token
        try:
            uid = await verify_token(token)
            await websocket.send_json({"type": "auth_success", "uid": uid})
        except ValueError as e:
            logger.error(f"Auth failed: {e}")
            await websocket.close(code=4003, reason="Authentication failed")
            return

        # 3. Message loop
        while True:
            msg_raw = await websocket.receive_text()
            try:
                msg = json.loads(msg_raw)
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "message": "Invalid JSON"})
                continue
                
            msg_type = msg.get("type")
            if msg_type == "ping":
                await websocket.send_json({"type": "pong"})
            elif msg_type == "text":
                content = msg.get("content", "")
                await websocket.send_json({"type": "text_echo", "content": content})
            else:
                await websocket.send_json({"type": "unknown"})
                
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.close(code=1011, reason="Internal server error")
        except RuntimeError:
            pass # Already closed
