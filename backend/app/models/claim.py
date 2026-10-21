"""
CLAIM MODEL
===========
INTERVIEW POINT: This class becomes a database table

SQLAlchemy automatically:
- Creates table with these columns
- Handles data types
- Manages relationships
- Provides query methods
"""

from sqlalchemy import Column, Integer, String, DECIMAL, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Claim(Base):
    """
    Claim model representing crop insurance claim records
    
    INTERVIEW POINT: Why __tablename__?
    Explicitly names the table (otherwise uses lowercase class name)
    """
    __tablename__ = "claims"
    
    # Primary Key
    # INTERVIEW POINT: autoincrement creates sequential IDs automatically
    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    
    # Application Details
    # INTERVIEW POINT: unique=True prevents duplicate app numbers
    application_number = Column(String(10), unique=True, nullable=False, index=True)
    farmer_name = Column(String(100), nullable=False)
    mobile_number = Column(String(10))
    
    # Crop Information
    crop = Column(String(50), nullable=False)
    season = Column(String(20), nullable=False)  # Kharif/Rabi/Zaid
    year = Column(Integer, nullable=False)
    
    # Location
    state = Column(String(50))
    district = Column(String(50))
    village = Column(String(50))
    land_area = Column(DECIMAL(10, 2))  # In hectares
    
    # Financial Details
    sum_insured = Column(DECIMAL(10, 2))  # Total insured amount
    premium_paid = Column(DECIMAL(10, 2))  # Premium farmer paid
    claim_amount = Column(DECIMAL(10, 2))  # Amount claimed
    payment_reference = Column(String(100))
    
    # Status Tracking
    claim_status = Column(
        String(50), 
        nullable=False,
        default="Under Review"
        # Possible values:
        # - Under Review
        # - Action Required
        # - Field Verification Pending
        # - Approved
        # - Rejected
        # - Completed
    )
    
    payment_status = Column(
        String(50),
        default="Not Applicable"
        # Possible values:
        # - Not Applicable
        # - Pending
        # - Processing
        # - Processed
        # - Failed
    )
    
    # Timeline position (1-6)
    current_stage = Column(Integer, default=1)
    completion_percentage = Column(Integer, default=0)
    
    # Error/Action Information
    error_message = Column(Text)
    action_needed = Column(Text)
    rejection_reason = Column(Text)
    
    # Additional Info
    appeal_possible = Column(Integer, default=0)  # Boolean as integer
    officer_name = Column(String(100))
    officer_contact = Column(String(10))
    
    # Timestamps
    # INTERVIEW POINT: func.now() uses database's current timestamp
    # server_default vs default: server_default runs on DB, default in Python
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    approval_date = Column(DateTime)
    payment_date = Column(DateTime)
    verification_date = Column(DateTime)
    
    # INTERVIEW POINT: Relationships
    # One claim has many documents and activities
    # back_populates creates bidirectional relationship
    # cascade deletes related records when claim is deleted
    documents = relationship(
        "Document", 
        back_populates="claim",
        cascade="all, delete-orphan"
    )
    
    activities = relationship(
        "Activity",
        back_populates="claim",
        cascade="all, delete-orphan",
        order_by="Activity.stage_number"  # Always ordered
    )
    
    def __repr__(self):
        """String representation for debugging"""
        return f"<Claim {self.application_number} - {self.farmer_name}>"
    
    def to_dict(self):
        """
        Convert model to dictionary
        
        INTERVIEW POINT: Why needed?
        SQLAlchemy models aren't JSON serializable
        Need to convert to dict for API responses
        """
        return {
            "id": self.id,
            "application_number": self.application_number,
            "farmer_name": self.farmer_name,
            "mobile_number": self.mobile_number,
            "crop": self.crop,
            "season": self.season,
            "year": self.year,
            "state": self.state,
            "district": self.district,
            "village": self.village,
            "land_area": float(self.land_area) if self.land_area else None,
            "sum_insured": float(self.sum_insured) if self.sum_insured else None,
            "premium_paid": float(self.premium_paid) if self.premium_paid else None,
            "claim_amount": float(self.claim_amount) if self.claim_amount else None,
            "payment_reference": self.payment_reference,
            "claim_status": self.claim_status,
            "payment_status": self.payment_status,
            "current_stage": self.current_stage,
            "completion_percentage": self.completion_percentage,
            "error_message": self.error_message,
            "action_needed": self.action_needed,
            "rejection_reason": self.rejection_reason,
            "appeal_possible": bool(self.appeal_possible),
            "officer_name": self.officer_name,
            "officer_contact": self.officer_contact,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "approval_date": self.approval_date.isoformat() if self.approval_date else None,
            "payment_date": self.payment_date.isoformat() if self.payment_date else None,
            "verification_date": self.verification_date.isoformat() if self.verification_date else None,
        }
