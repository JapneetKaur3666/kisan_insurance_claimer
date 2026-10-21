"""
SEED DATA GENERATOR
===================
INTERVIEW POINT: Why seed data?
- Testing without manual data entry
- Consistent test scenarios
- Demo-ready application
- Can be run multiple times (idempotent)
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Claim, Document, Activity
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


async def clear_all_data(db: AsyncSession):
    """
    Clear all existing data
    
    INTERVIEW POINT: CASCADE delete handles related records
    """
    result = await db.execute(select(Claim))
    claims = result.scalars().all()
    for claim in claims:
        await db.delete(claim)
    await db.commit()
    logger.info("🗑️  Cleared existing data")


async def create_test_claims(db: AsyncSession):
    """
    Create 6 test claim scenarios
    
    INTERVIEW POINT: Each scenario represents different use case
    """
    
    # ============================================
    # SCENARIO 1: HAPPY PATH - ALL COMPLETE ✅
    # ============================================
    claim1 = Claim(
        application_number="12345",
        farmer_name="Ramesh Kumar",
        mobile_number="9876543210",
        crop="Rice",
        season="Kharif",
        year=2026,
        state="Maharashtra",
        district="Nashik",
        village="Pimpalgaon",
        land_area=2.5,
        sum_insured=50000.00,
        premium_paid=2000.00,
        claim_amount=25000.00,
        payment_reference="PAY2026001",
        claim_status="Approved",
        payment_status="Processed",
        current_stage=6,
        completion_percentage=100,
        created_at=datetime.now() - timedelta(days=15),
        approval_date=datetime.now() - timedelta(days=2),
        payment_date=datetime.now() - timedelta(days=1)
    )
    
    # Documents for Claim 1
    docs1 = [
        Document(claim=claim1, document_type="Aadhaar Card", file_name="aadhaar_12345.pdf", 
                status="Verified", uploaded_at=datetime.now() - timedelta(days=14)),
        Document(claim=claim1, document_type="Bank Details", file_name="bank_12345.pdf", 
                status="Verified", uploaded_at=datetime.now() - timedelta(days=14)),
        Document(claim=claim1, document_type="Land Record", file_name="land_12345.pdf", 
                status="Verified", uploaded_at=datetime.now() - timedelta(days=13)),
        Document(claim=claim1, document_type="Sowing Certificate", file_name="sowing_12345.pdf", 
                status="Verified", uploaded_at=datetime.now() - timedelta(days=12)),
    ]
    
    # Timeline for Claim 1 - All complete
    activities1 = [
        Activity(claim=claim1, stage_number=1, stage_name="Application Received", 
                status="Completed", completed_at=datetime.now() - timedelta(days=15)),
        Activity(claim=claim1, stage_number=2, stage_name="Initial Verification", 
                status="Completed", completed_at=datetime.now() - timedelta(days=14)),
        Activity(claim=claim1, stage_number=3, stage_name="Document Review", 
                status="Completed", completed_at=datetime.now() - timedelta(days=10)),
        Activity(claim=claim1, stage_number=4, stage_name="Field Verification", 
                status="Completed", completed_at=datetime.now() - timedelta(days=5)),
        Activity(claim=claim1, stage_number=5, stage_name="Approval", 
                status="Completed", completed_at=datetime.now() - timedelta(days=2)),
        Activity(claim=claim1, stage_number=6, stage_name="Payment Processing", 
                status="Completed", completed_at=datetime.now() - timedelta(days=1)),
    ]
    
    # ============================================
    # SCENARIO 2: UNDER REVIEW - DOCUMENTS MISSING ⏳
    # ============================================
    claim2 = Claim(
        application_number="67890",
        farmer_name="Sunita Devi",
        mobile_number="9876543211",
        crop="Wheat",
        season="Rabi",
        year=2026,
        state="Punjab",
        district="Ludhiana",
        village="Jagraon",
        land_area=3.0,
        sum_insured=60000.00,
        premium_paid=2400.00,
        claim_status="Under Review",
        payment_status="Not Applicable",
        current_stage=3,
        completion_percentage=50,
        action_needed="Upload missing documents: Land Record and Sowing Certificate",
        created_at=datetime.now() - timedelta(days=5)
    )
    
    docs2 = [
        Document(claim=claim2, document_type="Aadhaar Card", file_name="aadhaar_67890.pdf", 
                status="Verified", uploaded_at=datetime.now() - timedelta(days=4)),
        Document(claim=claim2, document_type="Bank Details", file_name="bank_67890.pdf", 
                status="Verified", uploaded_at=datetime.now() - timedelta(days=4)),
        Document(claim=claim2, document_type="Land Record", status="Pending"),
        Document(claim=claim2, document_type="Sowing Certificate", status="Pending"),
    ]
    
    activities2 = [
        Activity(claim=claim2, stage_number=1, stage_name="Application Received", 
                status="Completed", completed_at=datetime.now() - timedelta(days=5)),
        Activity(claim=claim2, stage_number=2, stage_name="Initial Verification", 
                status="Completed", completed_at=datetime.now() - timedelta(days=4)),
        Activity(claim=claim2, stage_number=3, stage_name="Document Review", 
                status="In Progress", notes="Waiting for Land Record and Sowing Certificate"),
        Activity(claim=claim2, stage_number=4, stage_name="Field Verification", status="Pending"),
        Activity(claim=claim2, stage_number=5, stage_name="Approval", status="Pending"),
        Activity(claim=claim2, stage_number=6, stage_name="Payment Processing", status="Pending"),
    ]
    
    # ============================================
    # SCENARIO 3: WRONG SEASON - NEEDS CORRECTION ❌
    # ============================================
    claim3 = Claim(
        application_number="11223",
        farmer_name="Prakash Patil",
        mobile_number="9876543212",
        crop="Cotton",
        season="Rabi",  # WRONG! Cotton is Kharif crop
        year=2026,
        state="Gujarat",
        district="Ahmedabad",
        village="Dholka",
        land_area=4.0,
        sum_insured=80000.00,
        premium_paid=3200.00,
        claim_status="Action Required",
        payment_status="Not Applicable",
        current_stage=2,
        completion_percentage=20,
        error_message="Season mismatch: Cotton is a Kharif crop, but Rabi season was selected",
        action_needed="Please update season to Kharif or change crop selection",
        created_at=datetime.now() - timedelta(days=3)
    )
    
    docs3 = [
        Document(claim=claim3, document_type="Aadhaar Card", file_name="aadhaar_11223.pdf", 
                status="Verified", uploaded_at=datetime.now() - timedelta(days=2)),
        Document(claim=claim3, document_type="Bank Details", file_name="bank_11223.pdf", 
                status="Verified", uploaded_at=datetime.now() - timedelta(days=2)),
        Document(claim=claim3, document_type="Land Record", status="Pending"),
        Document(claim=claim3, document_type="Sowing Certificate", status="Pending"),
    ]
    
    activities3 = [
        Activity(claim=claim3, stage_number=1, stage_name="Application Received", 
                status="Completed", completed_at=datetime.now() - timedelta(days=3)),
        Activity(claim=claim3, stage_number=2, stage_name="Initial Verification", 
                status="Failed", notes="Season-crop mismatch detected"),
        Activity(claim=claim3, stage_number=3, stage_name="Document Review", status="Pending"),
        Activity(claim=claim3, stage_number=4, stage_name="Field Verification", status="Pending"),
        Activity(claim=claim3, stage_number=5, stage_name="Approval", status="Pending"),
        Activity(claim=claim3, stage_number=6, stage_name="Payment Processing", status="Pending"),
    ]
    
    # Continue in next message due to length...
    
    # ============================================
    # SCENARIO 4: APPROVED BUT UNPAID 💰
    # ============================================
    claim4 = Claim(
        application_number="44556",
        farmer_name="Lakshmi Reddy",
        mobile_number="9876543213",
        crop="Sugarcane",
        season="Kharif",
        year=2026,
        state="Karnataka",
        district="Belgaum",
        village="Sankeshwar",
        land_area=5.0,
        sum_insured=100000.00,
        premium_paid=4000.00,
        claim_amount=50000.00,
        claim_status="Approved",
        payment_status="Processing",
        current_stage=5,
        completion_percentage=90,
        created_at=datetime.now() - timedelta(days=10),
        approval_date=datetime.now() - timedelta(days=2)
    )
    
    docs4 = [
        Document(claim=claim4, document_type="Aadhaar Card", file_name="aadhaar_44556.pdf", 
                status="Verified", uploaded_at=datetime.now() - timedelta(days=9)),
        Document(claim=claim4, document_type="Bank Details", file_name="bank_44556.pdf", 
                status="Verified", uploaded_at=datetime.now() - timedelta(days=9)),
        Document(claim=claim4, document_type="Land Record", file_name="land_44556.pdf", 
                status="Verified", uploaded_at=datetime.now() - timedelta(days=8)),
        Document(claim=claim4, document_type="Sowing Certificate", file_name="sowing_44556.pdf", 
                status="Verified", uploaded_at=datetime.now() - timedelta(days=7)),
    ]
    
    activities4 = [
        Activity(claim=claim4, stage_number=1, stage_name="Application Received", 
                status="Completed", completed_at=datetime.now() - timedelta(days=10)),
        Activity(claim=claim4, stage_number=2, stage_name="Initial Verification", 
                status="Completed", completed_at=datetime.now() - timedelta(days=9)),
        Activity(claim=claim4, stage_number=3, stage_name="Document Review", 
                status="Completed", completed_at=datetime.now() - timedelta(days=6)),
        Activity(claim=claim4, stage_number=4, stage_name="Field Verification", 
                status="Completed", completed_at=datetime.now() - timedelta(days=4)),
        Activity(claim=claim4, stage_number=5, stage_name="Approval", 
                status="Completed", completed_at=datetime.now() - timedelta(days=2),
                notes="Claim approved for ₹50,000. Payment will be processed in 3-5 business days."),
        Activity(claim=claim4, stage_number=6, stage_name="Payment Processing", 
                status="In Progress", notes="Payment initiated. Expected: 3-5 business days"),
    ]
    
    # ============================================
    # SCENARIO 5: REJECTED - CLAIM DENIED 🚫
    # ============================================
    claim5 = Claim(
        application_number="78901",
        farmer_name="Vijay Singh",
        mobile_number="9876543214",
        crop="Maize",
        season="Kharif",
        year=2026,
        state="Uttar Pradesh",
        district="Meerut",
        village="Sardhana",
        land_area=2.0,
        sum_insured=40000.00,
        premium_paid=1600.00,
        claim_status="Rejected",
        payment_status="Not Applicable",
        current_stage=5,
        completion_percentage=100,
        rejection_reason="Crop damage not covered under policy terms. Damage caused by pest attack, which is excluded from coverage.",
        appeal_possible=True,
        created_at=datetime.now() - timedelta(days=20),
        approval_date=datetime.now() - timedelta(days=5)
    )
    
    docs5 = [
        Document(claim=claim5, document_type="Aadhaar Card", file_name="aadhaar_78901.pdf", 
                status="Verified", uploaded_at=datetime.now() - timedelta(days=19)),
        Document(claim=claim5, document_type="Bank Details", file_name="bank_78901.pdf", 
                status="Verified", uploaded_at=datetime.now() - timedelta(days=19)),
        Document(claim=claim5, document_type="Land Record", file_name="land_78901.pdf", 
                status="Verified", uploaded_at=datetime.now() - timedelta(days=18)),
        Document(claim=claim5, document_type="Sowing Certificate", file_name="sowing_78901.pdf", 
                status="Verified", uploaded_at=datetime.now() - timedelta(days=17)),
        Document(claim=claim5, document_type="Crop Photos", file_name="crop_78901.jpg", 
                status="Verified", uploaded_at=datetime.now() - timedelta(days=16)),
    ]
    
    activities5 = [
        Activity(claim=claim5, stage_number=1, stage_name="Application Received", 
                status="Completed", completed_at=datetime.now() - timedelta(days=20)),
        Activity(claim=claim5, stage_number=2, stage_name="Initial Verification", 
                status="Completed", completed_at=datetime.now() - timedelta(days=19)),
        Activity(claim=claim5, stage_number=3, stage_name="Document Review", 
                status="Completed", completed_at=datetime.now() - timedelta(days=15)),
        Activity(claim=claim5, stage_number=4, stage_name="Field Verification", 
                status="Completed", completed_at=datetime.now() - timedelta(days=10)),
        Activity(claim=claim5, stage_number=5, stage_name="Approval", 
                status="Completed", completed_at=datetime.now() - timedelta(days=5),
                notes="Claim rejected: Pest attack damage not covered. Appeal possible by 15-Nov-2026."),
        Activity(claim=claim5, stage_number=6, stage_name="Payment Processing", status="Pending"),
    ]
    
    # ============================================
    # SCENARIO 6: FIELD VERIFICATION SCHEDULED 📅
    # ============================================
    claim6 = Claim(
        application_number="33445",
        farmer_name="Meena Sharma",
        mobile_number="9876543215",
        crop="Bajra",
        season="Kharif",
        year=2026,
        state="Rajasthan",
        district="Jodhpur",
        village="Phalodi",
        land_area=6.0,
        sum_insured=120000.00,
        premium_paid=4800.00,
        claim_amount=60000.00,
        claim_status="Field Verification Pending",
        payment_status="Not Applicable",
        current_stage=4,
        completion_percentage=70,
        officer_name="Inspector Rajesh Kumar",
        officer_contact="9876501234",
        verification_date=datetime.now() + timedelta(days=5),
        created_at=datetime.now() - timedelta(days=8)
    )
    
    docs6 = [
        Document(claim=claim6, document_type="Aadhaar Card", file_name="aadhaar_33445.pdf", 
                status="Verified", uploaded_at=datetime.now() - timedelta(days=7)),
        Document(claim=claim6, document_type="Bank Details", file_name="bank_33445.pdf", 
                status="Verified", uploaded_at=datetime.now() - timedelta(days=7)),
        Document(claim=claim6, document_type="Land Record", file_name="land_33445.pdf", 
                status="Verified", uploaded_at=datetime.now() - timedelta(days=6)),
        Document(claim=claim6, document_type="Sowing Certificate", file_name="sowing_33445.pdf", 
                status="Verified", uploaded_at=datetime.now() - timedelta(days=6)),
        Document(claim=claim6, document_type="Crop Photos", file_name="crop_33445.jpg", 
                status="Verified", uploaded_at=datetime.now() - timedelta(days=5)),
    ]
    
    activities6 = [
        Activity(claim=claim6, stage_number=1, stage_name="Application Received", 
                status="Completed", completed_at=datetime.now() - timedelta(days=8)),
        Activity(claim=claim6, stage_number=2, stage_name="Initial Verification", 
                status="Completed", completed_at=datetime.now() - timedelta(days=7)),
        Activity(claim=claim6, stage_number=3, stage_name="Document Review", 
                status="Completed", completed_at=datetime.now() - timedelta(days=4)),
        Activity(claim=claim6, stage_number=4, stage_name="Field Verification", 
                status="In Progress", 
                notes=f"Scheduled for {(datetime.now() + timedelta(days=5)).strftime('%d %B %Y')}. Officer: Inspector Rajesh Kumar (9876501234)"),
        Activity(claim=claim6, stage_number=5, stage_name="Approval", status="Pending"),
        Activity(claim=claim6, stage_number=6, stage_name="Payment Processing", status="Pending"),
    ]
    
    db.add_all([claim1, claim2, claim3, claim4, claim5, claim6])
    db.add_all(docs1 + docs2 + docs3 + docs4 + docs5 + docs6)
    db.add_all(activities1 + activities2 + activities3 + activities4 + activities5 + activities6)
    
    await db.commit()
    logger.info(f"✅ Created 6 test claims with documents and activities")
    
    return {
        "claims_created": 6,
        "scenarios": [
            "12345 - Happy Path (Approved & Paid)",
            "67890 - Under Review (Missing Documents)",
            "11223 - Action Required (Wrong Season)",
            "44556 - Approved But Unpaid",
            "78901 - Rejected Claim",
            "33445 - Field Verification Scheduled"
        ]
    }


async def seed_database():
    """
    Main function to seed the database with test data
    Called from main.py on startup
    """
    from app.database import AsyncSessionLocal
    
    async with AsyncSessionLocal() as db:
        try:
            # Check if data already exists
            result = await db.execute(select(Claim))
            existing_claims = result.scalars().all()
            
            if existing_claims:
                logger.info("⚠️  Database already contains data. Skipping seed.")
                return
            
            # Create test data
            logger.info("🌱 Seeding database with test data...")
            result = await create_test_claims(db)
            logger.info(f"✅ Database seeded successfully: {result['claims_created']} claims created")
            return result
            
        except Exception as e:
            logger.error(f"❌ Error seeding database: {e}")
            await db.rollback()
            raise
