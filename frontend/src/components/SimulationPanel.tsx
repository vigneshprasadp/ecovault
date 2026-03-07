import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { simulatePropagation } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, Activity } from 'lucide-react';

export default function SimulationPanel() {
    const [sourceNode, setSourceNode] = useState('');
    const [loading, setLoading] = useState(false);
    const [simRunning, setSimRunning] = useState(false);

    const startSim = async () => {
        if (!sourceNode) return;
        setLoading(true);
        try {
            await simulatePropagation(sourceNode);
            toast.success('Simulation Started', { description: `Tracing propagation for ${sourceNode}` });
            setSimRunning(true);
        } catch (err) {
            toast.error('Simulation Failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
                <CardTitle className="text-emerald-400 flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Propagation Timeline
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex gap-2 mb-6">
                    <Input
                        placeholder="Enter source node (e.g. vignesh@company.com)"
                        value={sourceNode}
                        onChange={(e) => setSourceNode(e.target.value)}
                        className="bg-slate-900 border-slate-700"
                    />
                    <Button onClick={startSim} disabled={loading} className="bg-emerald-600 hover:bg-emerald-500">
                        {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                        Simulate
                    </Button>
                </div>

                {simRunning ? (
                    <div className="p-8 border border-slate-700/50 rounded flex flex-col items-center justify-center bg-slate-900/50 min-h-[250px]">
                        <p className="text-slate-400 mb-4 animate-pulse">Running live simulation...</p>
                        {/* Placeholder for LineChart */}
                        <div className="w-full max-w-lg h-32 bg-slate-800 rounded flex items-center justify-center border border-slate-700">
                            <span className="text-xs text-slate-500">Risk Timeline Chart Placeholder</span>
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-slate-500 py-12">
                        Enter a node to see propagation simulation
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
