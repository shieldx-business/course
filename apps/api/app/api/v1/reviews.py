from fastapi import APIRouter, Query
from app.db.mongodb import get_db

router = APIRouter()


@router.get("/reviews")
async def list_reviews(
    job_title: str = Query(default=""),
    category: str = Query(default=""),
    search: str = Query(default=""),
):
    db = get_db()
    clauses = []
    if job_title:
        clauses.append({"job_title": {"$regex": job_title, "$options": "i"}})
    if category:
        clauses.append({
            "$or": [
                {"category_name": {"$regex": category, "$options": "i"}},
                {"category_id": {"$regex": category, "$options": "i"}},
            ]
        })
    if search:
        clauses.append({
            "$or": [
                {"name": {"$regex": search, "$options": "i"}},
                {"comment": {"$regex": search, "$options": "i"}},
                {"outcome": {"$regex": search, "$options": "i"}},
            ]
        })
    query = {"$and": clauses} if len(clauses) > 1 else (clauses[0] if clauses else {})
    reviews = await db.reviews.find(query).to_list(100)
    return [{"id": r["_id"], **{k: v for k, v in r.items() if k != "_id"}} for r in reviews]
