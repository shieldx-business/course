from fastapi import APIRouter, Query, HTTPException
from app.db.mongodb import get_db

router = APIRouter()


@router.get("/categories")
async def list_categories():
    db = get_db()
    cats = await db.categories.find().to_list(100)
    return [{"id": c["_id"], **{k: v for k, v in c.items() if k != "_id"}} for c in cats]


@router.get("/categories/{slug}")
async def get_category(slug: str):
    db = get_db()
    cat = await db.categories.find_one({"slug": slug})
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"id": cat["_id"], **{k: v for k, v in cat.items() if k != "_id"}}


@router.get("/courses")
async def list_courses(search: str = "", category: str = ""):
    db = get_db()
    query = {}
    if category:
        query["category_slug"] = category
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
        ]
    courses = await db.courses.find(query).to_list(100)
    return [{"id": c["_id"], **{k: v for k, v in c.items() if k != "_id"}, "syllabus": _public_syllabus(c.get("syllabus", []))} for c in courses]


@router.get("/courses/{slug}")
async def get_course(slug: str):
    db = get_db()
    course = await db.courses.find_one({"slug": slug})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return {
        "id": course["_id"],
        **{k: v for k, v in course.items() if k != "_id"},
        "syllabus": _public_syllabus(course.get("syllabus", [])),
    }


def _public_syllabus(syllabus: list):
    return [{k: v for k, v in lesson.items() if k != "drive_file_id"} for lesson in syllabus]


@router.get("/stats")
async def public_stats():
    db = get_db()
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
        "total_courses": total_courses,
        "total_members": total_members,
        "total_hours": round(total_hours),
        "average_rating": round(avg_rating, 1),
    }
