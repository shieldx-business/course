from typing import List
from pydantic import BaseModel, Field


class AttachmentIn(BaseModel):
    title: str
    url: str


class LessonIn(BaseModel):
    id: str | None = None
    title: str
    order: int
    duration_seconds: int = 0
    drive_file_id: str | None = None
    attachments: List[AttachmentIn] = Field(default_factory=list)


class CourseIn(BaseModel):
    category_id: str
    title: str
    slug: str
    description: str
    thumbnail_url: str | None = None
    lesson_count: int = 0
    syllabus: List[LessonIn] = Field(default_factory=list)
    outcome: List[str] = Field(default_factory=list)


class DriveMapIn(BaseModel):
    drive_file_id: str
