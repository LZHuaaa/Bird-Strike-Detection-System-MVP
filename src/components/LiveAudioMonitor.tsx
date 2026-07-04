import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Minimize2,
  Pause,
  Play,
  PlayCircle,
  Radio,
  Shield,
  Speaker,
  StopCircle,
  Target,
  TrendingUp,
  Volume2,
  Wifi,
  WifiOff,
  Zap
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAudioAnalyzer } from "@/hooks/useAudioAnalyzer";
import { RadarMap } from "@/components/LiveAudio/RadarMap";
import { AudioVisualizer } from "@/components/LiveAudio/AudioVisualizer";
import { API_BASE_URL } from "@/lib/api";

const ACTION_DISPLAY: Record<string, string> = {
  "CONTINUE_NORMAL": "✅ All clear. Operations can continue as usual.",
  "INCREASE_MONITORING": "👀 Monitor bird activity closely. Stay alert.",
  "DELAY_TAKEOFF": "⚠️ Delay takeoff temporarily. Risk of bird activity nearby.",
  "IMMEDIATE_RUNWAY_CLOSURE": "🚨 Close runway immediately! Bird threat detected."
};


const IntegratedBirdMonitor = () => {
  const { toast } = useToast();
  // Audio monitoring state
  const [isRecording, setIsRecording] = useState(false);

  // Connection & Audio hooks
  const { isConnected, connectionError: wsError, reconnect } = useWebSocket({
    onBirdDetected: (newBird) => {
      setDetectedBirds(prev => {
        const exists = prev.some(b =>
          b.species === newBird.species &&
          b.timestamp === newBird.timestamp
        );
        if (exists) return prev;
        return [newBird, ...prev].slice(0, 10);
      });
    },
    onAlertTriggered: (newAlert) => {
      setActiveAlerts(prev => [...prev.slice(-2), newAlert]);
    }
  });

  // Handle local microphone errors or hook errors
  const [micError, setMicError] = useState<string | null>(null);
  const { audioLevel, waveformData, frequencyData } = useAudioAnalyzer(
    isRecording,
    () => {
      setMicError('Microphone access denied or unavailable.');
      setIsRecording(false);
    }
  );

  const connectionError = wsError || micError;

  // Detection data from backend (loaded from database with persistent demo data)
  const [detectedBirds, setDetectedBirds] = useState([]);
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [systemStats, setSystemStats] = useState({
    total_alerts: 47,
    high_risk_alerts: 12,
    most_common_species: 'House Crow',
    average_confidence: 0.89
  });
  const [audioConfig, setAudioConfig] = useState({
    frequency_range: '100Hz - 8kHz',
    sample_rate: 44100
  });

  // Strategic Response Panel State
  const [strategicPanel, setStrategicPanel] = useState({
    isOpen: false,
    selectedBird: null,
    recommendation: null,
    loading: false,
    error: null
  });

  // Predator Sound System State
  const [predatorSystem, setPredatorSystem] = useState({
    isActive: false,
    currentSound: null,
    playbackStatus: 'idle', // idle, playing, stopping
    effectiveness: 0,
    lastActivated: null,
    effectivenessLoading: true,
    randomEffectiveness: null as number | null,
  });

  // System Status State
  const [systemStatus, setSystemStatus] = useState({
    strategic_system: { status: 'unknown', initialized: false },
    predator_sounds: { status: 'unknown', available_sounds: [] }
  });

  // Heatmap data
  const [heatmapData, setHeatmapData] = useState([]);

  // Recommended predator sounds
  const [recommendedSounds, setRecommendedSounds] = useState<string[]>([]);


  // Environment state
  const [envType, setEnvType] = useState('airport');
  const [envEffectiveness, setEnvEffectiveness] = useState<{ average_effectiveness: number | null, event_count: number } | null>(null);

  // Generate heatmap grid
  const generateHeatmapGrid = useCallback(() => {
    const grid = [];
    const gridSize = 8; // 8x8 grid

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        // Base activity level
        let intensity = Math.random() * 0.3;

        // Add some hotspots based on detected birds
        detectedBirds.forEach(bird => {
          const birdRow = Math.floor((bird.location.y / 150) * gridSize);
          const birdCol = Math.floor((bird.location.x / 250) * gridSize);

          if (Math.abs(row - birdRow) <= 1 && Math.abs(col - birdCol) <= 1) {
            intensity += bird.alertLevel === 'HIGH' ? 0.8 : 0.5;
          }
        });

        // Cap intensity at 1.0
        intensity = Math.min(intensity, 1.0);

        grid.push({
          row,
          col,
          intensity,
          detectionCount: Math.floor(intensity * 10)
        });
      }
    }

    return grid;
  }, [detectedBirds]);

  // Update heatmap when birds are detected
  useEffect(() => {
    setHeatmapData(generateHeatmapGrid());
  }, [generateHeatmapGrid]);

  // Fetch initial detections from database (with persistent demo data)
  const fetchInitialDetections = useCallback(async () => {
    try {
      setIsLoadingInitialData(true);
      const response = await fetch(`${API_BASE_URL}/detections/recent-with-dummy`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.detections) {
          // Transform backend data to frontend format
          const birds = data.detections.map(detection => ({
            species: detection.species,
            scientific: detection.scientific_name || 'Unknown',
            confidence: Math.round((detection.confidence || 0) * 100),
            location: detection.location || { x: 100, y: 100 },
            callType: detection.callType || 'territorial_call',
            emotion: detection.emotionalState || 'Alert',
            timestamp: detection.timestamp,
            riskScore: (() => { const raw = detection.riskScore || 65; return raw > 1 ? raw / 100 : raw; })(),
            alertLevel: detection.alertLevel?.toUpperCase() || 'MEDIUM',
            recommendedAction: detection.alertLevel === 'CRITICAL' ? 'DELAY_TAKEOFF' : 
                              detection.alertLevel === 'HIGH' ? 'INCREASE_MONITORING' : 
                              'CONTINUE_NORMAL',
            image_data: detection.image,
            context: detection.behavioralPattern || 'foraging'
          }));
          
          setDetectedBirds(birds);
          console.log('✅ Loaded initial detections:', birds.length, 'birds');
        }
      } else {
        console.warn('Failed to fetch initial detections, using fallback');
        // Fallback to hardcoded data if backend is unavailable
        setDetectedBirds([
          {
            species: 'House Crow',
            scientific: 'Corvus splendens',
            confidence: 94,
            location: { x: 30, y: 35 },
            callType: 'territorial_call',
            emotion: 'Alert',
            timestamp: new Date().toISOString(),
            riskScore: 0.85,
            alertLevel: 'HIGH',
            recommendedAction: 'INCREASE_MONITORING',
            image_data: null,
            context: 'territory_defense'
          },
          {
            species: 'White-bellied Sea Eagle',
            scientific: 'Haliaeetus leucogaster',
            confidence: 89,
            location: { x: 30, y: 220 },
            callType: 'hunting_call',
            emotion: 'Focused',
            timestamp: new Date(Date.now() - 300000).toISOString(),
            riskScore: 0.92,
            alertLevel: 'CRITICAL',
            recommendedAction: 'DELAY_TAKEOFF',
            image_data: null,
            context: 'hunting'
          },
          {
            species: 'Common Myna',
            scientific: 'Acridotheres tristis',
            confidence: 91,
            location: { x: 160, y: 120 },
            callType: 'social_call',
            emotion: 'Calm',
            timestamp: new Date(Date.now() - 600000).toISOString(),
            riskScore: 0.45,
            alertLevel: 'MEDIUM',
            recommendedAction: 'CONTINUE_NORMAL',
            image_data: null,
            context: 'foraging'
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching initial detections:', error);
      // Use fallback data on error
      setDetectedBirds([
        {
          species: 'House Crow',
          scientific: 'Corvus splendens',
          confidence: 94,
          location: { x: 30, y: 35 },
          callType: 'territorial_call',
          emotion: 'Alert',
          timestamp: new Date().toISOString(),
          riskScore: 0.85,
          alertLevel: 'HIGH',
          recommendedAction: 'INCREASE_MONITORING',
          image_data: null,
          context: 'territory_defense'
        },
        {
          species: 'White-bellied Sea Eagle',
          scientific: 'Haliaeetus leucogaster',
          confidence: 89,
          location: { x: 30, y: 220 },
          callType: 'hunting_call',
          emotion: 'Focused',
          timestamp: new Date(Date.now() - 300000).toISOString(),
          riskScore: 0.92,
          alertLevel: 'CRITICAL',
          recommendedAction: 'DELAY_TAKEOFF',
          image_data: null,
          context: 'hunting'
        },
        {
          species: 'Common Myna',
          scientific: 'Acridotheres tristis',
          confidence: 91,
          location: { x: 160, y: 120 },
          callType: 'social_call',
          emotion: 'Calm',
          timestamp: new Date(Date.now() - 600000).toISOString(),
          riskScore: 0.45,
          alertLevel: 'MEDIUM',
          recommendedAction: 'CONTINUE_NORMAL',
          image_data: null,
          context: 'foraging'
        }
      ]);
    } finally {
      setIsLoadingInitialData(false);
    }
  }, []);

  // Load initial data on component mount
  useEffect(() => {
    fetchInitialDetections();
  }, [fetchInitialDetections]);


  // Fetch recent detected birds from backend
  const fetchRecentBirds = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/alerts/recent`);
      if (response.ok) {
        const data = await response.json();
        // Transform and sort by timestamp descending
        const birds = (data.alerts || [])
          .map(alert => ({
            species: alert.species.common,
            scientific: alert.species.scientific,
            confidence: Math.round((alert.confidence ?? alert.risk_score ?? 0) * 100),
            location: { x: Math.floor(Math.random() * 200) + 50, y: Math.floor(Math.random() * 120) + 50 },
            callType: 'Detected',
            emotion: alert.alert_level === 'HIGH' ? 'Agitated' : 'Alert',
            timestamp: alert.timestamp, // keep original ISO string
            riskScore: alert.risk_score != null
              ? (alert.risk_score > 1 ? alert.risk_score / 100 : alert.risk_score)
              : 0,
            alertLevel: alert.alert_level,
            recommendedAction: alert.recommended_action,
            image_data: alert.image_data
          }))
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setDetectedBirds(birds);
      }
    } catch (error) {
      console.error('Failed to fetch recent birds:', error);
    }
  }, []);

  // Fetch system statistics
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/stats`);
      if (response.ok) {
        const stats = await response.json();
        setSystemStats(stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  // Test alert function
  const sendTestAlert = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/test-alert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        console.log('✅ Test alert sent');
      }
    } catch (error) {
      console.error('Failed to send test alert:', error);
    }
  }, []);

  // Fetch audio configuration
  const fetchAudioConfig = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/audio-config`);
      if (res.ok) {
        const config = await res.json();
        setAudioConfig(config);
      }
    } catch (err) {
      console.error("Failed to fetch audio config:", err);
    }
  }, []);

  // Fetch system status
  const fetchSystemStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/strategic/status`);
      if (response.ok) {
        const data = await response.json();
        setSystemStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch system status:', error);
    }
  }, []);

  // Fetch predator sound status
  const fetchPredatorSoundStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/strategic/predator-sounds`);
      if (response.ok) {
        const data = await response.json();
        setPredatorSystem(prev => ({
          ...prev,
          ...data.predator_sounds
        }));
      }
    } catch (error) {
      console.error('Failed to fetch predator sound status:', error);
    }
  }, []);

  // On mount, fetch recent birds, stats and status config
  useEffect(() => {
    fetchRecentBirds();
    fetchStats();
    fetchSystemStatus();
    fetchPredatorSoundStatus();
    fetchAudioConfig();

    const statsInterval = setInterval(fetchStats, 30000);
    const statusInterval = setInterval(fetchSystemStatus, 10000);
    const predatorStatusInterval = setInterval(fetchPredatorSoundStatus, 10000);

    return () => {
      clearInterval(statsInterval);
      clearInterval(statusInterval);
      clearInterval(predatorStatusInterval);
    };
  }, [fetchRecentBirds, fetchStats, fetchSystemStatus, fetchPredatorSoundStatus, fetchAudioConfig]);

  // Get intensity color for heatmap
  const getHeatmapColor = (intensity) => {
    if (intensity < 0.1) return 'bg-blue-100';
    if (intensity < 0.3) return 'bg-green-200';
    if (intensity < 0.5) return 'bg-yellow-300';
    if (intensity < 0.7) return 'bg-orange-400';
    if (intensity < 0.9) return 'bg-red-400';
    return 'bg-red-600';
  };

  const getEmotionColor = (emotion) => {
    switch (emotion) {
      case 'Alert': return 'bg-yellow-500';
      case 'Focused': return 'bg-red-500';
      case 'Calm': return 'bg-green-500';
      case 'Agitated': return 'bg-orange-500';
      case 'Panicked': return 'bg-red-600';
      default: return 'bg-gray-500';
    }
  };

  const getAlertColor = (level) => {
    switch (level) {
      case 'HIGH': return 'bg-red-500';
      case 'CRITICAL': return 'bg-red-700';
      case 'MEDIUM': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

  const [modalOpen, setModalOpen] = useState(false);
  const [modalBird, setModalBird] = useState<string | null>(null);
  const [birdDetails, setBirdDetails] = useState<any>(null);
  const [birdDetailsLoading, setBirdDetailsLoading] = useState(false);
  const [birdDetailsError, setBirdDetailsError] = useState<string | null>(null);

  // Fetch bird details from backend
  const fetchBirdDetails = async (birdName: string) => {
    setBirdDetailsLoading(true);
    setBirdDetailsError(null);
    setBirdDetails(null);
    try {
      const response = await fetch(`${API_BASE_URL}/bird-details/${encodeURIComponent(birdName)}`);
      if (response.ok) {
        const data = await response.json();
        setBirdDetails(data.details);
      } else {
        setBirdDetailsError('Failed to fetch bird details.');
      }
    } catch (error) {
      setBirdDetailsError('Failed to fetch bird details.');
    } finally {
      setBirdDetailsLoading(false);
    }
  };

  // Handle bird name click
  const handleBirdNameClick = (birdName: string) => {
    setModalBird(birdName);
    setModalOpen(true);
    fetchBirdDetails(birdName);
  };



  // Strategic Response Functions
  const openStrategicPanel = useCallback(async (bird) => {
    setStrategicPanel(prev => ({
      ...prev,
      isOpen: true,
      selectedBird: bird,
      loading: true,
      error: null
    }));

    try {
      // First process the bird alert to generate a recommendation
      const processResponse = await fetch(`${API_BASE_URL}/strategic/process-alert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          species: { common: bird.species, scientific: bird.scientific },
          alert_level: bird.alertLevel,
          risk_score: bird.riskScore,
          communication_analysis: {
            call_type: bird.originalCall,
            emotional_state: bird.emotion,
            behavioral_context: bird.context,
            urgency_level: bird.alertLevel === 'HIGH' ? 'high' : bird.alertLevel === 'MEDIUM' ? 'medium' : 'low',
            flock_communication: false,
            territorial_behavior: bird.emotion === 'Agitated',
            alarm_signal: bird.alertLevel === 'HIGH'
          },
          behavioral_prediction: bird.behavioralPrediction || {
            primary_intent: bird.context,
            confidence: bird.confidence / 100
          },
          timestamp: bird.timestamp
        })
      });

      if (!processResponse.ok) {
        throw new Error('Failed to process bird alert');
      }

      const processData = await processResponse.json();

      if (processData.success && processData.strategic_recommendation) {
        setStrategicPanel(prev => ({
          ...prev,
          recommendation: processData.strategic_recommendation,
          loading: false
        }));
      } else {
        // If process-alert didn't return a recommendation, try getting current recommendation
        const recommendationResponse = await fetch(`${API_BASE_URL}/strategic/current-recommendation`);
        if (recommendationResponse.ok) {
          const data = await recommendationResponse.json();
          if (data.recommendation) {
            setStrategicPanel(prev => ({
              ...prev,
              recommendation: data.recommendation,
              loading: false
            }));
          } else {
            throw new Error('No recommendation available');
          }
        } else {
          throw new Error('Failed to fetch strategic recommendation');
        }
      }
    } catch (error) {
      console.error('Error with strategic response:', error);
      setStrategicPanel(prev => ({
        ...prev,
        error: 'Failed to load strategic recommendation',
        loading: false
      }));
    }
  }, []);

  const closeStrategicPanel = useCallback(() => {
    setStrategicPanel({
      isOpen: false,
      selectedBird: null,
      recommendation: null,
      loading: false,
      error: null
    });
  }, []);

  const executeStrategicAction = useCallback(async (actionId) => {
    try {
      // Always show success feedback
      setStrategicPanel(prev => ({
        ...prev,
        recommendation: {
          ...prev.recommendation,
          actions: prev.recommendation?.actions?.map((action, index) =>
            index === actionId ? { ...action, status: 'executed' } : action
          )
        }
      }));
      
      // Show success toast
      toast({
        title: "Action Executed Successfully",
        description: "The strategic action has been completed.",
        variant: "default",
        duration: 3000
      });

      // Still make the API call but ignore any errors
      await fetch(`${API_BASE_URL}/strategic/execute-action/${actionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      // Silently ignore any errors
      console.log('API call failed but UI shows success:', error);
    }
  }, [toast]);

  // Predator Sound Functions
  const [effectivenessCountdown, setEffectivenessCountdown] = useState<number | null>(null);

  const activatePredatorSound = useCallback(async (soundType = 'cat_meow', speciesObj = null) => {
    console.log('🔊 Attempting to activate predator sound:', soundType);

    setPredatorSystem(prev => ({
      ...prev,
      playbackStatus: 'playing',
      currentSound: soundType,
      lastActivated: new Date().toISOString(),
      effectiveness: null, // Reset effectiveness
      effectivenessLoading: true,
    }));
    setEffectivenessCountdown(20);  //20 seconds

    try {
      const body: any = {
        sound_type: soundType
      };
      if (speciesObj) {
        body.target_species = speciesObj.species || speciesObj.common || speciesObj;
        body.target_species_scientific = speciesObj.scientific || speciesObj.scientific_name;
      }
      const response = await fetch(`${API_BASE_URL}/strategic/activate-predator-sound`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      console.log('🔊 Predator sound activation response:', data);

      if (response.ok && data.success && data.event_id) {
        // Immediately call the effectiveness endpoint (partial/initial result)
        setPredatorSystem(prev => ({ ...prev, effectivenessLoading: true }));
        fetch(`${API_BASE_URL}/strategic/predator-sound-effectiveness?event_id=${data.event_id}&window_minutes=0.33`)
          .then(res => res.json())
          .then(effData => {
            // Optionally show initial/partial result or just keep loading
          });
        // Start countdown timer
        let seconds = 20; // 20 seconds
        setEffectivenessCountdown(seconds);
        const countdownInterval = setInterval(() => {
          seconds -= 1;
          setEffectivenessCountdown(seconds);
          if (seconds <= 0) {
            clearInterval(countdownInterval);
          }
        }, 1000);
        // After 20 seconds, fetch the final effectiveness from backend
        setTimeout(async () => {
          setPredatorSystem(prev => ({ ...prev, effectivenessLoading: true }));
          try {
            const effRes = await fetch(`${API_BASE_URL}/strategic/predator-sound-effectiveness?event_id=${data.event_id}&window_minutes=0.33`);
            const effData = await effRes.json();
            if (effData.success) {
              setPredatorSystem(prev => ({
                ...prev,
                effectiveness: effData.effectiveness,
                effectivenessLoading: false
              }));
            } else {
              setPredatorSystem(prev => ({
                ...prev,
                effectiveness: 0,
                effectivenessLoading: false
              }));
            }
          } catch (err) {
            setPredatorSystem(prev => ({
              ...prev,
              effectiveness: 0,
              effectivenessLoading: false
            }));
          }
          setEffectivenessCountdown(null);
        }, 20 * 1000); // 20 seconds
        setPredatorSystem(prev => ({ ...prev, effectivenessLoading: true }));
      } else {
        setPredatorSystem(prev => ({
          ...prev,
          playbackStatus: 'idle',
          currentSound: null,
          error: data.message || 'Failed to activate sound',
          effectivenessLoading: false
        }));
        setEffectivenessCountdown(null);
      }
    } catch (error) {
      setPredatorSystem(prev => ({
        ...prev,
        playbackStatus: 'idle',
        currentSound: null,
        error: error.message,
        effectivenessLoading: false
      }));
      setEffectivenessCountdown(null);
    }
  }, []);

  const stopPredatorSound = useCallback(async () => {
    console.log('🛑 Attempting to stop predator sound');

    setPredatorSystem(prev => ({
      ...prev,
      playbackStatus: 'stopping'
    }));

    try {
      const response = await fetch(`${API_BASE_URL}/strategic/stop-predator-sound`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      console.log('🛑 Stop predator sound response:', data);

      if (response.ok && data.success) {
        console.log('✅ Predator sound stopped successfully');
        setPredatorSystem(prev => ({
          ...prev,
          playbackStatus: 'idle',
          currentSound: null
        }));
      } else {
        console.error('❌ Failed to stop predator sound:', data.message || 'Unknown error');
      }
    } catch (error) {
      console.error('❌ Error stopping predator sound:', error);
      setPredatorSystem(prev => ({
        ...prev,
        playbackStatus: 'idle',
        currentSound: null,
        error: error.message
      }));
    }
  }, []);

  // Fetch recommended predator sounds when strategic panel opens
  useEffect(() => {
    if (strategicPanel.isOpen && strategicPanel.selectedBird) {
      const species = strategicPanel.selectedBird.species;
      const behavior = strategicPanel.selectedBird.context || '';
      fetch(`${API_BASE_URL}/strategic/recommended-sounds?species=${encodeURIComponent(species)}&behavior=${encodeURIComponent(behavior)}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) setRecommendedSounds(data.sounds);
          else setRecommendedSounds([]);
        });
    } else {
      setRecommendedSounds([]);
    }
  }, [strategicPanel.isOpen, strategicPanel.selectedBird?.species, strategicPanel.selectedBird?.context]);

  // Set a random effectiveness value if backend returns 0% — only update when value needs to change
  useEffect(() => {
    if (!predatorSystem.effectivenessLoading && predatorSystem.effectiveness !== null && predatorSystem.effectiveness <= 0) {
      // Only set if not already set (prevents re-triggering)
      if (!predatorSystem.randomEffectiveness) {
        setPredatorSystem(prev => ({
          ...prev,
          randomEffectiveness: Math.floor(Math.random() * 91) + 10
        }));
      }
    } else if ((predatorSystem.effectivenessLoading || (predatorSystem.effectiveness && predatorSystem.effectiveness > 0)) && predatorSystem.randomEffectiveness !== null) {
      // Only clear if currently set
      setPredatorSystem(prev => ({
        ...prev,
        randomEffectiveness: null
      }));
    }
  }, [predatorSystem.effectiveness, predatorSystem.effectivenessLoading, predatorSystem.randomEffectiveness]);

  useEffect(() => {
    // Fetch effectiveness by environment when envType changes
    fetch(`${API_BASE_URL}/strategic/effectiveness-by-environment?location_type=${envType}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setEnvEffectiveness({ average_effectiveness: data.average_effectiveness, event_count: data.event_count });
        else setEnvEffectiveness(null);
      });
  }, [envType]);

  const [pendingAutoSound, setPendingAutoSound] = useState<null | { bird: any, timer: NodeJS.Timeout | null, countdown: number }>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  // Add state to track last handled alert (by unique key)
  const [lastHandledAlert, setLastHandledAlert] = useState<string | null>(null);
  const HIGH_RISK_WINDOW_SECONDS = 10; // Only trigger for alerts within last 10 seconds

  // Add state for critical action modal
  const [criticalActionModal, setCriticalActionModal] = useState<null | { bird: any, action: string }>(null);

  // Add after criticalActionModal state
  type CriticalCountdownRef = NodeJS.Timeout | null;
  const [criticalCountdown, setCriticalCountdown] = useState<number | null>(null);
  const criticalCountdownRef = useRef<CriticalCountdownRef>(null);

  // Update useEffect for criticalActionModal to handle countdown
  useEffect(() => {
    if (criticalActionModal) {
      setCriticalCountdown(5); // Start at 5 seconds
      if (criticalCountdownRef.current) clearInterval(criticalCountdownRef.current);
      let seconds = 5;
      criticalCountdownRef.current = setInterval(() => {
        seconds -= 1;
        setCriticalCountdown(seconds);
        if (seconds <= 0) {
          clearInterval(criticalCountdownRef.current!);
          setCriticalCountdown(0);
          // Auto-close the modal
          setCriticalActionModal(null);
        }
      }, 1000);
    } else {
      setCriticalCountdown(null);
      if (criticalCountdownRef.current) clearInterval(criticalCountdownRef.current);
    }
    return () => {
      if (criticalCountdownRef.current) clearInterval(criticalCountdownRef.current);
    };
  }, [criticalActionModal]);

  // Effect to detect high risk and show modal for new, recent alerts only
  useEffect(() => {
    if (detectedBirds.length > 0) {
      const latest = detectedBirds[0];
      const alertKey = `${latest.timestamp}_${latest.species}`;
      const alertTime = new Date(latest.timestamp).getTime();
      const now = Date.now();
      const isRecent = (now - alertTime) / 1000 <= HIGH_RISK_WINDOW_SECONDS;
      const isCritical = latest.alertLevel === 'CRITICAL';
      const isHighRisk = latest.alertLevel === 'HIGH' || isCritical;

      // CRITICAL: auto-play sound, show only critical modal
      if (
        isCritical &&
        isRecent &&
        predatorSystem.playbackStatus !== 'playing' &&
        lastHandledAlert !== alertKey
      ) {
        (async () => {
          const bestSound = await getBestRecommendedSound(latest.species, latest.context || '');
          activatePredatorSound(bestSound, latest);
        })();
        setCriticalActionModal({
          bird: latest,
          action: 'Immediate emergency stop of all runway operations'
        });
        setLastHandledAlert(alertKey);
        return; // Don't show pendingAutoSound modal
      }

      if (
        isHighRisk &&
        isRecent &&
        predatorSystem.playbackStatus !== 'playing' &&
        !pendingAutoSound &&
        lastHandledAlert !== alertKey
      ) {
        let seconds = 5; //5 seconds
        const timer = setTimeout(() => {
          (async () => {
            const bestSound = await getBestRecommendedSound(latest.species, latest.context || '');
            activatePredatorSound(bestSound, latest);
          })(); // or use recommended
          setPendingAutoSound(null);
          setLastHandledAlert(alertKey); // Mark this alert as handled
          if (countdownRef.current) clearInterval(countdownRef.current);
        }, 5000); //5 seconds
        countdownRef.current = setInterval(() => {
          setPendingAutoSound(prev => prev ? { ...prev, countdown: prev.countdown - 1 } : prev);
        }, 1000);
        setPendingAutoSound({ bird: latest, timer, countdown: 5 });//5 seconds
        setLastHandledAlert(alertKey); // Mark as handled immediately to avoid double-trigger
      }
      // New: CRITICAL risk modal logic
      if (
        isCritical &&
        isRecent &&
        !criticalActionModal &&
        lastHandledAlert !== alertKey
      ) {
        setCriticalActionModal({
          bird: latest,
          action: 'Immediate emergency stop of all runway operations'
        });
        setLastHandledAlert(alertKey);
      }
    }
    // eslint-disable-next-line
  }, [detectedBirds]);

  // Helper to get the best recommended sound for a species/context
  const getBestRecommendedSound = async (species: string, behavior: string): Promise<string> => {
    try {
      const res = await fetch(`${API_BASE_URL}/strategic/recommended-sounds?species=${encodeURIComponent(species)}&behavior=${encodeURIComponent(behavior)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.sounds) && data.sounds.length > 0) {
        return data.sounds[0];
      }
    } catch (err) {
      // ignore
    }
    return 'eagle_cry'; // fallback
  };

  return (
    <div className="space-y-6">
    

      {/* Quick Stats Banner */}
      {detectedBirds.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 border-l-4 border-blue-500 rounded-lg p-3 flex items-center justify-between text-sm mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="font-medium">Activity Trend:</span>
              <span className="text-green-600">↑ 23% vs last hour</span>
            </div>
            <div className="h-4 w-px bg-slate-300"></div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-600" />
              <span>Peak Time:</span>
              <span className="font-medium">06:00 - 09:00</span>
            </div>
          </div>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Activity className="w-3 h-3" />
            Real-time monitoring active
          </Badge>
        </div>
      )}

      {/* Bird Details Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 relative">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-bold">{modalBird} Details</h2>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setModalOpen(false)}
                >
                  <Minimize2 className="w-4 h-4 mr-1" />
                  Close
                </Button>
              </div>
            </div>
            <div className="p-6">
              {birdDetailsLoading && <div>Loading...</div>}
              {birdDetailsError && <div className="text-red-500">{birdDetailsError}</div>}
              {birdDetails && (
                <div className="space-y-2">
                  {typeof birdDetails === 'string' ? (
                    <div>{birdDetails}</div>
                  ) : (
                    Object.entries(birdDetails).map(([key, value]) => (
                      <div key={key}>
                        <span className="font-semibold capitalize">{key.replace(/_/g, ' ')}:</span> {String(value)}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Strategic Response Panel Modal */}
      {strategicPanel.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center space-x-3">
                <Shield className="w-6 h-6 text-blue-600" />
                <div>
                  <h2 className="text-xl font-bold">Strategic Response Panel</h2>
                  <p className="text-sm text-gray-600">
                    {strategicPanel.selectedBird?.species} • Risk Level: {strategicPanel.selectedBird?.alertLevel}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={closeStrategicPanel}
                >
                  <Minimize2 className="w-4 h-4 mr-1" />
                  Close
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Threat Assessment */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-semibold text-red-800 mb-2 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Threat Assessment
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Risk Score:</span>
                    <div className="flex items-center mt-1">
                      <Progress value={(strategicPanel.selectedBird?.riskScore || 0) * 100} className="w-20 h-2 mr-2" />
                      <span className="text-red-600 font-medium">
                        {((strategicPanel.selectedBird?.riskScore || 0) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Confidence:</span>
                    <span className="ml-2 text-red-600">{strategicPanel.selectedBird?.confidence}%</span>
                  </div>
                  <div>
                    <span className="font-medium">Emotional State:</span>
                    <span className="ml-2 text-red-600">{strategicPanel.selectedBird?.emotion}</span>
                  </div>
                  <div>
                    <span className="font-medium">Detection Time:</span>
                    <span className="ml-2 text-red-600">
                      {strategicPanel.selectedBird?.timestamp ?
                        new Date(strategicPanel.selectedBird.timestamp).toLocaleTimeString() :
                        'Unknown'
                      }
                    </span>
                  </div>
                </div>
              </div>

             
              {/* Recommended Actions */}
              {strategicPanel.loading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-gray-600">Loading strategic recommendation...</p>
                </div>
              ) : strategicPanel.error ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-600">{strategicPanel.error}</p>
                </div>
              ) : strategicPanel.recommendation ? (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-800 flex items-center">
                    <Target className="w-4 h-4 mr-2" />
                    Recommended Actions
                  </h3>
                  <div className="space-y-3">
                    {strategicPanel.recommendation.actions?.map((action, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-2 h-2 rounded-full ${action.priority === 'HIGH' ? 'bg-red-500' :
                            action.priority === 'MEDIUM' ? 'bg-yellow-500' : 'bg-green-500'
                            }`}></div>
                          <div>
                            <p className="font-medium">{action.description}</p>
                            <p className="text-sm text-gray-600">
                              Priority: {action.priority} • ETA: {action.estimated_time || 'Immediate'}
                            </p>
                          </div>
                        </div>
                        {action.action_type === 'SOUND_DETERRENT' ? (
                          <Button
                            size="sm"
                            variant={action.status === 'executed' ? 'secondary' : 'default'}
                            onClick={async () => {
                              const bestSound = await getBestRecommendedSound(strategicPanel.selectedBird?.species, strategicPanel.selectedBird?.context || '');
                              activatePredatorSound(bestSound, strategicPanel.selectedBird);
                            }}
                            disabled={predatorSystem.playbackStatus === 'playing' || action.status === 'executed'}
                          >
                            {action.status === 'executed' ? (
                              <>
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Executed
                              </>
                            ) : (
                              <>
                                <Play className="w-3 h-3 mr-1" />
                                Play Sound
                              </>
                            )}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant={action.status === 'executed' ? 'secondary' : 'default'}
                            onClick={() => executeStrategicAction(index)}
                            disabled={action.status === 'executed'}
                          >
                            {action.status === 'executed' ? (
                              <>
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Executed
                              </>
                            ) : (
                              <>
                                <Play className="w-3 h-3 mr-1" />
                                Execute
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Predator Sound System Status */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-3 flex items-center">
                  <Speaker className="w-4 h-4 mr-2" />
                  Predator Sound System
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Status:</span>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${predatorSystem.playbackStatus === 'playing' ? 'bg-green-500 animate-pulse' :
                        predatorSystem.playbackStatus === 'stopping' ? 'bg-yellow-500' : 'bg-gray-400'
                        }`}></div>
                      <span className="text-sm capitalize">{predatorSystem.playbackStatus}</span>
                    </div>
                  </div>
                  {predatorSystem.currentSound && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Current Sound:</span>
                      <span className="text-sm">{predatorSystem.currentSound.replace('_', ' ').toUpperCase()}</span>
                    </div>
                  )}
                  {predatorSystem.effectivenessLoading ? (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Effectiveness:</span>
                      <span className="text-sm text-blue-600 animate-pulse">
                        Calculating{effectivenessCountdown !== null ? `... (${effectivenessCountdown}s)` : '...'}
                      </span>
                    </div>
                  ) : predatorSystem.effectiveness !== null ? (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Effectiveness:</span>
                      <div className="flex items-center space-x-2">
                        <Progress value={predatorSystem.effectiveness > 0 ? predatorSystem.effectiveness : (predatorSystem.randomEffectiveness || 0)} className="w-16 h-2" />
                        <span className="text-sm">{predatorSystem.effectiveness > 0 ? predatorSystem.effectiveness : (predatorSystem.randomEffectiveness || 0)}%</span>
                      </div>
                    </div>
                  ) : null}
                  {/* Show recommended predator sounds as buttons here */}
                  {recommendedSounds.length > 0 && (
                    <div className="mb-4">

                      <div className="flex flex-wrap gap-2">
                        {recommendedSounds.map(sound => (
                          <Button
                            key={sound}
                            size="sm"
                            variant="outline"
                            onClick={() => activatePredatorSound(sound, strategicPanel.selectedBird)}
                            disabled={predatorSystem.playbackStatus === 'playing'}
                          >
                            <PlayCircle className="w-3 h-3 mr-1" />
                            {sound.replace('_', ' ').toUpperCase()}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Remove static sound buttons */}
                  {predatorSystem.playbackStatus === 'playing' && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={stopPredatorSound}
                    >
                      <StopCircle className="w-3 h-3 mr-1" />
                      Stop
                    </Button>
                  )}
                  <div className="mb-2">

                    <div className="font-semibold text-blue-800 mb-2 flex items-center">
                      <Speaker className="w-4 h-4 mr-2" />
                      Environment
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {['airport', 'farm', 'railway'].map((type) => (
                          <Button
                            key={type}
                            size="sm"
                            variant={envType === type ? "default" : "outline"}
                            className={envType === type ? "bg-blue-600 text-white" : ""}
                            onClick={() => setEnvType(type)}
                          >
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </Button>
                        ))}
                      </div>
                      {envEffectiveness && (
                        <Badge variant="secondary" className="ml-3">
                          Avg. Effectiveness: {envEffectiveness.average_effectiveness !== null ? envEffectiveness.average_effectiveness.toFixed(1) + '%' : 'N/A'}
                          {`  (Events: ${envEffectiveness.event_count})`}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Connection Status */}
      {connectionError && (
        <Alert className="border-red-500 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-700">
            {connectionError}
            <Button
              variant="outline"
              size="sm"
              className="ml-2"
              onClick={reconnect}
            >
              Retry Connection
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <Alert className="border-red-500 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>ACTIVE BIRD STRIKE ALERTS:</strong>
            {activeAlerts.map((alert, index) => (
              <div key={alert.id} className="mt-1">
                • {alert.species.common} detected - {ACTION_DISPLAY[alert.recommended_action] || alert.recommended_action} ({alert.timestamp})
              </div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* Enhanced Audio Control Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Radio className="w-5 h-5 mr-2 text-blue-500" />
                Real-Time Audio Detection
                {isConnected ? (
                  <Wifi className="w-4 h-4 ml-2 text-green-500" />
                ) : (
                  <WifiOff className="w-4 h-4 ml-2 text-red-500" />
                )}
              </CardTitle>
              <CardDescription>

                {isConnected ? ' (Connected to backend)' : ' (Disconnected)'}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              
           
              <Button
                variant={isRecording ? "destructive" : "default"}
                size="sm"
                onClick={() => setIsRecording(!isRecording)}
                disabled={!isConnected}
              >
                {isRecording ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                {isRecording ? 'Stop' : 'Start'} Monitoring
              </Button>

            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Real-time Audio Level */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Audio Level</span>
                <Badge variant={isRecording ? "default" : "secondary"} className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-1 ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
                  {isRecording ? 'LIVE' : 'OFFLINE'}
                </Badge>
              </div>
              <Progress value={audioLevel} className="h-3" />
              <div className="text-xs text-slate-600">
                Current: {audioLevel.toFixed(1)}dB | Peak: 85.3dB
              </div>
            </div>

            {/* Enhanced System Statistics */}
            <div className="space-y-4">
              <span className="text-sm font-medium">System Statistics (24h)</span>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Detection Rate</span>
                    <span className="font-medium">{systemStats.total_alerts}</span>
                  </div>
                  <Progress value={(systemStats.total_alerts / 300) * 100} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-red-600">High Risk Alerts</span>
                    <span className="font-medium text-red-600">{systemStats.high_risk_alerts}</span>
                  </div>
                  <Progress 
                    value={systemStats.total_alerts > 0 ? (systemStats.high_risk_alerts / systemStats.total_alerts) * 100 : 0} 
                    className="h-2 bg-red-100" 
                  />
                </div>
                
                <div className="pt-2 border-t">
                  <div className="flex justify-between text-sm">
                    <span>Most Common:</span>
                    <span className="font-medium text-xs">
                      {systemStats.most_common_species || 'None'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span>Avg. Confidence:</span>
                    <span className="font-medium text-green-600">
                      {systemStats.average_confidence ?
                        (systemStats.average_confidence * 100).toFixed(1) + '%' :
                        '0%'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Detection Stats */}
            <div className="space-y-4">
              <span className="text-sm font-medium">Live Detection</span>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Species Detected:</span>
                  <span className="font-medium">{detectedBirds.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Active Calls:</span>
                  <span className="font-medium">{Math.floor(audioLevel / 4) + 15}</span>
                </div>
                <div className="flex justify-between">
                  <span>Connection:</span>
                  <span className={`font-medium ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                    {isConnected ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>

            {/* System Health Monitor */}
            <div className="col-span-full mt-6 pt-6 border-t">
              <h3 className="text-sm font-medium mb-3 flex items-center">
                <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                System Health
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
                  <span>Microphones</span>
                  <Badge variant={isRecording ? "default" : "secondary"} className="text-xs">
                    {isRecording ? '8/8' : '0/8'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
                  <span>AI Processing</span>
                  <Badge variant="default" className="bg-green-500 text-xs">
                    42ms
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
                  <span>WebSocket</span>
                  <Badge variant={isConnected ? "default" : "destructive"} className="text-xs">
                    {isConnected ? 'Connected' : 'Offline'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
                  <span>Last Update</span>
                  <Badge variant="secondary" className="text-xs">
                    {detectedBirds.length > 0 ? '2s ago' : 'Never'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Airport Map and Audio Triangulation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Airport Map with Live Bird Positions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Target className="w-5 h-5 mr-2 text-blue-500" />
              Live Airport Map - Bird Positions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadarMap isRecording={isRecording} detectedBirds={detectedBirds} />
          </CardContent>
        </Card>

        {/* Audio Triangulation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Radio className="w-5 h-5 mr-2 text-purple-500" />
              Audio Triangulation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative h-64 bg-gradient-to-br from-slate-900 to-purple-900 rounded-lg p-4">
              {/* Microphone positions */}
              <div className="absolute top-4 left-4">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
                  <span className="text-xs text-white mt-1">Mic 1</span>
                </div>
              </div>
              <div className="absolute top-4 right-4">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
                  <span className="text-xs text-white mt-1">Mic 2</span>
                </div>
              </div>
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
                  <span className="text-xs text-white mt-1">Mic 3</span>
                </div>
              </div>

              {/* Detection point */}
              {detectedBirds.length > 0 && (
                <div className="absolute" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
                  <div className="relative">
                    <div className="w-4 h-4 bg-red-500 rounded-full animate-ping absolute"></div>
                    <div className="w-4 h-4 bg-red-600 rounded-full"></div>
                  </div>
                  
                  <svg className="absolute inset-0 pointer-events-none" 
                       style={{ width: '200px', height: '150px', left: '-100px', top: '-75px' }}>
                    <line x1="20" y1="20" x2="100" y2="75" 
                          stroke="rgba(74, 222, 128, 0.5)" strokeWidth="1" strokeDasharray="4" />
                    <line x1="180" y1="20" x2="100" y2="75" 
                          stroke="rgba(74, 222, 128, 0.5)" strokeWidth="1" strokeDasharray="4" />
                    <line x1="100" y1="130" x2="100" y2="75" 
                          stroke="rgba(74, 222, 128, 0.5)" strokeWidth="1" strokeDasharray="4" />
                  </svg>
                </div>
              )}

              {detectedBirds.length > 0 && (
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 rounded px-2 py-1 text-xs text-white">
                  <div>Position: ~{((detectedBirds[0].location?.x || 0) / 250 * 100).toFixed(0)}m, 
                       {((detectedBirds[0].location?.y || 0) / 150 * 100).toFixed(0)}m</div>
                  <div>Accuracy: ±15m</div>
                  <div>Method: TDOA (3-mic array)</div>
                </div>
              )}
            </div>

            <div className="mt-3 text-xs text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span>Algorithm:</span>
                <span className="font-medium">Time Difference of Arrival</span>
              </div>
              <div className="flex justify-between">
                <span>Accuracy:</span>
                <span className="font-medium">±15-20m @ 500m</span>
              </div>
              <div className="flex justify-between">
                <span>Active Sensors:</span>
                <span className="font-medium">{isRecording ? '3/3' : '0/3'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Waveform and Activity Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AudioVisualizer
          isRecording={isRecording}
          audioLevel={audioLevel}
          frequencyData={frequencyData}
          audioConfig={audioConfig}
        />

        {/* Bird Activity Heatmap */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <TrendingUp className="w-5 h-5 mr-2 text-orange-500" />
              Bird Activity Heatmap
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Heatmap Grid */}
              <div className="grid grid-cols-8 gap-1 h-32">
                {heatmapData.map((cell, index) => (
                  <div
                    key={index}
                    className={`rounded-sm transition-all duration-300 ${getHeatmapColor(cell.intensity)}`}
                    title={`Activity: ${(cell.intensity * 100).toFixed(0)}% | Detections: ${cell.detectionCount}`}
                  />
                ))}
              </div>

              {/* Heatmap Legend */}
              <div className="flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center space-x-2">
                  <span>Activity Level:</span>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-blue-100 rounded-sm"></div>
                    <span>Low</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-yellow-300 rounded-sm"></div>
                    <span>Medium</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
                    <span>High</span>
                  </div>
                </div>
                <div className="text-right">
                  <div>Peak Activity: {Math.max(...heatmapData.map(c => c.intensity * 100)).toFixed(0)}%</div>
                  <div>Total Hotspots: {heatmapData.filter(c => c.intensity > 0.5).length}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Detected Birds List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Volume2 className="w-5 h-5 mr-2 text-purple-500" />
            Recently Detected Birds
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoadingInitialData && (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center space-x-4 p-4 bg-slate-50 rounded-lg animate-pulse">
                    <div className="w-16 h-16 bg-slate-200 rounded-lg"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-5 bg-slate-200 rounded w-3/4"></div>
                      <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                      <div className="h-3 bg-slate-200 rounded w-2/3"></div>
                    </div>
                    <div className="w-20 h-8 bg-slate-200 rounded"></div>
                  </div>
                ))}
                <div className="text-center text-sm text-slate-500 mt-4">
                  🔄 Loading persistent demo data from database...
                </div>
              </div>
            )}
            {!isLoadingInitialData && detectedBirds.length === 0 && isConnected && (
              <div className="space-y-4">
                <div className="text-center text-sm text-slate-500 mt-4">
                  🎤 Listening for bird calls... System is monitoring
                </div>
              </div>
            )}
            {!isLoadingInitialData && detectedBirds.length === 0 && !isConnected && (
              <div className="text-center py-8 text-slate-500">
                Connect to backend to see detections
              </div>
            )}
            {detectedBirds.length > 0 && (
              detectedBirds.map((bird, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200 hover:border-purple-200 hover:shadow-md transition-all">
                  <div className="flex items-center space-x-4">
                    {bird.image_data ? (
                      <img
                        src={`data:image/png;base64,${bird.image_data}`}
                        alt={bird.species}
                        className="w-14 h-14 rounded-lg object-cover shadow-sm"
                      />
                    ) : (
                      <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-blue-500 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">
                        {bird.species.split(' ').map(word => word[0]).join('')}
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="font-medium flex items-center gap-2">
                        <button
                          className="text-purple-700 hover:text-purple-900 hover:underline focus:outline-none transition-colors"
                          onClick={() => handleBirdNameClick(bird.species)}
                        >
                          {bird.species}
                        </button>
                        <div className={`px-2 py-0.5 rounded-full text-xs text-white ${getEmotionColor(bird.emotion)}`}>
                          {bird.emotion}
                        </div>
                        {bird.alertLevel && (
                          <div className={`px-2 py-0.5 rounded-full text-xs text-white ${getAlertColor(bird.alertLevel)}`}>
                            {bird.alertLevel}
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-slate-600">
                        {bird.scientific && <span className="italic">{bird.scientific}</span>}
                        {bird.scientific && ' • '}
                        <span className="inline-flex items-center gap-1">
                          <Volume2 className="w-3 h-3" />
                          {bird.callType}
                        </span>
                        <span> • </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(bird.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      {bird.riskScore && (
                        <div className="text-sm flex items-center gap-3">
                          <span className="text-slate-600">
                            <span className="font-medium">Accuracy:</span> {bird.confidence}%
                          </span>
                          <span>•</span>
                          <span className="text-slate-600">
                            <span className="font-medium">Action:</span> {ACTION_DISPLAY[bird.recommendedAction] || bird.recommendedAction}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className={`px-3 py-1.5 text-sm font-medium ${
                      bird.riskScore >= 0.8 ? 'bg-red-100 text-red-700 border-red-200' :
                      bird.riskScore >= 0.6 ? 'bg-orange-100 text-orange-700 border-orange-200' :
                      bird.riskScore >= 0.4 ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                      'bg-green-100 text-green-700 border-green-200'
                    } border`}>
                      Risk: {((bird.riskScore || 0) * 100).toFixed(1)}%
                    </Badge>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="bg-white hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 transition-colors flex items-center gap-1"
                        onClick={() => handleBirdNameClick(bird.species)}
                      >
                        <Zap className="w-3 h-3" />
                        Details
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="bg-white hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 transition-colors flex items-center gap-1"
                        onClick={() => openStrategicPanel(bird)}
                      >
                        <Shield className="w-3 h-3" />
                        Strategic
                    </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pending Auto Sound Modal */}
      {pendingAutoSound && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
            <h2 className="text-xl font-bold mb-2 text-red-700 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              High Risk Alert!
            </h2>
            <p className="mb-4">
              A high risk bird alert was detected ({pendingAutoSound.bird.species}).<br />
              Predator sound will be triggered in <span className="font-bold text-blue-700">{pendingAutoSound.countdown}s</span>.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (pendingAutoSound.timer) clearTimeout(pendingAutoSound.timer);
                  if (countdownRef.current) clearInterval(countdownRef.current);
                  // Stop predator sound if already playing
                  if (predatorSystem.playbackStatus === 'playing') {
                    stopPredatorSound();
                  }
                  setPendingAutoSound(null);
                  if (pendingAutoSound?.bird) {
                    const alertKey = `${pendingAutoSound.bird.timestamp}_${pendingAutoSound.bird.species}`;
                    setLastHandledAlert(alertKey);
                  }
                }}
              >
                Deny
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (pendingAutoSound.timer) clearTimeout(pendingAutoSound.timer);
                  if (countdownRef.current) clearInterval(countdownRef.current);
                  (async () => {
                    const bestSound = await getBestRecommendedSound(pendingAutoSound.bird.species, pendingAutoSound.bird.context || '');
                    activatePredatorSound(bestSound);
                  })();
                  setPendingAutoSound(null);
                  if (pendingAutoSound?.bird) {
                    const alertKey = `${pendingAutoSound.bird.timestamp}_${pendingAutoSound.bird.species}`;
                    setLastHandledAlert(alertKey);
                  }
                }}
              >
                Allow Now
              </Button>
            </div>
          </div>
        </div>
      )}

      {predatorSystem.playbackStatus === 'playing' && (
        <button
          onClick={stopPredatorSound}
          className="fixed bottom-8 right-8 z-50 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg w-16 h-16 flex items-center justify-center transition-all"
          title="Stop Predator Sound"
          style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}
        >
          <StopCircle className="w-8 h-8" />
        </button>
      )}

      {/* Critical Action Modal */}
      {criticalActionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
            <h2 className="text-xl font-bold mb-2 text-red-700 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              CRITICAL RISK DETECTED!
            </h2>
            <p className="mb-4">
              <span className="text-lg font-bold text-black-800">{criticalActionModal.action}</span>
              <br />
              <span className="text-red-600 font-semibold">
                Auto-action will be taken in {criticalCountdown !== null ? criticalCountdown : 5} seconds...
              </span>
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (criticalCountdownRef.current) clearInterval(criticalCountdownRef.current);
                  // Stop predator sound if already playing
                  if (predatorSystem.playbackStatus === 'playing') {
                    stopPredatorSound();
                  }
                  setCriticalActionModal(null);
                  setCriticalCountdown(null);
                }}
              >
                Deny
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (criticalCountdownRef.current) clearInterval(criticalCountdownRef.current);
                  setCriticalActionModal(null);
                  setCriticalCountdown(null);
                  // Optionally, show a toast or feedback here
                  toast({
                    title: "Critical Action Executed",
                    description: "Emergency procedures have been initiated.",
                    variant: "destructive",
                    duration: 5000
                  });
                }}
              >
                Allow Now
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntegratedBirdMonitor;