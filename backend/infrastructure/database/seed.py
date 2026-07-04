from backend.infrastructure.database.connection import Base, engine, db_session, SessionLocal
from backend.infrastructure.database.models import *
import random
from datetime import datetime, timedelta
from backend.services.external_image import BirdImageService

# Database initialization functions
def init_database():
    """Initialize database with tables"""
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully")

def seed_runways():
    """Seed database with sample runway data"""
    session = SessionLocal()
    
    runway_data = [
        {
            "runway_name": "09L/27R",
            "airport_code": "LAX",
            "length": 3685,
            "width": 45,
            "orientation": 90,
            "operational_hours": '{"start": "06:00", "end": "23:00"}'
        },
        {
            "runway_name": "09R/27L",
            "airport_code": "LAX",
            "length": 3685,
            "width": 45,
            "orientation": 90,
            "operational_hours": '{"start": "06:00", "end": "23:00"}'
        },
        {
            "runway_name": "04L/22R",
            "airport_code": "LAX",
            "length": 3382,
            "width": 45,
            "orientation": 40,
            "operational_hours": '{"start": "06:00", "end": "23:00"}'
        },
        {
            "runway_name": "04R/22L",
            "airport_code": "LAX",
            "length": 3382,
            "width": 45,
            "orientation": 40,
            "operational_hours": '{"start": "06:00", "end": "23:00"}'
        }
    ]
    
    for runway_info in runway_data:
        existing = session.query(Runway).filter_by(
            runway_name=runway_info["runway_name"]
        ).first()
        
        if not existing:
            runway = Runway(**runway_info)
            session.add(runway)
            print(f"✅ Added runway {runway_info['runway_name']}")
    
    session.commit()
    session.close()
    print("✅ Runway data seeded successfully")

def seed_bird_species():
    """Seed database with common bird species"""
    session = SessionLocal()
    image_service = BirdImageService()
    
    species_data = [
        {
            "scientific_name": "Turdus migratorius",
            "common_name": "American Robin",
            "risk_level": "LOW",
            "size_category": "SMALL",
            "typical_behavior": "Ground foraging, territorial calls",
            "migration_pattern": "Partial migrant"
        },
        {
            "scientific_name": "Buteo jamaicensis",
            "common_name": "Red-tailed Hawk",
            "risk_level": "HIGH",
            "size_category": "LARGE",
            "typical_behavior": "Soaring, hunting calls",
            "migration_pattern": "Resident"
        },
        {
            "scientific_name": "Passer domesticus",
            "common_name": "House Sparrow",
            "risk_level": "LOW",
            "size_category": "SMALL",
            "typical_behavior": "Social chirping, ground feeding",
            "migration_pattern": "Resident"
        },
        {
            "scientific_name": "Corvus splendens",
            "common_name": "House Crow",
            "risk_level": "HIGH",
            "size_category": "MEDIUM",
            "typical_behavior": "Intelligent, territorial, scavenging",
            "migration_pattern": "Resident"
        },
        {
            "scientific_name": "Larus argentatus",
            "common_name": "Herring Gull",
            "risk_level": "CRITICAL",
            "size_category": "LARGE",
            "typical_behavior": "Flocking, aggressive feeding",
            "migration_pattern": "Seasonal migrant"
        },
        {
            "scientific_name": "Hirundo rustica",
            "common_name": "Barn Swallow",
            "risk_level": "MEDIUM",
            "size_category": "SMALL",
            "typical_behavior": "Aerial feeding, social calls",
            "migration_pattern": "Long-distance migrant"
        },
        {
            "scientific_name": "Falco tinnunculus",
            "common_name": "Common Kestrel",
            "risk_level": "HIGH",
            "size_category": "MEDIUM",
            "typical_behavior": "Hovering, sharp calls",
            "migration_pattern": "Partial migrant"
        },
        {
            "scientific_name": "Sturnus vulgaris",
            "common_name": "European Starling",
            "risk_level": "HIGH",
            "size_category": "SMALL",
            "typical_behavior": "Flocking, mimicry",
            "migration_pattern": "Resident"
        }
    ]
    
    for species_info in species_data:
        existing = session.query(BirdSpecies).filter_by(
            scientific_name=species_info["scientific_name"]
        ).first()
        
        if not existing:
            print(f"🔍 Fetching image for {species_info['common_name']}...")
            image_data = image_service.fetch_bird_image(
                species_info['common_name'],
                species_info['scientific_name']
            )
            
            species_info.update(image_data)
            
            species = BirdSpecies(**species_info)
            session.add(species)
            print(f"✅ Added {species_info['common_name']} with image")
        else:
            if existing.image_data is None:
                print(f"🔍 Fetching image for existing species: {existing.common_name}")
                image_data = image_service.fetch_bird_image(
                    existing.common_name,
                    existing.scientific_name
                )
                
                existing.image_url = image_data['image_url']
                existing.image_data = image_data['image_data']
                existing.image_source = image_data['image_source']
                existing.image_fetched_at = image_data['image_fetched_at']
                print(f"✅ Updated {existing.common_name} with image")
    
    session.commit()
    session.close()
    print("✅ Bird species seeded successfully")

