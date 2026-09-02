# FastAPI application entry point for the CodeLens backend service #
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import routes

# Initialize the FastAPI application
app = FastAPI(
    title="CodeLens API",
    description="Backend engine for tracing and debugging code execution visually",
    version="1.0.0"
)

# Configure Cross-Origin Resource Sharing (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],         # In development, allows all frontend origins
    allow_credentials=True,
    allow_methods=["*"],         # Allows GET, POST, PUT, DELETE, OPTIONS, etc.
    allow_headers=["*"],         # Allows all headers (JSON content types, tokens)
)

# Mount the API routes
app.include_router(routes.router)

# Root health check endpoint
@app.get("/")
def health_check():
    return {"status": "online", "service": "CodeLens API"}

# Local development server launcher
if __name__ == "__main__":
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)