#!/usr/bin/env python3
"""
Combined seed script for risk assessment, weather, and alert data
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

import argparse
import random
import json
import sqlite3
from datetime import datetime, timedelta



# Try to import SQLAlchemy models, fallback to SQLite if not available
try:
    from sqlalchemy.orm import Session
    from db import (
        SessionLocal, RunwayRiskAssessment, BirdDetection,
        WeatherData, BirdSpecies, Runway, BirdAlert
    )
    SQLALCHEMY_AVAILABLE = True
except ImportError:
    import sqlite3
    SQLALCHEMY_AVAILABLE = False

def seed_risk_data_sqlalchemy():
    """Seed database with sample risk assessment data using SQLAlchemy"""
    session = SessionLocal()
    try:
        runways = session.query(Runway).all()
        if not runways:
            print("❌ No runways found in database")
            return
        for hour in range(24):
            for runway in runways:
                risk_assessment = RunwayRiskAssessment(
                    runway_id=runway.id,
                    timestamp=datetime.utcnow() - timedelta(hours=hour),
                    overall_risk_score=random.uniform(20, 40),
                    bird_activity_risk=random.uniform(15, 30),
                    weather_risk=random.uniform(20, 35),
                    seasonal_risk=random.uniform(40, 70),
                    traffic_density_risk=random.uniform(25, 40),
                    active_bird_count=random.randint(0, 3),
                    high_risk_species_present=random.choice([True, False]),
                    weather_conditions=json.dumps({'condition': 'clear', 'visibility': 'good'}),
                    risk_level='MODERATE',
                    recommended_action='MONITOR',
                    valid_until=datetime.utcnow() + timedelta(hours=1)
                )
                session.add(risk_assessment)
                species = session.query(BirdSpecies).all()
                if species:
                    for _ in range(random.randint(2, 5)):
                        distance = random.uniform(50, runway.approach_zone_length)
                        x = distance * random.uniform(-1, 1)
                        y = distance * random.uniform(-1, 1)
                        detection = BirdDetection(
                            species_id=random.choice(species).id,
                            timestamp=datetime.utcnow() - timedelta(minutes=random.randint(0, 1440)),
                            confidence=random.uniform(0.7, 0.95),
                            frequency_range=json.dumps({"min": 100, "max": 8000}),
                            amplitude=random.uniform(-60, -30),
                            duration=random.uniform(0.5, 3.0),
                            call_type=random.choice(['TERRITORIAL', 'FEEDING', 'WARNING']),
                            location_x=x,
                            location_y=y,
                            distance_from_runway=distance,
                            direction=random.choice(['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']),
                            weather_conditions=json.dumps({'condition': 'clear', 'visibility': 'good'}),
                            time_of_day='DAY',
                            season='SUMMER',
                            emotional_state=random.choice(['CALM', 'ALERT', 'AGITATED']),
                            behavioral_pattern='NORMAL',
                            group_behavior=random.choice([True, False])
                        )
                        session.add(detection)
        for hour in range(24):
            weather = WeatherData(
                timestamp=datetime.utcnow() - timedelta(hours=hour),
                temperature=random.uniform(15, 25),
                humidity=random.uniform(40, 80),
                pressure=random.uniform(1000, 1020),
                wind_speed=random.uniform(5, 15),
                wind_direction=random.randint(0, 359),
                wind_gust=random.uniform(8, 20),
                visibility=random.uniform(8, 15),
                precipitation=random.uniform(0, 2),
                cloud_cover=random.uniform(10, 90),
                bird_favorability_score=random.uniform(30, 70),
                migration_conditions='FAIR',
                data_source='SENSOR'
            )
            session.add(weather)
        session.commit()
        print("✅ Risk assessment data seeded successfully (SQLAlchemy)")
    except Exception as e:
        print(f"❌ Error seeding risk data: {str(e)}")
        session.rollback()
    finally:
        session.close()

def init_risk_data_sqlite():
    """Initialize risk assessment data for runways using raw SQLite3"""
    conn = sqlite3.connect('bird_strike_detection.db')
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id FROM runways")
        runway_ids = [row[0] for row in cursor.fetchall()]
        if not runway_ids:
            print("No runways found in database. Please run db.py first to initialize basic data.")
            return
        base_time = datetime.utcnow() - timedelta(hours=24)
        for runway_id in runway_ids:
            for hour in range(24):
                timestamp = base_time + timedelta(hours=hour)
                bird_activity_risk = random.uniform(10, 40)
                weather_risk = random.uniform(5, 30)
                seasonal_risk = random.uniform(15, 35)
                traffic_density_risk = random.uniform(10, 25)
                overall_risk = (
                    bird_activity_risk * 0.4 +
                    weather_risk * 0.2 +
                    seasonal_risk * 0.2 +
                    traffic_density_risk * 0.2
                )
                risk_level = (
                    'HIGH' if overall_risk > 30
                    else 'MODERATE' if overall_risk > 20
                    else 'LOW'
                )
                recommended_action = (
                    'DELAY' if risk_level == 'HIGH'
                    else 'CAUTION' if risk_level == 'MODERATE'
                    else 'NORMAL'
                )
                cursor.execute("""
                    INSERT INTO runway_risk_assessments (
                        runway_id,
                        timestamp,
                        overall_risk_score,
                        bird_activity_risk,
                        weather_risk,
                        seasonal_risk,
                        traffic_density_risk,
                        risk_level,
                        recommended_action,
                        active_bird_count,
                        high_risk_species_present,
                        valid_until
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    runway_id,
                    timestamp.strftime('%Y-%m-%d %H:%M:%S'),
                    overall_risk,
                    bird_activity_risk,
                    weather_risk,
                    seasonal_risk,
                    traffic_density_risk,
                    risk_level,
                    recommended_action,
                    random.randint(0, 10),
                    random.choice([0, 1]),
                    (timestamp + timedelta(hours=1)).strftime('%Y-%m-%d %H:%M:%S')
                ))
            print(f"✅ Generated 24 hours of risk data for runway {runway_id}")
        for hour in range(24):
            timestamp = base_time + timedelta(hours=hour)
            cursor.execute("""
                INSERT INTO weather_data (
                    timestamp,
                    temperature,
                    humidity,
                    pressure,
                    wind_speed,
                    wind_direction,
                    visibility,
                    precipitation,
                    cloud_cover,
                    bird_favorability_score,
                    migration_conditions,
                    data_source
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                timestamp.strftime('%Y-%m-%d %H:%M:%S'),
                random.uniform(60, 80),
                random.uniform(40, 80),
                random.uniform(980, 1020),
                random.uniform(5, 15),
                random.randint(0, 359),
                random.uniform(5, 10),
                random.uniform(0, 0.5),
                random.uniform(0, 100),
                random.uniform(0, 100),
                random.choice(['POOR', 'FAIR', 'GOOD', 'EXCELLENT']),
                'SENSOR'
            ))
        print("✅ Generated 24 hours of weather data (SQLite)")
        for runway_id in runway_ids:
            for _ in range(random.randint(2, 3)):
                timestamp = base_time + timedelta(hours=random.randint(0, 23))
                cursor.execute("""
                    INSERT INTO bird_alerts (
                        timestamp,
                        alert_level,
                        risk_score,
                        recommended_action,
                        proximity_to_runway,
                        flight_path_intersection,
                        flock_size,
                        resolved
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    timestamp.strftime('%Y-%m-%d %H:%M:%S'),
                    random.choice(['LOW', 'MEDIUM', 'HIGH']),
                    random.uniform(20, 80),
                    'MONITOR',
                    random.uniform(0, 1000),
                    random.choice([0, 1]),
                    random.randint(1, 10),
                    random.choice([0, 1])
                ))
            print(f"✅ Generated alerts for runway {runway_id}")
        conn.commit()
        print("✅ Successfully initialized risk assessment data! (SQLite)")
    except Exception as e:
        print(f"❌ Error initializing risk data: {str(e)}")
        conn.rollback()
    finally:
        conn.close()

