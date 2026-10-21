"""
VALIDATION UTILITIES
====================
INTERVIEW POINT: Business logic validation
Beyond Pydantic's type checking
"""

from typing import Dict, List, Optional


# INTERVIEW POINT: Crop-season validation data
# In real app, this would come from database
VALID_CROP_SEASONS = {
    "Kharif": [
        "Rice", "Cotton", "Maize", "Bajra", "Jowar", 
        "Groundnut", "Soybean", "Sugarcane", "Turmeric"
    ],
    "Rabi": [
        "Wheat", "Gram", "Mustard", "Barley", "Peas",
        "Lentil", "Chickpea", "Oats"
    ],
    "Zaid": [
        "Watermelon", "Cucumber", "Bitter Gourd",
        "Pumpkin", "Muskmelon", "Vegetables"
    ]
}


def validate_crop_season(crop: str, season: str) -> Dict[str, any]:
    """
    Validate crop-season combination
    
    INTERVIEW POINT: Returns dict with validation result
    {valid: bool, error: Optional[str]}
    """
    if season not in VALID_CROP_SEASONS:
        return {
            "valid": False,
            "error": f"Invalid season: {season}. Must be Kharif, Rabi, or Zaid"
        }
    
    valid_crops = VALID_CROP_SEASONS[season]
    
    # Case-insensitive check
    crop_lower = crop.lower()
    valid_crops_lower = [c.lower() for c in valid_crops]
    
    if crop_lower not in valid_crops_lower:
        # Find correct season for this crop
        correct_season = None
        for s, crops in VALID_CROP_SEASONS.items():
            if crop_lower in [c.lower() for c in crops]:
                correct_season = s
                break
        
        if correct_season:
            return {
                "valid": False,
                "error": f"Season mismatch: {crop} is a {correct_season} crop, but {season} was selected",
                "suggestion": f"Please change season to {correct_season}"
            }
        else:
            return {
                "valid": False,
                "error": f"Unknown crop: {crop}",
                "suggestion": f"Valid crops for {season}: {', '.join(valid_crops)}"
            }
    
    return {"valid": True, "error": None}


def validate_application_number(app_no: str) -> Dict[str, any]:
    """
    Validate application number format
    """
    if not app_no:
        return {"valid": False, "error": "Application number is required"}
    
    if not app_no.isdigit():
        return {"valid": False, "error": "Application number must contain only digits"}
    
    if len(app_no) < 4 or len(app_no) > 10:
        return {"valid": False, "error": "Application number must be 4-10 digits"}
    
    return {"valid": True, "error": None}


def get_required_documents(crop: str) -> List[str]:
    """
    Get required documents for a crop type
    
    INTERVIEW POINT: Different crops have different requirements
    """
    base_documents = [
        "Aadhaar Card",
        "Bank Details",
        "Land Record",
        "Sowing Certificate"
    ]
    
    # High-value crops require photos
    high_value_crops = ["Cotton", "Sugarcane", "Turmeric"]
    if crop in high_value_crops:
        base_documents.append("Crop Photos")
    
    return base_documents
