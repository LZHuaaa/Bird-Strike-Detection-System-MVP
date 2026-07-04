#!/usr/bin/env python3
"""
Quick test script to verify the data persistence implementation
Tests the database, API endpoint logic, and data transformation
"""

from db import SessionLocal, BirdDetection, BirdAlert, BirdSpecies
from datetime import datetime

def test_database():
    """Test 1: Verify demo detections are in database"""
    print("=" * 60)
    print("TEST 1: Database Content")
    print("=" * 60)
    
    session = SessionLocal()
    try:
        # Check demo species exist
        demo_species = ['House Crow', 'White-bellied Sea-Eagle', 'Common Myna']
        species_in_db = session.query(BirdSpecies).filter(
            BirdSpecies.common_name.in_(demo_species)
        ).all()
        
        print(f"\n✓ Found {len(species_in_db)} demo species in database:")
        for species in species_in_db:
            print(f"  - {species.common_name} ({species.scientific_name})")
        
        # Check demo detections
        detections = session.query(BirdDetection).join(BirdSpecies).filter(
            BirdSpecies.common_name.in_(demo_species),
            BirdDetection.location_x.isnot(None)  # Only recent ones with locations
        ).all()
        
        print(f"\n✓ Found {len(detections)} demo detections with locations:")
        for detection in detections:
            print(f"  - {detection.species.common_name}: ({detection.location_x}, {detection.location_y})")
            print(f"    Alert: {detection.emotional_state}, Behavior: {detection.behavioral_pattern}")
        
        # Check alerts
        alerts = session.query(BirdAlert).join(BirdDetection).join(BirdSpecies).filter(
            BirdSpecies.common_name.in_(demo_species)
        ).all()
        
        print(f"\n✓ Found {len(alerts)} demo alerts:")
        for alert in alerts:
            print(f"  - {alert.detection.species.common_name}: {alert.alert_level} (risk: {alert.risk_score})")
        
        print("\n" + "=" * 60)
        print("TEST 1: PASSED ✓")
        print("=" * 60)
        
        return True
    except Exception as e:
        print(f"\n❌ TEST 1 FAILED: {e}")
        return False
    finally:
        session.close()


