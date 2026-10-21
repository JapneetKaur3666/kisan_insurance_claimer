"""
Document API Routes
Endpoints for document management
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import logging
from datetime import datetime

from app.database import get_db
from app.models.document import Document
from app.models.claim import Claim
from app.schemas.document import DocumentResponse, DocumentCreate
from app.schemas.response import ResponseModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/documents", tags=["Documents"])


@router.get("/claim/{application_number}", response_model=ResponseModel[List[DocumentResponse]])
async def get_claim_documents(
    application_number: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get all documents for a specific claim
    
    - **application_number**: The claim's application number
    """
    logger.info(f"Fetching documents for claim: {application_number}")
    
    # Get claim first
    result = await db.execute(
        select(Claim).where(Claim.application_number == application_number)
    )
    claim = result.scalar_one_or_none()
    
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    
    # Get documents
    result = await db.execute(
        select(Document).where(Document.claim_id == claim.id)
    )
    documents = result.scalars().all()
    
    return ResponseModel(
        success=True,
        message=f"Found {len(documents)} documents",
        data=[DocumentResponse.model_validate(doc) for doc in documents]
    )


@router.post("/claim/{application_number}", response_model=ResponseModel[DocumentResponse], status_code=201)
async def add_document(
    application_number: str,
    document: DocumentCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Add a document to a claim
    
    - **application_number**: The claim's application number
    - **document_type**: Type of document (e.g., "Land Record", "Sowing Certificate")
    - **status**: Document status (Submitted, Verified, Missing, Rejected)
    """
    logger.info(f"Adding document to claim: {application_number}")
    
    # Get claim
    result = await db.execute(
        select(Claim).where(Claim.application_number == application_number)
    )
    claim = result.scalar_one_or_none()
    
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    
    # Check if document type already exists
    result = await db.execute(
        select(Document)
        .where(Document.claim_id == claim.id)
        .where(Document.document_type == document.document_type)
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        raise HTTPException(
            status_code=400, 
            detail=f"Document type '{document.document_type}' already exists for this claim"
        )
    
    # Create document
    new_doc = Document(
        claim_id=claim.id,
        document_type=document.document_type,
        status=document.status,
        uploaded_at=datetime.utcnow() if document.status == "Submitted" else None
    )
    
    db.add(new_doc)
    await db.commit()
    await db.refresh(new_doc)
    
    logger.info(f"Document added successfully: {document.document_type}")
    
    return ResponseModel(
        success=True,
        message="Document added successfully",
        data=DocumentResponse.model_validate(new_doc)
    )


@router.put("/{document_id}", response_model=ResponseModel[DocumentResponse])
async def update_document_status(
    document_id: int,
    status: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Update document status
    
    - **document_id**: The document's ID
    - **status**: New status (Submitted, Verified, Missing, Rejected)
    """
    logger.info(f"Updating document {document_id} status to: {status}")
    
    # Validate status
    valid_statuses = ["Submitted", "Verified", "Missing", "Rejected"]
    if status not in valid_statuses:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        )
    
    # Get document
    result = await db.execute(
        select(Document).where(Document.id == document_id)
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Update status
    old_status = document.status
    document.status = status
    
    # Set uploaded_at if submitting
    if status == "Submitted" and old_status != "Submitted":
        document.uploaded_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(document)
    
    logger.info(f"Document status updated from {old_status} to {status}")
    
    return ResponseModel(
        success=True,
        message="Document status updated successfully",
        data=DocumentResponse.model_validate(document)
    )


@router.post("/upload", response_model=ResponseModel[dict])
async def upload_document_file(
    file: UploadFile = File(...),
    application_number: str = None,
    document_type: str = None
):
    """
    Upload document file (simulated - file handling for demo)
    
    In production, this would:
    1. Validate file type and size
    2. Scan for viruses
    3. Store in cloud storage (S3, Azure Blob, etc.)
    4. Update database with file URL
    
    For this demo, we'll just acknowledge the upload.
    """
    logger.info(f"File upload simulated: {file.filename} for claim {application_number}")
    
    if not application_number or not document_type:
        raise HTTPException(
            status_code=400, 
            detail="application_number and document_type are required"
        )
    
    # In production, handle file storage here
    # For demo, just return success
    
    return ResponseModel(
        success=True,
        message=f"File '{file.filename}' uploaded successfully (simulated)",
        data={
            "filename": file.filename,
            "content_type": file.content_type,
            "size": file.size if hasattr(file, 'size') else None,
            "application_number": application_number,
            "document_type": document_type,
            "upload_timestamp": datetime.utcnow().isoformat()
        }
    )


@router.delete("/{document_id}", response_model=ResponseModel[dict])
async def delete_document(
    document_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a document
    
    - **document_id**: The document's ID
    """
    logger.info(f"Deleting document: {document_id}")
    
    # Get document
    result = await db.execute(
        select(Document).where(Document.id == document_id)
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    await db.delete(document)
    await db.commit()
    
    logger.info(f"Document deleted successfully: {document_id}")
    
    return ResponseModel(
        success=True,
        message="Document deleted successfully",
        data={"document_id": document_id}
    )
