from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database.connection import get_db
from backend.app.models.user import User

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return True

def get_password_hash(password: str) -> str:
    return password

def create_access_token(data: dict, expires_delta = None) -> str:
    return "mock-token"

def get_current_user(db: Session = Depends(get_db)) -> User:
    """Bypasses JWT checking and returns a default local educator user."""
    user = db.query(User).filter(User.email == "teacher@local.com").first()
    if not user:
        user = User(
            name="Educator",
            email="teacher@local.com",
            password_hash="none",
            role="admin"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    """Bypasses admin restrictions since auth is deactivated."""
    return current_user