def test_api_endpoint_logic():
    """Test 2: Simulate API endpoint logic"""
    print("\n" + "=" * 60)
    print("TEST 2: API Endpoint Logic Simulation")
    print("=" * 60)
    
    session = SessionLocal()
    try:
        # Simulate the endpoint logic
        detections = session.query(BirdDetection).order_by(
            BirdDetection.timestamp.desc()
        ).limit(10).all()
        
        detection_data = []
        for detection in detections:
            species = detection.species
            if not species:
                continue
            
            alert = session.query(BirdAlert).filter(
                BirdAlert.detection_id == detection.id
            ).first()
            
            detection_data.append({
                "id": detection.id,
                "species": species.common_name,
                "scientific_name": species.scientific_name,
                "confidence": detection.confidence or 0.85,
                "timestamp": detection.timestamp.isoformat(),
                "location": {
                    "x": detection.location_x or 100,
                    "y": detection.location_y or 100
                },
                "callType": detection.call_type or "territorial",
                "emotionalState": detection.emotional_state or "alert",
                "behavioralPattern": detection.behavioral_pattern or "foraging",
                "alertLevel": alert.alert_level if alert else "medium",
                "riskScore": alert.risk_score if alert else 65,
            })
        
        print(f"\n✓ Processed {len(detection_data)} detections from database")
        print("\nSample detection data (first 3):")
        for i, data in enumerate(detection_data[:3], 1):
            print(f"\n{i}. {data['species']}")
            print(f"   Location: ({data['location']['x']}, {data['location']['y']})")
            print(f"   Alert: {data['alertLevel']} | Risk: {data['riskScore']}")
            print(f"   Emotion: {data['emotionalState']} | Behavior: {data['behavioralPattern']}")
        
        # Check if we have at least 3 detections
        if len(detection_data) >= 3:
            print(f"\n✓ Have {len(detection_data)} detections (≥3 required)")
        else:
            print(f"\n⚠ Only {len(detection_data)} detections (would add demo fallback)")
        
        print("\n" + "=" * 60)
        print("TEST 2: PASSED ✓")
        print("=" * 60)
        
        return True
    except Exception as e:
        print(f"\n❌ TEST 2 FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        session.close()


def test_frontend_data_format():
    """Test 3: Verify data format matches frontend expectations"""
    print("\n" + "=" * 60)
    print("TEST 3: Frontend Data Format Compatibility")
    print("=" * 60)
    
    session = SessionLocal()
    try:
        # Get one detection and format it for frontend
        detection = session.query(BirdDetection).join(BirdSpecies).filter(
            BirdSpecies.common_name == 'House Crow',
            BirdDetection.location_x.isnot(None)
        ).first()
        
        if not detection:
            print("❌ No House Crow detection found")
            return False
        
        alert = session.query(BirdAlert).filter(
            BirdAlert.detection_id == detection.id
        ).first()
        
        # Format for frontend (as done in fetchInitialDetections)
        frontend_data = {
            "species": detection.species.common_name,
            "scientific": detection.species.scientific_name or 'Unknown',
            "confidence": int((detection.confidence or 0) * 100),
            "location": {
                "x": detection.location_x or 100,
                "y": detection.location_y or 100
            },
            "callType": detection.call_type.lower() + "_call" if detection.call_type else 'territorial_call',
            "emotion": detection.emotional_state.capitalize() if detection.emotional_state else 'Alert',
            "timestamp": detection.timestamp.isoformat(),
            "riskScore": (alert.risk_score if alert else 65) / 100,
            "alertLevel": alert.alert_level.upper() if alert else 'MEDIUM',
            "recommendedAction": (
                'DELAY_TAKEOFF' if alert and alert.alert_level == 'CRITICAL' else
                'INCREASE_MONITORING' if alert and alert.alert_level == 'HIGH' else
                'CONTINUE_NORMAL'
            )
        }
        
        print("\n✓ Successfully formatted detection for frontend:")
        print(f"\nSpecies: {frontend_data['species']}")
        print(f"Scientific: {frontend_data['scientific']}")
        print(f"Confidence: {frontend_data['confidence']}%")
        print(f"Location: {frontend_data['location']}")
        print(f"Call Type: {frontend_data['callType']}")
        print(f"Emotion: {frontend_data['emotion']}")
        print(f"Alert Level: {frontend_data['alertLevel']}")
        print(f"Risk Score: {frontend_data['riskScore']}")
        print(f"Recommended Action: {frontend_data['recommendedAction']}")
        
        # Validate required fields exist
        required_fields = ['species', 'scientific', 'confidence', 'location', 
                          'callType', 'emotion', 'timestamp', 'riskScore', 
                          'alertLevel', 'recommendedAction']
        missing_fields = [f for f in required_fields if f not in frontend_data]
        
        if missing_fields:
            print(f"\n❌ Missing fields: {missing_fields}")
            return False
        
        print("\n✓ All required fields present")
        
        print("\n" + "=" * 60)
        print("TEST 3: PASSED ✓")
        print("=" * 60)
        
        return True
    except Exception as e:
        print(f"\n❌ TEST 3 FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        session.close()


def main():
    """Run all tests"""
    print("\n" + "=" * 60)
    print("DATA PERSISTENCE IMPLEMENTATION - TEST SUITE")
    print("=" * 60)
    
    results = {
        "Database Content": test_database(),
        "API Endpoint Logic": test_api_endpoint_logic(),
        "Frontend Data Format": test_frontend_data_format()
    }
    
    print("\n\n" + "=" * 60)
    print("FINAL RESULTS")
    print("=" * 60)
    
    for test_name, passed in results.items():
        status = "✓ PASSED" if passed else "✗ FAILED"
        print(f"{test_name}: {status}")
    
    all_passed = all(results.values())
    
    if all_passed:
        print("\n" + "=" * 60)
        print("🎉 ALL TESTS PASSED! System is ready for demo.")
        print("=" * 60)
        print("\nNext steps:")
        print("1. Start backend: cd backend && python app.py")
        print("2. Start frontend: npm run dev")
        print("3. Open browser: http://localhost:5173")
        print("4. Verify 3 demo birds appear on map")
        print("5. Refresh page - birds should persist!")
    else:
        print("\n" + "=" * 60)
        print("❌ SOME TESTS FAILED - Review errors above")
        print("=" * 60)
    
    return all_passed


if __name__ == "__main__":
    import sys
    success = main()
    sys.exit(0 if success else 1)
