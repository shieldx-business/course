from pydantic import BaseModel


class ContactIn(BaseModel):
    name: str
    email: str
    subject: str
    message: str
