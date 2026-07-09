import bcrypt
from fastapi import HTTPException, Request
from sqlalchemy.orm import Session

import models

DEFAULT_USERNAME = "selva"
DEFAULT_PASSWORD = "selvasathya"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def seed_default_user(db: Session) -> None:
    existing = db.query(models.User).filter(models.User.username == DEFAULT_USERNAME).first()
    if existing:
        return
    db.add(models.User(username=DEFAULT_USERNAME, password_hash=hash_password(DEFAULT_PASSWORD)))
    db.commit()


def authenticate(db: Session, username: str, password: str) -> bool:
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        return False
    return verify_password(password, user.password_hash)


def get_current_user(request: Request) -> str:
    username = request.session.get("user")
    if not username:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return username
