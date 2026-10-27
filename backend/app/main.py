"""
Blu Visual Teacher — FastAPI Backend Entry Point.
Person 2 Owned.

Provides the minimal reliable FastAPI application:
- Configures CORS for local frontend (http://localhost:5173).
- Exposes root status endpoint.
- Prepared for router inclusion in subsequent phases.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.jobs import router as jobs_router
from backend.app.api.lessons import router as lessons_router

app = FastAPI(
    title="Blu Visual Teacher API",
    version="1.0.0",
    description="Offline-first educational lesson video generator for low-connectivity schools.",
)

# CORS configuration allowing local Vite development server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(lessons_router, prefix="/api")
app.include_router(jobs_router, prefix="/api")
# Root-level aliases for direct or proxy-rewritten endpoints
app.include_router(jobs_router)
app.include_router(lessons_router)


@app.get("/", tags=["General"])
def root_status():
    """Returns basic service information and running status."""
    return {
        "app": "Blu Visual Teacher Backend API",
        "version": "1.0.0",
        "status": "running",
        "docs_url": "/docs",
    }