def seed_test_alerts_sqlite():
    """Add some test alerts to the database using SQLite3"""
    conn = sqlite3.connect('bird_strike_detection.db')
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM bird_alerts")
        cursor.execute("SELECT id, runway_name FROM runways")
        runways = cursor.fetchall()
        if not runways:
            cursor.execute("""
                INSERT INTO runways (runway_name, airport_code, length, width, orientation, is_active)
                VALUES ('09L/27R', 'TEST', 3000, 45, 90, 1)
            """)
            conn.commit()
            cursor.execute("SELECT id, runway_name FROM runways")
            runways = cursor.fetchall()
        alert_levels = ['LOW', 'MEDIUM', 'HIGH']
        actions = [
            'Monitor bird activity near runway',
            'Consider temporary runway closure',
            'Alert ground crew for inspection',
            'Increase monitoring frequency',
            'Deploy deterrent measures'
        ]
        for i in range(5):
            timestamp = datetime.utcnow() - timedelta(hours=random.randint(0, 23))
            runway = random.choice(runways)
            cursor.execute("""
                INSERT INTO bird_detections (
                    timestamp,
                    confidence,
                    distance_from_runway,
                    direction
                ) VALUES (?, ?, ?, ?)
            """, (
                timestamp.strftime('%Y-%m-%d %H:%M:%S'),
                random.uniform(0.7, 0.95),
                random.uniform(100, 1000),
                random.choice(['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'])
            ))
            detection_id = cursor.lastrowid
            cursor.execute("""
                INSERT INTO bird_alerts (
                    detection_id,
                    timestamp,
                    alert_level,
                    risk_score,
                    recommended_action,
                    proximity_to_runway,
                    flight_path_intersection,
                    flock_size,
                    resolved
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                detection_id,
                timestamp.strftime('%Y-%m-%d %H:%M:%S'),
                random.choice(alert_levels),
                random.uniform(20, 80),
                random.choice(actions),
                random.uniform(100, 1000),
                random.choice([0, 1]),
                random.randint(1, 10),
                0
            ))
        conn.commit()
        print("✅ Test alerts added successfully (SQLite)")
    except Exception as e:
        print(f"❌ Error seeding alerts: {str(e)}")
        conn.rollback()
    finally:
        conn.close()

def seed_demo_detections():
    """Seed database with persistent demo bird detections for frontend display"""
    if not SQLALCHEMY_AVAILABLE:
        print("❌ SQLAlchemy not available. Cannot seed demo detections.")
        return
    
    session = SessionLocal()
    try:
        # First, check if demo birds already exist (avoid duplicates)
        demo_species_names = ["House Crow", "White-bellied Sea-Eagle", "Common Myna"]
        
        # Clear old demo detections (optional - you can keep this or remove)
        # This ensures we always have fresh demo data
        from db import BirdAlert
        existing_demos = session.query(BirdDetection).join(BirdSpecies).filter(
            BirdSpecies.common_name.in_(demo_species_names)
        ).all()
        
        # Only keep the 3 most recent per species
        for species_name in demo_species_names:
            species_detections = session.query(BirdDetection).join(BirdSpecies).filter(
                BirdSpecies.common_name == species_name
            ).order_by(BirdDetection.timestamp.desc()).all()
            
            if len(species_detections) > 1:
                # Keep only the most recent one, delete others
                for detection in species_detections[1:]:
                    # Delete associated alerts first
                    session.query(BirdAlert).filter(BirdAlert.detection_id == detection.id).delete()
                    session.delete(detection)
        
        session.commit()
        
        # Create demo detections
        demo_birds = [
            {
                "species_name": "House Crow",
                "confidence": 0.89,
                "location_x": 30.0,
                "location_y": 35.0,
                "call_type": "TERRITORIAL",
                "emotional_state": "ALERT",
                "behavioral_pattern": "foraging",
                "alert_level": "HIGH",
                "risk_score": 75,
                "timestamp_offset": 0  # Current time
            },
            {
                "species_name": "White-bellied Sea-Eagle",
                "confidence": 0.92,
                "location_x": 30.0,
                "location_y": 220.0,
                "call_type": "HUNTING",
                "emotional_state": "FOCUSED",
                "behavioral_pattern": "hunting",
                "alert_level": "CRITICAL",
                "risk_score": 92,
                "timestamp_offset": 5  # 5 minutes ago
            },
            {
                "species_name": "Common Myna",
                "confidence": 0.87,
                "location_x": 160.0,
                "location_y": 120.0,
                "call_type": "SOCIAL",
                "emotional_state": "CALM",
                "behavioral_pattern": "flocking",
                "alert_level": "MODERATE",
                "risk_score": 58,
                "timestamp_offset": 10  # 10 minutes ago
            }
        ]
        
        for bird_data in demo_birds:
            # Find the species
            species = session.query(BirdSpecies).filter(
                BirdSpecies.common_name == bird_data["species_name"]
            ).first()
            
            if not species:
                print(f"⚠️ Species '{bird_data['species_name']}' not found. Skipping.")
                continue
            
            # Create detection
            detection = BirdDetection(
                species_id=species.id,
                timestamp=datetime.utcnow() - timedelta(minutes=bird_data["timestamp_offset"]),
                confidence=bird_data["confidence"],
                location_x=bird_data["location_x"],
                location_y=bird_data["location_y"],
                call_type=bird_data["call_type"],
                emotional_state=bird_data["emotional_state"],
                behavioral_pattern=bird_data["behavioral_pattern"],
                distance_from_runway=100.0,
                direction="N",
                weather_conditions='{"condition": "clear"}',
                time_of_day="DAY",
                season="SUMMER",
                group_behavior=False
            )
            session.add(detection)
            session.flush()  # Get the detection ID
            
            # Create associated alert
            alert = BirdAlert(
                detection_id=detection.id,
                species_id=species.id,
                timestamp=detection.timestamp,
                alert_level=bird_data["alert_level"],
                risk_score=bird_data["risk_score"],
                recommended_action="MONITOR",
                proximity_to_runway=100.0,
                flight_path_intersection=False,
                flock_size=1,
                resolved=False
            )
            session.add(alert)
        
        session.commit()
        print(f"✅ Demo detections seeded successfully: {len(demo_birds)} birds")
    except Exception as e:
        print(f"❌ Error seeding demo detections: {str(e)}")
        import traceback
        traceback.print_exc()
        session.rollback()
    finally:
        session.close()


def main():
    parser = argparse.ArgumentParser(description="Seed/init risk, weather, and alert data.")
    parser.add_argument('--risk', action='store_true', help='Seed risk and weather data (SQLAlchemy if available)')
    parser.add_argument('--init', action='store_true', help='Initialize risk, weather, and alert data (SQLite)')
    parser.add_argument('--alerts', action='store_true', help='Seed test alerts (SQLite)')
    parser.add_argument('--demo', action='store_true', help='Seed demo bird detections for frontend')
    parser.add_argument('--all', action='store_true', help='Run all seeding/init operations')
    args = parser.parse_args()

    if args.all or (not args.risk and not args.init and not args.alerts and not args.demo):
        if SQLALCHEMY_AVAILABLE:
            seed_risk_data_sqlalchemy()
        else:
            init_risk_data_sqlite()
        seed_test_alerts_sqlite()
        seed_demo_detections()
    else:
        if args.risk:
            if SQLALCHEMY_AVAILABLE:
                seed_risk_data_sqlalchemy()
            else:
                print("SQLAlchemy not available. Use --init for SQLite seeding.")
        if args.init:
            init_risk_data_sqlite()
        if args.alerts:
            seed_test_alerts_sqlite()
        if args.demo:
            seed_demo_detections()

if __name__ == "__main__":
    main() 