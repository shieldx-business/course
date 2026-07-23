from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from app.core.deps import require_admin
from app.models import (
    AttachmentIn,
    CourseIn,
    CouponIn,
    DriveMapIn,
    LessonIn,
    SubscriptionOverrideIn,
    UserUpdateIn,
)
from app.core.config import settings
from app.db.mongodb import get_db
from app.services import ai
from app.services import payment as payment_service
from app.services import drive as drive_service
from app.services import cache as cache_service

router = APIRouter()


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
        "model": revenue.get("model", "fallback"),
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
        "syllabus": [{"id": s.id or f"{course_id}-lesson-{i+1}", **s.model_dump(exclude={"id"})} for i, s in enumerate(body.syllabus)],
        "outcome": body.outcome,
    }
    await db.courses.insert_one(course)
    await cache_service.invalidate_public_course_cache(slug=body.slug, category_slug=cat["slug"])
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
    existing = await db.courses.find_one({"_id": course_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Course not found")

    cat = await db.categories.find_one({"_id": body.category_id})
    if not cat:
        raise HTTPException(status_code=400, detail="Category not found")

    old_lessons = {lesson["id"]: lesson for lesson in existing.get("syllabus", [])}

    def _merge_lesson(i: int, lesson_in: LessonIn):
        lesson_id = lesson_in.id
        if lesson_id and lesson_id in old_lessons:
            old = old_lessons[lesson_id]
            updates = lesson_in.model_dump(exclude={"id"}, exclude_unset=True)
            merged = {**old, **updates, "id": lesson_id}
            return merged
        return {
            "id": lesson_in.id or f"{course_id}-lesson-{i+1}",
            **lesson_in.model_dump(exclude={"id"}),
        }

    syllabus = [_merge_lesson(i, s) for i, s in enumerate(body.syllabus)]

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
                "lesson_count": len(syllabus),
                "syllabus": syllabus,
                "outcome": body.outcome,
            }
        },
    )
    if existing["slug"] != body.slug:
        await cache_service.invalidate(f"course:{existing['slug']}")
    await cache_service.invalidate_public_course_cache(slug=body.slug, category_slug=cat["slug"])
    course = await db.courses.find_one({"_id": course_id})
    return {"id": course["_id"], **{k: v for k, v in course.items() if k != "_id"}}


@router.delete("/courses/{course_id}", dependencies=[Depends(require_admin)])
async def delete_course(course_id: str):
    db = get_db()
    course = await db.courses.find_one({"_id": course_id})
    if course:
        await cache_service.invalidate_public_course_cache(slug=course.get("slug"), category_slug=course.get("category_slug"))
    await db.courses.delete_many({"_id": course_id})
    return {"deleted": True}


@router.put("/courses/{course_id}/lessons/{lesson_id}/drive", dependencies=[Depends(require_admin)])
async def map_lesson_drive_file(course_id: str, lesson_id: str, body: DriveMapIn):
    db = get_db()
    course = await db.courses.find_one({"_id": course_id})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    updated = False
    syllabus = course.get("syllabus", [])
    for lesson in syllabus:
        if lesson["id"] == lesson_id:
            lesson["drive_file_id"] = body.drive_file_id
            updated = True
            break

    if not updated:
        raise HTTPException(status_code=404, detail="Lesson not found")

    await db.courses.update_one({"_id": course_id}, {"$set": {"syllabus": syllabus}})
    await cache_service.invalidate_public_course_cache(slug=course.get("slug"), category_slug=course.get("category_slug"))
    return {"lesson_id": lesson_id, "drive_file_id": body.drive_file_id}


@router.get("/drive/files", dependencies=[Depends(require_admin)])
async def list_drive_files():
    service = drive_service.get_drive_service()
    if not service:
        return {"configured": False, "files": []}

    folder_id = settings.drive_root_folder_id
    query = f"'{folder_id}' in parents and mimeType contains 'video/'" if folder_id else "mimeType contains 'video/'"
    results = service.files().list(q=query, pageSize=50, fields="files(id,name)").execute()
    files = results.get("files", [])
    return {"configured": True, "files": [{"id": f["id"], "name": f["name"]} for f in files]}


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
    await cache_service.invalidate_public_course_cache(slug=course.get("slug"), category_slug=course.get("category_slug"))
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
    await cache_service.invalidate_public_course_cache(slug=course.get("slug"), category_slug=course.get("category_slug"))
    return {"deleted": True}


@router.get("/users", dependencies=[Depends(require_admin)])
async def list_users():
    db = get_db()
    users = await db.users.find().to_list(1000)
    return [{"id": u["_id"], "email": u["email"], "name": u.get("name", ""), "role": u["role"], "phone_verified": u.get("phone_verified", False)} for u in users]


