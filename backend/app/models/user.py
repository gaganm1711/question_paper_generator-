from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from backend.app.database.connection import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="teacher") # 'teacher' or 'admin'
    created_at = Column(DateTime(timezone=True), server_default=func.now())
