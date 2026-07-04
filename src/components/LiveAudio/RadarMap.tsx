import React from 'react';
import { Target, Radio } from 'lucide-react';

interface Bird {
  species: string;
  scientific: string;
  confidence: number;
  location?: { x: number; y: number };
  callType: string;
  emotion: string;
  timestamp: string;
  riskScore: number;
  alertLevel: string;
  recommendedAction: string;
  image_data?: string | null;
}

interface RadarMapProps {
  isRecording: boolean;
  detectedBirds: Bird[];
}

export const RadarMap: React.FC<RadarMapProps> = ({ isRecording, detectedBirds }) => {
  return (
    <div className="relative h-64 bg-gradient-to-b from-sky-100 to-green-50 rounded-lg border-2 border-slate-300 overflow-hidden">
      {/* Runway */}
      <div className="absolute top-1/2 left-1/4 right-1/4 h-12 bg-gray-700 transform -translate-y-1/2 rounded">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white text-xs font-bold tracking-widest">RUNWAY 32L</div>
        </div>
        <div className="absolute inset-x-0 top-1/2 h-0.5 border-t-2 border-dashed border-white"></div>
      </div>

      {/* Terminal */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-24 h-16 bg-blue-600 rounded-lg shadow-lg">
        <div className="text-white text-xs text-center mt-1">Terminal</div>
      </div>

      {/* Grassland Zone - Top Left */}
      <div className="absolute top-4 left-4 w-20 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-lg opacity-60 border border-green-700">
        <div className="text-xs text-center mt-1 text-white font-medium">🌾 Grassland</div>
        <div className="absolute inset-0 opacity-30">
          <div className="h-full w-full" style={{
            backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.3) 2px, rgba(255,255,255,0.3) 4px)',
            backgroundSize: '4px 4px'
          }}></div>
        </div>
      </div>

      {/* Wetland Zone - Bottom Left */}
      <div className="absolute bottom-4 left-4 w-20 h-16 bg-blue-300 rounded-lg opacity-50 border border-blue-500">
        <div className="text-xs text-center mt-1 text-blue-800">💧 Wetland</div>
      </div>

      {/* Microphone Sensors */}
      <div className="absolute top-8 left-12">
        <div className="relative">
          <Radio className="w-4 h-4 text-purple-600" />
          {isRecording && (
            <div className="absolute inset-0 rounded-full bg-purple-400 animate-ping opacity-75"></div>
          )}
        </div>
      </div>
      <div className="absolute top-8 right-12">
        <Radio className="w-4 h-4 text-purple-600" />
      </div>
      <div className="absolute bottom-8 left-12">
        <Radio className="w-4 h-4 text-purple-600" />
      </div>

      {/* Live Bird Positions */}
      {detectedBirds.slice(0, 5).map((bird, index) => (
        <div
          key={index}
          className="absolute animate-pulse"
          style={{
            left: `${bird.location?.x || (50 + index * 30)}px`,
            top: `${bird.location?.y || (50 + index * 20)}px`,
          }}
        >
          <div className="relative group cursor-pointer">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
              bird.alertLevel === 'HIGH' || bird.alertLevel === 'CRITICAL' 
                ? 'bg-red-500 animate-bounce' 
                : bird.alertLevel === 'MEDIUM'
                ? 'bg-yellow-500'
                : 'bg-green-500'
            }`}>
              <span className="text-white text-xs">🦅</span>
            </div>
            
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
              {bird.species}
              <br />
              Risk: {((bird.riskScore || 0) * 100).toFixed(0)}%
            </div>
            
            {(bird.alertLevel === 'HIGH' || bird.alertLevel === 'CRITICAL') && (
              <div className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping" 
                   style={{ width: '40px', height: '40px', left: '-7px', top: '-7px' }}>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Legend */}
      <div className="absolute bottom-2 right-2 bg-white bg-opacity-90 rounded p-2 text-xs space-y-1">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span>High Risk</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <span>Medium Risk</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span>Low Risk</span>
        </div>
      </div>
    </div>
  );
};
