"""
RESPONSE SCHEMAS
================
INTERVIEW POINT: Standardized API responses
All endpoints return consistent structure
"""

from pydantic import BaseModel
from typing import Optional, Generic, TypeVar, List

# Generic type for data
DataT = TypeVar('DataT')


class ResponseModel(BaseModel, Generic[DataT]):
    """
    Standard success response wrapper
    
    INTERVIEW POINT: Generic type allows any data type
    ResponseModel[ClaimResponse] returns claim data
    ResponseModel[List[ClaimResponse]] returns list of claims
    """
    success: bool = True
    message: str = "Operation successful"
    data: Optional[DataT] = None
    
    class Config:
        from_attributes = True


class ErrorDetail(BaseModel):
    """Detailed error information"""
    code: str
    field: Optional[str] = None
    message: str


class ErrorResponse(BaseModel):
    """
    Standard error response
    
    INTERVIEW POINT: Consistent error format helps frontend
    """
    success: bool = False
    message: str
    errors: Optional[List[ErrorDetail]] = None
    suggestions: Optional[List[str]] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": False,
                "message": "Claim not found",
                "errors": [
                    {
                        "code": "NOT_FOUND",
                        "message": "No claim exists with application number 99999"
                    }
                ],
                "suggestions": [
                    "Check if application number is correct",
                    "Contact helpline: 1800-123-4567"
                ]
            }
        }


class PaginatedResponse(BaseModel, Generic[DataT]):
    """
    Paginated response for list endpoints
    
    INTERVIEW POINT: Pagination prevents loading too much data
    """
    success: bool = True
    message: str = "Data retrieved successfully"
    data: List[DataT]
    total: int
    page: int
    page_size: int
    total_pages: int
    
    class Config:
        from_attributes = True
