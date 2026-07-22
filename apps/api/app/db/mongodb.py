import os
from typing import Any
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings


class InMemoryCollection:
    def __init__(self):
        self.data: list[dict] = []

    def find(self, query=None):
        query = query or {}
        results = [d for d in self.data if self._match(d, query)]
        return InMemoryCursor(results)

    async def find_one(self, query=None):
        query = query or {}
        for d in self.data:
            if self._match(d, query):
                return d
        return None

    async def count_documents(self, query=None):
        query = query or {}
        return len([d for d in self.data if self._match(d, query)])

    async def insert_many(self, docs: list[dict]):
        self.data.extend(docs)

    async def insert_one(self, doc: dict):
        self.data.append(doc)

    async def update_one(self, query, update):
        for d in self.data:
            if self._match(d, query):
                if "$set" in update:
                    d.update(update["$set"])
                return

    async def delete_many(self, query=None):
        query = query or {}
        self.data = [d for d in self.data if not self._match(d, query)]

    def _match(self, doc: dict, query: dict) -> bool:
        for key, value in query.items():
            if key == "$or":
                if not any(self._match(doc, clause) for clause in value):
                    return False
                continue
            if isinstance(value, dict):
                if "$regex" in value:
                    import re

                    if not re.search(value["$regex"], str(doc.get(key, "")), re.I):
                        return False
                continue
            if doc.get(key) != value:
                return False
        return True


class InMemoryCursor:
    def __init__(self, data: list[dict]):
        self.data = data

    async def to_list(self, length=None):
        return self.data

    def sort(self, *args, **kwargs):
        return self


class InMemoryDB:
    def __init__(self):
        self._collections: dict[str, InMemoryCollection] = {}

    def __getitem__(self, name: str):
        if name not in self._collections:
            self._collections[name] = InMemoryCollection()
        return self._collections[name]

    def __getattr__(self, name: str):
        return self[name]


client: AsyncIOMotorClient | None = None
memory_db: InMemoryDB | None = None


def get_db():
    global memory_db
    if settings.mongodb_uri.startswith("memory:"):
        if memory_db is None:
            memory_db = InMemoryDB()
        return memory_db

    global client
    if client is None:
        client = AsyncIOMotorClient(settings.mongodb_uri, serverSelectionTimeoutMS=5000)
    return client["ascendly"]


def get_redis():
    try:
        import redis as _redis

        return _redis.from_url(settings.redis_url)
    except Exception:
        return None


