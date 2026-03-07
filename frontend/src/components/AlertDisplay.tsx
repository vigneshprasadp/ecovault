import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BellRing } from 'lucide-react';

export default function AlertDisplay() {
    const [alerts, setAlerts] = useState<any[]>([]);

    useEffect(() => {
        // Stub for polling or WebSocket
        const interval = setInterval(() => {
            // Simulate random alert occasionally
            if (Math.random() > 0.8) {
                setAlerts((prev) => [
                    { id: Date.now(), title: "Suspicious Login Activity", risk: (Math.random() * 0.5 + 0.5).toFixed(2), time: new Date().toLocaleTimeString() },
                    ...prev.slice(0, 4)
                ]);
            }
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
                <CardTitle className="text-blue-400 flex items-center gap-2">
                    <BellRing className="h-5 w-5" />
                    Active Threats
                </CardTitle>
            </CardHeader>
            <CardContent>
                {alerts.length === 0 ? (
                    <p className="text-slate-500 text-sm">No recent alerts detected.</p>
                ) : (
                    <div className="space-y-3">
                        {alerts.map((alert) => (
                            <div key={alert.id} className="p-3 bg-slate-900/50 border border-slate-700 rounded-md flex justify-between items-center">
                                <div>
                                    <p className="font-medium text-slate-200">{alert.title}</p>
                                    <p className="text-xs text-slate-400">{alert.time}</p>
                                </div>
                                <div className={`px-2 py-1 rounded text-xs font-bold ${Number(alert.risk) > 0.8 ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'}`}>
                                    Risk: {alert.risk}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
