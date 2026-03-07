import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { simulatePropagation } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend, Label } from 'recharts';

export default function SimulationPanel() {
    const [sourceNode, setSourceNode] = useState('');
    const [loading, setLoading] = useState(false);
    const [simRunning, setSimRunning] = useState(false);

    const [chartData, setChartData] = useState<{ step: number; risk: number }[]>([]);

    const startSim = async () => {
        if (!sourceNode) return;
        setLoading(true);
        try {
            const res = await simulatePropagation(sourceNode);
            toast.success('Simulation Complete', { description: `Propagation Risk: ${res.data.propagation_risk}` });

            // Build mock timeline dataset based on propagation risk
            const baseRisk = res.data.propagation_risk || 0.1;
            const timeline = Array.from({ length: 6 }).map((_, i) => ({
                step: i,
                risk: Math.min(baseRisk * (1 + i * 0.2) + Math.random() * 0.1, 1).toFixed(2)
            }));

            setChartData(timeline as any);
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
                    <div className="p-8 border border-slate-700/50 rounded flex flex-col items-center justify-center bg-slate-900/50 min-h-[400px]">
                        <p className="text-emerald-400 mb-6 font-semibold animate-pulse tracking-widest text-sm uppercase">Simulating Lateral Movement...</p>

                        <div className="w-full h-72 bg-slate-800/80 rounded border border-slate-700 p-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 10, right: 20, left: 16, bottom: 28 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />

                                    <XAxis dataKey="step" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }}>
                                        <Label value="Time Step (Hours Post-Breach)" offset={-10} position="insideBottom" fill="#64748b" fontSize={11} />
                                    </XAxis>

                                    <YAxis stroke="#64748b" domain={[0, 1]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} tick={{ fill: '#94a3b8', fontSize: 12 }}>
                                        <Label value="Propagation Risk Level" angle={-90} position="insideLeft" offset={-4} fill="#64748b" fontSize={11} style={{ textAnchor: 'middle' }} />
                                    </YAxis>

                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', padding: '10px 14px' }}
                                        labelFormatter={(val) => `Hour ${val} post-breach`}
                                        formatter={(val: any) => [`${(Number(val) * 100).toFixed(1)}% Risk`, 'Propagation Level']}
                                    />

                                    <Legend wrapperStyle={{ color: '#94a3b8', fontSize: '12px', paddingTop: '8px' }} />

                                    {/* Critical threshold line at 80% risk */}
                                    <ReferenceLine y={0.8} stroke="#f43f5e" strokeDasharray="6 3" label={{ value: '⚠ Critical Threshold (80%)', fill: '#f43f5e', fontSize: 10, position: 'insideTopRight' }} />

                                    <Line
                                        type="monotone"
                                        dataKey="risk"
                                        name="Threat Risk"
                                        stroke="#10b981"
                                        strokeWidth={3}
                                        dot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#064e3b' }}
                                        activeDot={{ r: 8, fill: '#34d399' }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
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
