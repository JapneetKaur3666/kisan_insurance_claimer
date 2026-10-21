"""
DATABASE MODULE
===============
INTERVIEW POINT: Why SQLAlchemy ORM?
- Write Python code instead of SQL
- Type-safe database operations
- Automatic migrations
- Works with multiple databases (SQLite, PostgreSQL, MySQL)
- Prevents SQL injection

INTERVIEW POINT: Why async?
- Non-blocking I/O operations
- Handle multiple requests simultaneously
- Better performance under load
"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.config import settings
import logging

logger = logging.getLogger(__name__)

# INTERVIEW POINT: What is an Engine?
# Engine manages database connections - creates, pools, and closes them
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,  # Log all SQL queries when DEBUG=True
    future=True,
    connect_args={"check_same_thread": False}  # SQLite specific
)

# INTERVIEW POINT: What is SessionLocal?
# Session represents a "conversation" with the database
# Like opening a connection, doing work, then closing it
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,  # Keep objects accessible after commit
    autocommit=False,
    autoflush=False
)

# INTERVIEW POINT: What is Base?
# Base class for all database models
# Classes inheriting from Base become database tables
Base = declarative_base()


# INTERVIEW POINT: Dependency Injection pattern
async def get_db():
    """
    Database session generator for FastAPI dependency injection
    
    INTERVIEW QUESTION: What is dependency injection?
    Answer: Pattern where dependencies (like DB session) are provided
    to functions rather than created inside them.
    
    Benefits:
    - Easy testing (inject mock DB)
    - Resource management (auto cleanup)
    - Single responsibility principle
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session  # Provide session to route
            await session.commit()  # Commit if successful
        except Exception as e:
            await session.rollback()  # Rollback on error
            logger.error(f"Database error: {e}")
            raise
        finally:
            await session.close()  # Always close connection


async def init_db():
    """
    Initialize database - create all tables
    
    INTERVIEW POINT: Why separate init function?
    - Run once at startup
    - Can be used in tests
    - Idempotent (safe to run multiple times)
    """
    async with engine.begin() as conn:
        # Create all tables defined in models
        await conn.run_sync(Base.metadata.create_all)
        logger.info("✅ Database initialized successfully")


async def close_db():
    """
    Cleanup database connections
    Called when application shuts down
    """
    await engine.dispose()
    logger.info("🔒 Database connections closed")
