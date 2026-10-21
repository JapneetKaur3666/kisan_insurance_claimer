"""
FastAPI Main Application
Kisan Insurance Claim Tracker Backend
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
from datetime import datetime

from app.config import get_settings
from app.database import init_db
from app.routes import claims, documents
from app.utils.seed_data import seed_database

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup and shutdown events
    Initializes database and seeds test data
    """
    logger.info("🚀 Starting Kisan Insurance Portal API")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Database: {settings.DATABASE_URL}")
    
    # Initialize database
    await init_db()
    logger.info("✅ Database initialized")
    
    # Seed test data
    try:
        await seed_database()
        logger.info("✅ Test data seeded (6 sample claims)")
    except Exception as e:
        logger.warning(f"⚠️ Seed data already exists or error: {e}")
    
    logger.info("✅ Application startup complete")
    
    yield
    
    # Shutdown
    logger.info("👋 Shutting down Kisan Insurance Portal API")


# Create FastAPI app
app = FastAPI(
    title="Kisan Insurance Claim Tracker API",
    description="""
    Backend API for Crop Insurance Claim Tracking System
    
    ## Features
    - 🔍 Claim search and retrieval
    - 🎤 Voice-optimized endpoints for low-literacy users
    - 📄 Document management
    - 📊 Timeline tracking
    - ✅ Crop-season validation
    - 🌐 Multi-language support
    
    ## Test Application Numbers
    - **12345** - Approved & Paid (Happy path)
    - **67890** - Under Review with missing documents
    - **11223** - Action Required (wrong season)
    - **44556** - Approved but payment pending
    - **78901** - Rejected claim
    - **33445** - Field verification scheduled
    """,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(claims.router)
app.include_router(documents.router)

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle unexpected errors gracefully"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "Internal server error",
            "error": str(exc) if settings.DEBUG else "An unexpected error occurred"
        }
    )


# Health check endpoint
@app.get("/health", tags=["System"])
async def health_check():
    """
    Health check endpoint
    Returns API status and version
    """
    return {
        "status": "healthy",
        "service": "Kisan Insurance Claim Tracker API",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "environment": settings.ENVIRONMENT
    }


# Root endpoint
@app.get("/", tags=["System"])
async def root():
    """
    Root endpoint with API information
    """
    return {
        "message": "Kisan Insurance Claim Tracker API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
        "endpoints": {
            "claims": "/api/claims",
            "documents": "/api/documents"
        }
    }


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests"""
    start_time = datetime.utcnow()
    
    # Log request
    logger.info(f"→ {request.method} {request.url.path}")
    
    # Process request
    response = await call_next(request)
    
    # Log response
    duration = (datetime.utcnow() - start_time).total_seconds()
    logger.info(f"← {request.method} {request.url.path} - {response.status_code} ({duration:.3f}s)")
    
    return response


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
