from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.infrastructure.database.connection import Base

class BirdSpecies(Base):
    __tablename__ = "bird_species"
    
    id = Column(Integer, primary_key=True, index=True)
    scientific_name = Column(String, unique=True, index=True)
    common_name = Column(String, index=True)
    risk_level = Column(String)  # LOW, MEDIUM, HIGH
    size_category = Column(String)  # SMALL, MEDIUM, LARGE
    typical_behavior = Column(Text)
    migration_pattern = Column(String)
    
    # Image data
    image_url = Column(String)
    image_data = Column(Text)
    image_source = Column(String)
    image_fetched_at = Column(DateTime)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    detections = relationship("BirdDetection", back_populates="species")
    alerts = relationship("BirdAlert", back_populates="species")
    personalities = relationship("BirdPersonality", back_populates="species")
    migration_data = relationship("MigrationData", back_populates="species")

class BirdDetection(Base):
    __tablename__ = "bird_detections"
    
    id = Column(Integer, primary_key=True, index=True)
    species_id = Column(Integer, ForeignKey("bird_species.id"))
    timestamp = Column(DateTime, default=datetime.utcnow)
    confidence = Column(Float)
    
    # Audio characteristics
    frequency_range = Column(String)  # JSON: {"min": 100, "max": 8000}
    amplitude = Column(Float)
    duration = Column(Float)
    call_type = Column(String)  # TERRITORIAL, FEEDING, SOCIAL, WARNING, MATING
    
    # Location data
    location_x = Column(Float)
    location_y = Column(Float)
    distance_from_runway = Column(Float)
    direction = Column(String)  # N, NE, E, SE, S, SW, W, NW
    
    # Environmental context
    weather_conditions = Column(String)
    time_of_day = Column(String)
    season = Column(String)
    
    # AI Analysis
    emotional_state = Column(String)  # CALM, ALERT, AGITATED, FOCUSED, PANICKED
    behavioral_pattern = Column(String)
    group_behavior = Column(Boolean, default=False)
    
    # Location type
    location_type = Column(String, default="airport")

    # NEW: Audio segment filename for playback
    audio_segment_filename = Column(String, nullable=True)
    
    # NEW: Track if detection occurred during predator sound playback
    during_predator_sound = Column(Boolean, default=False)
    
    # Relationships
    species = relationship("BirdSpecies", back_populates="detections")
    alerts = relationship("BirdAlert", back_populates="detection")
    translations = relationship("BirdTranslation", back_populates="detection")

class BirdAlert(Base):
    __tablename__ = "bird_alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    detection_id = Column(Integer, ForeignKey("bird_detections.id"))
    species_id = Column(Integer, ForeignKey("bird_species.id"))
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Alert details
    alert_level = Column(String)  # LOW, MEDIUM, HIGH, CRITICAL
    risk_score = Column(Float)
    recommended_action = Column(String)  # MONITOR, DELAY_TAKEOFF, EMERGENCY_PROTOCOL
    
    # Strike risk factors
    proximity_to_runway = Column(Float)
    flight_path_intersection = Column(Boolean, default=False)
    flock_size = Column(Integer, default=1)
    
    # Response tracking
    acknowledged = Column(Boolean, default=False)
    acknowledged_by = Column(String)
    acknowledged_at = Column(DateTime)
    action_taken = Column(String)
    resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime)
    ai_analysis = Column(Text, nullable=True)  # or String if you prefer
    
    # Location type
    location_type = Column(String, default="airport")
    
    # Relationships
    detection = relationship("BirdDetection", back_populates="alerts")
    species = relationship("BirdSpecies", back_populates="alerts")

class AudioSession(Base):
    __tablename__ = "audio_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, unique=True, index=True)
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime)
    
    # Audio configuration
    sample_rate = Column(Integer, default=44100)
    channels = Column(Integer, default=16)
    bit_depth = Column(Integer, default=16)
    
    # Session statistics
    total_detections = Column(Integer, default=0)
    total_alerts = Column(Integer, default=0)
    avg_confidence = Column(Float, default=0.0)
    
    # Status
    is_active = Column(Boolean, default=True)
    
class SystemMetrics(Base):
    __tablename__ = "system_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # System performance
    cpu_usage = Column(Float)
    memory_usage = Column(Float)
    disk_usage = Column(Float)
    
    # Detection metrics
    detections_per_minute = Column(Float)
    false_positive_rate = Column(Float)
    system_uptime = Column(Float)
    
    # Audio system
    audio_level = Column(Float)
    microphone_status = Column(String)
    
    # Network
    connected_airports = Column(Integer)
    network_latency = Column(Float)

# NEW TABLES - Enhanced functionality

