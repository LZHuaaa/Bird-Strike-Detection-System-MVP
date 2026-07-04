import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from backend.infrastructure.database.connection import db_session

# Import routers
from backend.api.routes import alerts
from backend.api.routes import legacy
from backend.api.routes import audio

app = FastAPI(
    title="Enhanced Bird Strike Warning API",
    description="AI-powered bird communication analysis and strike prevention",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def db_session_middleware(request: Request, call_next):
    try:
        response = await call_next(request)
        return response
    finally:
        db_session.remove()

# Include all endpoint routers
app.include_router(alerts.router)
app.include_router(legacy.router)
app.include_router(audio.router)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
