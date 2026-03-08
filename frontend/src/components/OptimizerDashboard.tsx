import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Input } from '@/components/ui/input';
import { optimizeScenario } from '@/lib/api';
import { Play, Plus, Trash2, Crosshair, ShieldAlert } from 'lucide-react';

interface Intervention {
    id: string;
    action: string;
    hour: number;
    cost: number;
    risk_reduction: number;
}

const AVAILABLE_ACTIONS = [
    { label: "Isolate Endpoint", value: "isolate_node", cost: 3.0, risk_reduction: 0.5 },
    { label: "Enforce MFA", value: "enforce_mfa", cost: 1.0, risk_reduction: 0.3 },
    { label: "Deploy Honeypot", value: "deploy_honeypot", cost: 4.0, risk_reduction: 0.6 },
    { label: "Alert Team", value: "alert_team", cost: 0.5, risk_reduction: 0.2 },
    { label: "Block IP Ranges", value: "block_ip_ranges", cost: 2.0, risk_reduction: 0.4 },
    { label: "Quarantine Subnet", value: "quarantine_subnet", cost: 5.0, risk_reduction: 0.8 },
];

const OptimizerDashboard: React.FC = () => {
    const [sourceNode, setSourceNode] = useState('vignesh@example.com');
    const [interventions, setInterventions] = useState<Intervention[]>([]);

    // Results
    const [chartData, setChartData] = useState<any[]>([]);
    const [metrics, setMetrics] = useState({
        prob: 0,
        time: 24,
        ethical: 0.5,
        optimalPlan: [] as any[]
    });
    const [isOptimizing, setIsOptimizing] = useState(false);

    // Initial load empty baseline
    useEffect(() => {
        handleOptimize();
    }, []);

    const handleAddIntervention = (actionValue: string) => {
        const template = AVAILABLE_ACTIONS.find(a => a.value === actionValue);
        if (!template) return;

        setInterventions(prev => [
            ...prev,
            {
                id: `ix_${Date.now()}`,
                action: template.value,
                hour: 0,
                cost: template.cost,
                risk_reduction: template.risk_reduction
            }
        ]);
        toast.info(`Added: ${template.label}`);
    };

    const handleRemoveIntervention = (id: string) => {
        setInterventions(prev => prev.filter(ix => ix.id !== id));
    };

    const handleHourChange = (id: string, hour: number) => {
        setInterventions(prev => prev.map(ix => ix.id === id ? { ...ix, hour } : ix));
    };

    const handleOptimize = async () => {
        setIsOptimizing(true);
        try {
            const res = await optimizeScenario(sourceNode, interventions);
            const {
                baseline_risk,
                scenario_risk,
                optimal_risk,
                containment_probability,
                time_to_containment,
                ethical_score,
                optimal_plan
            } = res.data;

            // Combine into recharts format
            const formatted = baseline_risk.map((val: number, idx: number) => ({
                hour: idx,
                Baseline: parseFloat(val.toFixed(3)),
                Scenario: parseFloat(scenario_risk[idx].toFixed(3)),
                Optimal: parseFloat(optimal_risk[idx].toFixed(3)),
            }));

            setChartData(formatted);
            setMetrics({
                prob: containment_probability,
                time: time_to_containment,
                ethical: ethical_score,
                optimalPlan: optimal_plan
            });
            toast.success("Simulation complete! Optimizer results updated.");
        } catch (err) {
            console.error(err);
            toast.error("Failed to run optimization engine.");
        } finally {
            setIsOptimizing(false);
        }
    };



    return (
        <Card className="bg-slate-900/80 border-indigo-500/30 backdrop-blur-sm min-h-[500px]">
            <CardHeader className="pb-3 border-b border-slate-800">
                <CardTitle className="flex justify-between items-center text-indigo-400">
                    <span className="flex items-center gap-2">
                        <Crosshair className="h-5 w-5" /> Response Optimizer
                    </span>
                </CardTitle>
                <p className="text-sm text-slate-400">Build ethical intervention scenarios and simulate outcomes using MILP + Monte Carlo</p>
            </CardHeader>

            <CardContent className="pt-6 grid grid-cols-1 xl:grid-cols-3 gap-6">

                {/* Left Panel: Scenario Builder */}
                <div className="space-y-6">
                    <div>
                        <label className="text-xs text-slate-400 uppercase font-semibold tracking-wider mb-2 block">Source Node (Target)</label>
                        <Input
                            value={sourceNode}
                            onChange={(e) => setSourceNode(e.target.value)}
                            className="bg-slate-950 border-slate-700 text-slate-200"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs text-slate-400 uppercase font-semibold tracking-wider block">Add Ethical Intervention</label>
                        <div className="flex flex-wrap gap-2">
                            {AVAILABLE_ACTIONS.map(a => (
                                <Badge
                                    key={a.value}
                                    variant="outline"
                                    className="cursor-pointer hover:bg-slate-800 bg-slate-900 border-slate-700 text-slate-300"
                                    onClick={() => handleAddIntervention(a.value)}
                                >
                                    <Plus className="h-3 w-3 mr-1" /> {a.label}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3 pt-4">
                        <label className="text-xs text-slate-400 uppercase font-semibold tracking-wider flex items-center gap-2 block">
                            Active Interventions <Badge className="bg-indigo-600 ml-auto">{interventions.length}</Badge>
                        </label>
                        {interventions.length === 0 ? (
                            <div className="text-sm text-slate-500 italic p-4 border border-dashed border-slate-800 rounded-lg text-center">
                                No interventions scheduled. Breach will propagate unmitigated.
                            </div>
                        ) : (
                            interventions.map(ix => {
                                const label = AVAILABLE_ACTIONS.find(a => a.value === ix.action)?.label;
                                return (
                                    <div key={ix.id} className="bg-slate-950 p-3 rounded-lg border border-slate-800 shadow-sm relative group transition-all hover:border-indigo-900/50">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-medium text-slate-200 text-sm flex items-center gap-2">
                                                <ShieldAlert className="h-4 w-4 text-indigo-400" /> {label}
                                            </span>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-900/20" onClick={() => handleRemoveIntervention(ix.id)}>
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-slate-500 whitespace-nowrap">Trigger Hour: {ix.hour}</span>
                                            <Slider
                                                value={[ix.hour]}
                                                onValueChange={(val) => handleHourChange(ix.id, val[0])}
                                                max={23}
                                                step={1}
                                                className="flex-1"
                                            />
                                        </div>
                                    </div>
                                )
                            })
                        )}
                        <Button onClick={handleOptimize} className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-900/20" disabled={isOptimizing}>
                            {isOptimizing ? "Simulating..." : <><Play className="h-4 w-4 mr-2" /> Run Optimizer</>}
                        </Button>
                    </div>
                </div>

                {/* Right Panel: Charts & Metrics */}
                <div className="xl:col-span-2 space-y-6 flex flex-col">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-slate-950 p-4 border border-slate-800 rounded-lg flex flex-col justify-center items-center">
                            <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">Containment Prob.</span>
                            <span className={`text-3xl font-bold ${(metrics.prob > 0.7) ? 'text-emerald-400' : 'text-orange-400'}`}>
                                {(metrics.prob * 100).toFixed(1)}%
                            </span>
                        </div>
                        <div className="bg-slate-950 p-4 border border-slate-800 rounded-lg flex flex-col justify-center items-center">
                            <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">Containment Time</span>
                            <span className="text-3xl font-bold text-cyan-400">
                                {metrics.time.toFixed(1)}h
                            </span>
                        </div>
                        <div className="bg-slate-950 p-4 border border-slate-800 rounded-lg flex flex-col justify-center items-center">
                            <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">Ethical Score</span>
                            <span className={`text-3xl font-bold px-3 py-1 bg-slate-900 rounded ${metrics.ethical > 0.7 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {metrics.ethical.toFixed(2)}
                            </span>
                        </div>
                    </div>

                    <div className="flex-1 min-h-[300px] border border-slate-800 rounded-lg bg-slate-950 p-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorBaseline" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorScenario" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.5} />
                                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorOptimal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.6} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="hour" stroke="#475569" tick={{ fill: '#94a3b8' }} />
                                <YAxis stroke="#475569" tick={{ fill: '#94a3b8' }} />
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                                    itemStyle={{ color: '#cbd5e1' }}
                                    labelStyle={{ color: '#94a3b8', marginBottom: '8px' }}
                                />
                                <Legend />
                                <Area type="monotone" dataKey="Baseline" stroke="#ef4444" fillOpacity={1} fill="url(#colorBaseline)" name="Unmitigated Risk" />
                                <Area type="monotone" dataKey="Scenario" stroke="#f59e0b" fillOpacity={1} fill="url(#colorScenario)" name="Your Custom Plan" />
                                <Area type="monotone" dataKey="Optimal" stroke="#10b981" fillOpacity={1} fill="url(#colorOptimal)" name="AI Optimized Path" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </CardContent>
        </Card>
    );
};

export default OptimizerDashboard;
