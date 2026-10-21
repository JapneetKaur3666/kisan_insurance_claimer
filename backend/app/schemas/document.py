"""
DOCUMENT SCHEMAS
================
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class DocumentBase(BaseModel):
    """Base document schema"""
    document_type: str = Field(..., description="Type of document")
    
class DocumentCreate(DocumentBase):
    """Schema for creating document"""
    claim_id: int
    file_name: Optional[str] = None
    file_path: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None


class DocumentResponse(DocumentBase):
    """Schema for document API response"""
    id: int
    claim_id: int
    file_name: Optional[str]
    file_path: Optional[str]
    file_size: Optional[int]
    mime_type: Optional[str]
    status: str
    verified_by: Optional[str]
    verification_notes: Optional[str]
    rejection_reason: Optional[str]
    uploaded_at: Optional[datetime]
    verified_at: Optional[datetime]
    
    class Config:
        from_attributes = True
