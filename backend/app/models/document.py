"""
DOCUMENT MODEL
==============
INTERVIEW POINT: Represents uploaded/required documents
One-to-Many relationship: One claim has many documents
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Document(Base):
    """Document model for claim-related documents"""
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    
    # INTERVIEW POINT: Foreign Key establishes relationship
    # Links this document to a specific claim
    # ondelete="CASCADE" - delete document if claim is deleted
    claim_id = Column(
        Integer, 
        ForeignKey("claims.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    # Document Details
    document_type = Column(String(50), nullable=False)
    # Types: Aadhaar Card, Bank Details, Land Record, 
    #        Sowing Certificate, Crop Photos
    
    file_name = Column(String(255))
    file_path = Column(String(500))  # Simulated path for demo
    file_size = Column(Integer)  # In bytes
    mime_type = Column(String(100))  # image/jpeg, application/pdf, etc.
    
    # Status
    status = Column(
        String(20),
        default="Pending"
        # Values: Pending, Uploaded, Verified, Rejected
    )
    
    # Verification
    verified_by = Column(String(100))  # Officer name
    verification_notes = Column(Text)
    rejection_reason = Column(Text)
    
    # Timestamps
    uploaded_at = Column(DateTime, server_default=func.now())
    verified_at = Column(DateTime)
    
    # INTERVIEW POINT: Relationship back to Claim
    # back_populates must match the attribute name in Claim model
    claim = relationship("Claim", back_populates="documents")
    
    def __repr__(self):
        return f"<Document {self.document_type} for Claim {self.claim_id}>"
    
    def to_dict(self):
        """Convert to dictionary for API response"""
        return {
            "id": self.id,
            "claim_id": self.claim_id,
            "document_type": self.document_type,
            "file_name": self.file_name,
            "file_path": self.file_path,
            "file_size": self.file_size,
            "mime_type": self.mime_type,
            "status": self.status,
            "verified_by": self.verified_by,
            "verification_notes": self.verification_notes,
            "rejection_reason": self.rejection_reason,
            "uploaded_at": self.uploaded_at.isoformat() if self.uploaded_at else None,
            "verified_at": self.verified_at.isoformat() if self.verified_at else None,
        }
