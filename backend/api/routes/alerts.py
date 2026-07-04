from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, List
from datetime import datetime
from sqlalchemy.orm import Session
import json

from backend.infrastructure.database.connection import get_db
from backend.infrastructure.database.repositories.manager import DatabaseManager
from backend.infrastructure.database.models import BirdAlert
from backend.api.schemas.alerts import AlertResponse
from backend.services.alert_templates import get_response_template
from backend.api.routes.legacy import manager, serialize_enhanced_alert, db_manager, logger, set_column_value, get_datetime_value

router = APIRouter(prefix="/api/alerts", tags=["alerts"])

@router.get("/")
async def get_all_alerts():
    """Return all alerts with enhanced AI analysis"""
    try:
        alerts = db_manager.get_active_alerts()
        enhanced_alerts = []
        
        for alert in alerts:
            serialized = serialize_enhanced_alert(alert)
            enhanced_alerts.append(serialized)
        
        return {
            "alerts": enhanced_alerts,
            "total_count": len(enhanced_alerts),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting alerts: {e}")
        return {"alerts": [], "total_count": 0, "error": str(e)}


@router.get("/recent")
async def get_recent_alerts():
    """Return recent alerts with AI analysis"""
    try:
        alerts = db_manager.session.query(BirdAlert).order_by(
            BirdAlert.timestamp.desc()
        ).limit(10).all()
        
        enhanced_alerts = [serialize_enhanced_alert(alert) for alert in alerts]
        
        return {
            "alerts": enhanced_alerts,
            "count": len(enhanced_alerts),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting recent alerts: {e}")
        return {"alerts": [], "count": 0, "error": str(e)}

@router.post("/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: int):
    """Acknowledge an alert"""
    try:
        alert = db_manager.session.query(BirdAlert).filter(
            BirdAlert.id == alert_id
        ).first()
        
        if alert:
            set_column_value(alert, 'acknowledged', True)
            db_manager.session.commit()
            
            # Broadcast acknowledgment
            await manager.broadcast(json.dumps({
                "type": "alert_acknowledged",
                "alert_id": alert_id,
                "timestamp": datetime.now().isoformat()
            }))
            
            return {"message": "Alert acknowledged", "alert_id": alert_id}
        else:
            raise HTTPException(status_code=404, detail="Alert not found")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error acknowledging alert: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{alert_id}/resolve")
async def resolve_alert(alert_id: int):
    """Resolve an alert"""
    try:
        alert = db_manager.session.query(BirdAlert).filter(
            BirdAlert.id == alert_id
        ).first()
        
        if alert:
            set_column_value(alert, 'resolved', True)
            set_column_value(alert, 'acknowledged', True)
            db_manager.session.commit()
            
            # Broadcast resolution
            await manager.broadcast(json.dumps({
                "type": "alert_resolved",
                "alert_id": alert_id,
                "timestamp": datetime.now().isoformat()
            }))
            
            return {"message": "Alert resolved", "alert_id": alert_id}
        else:
            raise HTTPException(status_code=404, detail="Alert not found")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resolving alert: {e}")
        raise HTTPException(status_code=500, detail=str(e))
