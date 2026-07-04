from pydantic import BaseModel
from typing import List, Dict, Optional

class CommunicationPattern(BaseModel):
    call_type: str
    emotional_state: str
    behavioral_context: str
    urgency_level: str
    flock_communication: bool
    territorial_behavior: bool
    alarm_signal: bool

class BehavioralPrediction(BaseModel):
    primary_intent: str
    confidence: float
    all_scores: Dict[str, float]

class AIInsights(BaseModel):
    call_interpretation: List[str]
    threat_assessment: List[str]
    recommended_monitoring: List[str]

class EnhancedAlert(BaseModel):
    id: Optional[int] = None
    timestamp: str
    species: Dict[str, str]
    confidence: float
    risk_score: float
    alert_level: str
    recommended_action: str
    communication_analysis: CommunicationPattern
    behavioral_prediction: BehavioralPrediction
    ai_insights: AIInsights
    acknowledged: bool = False
    resolved: bool = False
    strategic_recommendation: Optional[Dict] = None

class AlertResponse(BaseModel):
    alert_id: int
    action_taken: str
    notes: Optional[str] = None
    template_key: Optional[str] = None
