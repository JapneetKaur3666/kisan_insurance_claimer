"""
ACTIVITY SCHEMAS
================
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ActivityBase(BaseModel):
    """Base activity schema"""
    stage_number: int = Field(..., ge=1, le=6)
    stage_name: str


class ActivityCreate(ActivityBase):
    """Schema for creating activity"""
    claim_id: int
    status: str = "Pending"
    notes: Optional[str] = None


class ActivityResponse(ActivityBase):
    """Schema for activity API response"""
    id: int
    claim_id: int
    status: str
    notes: Optional[str]
    performed_by: Optional[str]
    created_at: Optional[datetime]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    
    class Config:
        from_attributes = True