def seed_behavior_data():
    """Seed database with behavior analytics data"""
    session = SessionLocal()
    
    # Daily patterns
    daily_patterns = [
        {"time_of_day": "06:00", "activity_level": 85, "species_count": 12},
        {"time_of_day": "08:00", "activity_level": 95, "species_count": 15},
        {"time_of_day": "10:00", "activity_level": 70, "species_count": 10},
        {"time_of_day": "12:00", "activity_level": 45, "species_count": 8},
        {"time_of_day": "14:00", "activity_level": 60, "species_count": 9},
        {"time_of_day": "16:00", "activity_level": 80, "species_count": 13},
        {"time_of_day": "18:00", "activity_level": 90, "species_count": 14},
        {"time_of_day": "20:00", "activity_level": 30, "species_count": 6}
    ]
    
    for pattern in daily_patterns:
        existing = session.query(DailyPattern).filter_by(
            time_of_day=pattern["time_of_day"]
        ).first()
        
        if not existing:
            daily = DailyPattern(**pattern)
            session.add(daily)
    
    # Migration data
    migration_data = [
        {"species_id": 1, "peak_period": "March 15-30", "status": "Active", "bird_count": 156},
        {"species_id": 2, "peak_period": "April 1-15", "status": "Starting", "bird_count": 89},
        {"species_id": 6, "peak_period": "April 10-25", "status": "Upcoming", "bird_count": 23},
    ]
    
    for migration in migration_data:
        existing = session.query(MigrationData).filter_by(
            species_id=migration["species_id"],
            peak_period=migration["peak_period"]
        ).first()
        
        if not existing:
            mig = MigrationData(**migration)
            session.add(mig)
    
    # Behavior insights
    insights = [
        {
            "title": "Morning Territorial Behavior",
            "description": "Peak territorial calling occurs between 6-8 AM, primarily from resident species",
            "impact_level": "High",
            "recommendation": "Schedule maintenance activities to avoid peak territorial hours"
        },
        {
            "title": "Weather-Driven Feeding Patterns",
            "description": "Bird activity increases 40% on overcast days due to optimal foraging conditions",
            "impact_level": "Medium",
            "recommendation": "Increase monitoring on cloudy days"
        },
        {
            "title": "Human Adaptation Learning",
            "description": "Birds show 67% faster adaptation to new airport schedules compared to last year",
            "impact_level": "Positive",
            "recommendation": "Continue consistent deterrent timing"
        }
    ]
    
    for insight in insights:
        existing = session.query(BehaviorInsight).filter_by(
            title=insight["title"]
        ).first()
        
        if not existing:
            behavior = BehaviorInsight(**insight)
            session.add(behavior)
    
    session.commit()
    session.close()
    print("✅ Behavior analytics data seeded successfully")

def seed_translator_data():
    """Seed database with bird translator data"""
    session = SessionLocal()
    
    # Bird personalities
    personalities = [
        {
            "species_id": 1,
            "name": "Alpha Robin #1",
            "personality_type": "Assertive Leader",
            "territory": "Northwest Quadrant",
            "behavior_notes": "Highly territorial, consistent morning vocalist, protective of nesting area",
            "social_rank": "Dominant",
            "stress_level": "Low",
            "learning_patterns": "Adapts quickly to human schedules"
        },
        {
            "species_id": 3,
            "name": "Social Sparrow #3",
            "personality_type": "Community Coordinator",
            "territory": "Central Food Area",
            "behavior_notes": "Excellent communicator, mediates disputes, organizes group feeding",
            "social_rank": "Facilitator",
            "stress_level": "Medium",
            "learning_patterns": "Teaches flock about human behavior patterns"
        }
    ]
    
    for personality in personalities:
        existing = session.query(BirdPersonality).filter_by(
            name=personality["name"]
        ).first()
        
        if not existing:
            bird_personality = BirdPersonality(**personality)
            session.add(bird_personality)
    
    session.commit()
    session.close()
    print("✅ Bird translator data seeded successfully")

def get_db():
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Enhanced Database Manager
