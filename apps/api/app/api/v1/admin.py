from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from app.core.deps import require_admin
from app.db.mongodb import get_db
from app.services import ai

router = APIRouter()


class LessonIn(BaseModel):
    title: str
    order: int
    duration_seconds: int
    drive_file_id: str | None = None


class CourseIn(BaseModel):
    category_id: str
    title: str
    slug: str
    description: str
    syllabus: List[LessonIn] = Field(default_factory=list)
    outcome: List[str] = Field(default_factory=list)


@router.get("/dashboard", dependencies=[Depends(require_admin)])
async def dashboard_kpis():
    db = get_db()
    total_users = await db.users.count_documents({})
    active_subs = await db.subscriptions.count_documents({"status": "active"})
    total_courses = await db.courses.count_documents({})
    total_lessons = sum(len(c.get("syllabus", [])) for c in await db.courses.find().to_list(1000))
    orders = await db.orders.find().to_list(10000)
    total_revenue = sum(o.get("amount", 0) for o in orders)

    return {
        "total_members": total_users,
        "active_subscriptions": active_subs,
        "total_courses": total_courses,
        "total_lessons": total_lessons,
        "total_revenue": round(total_revenue, 2),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/analytics/summary", dependencies=[Depends(require_admin)])
async def analytics_summary():
    db = get_db()
    users = await db.users.find().to_list(10000)
    progress = await db.progress.find().to_list(10000)
    subscriptions = await db.subscriptions.find().to_list(10000)
    courses = await db.courses.find().to_list(10000)
    orders = await db.orders.find().to_list(10000)

    metrics = ai.build_metrics(users, progress, subscriptions, courses, orders)
    llm = ai.summarize_with_llm(metrics)

    return {
        "segment": metrics["segment"],
        "churn_risk_users": metrics["churn_risk_users"],
        "active_subscriptions": metrics["active_subscriptions"],
        "top_category": metrics["top_category"],
        "recent_30_day_revenue": metrics["recent_30_day_revenue"],
        "llm_summary": llm["summary"],
        "llm_source": llm["source"],
        "recommendation": "Offer a 3-day extension to users who completed 2+ lessons then paused.",
        "content_gap": f"Category with most courses: {metrics['top_category']} ({metrics['top_category_count']} courses).",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/analytics/forecast", dependencies=[Depends(require_admin)])
async def analytics_forecast():
    db = get_db()
    orders = await db.orders.find().to_list(10000)
    progress = await db.progress.find().to_list(10000)
    subscriptions = await db.subscriptions.find().to_list(10000)

    revenue = ai.forecast_revenue(orders, 30)
    subs = ai.forecast_new_subscriptions(orders, 50.0, 30)
    churn = ai.forecast_churn(progress, subscriptions)

    return {
        "next_30_days": {
            "predicted_revenue": revenue["predicted_revenue"],
            "predicted_new_subscriptions": subs["predicted_new_subscriptions"],
            "predicted_churn_rate": churn["predicted_churn_rate"],
            "confidence": revenue["confidence"],
        },
        "churn_risk_users": churn["churn_risk_users"],
        "note": revenue["note"],
    }


@router.get("/courses", dependencies=[Depends(require_admin)])
async def list_courses_admin():
    db = get_db()
    courses = await db.courses.find().to_list(1000)
    return [{"id": c["_id"], **{k: v for k, v in c.items() if k != "_id"}} for c in courses]


@router.post("/courses", dependencies=[Depends(require_admin)])
async def create_course(body: CourseIn):
    db = get_db()
    cat = await db.categories.find_one({"_id": body.category_id})
    if not cat:
        raise HTTPException(status_code=400, detail="Category not found")

    course_id = f"course-{body.slug}"
    if await db.courses.find_one({"_id": course_id}):
        raise HTTPException(status_code=400, detail="Course slug already exists")

    course = {
        "_id": course_id,
        "category_id": body.category_id,
        "category_slug": cat["slug"],
        "category_name": cat["name"],
        "title": body.title,
        "slug": body.slug,
        "description": body.description,
        "lesson_count": len(body.syllabus),
        "syllabus": [{"id": f"{course_id}-lesson-{i+1}", **s.model_dump()} for i, s in enumerate(body.syllabus)],
        "outcome": body.outcome,
    }
    await db.courses.insert_one(course)
    return {"id": course["_id"], **{k: v for k, v in course.items() if k != "_id"}}


@router.get("/courses/{course_id}", dependencies=[Depends(require_admin)])
async def get_course_admin(course_id: str):
    db = get_db()
    course = await db.courses.find_one({"_id": course_id})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return {"id": course["_id"], **{k: v for k, v in course.items() if k != "_id"}}


@router.put("/courses/{course_id}", dependencies=[Depends(require_admin)])
async def update_course(course_id: str, body: CourseIn):
    db = get_db()
    cat = await db.categories.find_one({"_id": body.category_id})
    if not cat:
        raise HTTPException(status_code=400, detail="Category not found")

    await db.courses.update_one(
        {"_id": course_id},
        {
            "$set": {
                "category_id": body.category_id,
                "category_slug": cat["slug"],
                "category_name": cat["name"],
                "title": body.title,
                "slug": body.slug,
                "description": body.description,
                "lesson_count": len(body.syllabus),
                "syllabus": [{"id": f"{course_id}-lesson-{i+1}", **s.model_dump()} for i, s in enumerate(body.syllabus)],
                "outcome": body.outcome,
            }
        },
    )
    course = await db.courses.find_one({"_id": course_id})
    return {"id": course["_id"], **{k: v for k, v in course.items() if k != "_id"}}


@router.delete("/courses/{course_id}", dependencies=[Depends(require_admin)])
async def delete_course(course_id: str):
    db = get_db()
    await db.courses.delete_many({"_id": course_id})
    return {"deleted": True}


@router.post("/courses/{course_id}/lessons", dependencies=[Depends(require_admin)])
async def add_lesson(course_id: str, body: LessonIn):
    db = get_db()
    course = await db.courses.find_one({"_id": course_id})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    lesson = {
        "id": f"{course_id}-lesson-{len(course['syllabus']) + 1}",
        **body.model_dump(),
    }
    course["syllabus"].append(lesson)
    course["lesson_count"] = len(course["syllabus"])
    await db.courses.update_one({"_id": course_id}, {"$set": {"syllabus": course["syllabus"], "lesson_count": course["lesson_count"]}})
    return lesson


@router.delete("/courses/{course_id}/lessons/{lesson_id}", dependencies=[Depends(require_admin)])
async def delete_lesson(course_id: str, lesson_id: str):
    db = get_db()
    course = await db.courses.find_one({"_id": course_id})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    course["syllabus"] = [l for l in course["syllabus"] if l["id"] != lesson_id]
    course["lesson_count"] = len(course["syllabus"])
    await db.courses.update_one({"_id": course_id}, {"$set": {"syllabus": course["syllabus"], "lesson_count": course["lesson_count"]}})
    return {"deleted": True}


@router.get("/users", dependencies=[Depends(require_admin)])
async def list_users():
    db = get_db()
    users = await db.users.find().to_list(1000)
    return [{"id": u["_id"], "email": u["email"], "role": u["role"], "phone_verified": u.get("phone_verified", False)} for u in users]


@router.get("/orders", dependencies=[Depends(require_admin)])
async def list_orders():
    db = get_db()
    orders = await db.orders.find().to_list(1000)
    return [{"id": o["_id"], **{k: v for k, v in o.items() if k != "_id"}} for o in orders]


@router.get("/coupons", dependencies=[Depends(require_admin)])
async def list_coupons():
    db = get_db()
    coupons = await db.coupons.find().to_list(1000)
    return [{"id": c["_id"], **{k: v for k, v in c.items() if k != "_id"}} for c in coupons]


class CouponIn(BaseModel):
    code: str
    discount_type: str = "percent"
    discount_value: float
    max_uses: int | None = None
    expires_at: str | None = None


@router.post("/coupons", dependencies=[Depends(require_admin)])
async def create_coupon(body: CouponIn):
    db = get_db()
    coupon_id = f"coupon-{body.code.upper()}"
    if await db.coupons.find_one({"_id": coupon_id}):
        raise HTTPException(status_code=400, detail="Coupon code already exists")
    coupon = {
        "_id": coupon_id,
        "code": body.code.upper(),
        "discount_type": body.discount_type,
        "discount_value": body.discount_value,
        "max_uses": body.max_uses,
        "used_count": 0,
        "expires_at": body.expires_at,
    }
    await db.coupons.insert_one(coupon)
    return {"id": coupon["_id"], **{k: v for k, v in coupon.items() if k != "_id"}}


@router.delete("/coupons/{coupon_id}", dependencies=[Depends(require_admin)])
async def delete_coupon(coupon_id: str):
    db = get_db()
    await db.coupons.delete_many({"_id": coupon_id})
    return {"deleted": True}