class Runway(Base):
    __tablename__ = "runways"
    
    id = Column(Integer, primary_key=True, index=True)
    runway_name = Column(String, unique=True, index=True)  # e.g., "09L/27R"
    airport_code = Column(String, index=True)  # e.g., "LAX"
    
    # Physical characteristics
    length = Column(Float)  # meters
    width = Column(Float)  # meters
    orientation = Column(Integer)  # degrees (0-360)
    
    # Operational status
    is_active = Column(Boolean, default=True)
    operational_hours = Column(String)  # JSON: {"start": "06:00", "end": "23:00"}
    
    # Risk zones around runway
    approach_zone_length = Column(Float, default=3000)  # meters
    departure_zone_length = Column(Float, default=1500)  # meters
    side_clearance = Column(Float, default=150)  # meters
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    risk_assessments = relationship("RunwayRiskAssessment", back_populates="runway")
    flight_schedules = relationship("FlightSchedule", back_populates="runway")

class RunwayRiskAssessment(Base):
    __tablename__ = "runway_risk_assessments"
    
    id = Column(Integer, primary_key=True, index=True)
    runway_id = Column(Integer, ForeignKey("runways.id"))
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Risk metrics
    overall_risk_score = Column(Float)  # 0-100
    bird_activity_risk = Column(Float)  # 0-100
    weather_risk = Column(Float)  # 0-100
    seasonal_risk = Column(Float)  # 0-100
    traffic_density_risk = Column(Float)  # 0-100
    
    # Current conditions
    active_bird_count = Column(Integer, default=0)
    high_risk_species_present = Column(Boolean, default=False)
    weather_conditions = Column(String)  # JSON weather data
    
    # Recommendations
    risk_level = Column(String)  # LOW, MODERATE, HIGH, CRITICAL
    recommended_action = Column(String)  # NORMAL, MONITOR, CAUTION, DELAY
    
    # Validity
    valid_until = Column(DateTime)
    
    # Relationships
    runway = relationship("Runway", back_populates="risk_assessments")

class WeatherData(Base):
    __tablename__ = "weather_data"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Basic weather
    temperature = Column(Float)  # Celsius
    humidity = Column(Float)  # percentage
    pressure = Column(Float)  # hPa
    
    # Wind data
    wind_speed = Column(Float)  # m/s
    wind_direction = Column(Integer)  # degrees
    wind_gust = Column(Float)  # m/s
    
    # Visibility and precipitation
    visibility = Column(Float)  # km
    precipitation = Column(Float)  # mm/h
    cloud_cover = Column(Float)  # percentage
    
    # Bird activity factors
    bird_favorability_score = Column(Float)  # 0-100
    migration_conditions = Column(String)  # POOR, FAIR, GOOD, EXCELLENT
    
    # Data source
    data_source = Column(String)  # API, MANUAL, SENSOR
    
    created_at = Column(DateTime, default=datetime.utcnow)

class FlightSchedule(Base):
    __tablename__ = "flight_schedules"
    
    id = Column(Integer, primary_key=True, index=True)
    runway_id = Column(Integer, ForeignKey("runways.id"))
    
    # Flight information
    flight_number = Column(String, index=True)
    airline = Column(String)
    aircraft_type = Column(String)
    
    # Schedule
    scheduled_time = Column(DateTime)
    actual_time = Column(DateTime)
    flight_type = Column(String)  # ARRIVAL, DEPARTURE
    
    # Status
    status = Column(String)  # SCHEDULED, DELAYED, CANCELLED, COMPLETED
    delay_reason = Column(String)
    bird_related_delay = Column(Boolean, default=False)
    
    # Risk assessment
    pre_flight_risk_score = Column(Float)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    runway = relationship("Runway", back_populates="flight_schedules")

class BirdStrikeIncident(Base):
    __tablename__ = "bird_strike_incidents"
    
    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(String, unique=True, index=True)
    
    # Basic incident information
    timestamp = Column(DateTime, default=datetime.utcnow)
    runway_id = Column(Integer, ForeignKey("runways.id"))
    flight_number = Column(String)
    aircraft_type = Column(String)
    
    # Strike details
    strike_location = Column(String)  # ENGINE, WINDSHIELD, WING, FUSELAGE
    bird_species_id = Column(Integer, ForeignKey("bird_species.id"))
    number_of_birds = Column(Integer, default=1)
    
    # Damage assessment
    damage_level = Column(String)  # NONE, MINOR, MODERATE, MAJOR, SUBSTANTIAL
    damage_cost = Column(Float)  # USD
    aircraft_damage_description = Column(Text)
    
    # Flight impact
    flight_phase = Column(String)  # TAXI, TAKEOFF, CLIMB, APPROACH, LANDING
    altitude = Column(Float)  # feet
    speed = Column(Float)  # knots
    
    # Response and outcome
    emergency_declared = Column(Boolean, default=False)
    return_to_airport = Column(Boolean, default=False)
    injuries = Column(Integer, default=0)
    fatalities = Column(Integer, default=0)
    
    # Investigation
    investigation_status = Column(String)  # OPEN, CLOSED, PENDING
    investigation_findings = Column(Text)
    
    # Prevention analysis
    could_have_been_prevented = Column(Boolean)
    prevention_recommendations = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)

