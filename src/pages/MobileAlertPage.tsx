import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bird, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../lib/api';

const MobileAlertPage = () => {
  const [latestAlert, setLatestAlert] = useState<any>(null);

  // Optionally fetch the latest alert from backend on mount
  useEffect(() => {
    fetch(`${API_BASE_URL}/latest-alert`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data && data.message) {
          setLatestAlert({
            message: data.message,
            time: data.time || '',
          });
        }
      });
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gradient-to-b from-blue-100 to-white px-4 py-6">
      {/* Header */}
      <header className="w-full flex flex-col items-center mb-6">
        <Bird className="w-12 h-12 text-blue-600 mb-2" />
        <h1 className="text-3xl font-bold text-blue-800 tracking-tight mb-1">Bird Strike Alert</h1>
        <span className="text-base text-gray-500 font-medium">Aviation Safety System</span>
      </header>

      {/* Latest Alert Card */}
      <Card className="w-full max-w-md bg-white border-blue-200 shadow-lg mb-4">
        <CardHeader className="flex flex-row items-center gap-3 pb-2">
          <MapPin className="w-7 h-7 text-blue-500" />
          <CardTitle className="text-xl text-blue-900 font-bold">Latest Bird Alert</CardTitle>
        </CardHeader>
        <CardContent>
          {latestAlert ? (
            <div className="flex flex-col gap-2">
              <div className="text-lg font-semibold text-blue-800 flex items-center gap-2">
                ⚠️ {latestAlert.message}
              </div>
              {latestAlert.time && (
                <div className="text-sm text-gray-500">{latestAlert.time}</div>
              )}
            </div>
          ) : (
            <div className="text-gray-400 text-base">No recent alerts.</div>
          )}
        </CardContent>
      </Card>

      {/* Minimal footer */}
      <footer className="mt-auto text-center text-xs text-gray-400 pt-8">
        &copy; {new Date().getFullYear()} Bird Strike Alert System
      </footer>
    </div>
  );
};

export default MobileAlertPage; 