"""
Development Server Runner
Starts the FastAPI application with uvicorn
"""
import uvicorn
import sys
import os

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    print("Starting Kisan Insurance Portal API Server...")
    print("API Documentation: http://localhost:8001/docs")
    print("ReDoc Documentation: http://localhost:8001/redoc")
    print("Health Check: http://localhost:8001/health")
    print("\n🧪 Test Application Numbers:")
    print("   - 12345: Approved & Paid")
    print("   - 67890: Under Review (missing docs)")
    print("   - 11223: Action Required (wrong season)")
    print("   - 44556: Approved but unpaid")
    print("   - 78901: Rejected")
    print("   - 33445: Field Verification\n")
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8001,
        reload=False,
        log_level="info",
        access_log=True
    )
