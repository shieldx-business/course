import json
from fastapi import APIRouter, Query, HTTPException
from app.db.mongodb import get_db
from app.core.config import settings
from app.services import cache as cache_service

router = APIRouter()


def _course_to_public(course: dict) -> dict:
    public = {k: v for k, v in course.items() if k != "_id"}
    public["id"] = course["_id"]
    public["syllabus"] = _public_syllabus(course.get("syllabus", []))
    return public


def _public_syllabus(syllabus: list):
    return [{k: v for k, v in lesson.items() if k != "drive_file_id"} for lesson in syllabus]


@router.get("/categories")
async def list_categories():
    db = get_db()

    async def loader():
        cats = await db.categories.find().to_list(100)
        return [{"id": c["_id"], **{k: v for k, v in c.items() if k != "_id"}} for c in cats]

    return await cache_service.cached_json("categories:all", loader, ttl=60)


@router.get("/categories/{slug}")
async def get_category(slug: str):
    db = get_db()

    async def loader():
        cat = await db.categories.find_one({"slug": slug})
        if not cat:
            raise HTTPException(status_code=404, detail="Category not found")
        return {"id": cat["_id"], **{k: v for k, v in cat.items() if k != "_id"}}

    return await cache_service.cached_json(f"category:{slug}", loader, ttl=60)


@router.get("/courses")
async def list_courses(search: str = "", category: str = ""):
    db = get_db()
    cache_key = f"courses:search={search}:category={category}"

    async def loader():
        query = {}
        if category:
            query["category_slug"] = category
        if search:
            query["$or"] = [
                {"title": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}},
            ]
        courses = await db.courses.find(query).to_list(100)
        return [_course_to_public(c) for c in courses]

    return await cache_service.cached_json(cache_key, loader, ttl=60)


@router.get("/courses/{slug}")
async def get_course(slug: str):
    db = get_db()

    async def loader():
        course = await db.courses.find_one({"slug": slug})
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        return _course_to_public(course)

    return await cache_service.cached_json(f"course:{slug}", loader, ttl=60)


@router.get("/stats")
async def public_stats():
    db = get_db()

    async def loader():
        courses = await db.courses.find().to_list(1000)
        users = await db.users.find().to_list(10000)
        reviews = await db.reviews.find().to_list(1000)

        total_courses = len(courses)
        total_members = len(users)
        total_hours = sum(
            sum(lesson.get("duration_seconds", 0) for lesson in course.get("syllabus", []))
            for course in courses
        ) / 3600
        avg_rating = (
            sum(r.get("rating", 0) for r in reviews) / len(reviews)
            if reviews else 0
        )

        return {
            "total_courses": max(total_courses, settings.public_stats_min_courses),
            "total_members": max(total_members, settings.public_stats_min_members),
            "total_hours": max(round(total_hours), settings.public_stats_min_hours),
            "average_rating": max(round(avg_rating, 1), settings.public_stats_min_rating),
        }

    return await cache_service.cached_json("stats:public", loader, ttl=60)
