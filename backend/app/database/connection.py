from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from backend.app.config.settings import settings

DATABASE_URL = settings.DATABASE_URL
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+pg8000://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+pg8000://", 1)
IS_SQLITE = DATABASE_URL.startswith("sqlite")

# Configure database engine arguments
connect_args = {}
engine_kwargs = {}
if IS_SQLITE:
    connect_args = {"check_same_thread": False}
else:
    from sqlalchemy.pool import NullPool
    engine_kwargs["poolclass"] = NullPool
    engine_kwargs["pool_pre_ping"] = True

engine = create_engine(DATABASE_URL, connect_args=connect_args, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Helper type for pgvector / SQLite fallback
if IS_SQLITE:
    from sqlalchemy.types import TypeDecorator, TEXT
    import json

    class SQLiteVector(TypeDecorator):
        impl = TEXT
        cache_ok = True

        def process_bind_param(self, value, dialect):
            if value is not None:
                if isinstance(value, list):
                    return json.dumps(value)
                return json.dumps(list(value))
            return None

        def process_result_value(self, value, dialect):
            if value is not None:
                return json.loads(value)
            return None

    EmbeddingType = SQLiteVector
else:
    from pgvector.sqlalchemy import Vector
    EmbeddingType = Vector(384)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
