"""
Claim Service - Business logic for claim operations
Handles database queries and business rules
"""
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from datetime import datetime

from app.models.claim import Claim
from app.models.document import Document
from app.models.activity import Activity
from app.schemas.claim import ClaimCreate
from app.utils.validators import validate_crop_season


class ClaimService:
    """Service class for claim-related operations"""
    
    @staticmethod
    async def get_claim_by_application_number(
        db: AsyncSession, 
        application_number: str
    ) -> Optional[Claim]:
        """
        Fetch a single claim with all related documents and activities
        """
        result = await db.execute(
            select(Claim)
            .options(
                selectinload(Claim.documents),
                selectinload(Claim.activities)
            )
            .where(Claim.application_number == application_number)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def search_claims(
        db: AsyncSession,
        farmer_name: Optional[str] = None,
        crop: Optional[str] = None,
        season: Optional[str] = None,
        year: Optional[int] = None,
        claim_status: Optional[str] = None,
        skip: int = 0,
        limit: int = 10
    ) -> tuple[List[Claim], int]:
        """
        Search claims with multiple filter criteria
        Returns (claims_list, total_count)
        """
        query = select(Claim).options(
            selectinload(Claim.documents),
            selectinload(Claim.activities)
        )
        
        # Apply filters dynamically
        filters = []
        if farmer_name:
            filters.append(Claim.farmer_name.ilike(f"%{farmer_name}%"))
        if crop:
            filters.append(Claim.crop.ilike(f"%{crop}%"))
        if season:
            filters.append(Claim.season.ilike(f"%{season}%"))
        if year:
            filters.append(Claim.year == year)
        if claim_status:
            filters.append(Claim.claim_status.ilike(f"%{claim_status}%"))
        
        if filters:
            query = query.where(or_(*filters))
        
        # Get total count
        count_result = await db.execute(
            select(Claim).where(or_(*filters) if filters else True)
        )
        total_count = len(count_result.all())
        
        # Apply pagination
        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        claims = result.scalars().all()
        
        return list(claims), total_count
    
    @staticmethod
    async def create_claim(
        db: AsyncSession,
        claim_data: ClaimCreate
    ) -> Claim:
        """
        Create a new claim with validation
        """
        # Validate crop-season combination
        is_valid, error_message = validate_crop_season(claim_data.crop, claim_data.season)
        if not is_valid:
            raise ValueError(error_message)
        
        # Check if application number already exists
        existing = await ClaimService.get_claim_by_application_number(
            db, claim_data.application_number
        )
        if existing:
            raise ValueError(f"Claim with application number {claim_data.application_number} already exists")
        
        # Create claim
        new_claim = Claim(
            application_number=claim_data.application_number,
            farmer_name=claim_data.farmer_name,
            crop=claim_data.crop,
            season=claim_data.season,
            year=claim_data.year,
            claim_status="Under Review",
            payment_status="Pending",
            current_stage=1
        )
        
        db.add(new_claim)
        await db.commit()
        await db.refresh(new_claim)
        
        # Create initial activity
        initial_activity = Activity(
            claim_id=new_claim.id,
            stage_number=1,
            stage_name="Application Submitted",
            status="Completed",
            completed_at=datetime.utcnow()
        )
        db.add(initial_activity)
        await db.commit()
        
        # Reload with relationships
        return await ClaimService.get_claim_by_application_number(
            db, new_claim.application_number
        )
    
    @staticmethod
    async def get_claim_documents(
        db: AsyncSession,
        claim_id: int
    ) -> List[Document]:
        """Get all documents for a claim"""
        result = await db.execute(
            select(Document).where(Document.claim_id == claim_id)
        )
        return list(result.scalars().all())
    
    @staticmethod
    async def get_claim_activities(
        db: AsyncSession,
        claim_id: int
    ) -> List[Activity]:
        """Get all activities/timeline for a claim"""
        result = await db.execute(
            select(Activity)
            .where(Activity.claim_id == claim_id)
            .order_by(Activity.stage_number)
        )
        return list(result.scalars().all())
    
    @staticmethod
    async def update_claim_stage(
        db: AsyncSession,
        claim_id: int,
        new_stage: int,
        stage_name: str
    ) -> Optional[Claim]:
        """Update claim's current stage and add activity"""
        result = await db.execute(
            select(Claim).where(Claim.id == claim_id)
        )
        claim = result.scalar_one_or_none()
        
        if not claim:
            return None
        
        claim.current_stage = new_stage
        
        # Add new activity
        activity = Activity(
            claim_id=claim_id,
            stage_number=new_stage,
            stage_name=stage_name,
            status="Completed",
            completed_at=datetime.utcnow()
        )
        db.add(activity)
        
        await db.commit()
        await db.refresh(claim)
        
        return claim