async def seed_db():
    db = get_db()
    if await db.categories.count_documents({}) == 0:
        categories = [
            {"_id": "cat-marketing", "name": "Marketing & Advertising", "slug": "marketing", "icon": "briefcase", "course_count": 240},
            {"_id": "cat-ai", "name": "AI & New Technology", "slug": "ai", "icon": "brain", "course_count": 180},
            {"_id": "cat-programming", "name": "Programming & Software", "slug": "programming", "icon": "code", "course_count": 420},
            {"_id": "cat-design", "name": "Design & Creative", "slug": "design", "icon": "palette", "course_count": 310},
            {"_id": "cat-data", "name": "Data & Analytics", "slug": "data", "icon": "database", "course_count": 260},
            {"_id": "cat-business", "name": "Business & Investment", "slug": "business", "icon": "bar-chart", "course_count": 330},
            {"_id": "cat-career", "name": "Career & Professional Skills", "slug": "career", "icon": "users", "course_count": 190},
        ]
        await db.categories.insert_many(categories)

    if await db.courses.count_documents({}) == 0:
        courses = [
            {
                "_id": "course-excel",
                "category_id": "cat-data",
                "category_slug": "data",
                "category_name": "Data & Analytics",
                "title": "Excel for Busy Professionals",
                "slug": "excel-for-busy-professionals",
                "description": "Learn Excel well enough to run your team's reporting — from core formulas to pivot tables and dashboards.",
                "lesson_count": 12,
                "syllabus": [
                    {"id": "lesson-1", "title": "Course introduction", "order": 1, "duration_seconds": 300},
                    {"id": "lesson-2", "title": "Setting up your workspace", "order": 2, "duration_seconds": 420},
                    {"id": "lesson-3", "title": "Core formulas", "order": 3, "duration_seconds": 540},
                    {"id": "lesson-4", "title": "Pivot tables", "order": 4, "duration_seconds": 600},
                    {"id": "lesson-5", "title": "Charts and dashboards", "order": 5, "duration_seconds": 780},
                ],
                "outcome": [
                    "Build a rolling 12-month forecast in Excel",
                    "Create pivot tables that update automatically",
                    "Design dashboards your manager can read",
                    "Use lookups without memorizing every formula",
                ],
            },
            {
                "_id": "course-powerbi",
                "category_id": "cat-data",
                "category_slug": "data",
                "category_name": "Data & Analytics",
                "title": "Power BI Fundamentals",
                "slug": "power-bi-fundamentals",
                "description": "Go from first dataset to team report. Model, visualize, and share insights with Power BI.",
                "lesson_count": 14,
                "syllabus": [
                    {"id": "pb-1", "title": "Power BI overview", "order": 1, "duration_seconds": 360},
                    {"id": "pb-2", "title": "Data modeling", "order": 2, "duration_seconds": 480},
                    {"id": "pb-3", "title": "DAX essentials", "order": 3, "duration_seconds": 540},
                ],
                "outcome": [
                    "Model a star schema from messy source data",
                    "Write DAX measures that answer business questions",
                    "Publish dashboards to Power BI Service",
                ],
            },
            {
                "_id": "course-leadership",
                "category_id": "cat-career",
                "category_slug": "career",
                "category_name": "Career & Professional Skills",
                "title": "Leadership for New Managers",
                "slug": "leadership-for-new-managers",
                "description": "The practical management skills nobody teaches you when you first get promoted.",
                "lesson_count": 10,
                "syllabus": [
                    {"id": "lm-1", "title": "From peer to manager", "order": 1, "duration_seconds": 300},
                    {"id": "lm-2", "title": "One-on-ones that work", "order": 2, "duration_seconds": 420},
                ],
                "outcome": [
                    "Run effective one-on-ones",
                    "Delegate without micromanaging",
                    "Give feedback people actually act on",
                ],
            },
        ]
        await db.courses.insert_many(courses)

    if await db.reviews.count_documents({}) == 0:
        reviews = [
            {"_id": "rev-1", "name": "Sarah Lin", "role": "Operations Analyst", "outcome": "I finally understood Power BI well enough to run our team's weekly report.", "quote": "The course is structured exactly how I learn."},
            {"_id": "rev-2", "name": "Marcus Rivera", "role": "Marketing Coordinator", "outcome": "Excel skills that got me noticed for the promotion I wanted.", "quote": "I use what I learned every single day."},
            {"_id": "rev-3", "name": "Priya Shah", "role": "Junior UX Designer", "outcome": "Went from admin work to my first design role in 9 months.", "quote": "The career change path made the difference."},
        ]
        await db.reviews.insert_many(reviews)

    if await db.tiers.count_documents({}) == 0:
        tiers = [
            {"_id": "tier-1mo", "id": "1mo", "label": "Try it out", "price_per_month": 49, "duration_months": 1},
            {"_id": "tier-3mo", "id": "3mo", "label": "For one focused skill", "price_per_month": 39, "duration_months": 3},
            {"_id": "tier-6mo", "id": "6mo", "label": "For a career pivot", "price_per_month": 35, "duration_months": 6},
            {"_id": "tier-12mo", "id": "12mo", "label": "For serious learners", "price_per_month": 29, "duration_months": 12, "recommended": True},
            {"_id": "tier-lifetime", "id": "lifetime", "label": "Pay once, learn forever", "price_per_month": 999, "duration_months": 999, "badge": "Limited seats"},
        ]
        await db.tiers.insert_many(tiers)