class PredictiveModel(Base):
    __tablename__ = "predictive_models"
    
    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String, unique=True, index=True)
    model_type = Column(String)  # RISK_PREDICTION, SPECIES_DETECTION, BEHAVIOR_ANALYSIS
    
    # Model metadata
    version = Column(String)
    training_data_size = Column(Integer)
    accuracy_score = Column(Float)
    last_trained = Column(DateTime)
    
    # Model parameters
    parameters = Column(Text)  # JSON serialized parameters
    feature_importance = Column(Text)  # JSON serialized feature importance
    
    # Performance metrics
    precision = Column(Float)
    recall = Column(Float)
    f1_score = Column(Float)
    
    # Status
    is_active = Column(Boolean, default=True)
    deployment_date = Column(DateTime)
    
    created_at = Column(DateTime, default=datetime.utcnow)

class RiskPrediction(Base):
    __tablename__ = "risk_predictions"
    
    id = Column(Integer, primary_key=True, index=True)
    model_id = Column(Integer, ForeignKey("predictive_models.id"))
    runway_id = Column(Integer, ForeignKey("runways.id"))
    
    # Prediction details
    prediction_timestamp = Column(DateTime, default=datetime.utcnow)
    forecast_timestamp = Column(DateTime)  # When the prediction is for
    
    # Risk scores
    predicted_risk_score = Column(Float)  # 0-100
    confidence_interval = Column(Float)  # 0-100
    
    # Contributing factors
    weather_contribution = Column(Float)
    seasonal_contribution = Column(Float)
    historical_contribution = Column(Float)
    bird_activity_contribution = Column(Float)
    
    # Prediction details
    prediction_horizon = Column(Integer)  # hours
    model_confidence = Column(Float)  # 0-100
    
    # Validation (if available)
    actual_risk_score = Column(Float)
    prediction_accuracy = Column(Float)
    
    created_at = Column(DateTime, default=datetime.utcnow)

class UserActivity(Base):
    __tablename__ = "user_activities"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    username = Column(String)
    user_role = Column(String)  # OPERATOR, SUPERVISOR, ADMIN
    
    # Activity details
    activity_type = Column(String)  # LOGIN, ALERT_ACK, SYSTEM_CONFIG, REPORT_GENERATE
    activity_description = Column(Text)
    target_object = Column(String)  # What was acted upon
    
    # System interaction
    ip_address = Column(String)
    user_agent = Column(String)
    session_id = Column(String)
    
    # Timestamps
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Result
    success = Column(Boolean, default=True)
    error_message = Column(String)

# NEW TABLES FOR BEHAVIOR ANALYTICS AND TRANSLATOR
class BirdPersonality(Base):
    __tablename__ = "bird_personalities"
    
    id = Column(Integer, primary_key=True, index=True)
    species_id = Column(Integer, ForeignKey("bird_species.id"))
    name = Column(String)  # e.g., "Alpha Robin #1"
    personality_type = Column(String)  # Assertive Leader, Community Coordinator
    territory = Column(String)  # Northwest Quadrant
    behavior_notes = Column(Text)
    social_rank = Column(String)  # Dominant, Facilitator
    stress_level = Column(String)  # Low, Medium, High
    learning_patterns = Column(Text)
    
    # Relationships
    species = relationship("BirdSpecies", back_populates="personalities")

class BirdTranslation(Base):
    __tablename__ = "bird_translations"
    
    id = Column(Integer, primary_key=True, index=True)
    detection_id = Column(Integer, ForeignKey("bird_detections.id"))
    original_call = Column(String)
    translation = Column(Text)
    emotion = Column(String)  # Confident, Focused, Excited
    context = Column(String)  # Territorial Defense, Hunting Alert
    confidence = Column(Float)
    
    # Relationships
    detection = relationship("BirdDetection", back_populates="translations")

class DailyPattern(Base):
    __tablename__ = "daily_patterns"
    
    id = Column(Integer, primary_key=True, index=True)
    time_of_day = Column(String)  # e.g., "06:00"
    activity_level = Column(Integer)  # 0-100%
    species_count = Column(Integer)
    timestamp = Column(DateTime, default=datetime.utcnow)

class MigrationData(Base):
    __tablename__ = "migration_data"
    
    id = Column(Integer, primary_key=True, index=True)
    species_id = Column(Integer, ForeignKey("bird_species.id"))
    peak_period = Column(String)  # March 15-30
    status = Column(String)  # Active, Starting, Upcoming
    bird_count = Column(Integer)
    forecast_date = Column(DateTime)
    
    # Relationships
    species = relationship("BirdSpecies", back_populates="migration_data")

class BehaviorInsight(Base):
    __tablename__ = "behavior_insights"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    description = Column(Text)
    impact_level = Column(String)  # High, Medium, Positive
    recommendation = Column(Text)
    generated_at = Column(DateTime, default=datetime.utcnow)

# NEW TABLE FOR PREDATOR SOUND EVENTS
class PredatorSoundEvent(Base):
    __tablename__ = "predator_sound_events"
    id = Column(Integer, primary_key=True, index=True)
    sound_type = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
    effectiveness = Column(Float, nullable=True)
    location_type = Column(String, default="airport")
    target_species = Column(String)  # Add this field
    target_species_scientific = Column(String)  # Add this field

