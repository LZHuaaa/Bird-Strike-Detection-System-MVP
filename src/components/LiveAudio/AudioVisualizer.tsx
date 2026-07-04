import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Radio, Activity } from 'lucide-react';

interface AudioVisualizerProps {
  isRecording: boolean;
  audioLevel: number;
  frequencyData: number[];
  audioConfig: {
    frequency_range?: string;
    sample_rate?: number;
  };
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isRecording,
  audioLevel,
  frequencyData,
  audioConfig
}) => {
  const sampleRateKhz = audioConfig.sample_rate 
    ? (audioConfig.sample_rate / 1000).toFixed(1) 
    : '44.1';

  return (
    <div className="space-y-6">
      {/* Real-time Audio Level */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center">
              <Radio className="w-4 h-4 mr-2 text-blue-500" />
              Audio Level
            </CardTitle>
            <Badge variant={isRecording ? "default" : "secondary"} className="flex items-center">
              <div className={`w-2 h-2 rounded-full mr-1 ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
              {isRecording ? 'LIVE' : 'OFFLINE'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={audioLevel} className="h-3 mb-2" />
          <div className="text-xs text-slate-600">
            Current: {audioLevel.toFixed(1)}dB | Peak: 85.3dB
          </div>
        </CardContent>
      </Card>

      {/* Live Audio Frequency Spectrum */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            <Activity className="w-4 h-4 mr-2 text-green-500" />
            Live Audio Frequency Spectrum
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 bg-gray-900 rounded-lg p-3">
            <div className="h-full flex items-end space-x-0.5">
              {frequencyData.map((value, index) => (
                <div
                  key={index}
                  className={`rounded-t-sm flex-1 transition-all duration-100 ${
                    isRecording 
                      ? 'bg-gradient-to-t from-purple-500 to-pink-400' 
                      : 'bg-gray-700'
                  }`}
                  style={{ height: `${(value / 255) * 100}%` }}
                />
              ))}
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500 text-center">
            Frequency Range: {audioConfig.frequency_range || '20Hz - 20kHz'} | Sample Rate: {sampleRateKhz}kHz
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
