"""
CLAIM SCHEMAS
=============
INTERVIEW POINT: Why separate schemas from models?

Models = Database layer (SQLAlchemy)
Schemas = API layer (Pydantic)

Benefits:
- Validation before hitting database
- Different fields for input vs output
- API documentation auto-generated
- Type safety
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


class ClaimBase(BaseModel):
    """
    Base claim schema with common fields
    
    INTERVIEW POINT: Field() provides validation and documentation
    """
    application_number: str = Field(..., min_length=4, max_length=10, description="Application number (4-10 digits)")
    farmer_name: str = Field(..., min_length=2, max_length=100)
    mobile_number: Optional[str] = Field(None, pattern=r"^[6-9]\d{9}$", description="10-digit Indian mobile number")
    crop: str = Field(..., min_length=2, max_length=50)
    season: str = Field(..., pattern=r"^(Kharif|Rabi|Zaid)$", description="Must be Kharif, Rabi, or Zaid")
    year: int = Field(..., ge=2020, le=2030, description="Year between 2020-2030")
    
    # INTERVIEW POINT: Pydantic validator for custom validation
    @validator('application_number')
    def validate_app_number(cls, v):
        """Ensure application number contains only digits"""
        if not v.isdigit():
            raise ValueError('Application number must contain only digits')
        return v
    
    @validator('crop', 'farmer_name')
    def validate_not_empty(cls, v):
        """Ensure fields aren't just whitespace"""
        if not v or not v.strip():
            raise ValueError('Field cannot be empty')
        return v.strip()


class ClaimCreate(ClaimBase):
    """Schema for creating new claim (if needed for testing)"""
    state: Optional[str] = None
    district: Optional[str] = None
    village: Optional[str] = None
    land_area: Optional[Decimal] = None
    sum_insured: Optional[Decimal] = None
    premium_paid: Optional[Decimal] = None


class ClaimResponse(ClaimBase):
    """
    Schema for claim API responses — includes nested documents and activities
    """
    id: int
    state: Optional[str]
    district: Optional[str]
    village: Optional[str]
    land_area: Optional[Decimal]
    sum_insured: Optional[Decimal]
    premium_paid: Optional[Decimal]
    claim_amount: Optional[Decimal]
    payment_reference: Optional[str]
    claim_status: str
    payment_status: str
    current_stage: int
    completion_percentage: int
    error_message: Optional[str]
    action_needed: Optional[str]
    rejection_reason: Optional[str]
    appeal_possible: bool
    officer_name: Optional[str]
    officer_contact: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    approval_date: Optional[datetime]
    payment_date: Optional[datetime]
    verification_date: Optional[datetime]
    documents: List['DocumentResponse'] = []
    activities: List['ActivityResponse'] = []

    class Config:
        from_attributes = True


class ClaimDetail(ClaimResponse):
    """
    Detailed claim response including related data
    Used when fetching single claim with documents and timeline
    """
    documents: List['DocumentResponse'] = []
    activities: List['ActivityResponse'] = []
    
    class Config:
        from_attributes = True


class ClaimSearchParams(BaseModel):
    """Schema for search query parameters"""
    crop: Optional[str] = None
    season: Optional[str] = None
    year: Optional[int] = None
    status: Optional[str] = None
    state: Optional[str] = None
    page: int = Field(1, ge=1)
    page_size: int = Field(10, ge=1, le=100)


class VoiceSearchRequest(BaseModel):
    """
    Schema for voice recognition search
    
    INTERVIEW POINT: Voice-specific endpoint
    Frontend sends extracted data from speech
    """
    text: str = Field(..., description="Natural language query from voice input")
    language: str = Field("en-IN", description="Language code used for recognition")


# Import forward references for type hints
from app.schemas.document import DocumentResponse
from app.schemas.activity import ActivityResponse

# Rebuild both models after forward refs are available
ClaimResponse.model_rebuild()
ClaimDetail.model_rebuild()
