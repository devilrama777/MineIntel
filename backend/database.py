"""
MineIntel SQLite / SQLAlchemy Database Layer (L3 Persistence)
Provides persistent storage for ingested documents, reports, and metadata.
"""
import json
import logging
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

from sqlalchemy import BigInteger, Column, Integer, String, Text, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session

from backend import config

logger = logging.getLogger("mineintel.database")

# Persistent SQLite database file in backend/data/
DB_FILE = config.DATA_DIR / "mineintel.db"
DB_FILE.parent.mkdir(parents=True, exist_ok=True)

SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_FILE.as_posix()}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


class Document(Base):
    """
    Persistent document entity for all uploaded / ingested evidence files.
    """
    __tablename__ = "documents"

    id = Column(String(128), primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    file_type = Column(String(64), nullable=False, default="application/pdf")
    file_size = Column(Integer, nullable=False, default=0)
    sha256_hash = Column(String(64), nullable=True, index=True)
    raw_path = Column(Text, nullable=False)
    normalized_path = Column(Text, nullable=True)
    status = Column(String(64), nullable=False, default="completed")
    owner_id = Column(String(128), nullable=True, default="LOCAL_OFFICER")
    metadata_json = Column(Text, nullable=True)
    created_at = Column(BigInteger, nullable=False)

    def to_dict(self) -> Dict[str, Any]:
        meta: Dict[str, Any] = {}
        if self.metadata_json:
            try:
                meta = json.loads(self.metadata_json)
            except Exception:
                meta = {}
        return {
            "id": self.id,
            "file_id": self.id,
            "filename": self.filename,
            "name": self.filename,
            "type": self.file_type,
            "file_type": self.file_type,
            "size": self.file_size,
            "file_size": self.file_size,
            "sizeBytes": self.file_size,
            "sha256_hash": self.sha256_hash,
            "raw_path": self.raw_path,
            "normalized_path": self.normalized_path,
            "status": self.status,
            "owner_id": self.owner_id,
            "metadata": meta,
            "created_at": self.created_at,
            "dateModified": time.strftime("%Y-%m-%d", time.localtime(self.created_at / 1000 if self.created_at > 1e11 else self.created_at)),
        }


def get_db():
    """FastAPI dependency to yield a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initializes tables in SQLite database."""
    Base.metadata.create_all(bind=engine)
    logger.info("SQLite database tables initialized at %s", DB_FILE)
