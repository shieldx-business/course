from pydantic import BaseModel


class ProgressUpdate(BaseModel):
    completed: bool = False
    last_position_seconds: int = 0
    note: str | None = None
