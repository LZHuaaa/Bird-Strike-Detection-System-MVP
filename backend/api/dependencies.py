from backend.infrastructure.database.connection import get_db
from backend.infrastructure.database.repositories.manager import DatabaseManager
from backend.application.ai_analysis.analyzer import AdvancedBirdCommunicationAnalyzer

# Initialize singleton instances
db_manager = DatabaseManager()
warning_system = None
communication_analyzer = None

def get_db_manager():
    return db_manager

def get_warning_system():
    return warning_system

def get_communication_analyzer():
    return communication_analyzer
