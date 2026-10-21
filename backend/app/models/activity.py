"""
ACTIVITY MODEL
==============
INTERVIEW POINT: Timeline/audit trail for claim processing
Tracks each stage of claim journey
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Activity(Base):
    """Activity/Timeline model for claim processing stages"""
    __tablename__ = "activities"
    
    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    
    # Foreign Key to Claim
    claim_id = Column(
        Integer,
        ForeignKey("claims.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    # Stage Information
    stage_number = Column(Integer, nullable=False)  # 1-6
    stage_name = Column(String(100), nullable=False)
    # Stage names:
    # 1. Application Received
    # 2. Initial Verification
    # 3. Document Review
    # 4. Field Verification
    # 5. Approval
    # 6. Payment Processing
    
    # Status
    status = Column(
        String(20),
        nullable=False,
        default="Pending"
        # Values: Pending, In Progress, Completed, Failed
    )
    
    # Details
    notes = Column(Text)  # Additional information about this stage
    performed_by = Column(String(100))  # Officer/system that completed stage
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    
    # Relationship
    claim = relationship("Claim", back_populates="activities")
    
    def __repr__(self):
        return f"<Activity Stage {self.stage_number}: {self.stage_name}>"
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            "id": self.id,
            "claim_id": self.claim_id,
            "stage_number": self.stage_number,
            "stage_name": self.stage_name,
            "status": self.status,
            "notes": self.notes,
            "performed_by": self.performed_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }
