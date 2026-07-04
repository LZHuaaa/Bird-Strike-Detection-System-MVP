from sqlalchemy.orm import Session
from backend.infrastructure.database.connection import db_session
from backend.infrastructure.database.models import *
from datetime import datetime
from backend.services.external_image import BirdImageService
import random

class DatabaseManager:
    def __init__(self):
        self.session = db_session
        self.image_service = BirdImageService()
    
    def add_detection(self, detection_data):
        """Add new bird detection to database"""
        if 'location_type' not in detection_data:
            detection_data['location_type'] = 'airport'
        detection = BirdDetection(**detection_data)
        self.session.add(detection)
        self.session.commit()
        return detection
    
    def add_alert(self, alert_data):
        """Add new alert to database"""
        if 'location_type' not in alert_data:
            alert_data['location_type'] = 'airport'
        alert = BirdAlert(**alert_data)
        self.session.add(alert)
        self.session.commit()
        return alert
    
    def add_runway_risk_assessment(self, runway_id, risk_data):
        """Add runway risk assessment"""
        risk_assessment = RunwayRiskAssessment(
            runway_id=runway_id,
            **risk_data
        )
        self.session.add(risk_assessment)
        self.session.commit()
        return risk_assessment
    
    def add_weather_data(self, weather_data):
        """Add weather data"""
        weather = WeatherData(**weather_data)
        self.session.add(weather)
        self.session.commit()
        return weather
    
    def add_bird_strike_incident(self, incident_data):
        """Add bird strike incident"""
        incident = BirdStrikeIncident(**incident_data)
        self.session.add(incident)
        self.session.commit()
        return incident
    
    def add_predator_sound_event(self, event_data):
        """Add predator sound event"""
        if 'location_type' not in event_data:
            event_data['location_type'] = 'airport'
        event = PredatorSoundEvent(**event_data)
        self.session.add(event)
        self.session.commit()
        return event
    
    def get_runway_current_risk(self, runway_name):
        """Get current risk assessment for a runway"""
        runway = self.session.query(Runway).filter_by(runway_name=runway_name).first()
        if not runway:
            return None
        
        current_risk = self.session.query(RunwayRiskAssessment).filter_by(
            runway_id=runway.id
        ).order_by(RunwayRiskAssessment.timestamp.desc()).first()
        
        return current_risk
    
    def get_recent_detections(self, limit=10):
        """Get recent bird detections with species images"""
        detections = self.session.query(BirdDetection).join(BirdSpecies).order_by(
            BirdDetection.timestamp.desc()
        ).limit(limit).all()
        
        for detection in detections:
            if not detection.species.image_data:
                self._fetch_species_image(detection.species)
        
        return detections
    
    def get_active_alerts(self):
        """Get unresolved alerts"""
        return self.session.query(BirdAlert).filter_by(
            resolved=False
        ).order_by(BirdAlert.timestamp.desc()).all()
    
    def get_species_by_name(self, common_name):
        """Get species by common name"""
        species = self.session.query(BirdSpecies).filter_by(
            common_name=common_name
        ).first()
        
        if species is not None and species.image_data is None:
            self._fetch_species_image(species)
        
        return species
    
    def _fetch_species_image(self, species):
        """Fetch and save image for a species"""
        try:
            print(f"🔍 Fetching image for {species.common_name}...")
            image_data = self.image_service.fetch_bird_image(
                species.common_name,
                species.scientific_name
            )
            
            species.image_url = image_data['image_url']
            species.image_data = image_data['image_data']
            species.image_source = image_data['image_source']
            species.image_fetched_at = image_data['image_fetched_at']
            
            self.session.commit()
            print(f"✅ Image fetched for {species.common_name}")
            
        except Exception as e:
            print(f"❌ Failed to fetch image for {species.common_name}: {str(e)}")
    
    def get_detection_stats(self):
        """Get detection statistics"""
        from sqlalchemy import func
        
        total_detections = self.session.query(BirdDetection).count()
        total_alerts = self.session.query(BirdAlert).count()
        high_risk_alerts = self.session.query(BirdAlert).filter(
            BirdAlert.alert_level.in_(['HIGH', 'CRITICAL'])
        ).count()
        
        most_common = self.session.query(
            BirdSpecies.common_name,
            func.count(BirdDetection.id).label('count')
        ).join(BirdDetection).group_by(BirdSpecies.common_name).order_by(
            func.count(BirdDetection.id).desc()
        ).first()
        
        avg_confidence = self.session.query(
            func.avg(BirdDetection.confidence)
        ).scalar() or 0.0

        # Add species count
        species_count = self.session.query(func.count(func.distinct(BirdDetection.species_id))).scalar() or 0
        
        # Add active (unresolved) alerts
        active_alerts = self.session.query(BirdAlert).filter(
            BirdAlert.resolved == False
        ).count()
        
        return {
            'total_detections': total_detections,
            'total_alerts': total_alerts,
            'high_risk_alerts': high_risk_alerts,
            'most_common_species': most_common[0] if most_common else None,
            'average_confidence': avg_confidence,
            'species_count': species_count,
            'active_alerts': active_alerts
        }
    
    # New methods for behavior analytics
    def get_daily_patterns(self):
        """Get daily activity patterns"""
        return self.session.query(DailyPattern).order_by(
            DailyPattern.time_of_day.asc()
        ).all()
    
    def get_migration_data(self):
        """Get migration patterns"""
        return self.session.query(MigrationData).join(BirdSpecies).all()
    
    def get_behavior_insights(self, limit=3):
        """Get AI-generated behavior insights"""
        return self.session.query(BehaviorInsight).order_by(
            BehaviorInsight.generated_at.desc()
        ).limit(limit).all()
    
    # New methods for bird translator
    def add_translation(self, translation_data):
        """Add bird call translation"""
        translation = BirdTranslation(**translation_data)
        self.session.add(translation)
        self.session.commit()
        return translation
    
    def get_recent_translations(self, limit=5):
        """Get recent bird translations"""
        return self.session.query(BirdTranslation).join(BirdDetection).order_by(
            BirdTranslation.id.desc()
        ).limit(limit).all()
    
    def get_bird_personalities(self):
        """Get bird personality profiles"""
        return self.session.query(BirdPersonality).join(BirdSpecies).all()
    
    def get_effectiveness_by_environment(self, location_type):
        """Get effectiveness by environment"""
        events = self.session.query(PredatorSoundEvent).filter_by(location_type=location_type).all()
        effectiveness_values = [e.effectiveness for e in events if e.effectiveness is not None]
        if effectiveness_values:
            avg_effectiveness = sum(effectiveness_values) / len(effectiveness_values)
        else:
            avg_effectiveness = None
        return {
            'location_type': location_type,
            'average_effectiveness': avg_effectiveness,
            'event_count': len(effectiveness_values)
        }
    
    def close(self):
        db_session.remove()

# Database setup script
if __name__ == "__main__":
    print("🚀 Initializing Enhanced Bird Strike Detection Database...")
    
    # Create database and tables
    init_database()
    
    # Seed with data
    seed_runways()
    seed_bird_species()
    seed_behavior_data()
    seed_translator_data()
    
    # Test database connection
    db_manager = DatabaseManager()
    stats = db_manager.get_detection_stats()
    print(f"📊 Database initialized with enhanced schema")
    print(f"Total detections: {stats['total_detections']}")
    print(f"Total alerts: {stats['total_alerts']}")
    print(f"High risk alerts: {stats['high_risk_alerts']}")
    
    # Test new tables
    daily_patterns = db_manager.get_daily_patterns()
    print(f"📅 Daily patterns: {len(daily_patterns)} records")
    
    personalities = db_manager.get_bird_personalities()
    print(f"🐦 Bird personalities: {len(personalities)} records")
    
    db_manager.close()
    
    print("✅ Enhanced database setup complete!")