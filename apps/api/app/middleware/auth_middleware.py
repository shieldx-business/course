from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.security import verify_token
from app.db.mongodb import get_db

security = HTTPBearer(auto_error=False)


def token_from_request(request: Request) -> str | None:
    if credentials := request.headers.get("authorization"):
        scheme, _, token = credentials.partition(" ")
        if scheme.lower() == "bearer" and token:
            return token
    return request.cookies.get("access_token")


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
):
    token = None
    if credentials:
        token = credentials.credentials
    if not token:
        token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
    payload = verify_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    db = get_db()
    user = await db.users.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return {
        "id": user["_id"],
        "email": user["email"],
        "name": user.get("name") or "",
        "role": user["role"],
        "phone": user.get("phone"),
        "phone_verified": user.get("phone_verified", False),
        "trial_active": user.get("trial_active", False),
        "trial_expires": user.get("trial_expires"),
    }
