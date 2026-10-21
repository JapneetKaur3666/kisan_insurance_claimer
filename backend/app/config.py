"""
CONFIGURATION MODULE
====================
INTERVIEW POINT: Why separate config file?
- Environment-specific settings (dev, prod)
- Sensitive data (API keys, secrets) from .env
- Type-safe configuration with Pydantic
- Single source of truth for all settings
"""

from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    """
    Application settings loaded from environment variables
    
    INTERVIEW POINT: Pydantic BaseSettings automatically:
    - Loads from .env file
    - Validates types
    - Provides defaults
    - Raises errors for required missing values
    """
    
    # Application
    APP_NAME: str = "Kisan Insurance API"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Server
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    
    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./kisan_insurance.db"
    
    # CORS - Cross-Origin Resource Sharing
    CORS_ORIGINS: str = "http://localhost:5500,http://127.0.0.1:5500,file://"
    
    # CORS - Cross-Origin Resource Sharing
    # INTERVIEW POINT: Why CORS needed?
    # Browser security blocks requests from different origins
    # Our frontend (file://) needs to call backend (http://localhost:8000)
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:8000",
        "file://",  # For local HTML files
        "*"  # Allow all for development (remove in production!)
    ]
    
    # API Settings
    API_PREFIX: str = "/api"
    
    # Pagination
    DEFAULT_PAGE_SIZE: int = 10
    MAX_PAGE_SIZE: int = 100
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 100
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS_ORIGINS string into list"""
        if isinstance(self.CORS_ORIGINS, str):
            return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
        return self.ALLOWED_ORIGINS
    
    class Config:
        # INTERVIEW POINT: Load from .env file
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # Ignore extra fields from .env that aren't in the model

# Create single instance
# INTERVIEW POINT: Singleton pattern - one instance shared across app
settings = Settings()


def get_settings() -> Settings:
    """
    Dependency injection for settings
    Makes testing easier by allowing settings override
    """
    return settings
