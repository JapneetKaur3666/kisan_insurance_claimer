"""
Claims API Routes
Endpoints for claim operations
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
import logging

from app.database import get_db
from app.services.claim_service import ClaimService
from app.schemas.claim import ClaimResponse, ClaimCreate, VoiceSearchRequest
from app.schemas.response import ResponseModel, PaginatedResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/claims", tags=["Claims"])


@router.get("/{application_number}", response_model=ResponseModel[ClaimResponse])
async def get_claim(
    application_number: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get claim details by application number
    
    - **application_number**: Unique claim application number (e.g., "12345")
    """
    logger.info(f"Fetching claim: {application_number}")
    
    claim = await ClaimService.get_claim_by_application_number(db, application_number)
    
    if not claim:
        logger.warning(f"Claim not found: {application_number}")
        raise HTTPException(status_code=404, detail="Claim not found")
    
    return ResponseModel(
        success=True,
        message="Claim retrieved successfully",
        data=ClaimResponse.model_validate(claim)
    )


@router.get("/", response_model=PaginatedResponse[ClaimResponse])
async def search_claims(
    farmer_name: Optional[str] = Query(None, description="Search by farmer name (partial match)"),
    crop: Optional[str] = Query(None, description="Filter by crop type"),
    season: Optional[str] = Query(None, description="Filter by season (Kharif/Rabi)"),
    year: Optional[int] = Query(None, description="Filter by year"),
    claim_status: Optional[str] = Query(None, description="Filter by claim status"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(10, ge=1, le=100, description="Maximum number of records to return"),
    db: AsyncSession = Depends(get_db)
):
    """
    Search claims with multiple filter criteria
    
    Supports pagination and multiple filters:
    - Farmer name (partial match, case-insensitive)
    - Crop type
    - Season (Kharif/Rabi)
    - Year
    - Claim status
    """
    logger.info(f"Searching claims with filters: farmer_name={farmer_name}, crop={crop}, season={season}, year={year}, status={claim_status}")
    
    claims, total = await ClaimService.search_claims(
        db=db,
        farmer_name=farmer_name,
        crop=crop,
        season=season,
        year=year,
        claim_status=claim_status,
        skip=skip,
        limit=limit
    )
    
    return PaginatedResponse(
        success=True,
        message=f"Found {total} claims",
        data=[ClaimResponse.model_validate(claim) for claim in claims],
        total=total,
        page=skip // limit + 1,
        page_size=limit
    )


@router.post("/", response_model=ResponseModel[ClaimResponse], status_code=201)
async def create_claim(
    claim_data: ClaimCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new insurance claim
    
    - **application_number**: Unique identifier for the claim
    - **farmer_name**: Name of the farmer
    - **crop**: Type of crop (must match season - see validation rules)
    - **season**: Kharif or Rabi
    - **year**: Claim year
    
    **Validation Rules:**
    - Kharif crops: Rice, Cotton, Soybean, Bajra, Maize
    - Rabi crops: Wheat, Mustard, Gram, Barley
    """
    logger.info(f"Creating new claim: {claim_data.application_number}")
    
    try:
        new_claim = await ClaimService.create_claim(db, claim_data)
        logger.info(f"Claim created successfully: {new_claim.application_number}")
        
        return ResponseModel(
            success=True,
            message="Claim created successfully",
            data=ClaimResponse.model_validate(new_claim)
        )
    except ValueError as e:
        logger.error(f"Validation error creating claim: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating claim: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/voice-search", response_model=ResponseModel[ClaimResponse])
async def voice_search(
    request: VoiceSearchRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Voice-optimized search endpoint
    
    Extracts application number from natural language input.
    Example: "Check my claim 12345" → searches for "12345"
    
    - **text**: Natural language query from voice input
    - **language**: Language code (e.g., en-IN, hi-IN)
    """
    logger.info(f"Voice search request: '{request.text}' in {request.language}")
    
    # Extract application number (simple extraction - looks for 5+ digit numbers)
    import re
    numbers = re.findall(r'\d{5,}', request.text)
    
    if not numbers:
        raise HTTPException(
            status_code=400, 
            detail="Could not extract application number from voice input. Please speak clearly including the full application number."
        )
    
    application_number = numbers[0]
    logger.info(f"Extracted application number: {application_number}")
    
    claim = await ClaimService.get_claim_by_application_number(db, application_number)
    
    if not claim:
        raise HTTPException(
            status_code=404, 
            detail=f"No claim found with application number {application_number}"
        )
    
    return ResponseModel(
        success=True,
        message=f"Found claim for application number {application_number}",
        data=ClaimResponse.model_validate(claim)
    )


@router.get("/{application_number}/summary", response_model=ResponseModel[dict])
async def get_claim_summary(
    application_number: str,
    language: str = Query("en-IN", description="Language code for voice output"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get claim summary optimized for voice output
    
    Returns simplified, voice-friendly summary including:
    - Claim status
    - Payment status
    - Missing documents
    - Next action required
    """
    logger.info(f"Fetching voice summary for claim: {application_number}")
    
    claim = await ClaimService.get_claim_by_application_number(db, application_number)
    
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    
    # Build voice-friendly summary
    missing_docs = [doc.document_type for doc in claim.documents if doc.status == "Missing"]
    
    summary = {
        "application_number": claim.application_number,
        "farmer_name": claim.farmer_name,
        "crop": claim.crop,
        "season": claim.season,
        "claim_status": claim.claim_status,
        "payment_status": claim.payment_status,
        "current_stage": claim.current_stage,
        "total_stages": 6,
        "missing_documents": missing_docs,
        "missing_documents_count": len(missing_docs),
        "voice_message": _build_voice_message(claim, missing_docs, language)
    }
    
    return ResponseModel(
        success=True,
        message="Summary retrieved successfully",
        data=summary
    )


def _build_voice_message(claim, missing_docs: list, language: str) -> str:
    """Build natural language summary for TTS"""
    
    # English messages
    if language.startswith("en"):
        msg = f"Your claim for {claim.crop} in {claim.season} season is {claim.claim_status.lower()}. "
        
        if claim.claim_status == "Approved":
            if claim.payment_status == "Paid":
                msg += "Payment has been completed."
            else:
                msg += "Payment is being processed."
        elif missing_docs:
            msg += f"You need to submit {len(missing_docs)} documents: {', '.join(missing_docs)}."
        else:
            msg += f"Your claim is currently at stage {claim.current_stage} of 6."
        
        return msg
    
    # Hindi messages
    elif language.startswith("hi"):
        msg = f"आपका {claim.crop} का दावा {claim.season} सीजन में {claim.claim_status} है। "
        
        if claim.claim_status == "Approved":
            if claim.payment_status == "Paid":
                msg += "भुगतान पूरा हो गया है।"
            else:
                msg += "भुगतान की प्रक्रिया चल रही है।"
        elif missing_docs:
            msg += f"आपको {len(missing_docs)} दस्तावेज जमा करने हैं।"
        
        return msg
    
    # Default to English
    return f"Your claim status is {claim.claim_status}. Payment status is {claim.payment_status}."
