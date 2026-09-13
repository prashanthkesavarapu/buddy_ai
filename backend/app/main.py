from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.analysis import router as analysis_router


app = FastAPI(
    title="Buddy AI",
    description="AI-powered intelligent assistant",
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://buddy-ai.prashanthkesavarapu.workers.dev",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Source-Filename"],
)


app.include_router(analysis_router)


@app.get("/")
def root():
    return {
        "message": "Buddy AI API is running!"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }