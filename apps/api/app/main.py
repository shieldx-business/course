from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.mongodb import seed_db
from app.api.v1 import courses, auth, subscriptions, reviews, admin, stream, progress, contact


@asynccontextmanager
async def lifespan(app: FastAPI):
    await seed_db()
    yield


app = FastAPI(title="Ascendly API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(courses.router, prefix="/api/v1", tags=["courses"])
app.include_router(subscriptions.router, prefix="/api/v1", tags=["subscriptions"])
app.include_router(reviews.router, prefix="/api/v1", tags=["reviews"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["admin"])
app.include_router(stream.router, prefix="/api/v1", tags=["stream"])
app.include_router(progress.router, prefix="/api/v1", tags=["progress"])
app.include_router(contact.router, prefix="/api/v1", tags=["contact"])


@app.get("/api/v1/health")
async def health():
    return {"status": "ok"}