@router.get("/users/{user_id}", dependencies=[Depends(require_admin)])
async def get_user(user_id: str):
    db = get_db()
    user = await db.users.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    sub = await db.subscriptions.find_one({"user_id": user_id, "status": "active"})
    return {
        "id": user["_id"],
        "email": user["email"],
        "name": user.get("name", ""),
        "role": user["role"],
        "phone_verified": user.get("phone_verified", False),
        "subscription": sub,
    }


@router.put("/users/{user_id}", dependencies=[Depends(require_admin)])
async def update_user(user_id: str, body: UserUpdateIn):
    db = get_db()
    user = await db.users.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    updates = {}
    if body.name is not None:
        updates["name"] = body.name
    if body.role is not None:
        updates["role"] = body.role
    if updates:
        await db.users.update_one({"_id": user_id}, {"$set": updates})
    updated = await db.users.find_one({"_id": user_id})
    return {"id": updated["_id"], "email": updated["email"], "name": updated.get("name", ""), "role": updated["role"]}


@router.post("/users/{user_id}/subscription", dependencies=[Depends(require_admin)])
async def override_subscription(user_id: str, body: SubscriptionOverrideIn):
    db = get_db()
    user = await db.users.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    tier = await db.tiers.find_one({"_id": body.tier_id}) or await db.tiers.find_one({"id": body.tier_id})
    if not tier:
        raise HTTPException(status_code=404, detail="Tier not found")

    # Cancel any active subscription
    await db.subscriptions.update_many({"user_id": user_id, "status": "active"}, {"$set": {"status": "canceled", "updated_at": datetime.now(timezone.utc).isoformat()}})

    now = datetime.now(timezone.utc)
    if body.ends_at:
        ends_at = body.ends_at
    elif body.duration_months is not None:
        ends_at = (now + timedelta(days=30 * body.duration_months)).isoformat()
    else:
        ends_at = (now + timedelta(days=30)).isoformat()

    sub_id = f"sub-{user_id}-{now.timestamp()}"
    await db.subscriptions.insert_one({
        "_id": sub_id,
        "user_id": user_id,
        "tier": tier["id"],
        "status": body.status,
        "starts_at": now.isoformat(),
        "ends_at": ends_at,
    })
    return {"subscription_id": sub_id, "status": body.status, "ends_at": ends_at}


@router.delete("/users/{user_id}/subscription", dependencies=[Depends(require_admin)])
async def cancel_user_subscription(user_id: str):
    db = get_db()
    result = await db.subscriptions.update_many(
        {"user_id": user_id, "status": "active"},
        {"$set": {"status": "canceled", "ends_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"canceled": result}


@router.get("/orders", dependencies=[Depends(require_admin)])
async def list_orders():
    db = get_db()
    orders = await db.orders.find().to_list(1000)
    return [{"id": o["_id"], **{k: v for k, v in o.items() if k != "_id"}} for o in orders]


@router.post("/orders/{order_id}/refund", dependencies=[Depends(require_admin)])
async def refund_order(order_id: str):
    db = get_db()
    order = await db.orders.find_one({"_id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.get("payment_status") == "refunded":
        raise HTTPException(status_code=400, detail="Order already refunded")

    # Attempt provider refund
    provider = order.get("payment_provider")
    external_id = order.get("external_id")
    refund_error = None
    if provider == "stripe" and external_id and settings.stripe_secret_key:
        try:
            payment_service.refund_stripe(external_id)
        except Exception as e:
            refund_error = str(e)
    elif provider == "paypal" and external_id and settings.paypal_client_id:
        try:
            await payment_service.refund_paypal(external_id)
        except Exception as e:
            refund_error = str(e)

    now = datetime.now(timezone.utc).isoformat()
    await db.orders.update_one(
        {"_id": order_id},
        {"$set": {"payment_status": "refunded", "refunded_at": now, "refund_error": refund_error}}
    )

    if order.get("subscription_id"):
        await db.subscriptions.update_one(
            {"_id": order["subscription_id"]},
            {"$set": {"status": "canceled", "ends_at": now, "updated_at": now}}
        )

    return {"refunded": True, "order_id": order_id, "refund_error": refund_error}


@router.get("/coupons", dependencies=[Depends(require_admin)])
async def list_coupons():
    db = get_db()
    coupons = await db.coupons.find().to_list(1000)
    return [{"id": c["_id"], **{k: v for k, v in c.items() if k != "_id"}} for c in coupons]


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
