import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { startDwieMonitor, getThreatFeed, getThreatScore, getPredictions, getActorNetwork, getLeakAuthenticity } from '@/lib/api';
import ForceGraph3D from 'react-force-graph-3d';
import { Eye, ShieldAlert, Cpu, Activity, RefreshCw, Crosshair, Box } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Line } from 'recharts';

export default function DwieDashboard() {
    const [domain, setDomain] = useState('examplecorp.com');
    const [scoreData, setScoreData] = useState<any>(null);
    const [feed, setFeed] = useState<any[]>([]);
    const [predictions, setPredictions] = useState<any[]>([]);
    const [actorNetwork, setActorNetwork] = useState<any>({ nodes: [], links: [] });
    const [leakAuth, setLeakAuth] = useState<any>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const actorGraphRef = useRef<any>(null);

    const fetchIntel = async () => {
        setIsRefreshing(true);
        try {
            const feedRes = await getThreatFeed();
            if (feedRes.data) setFeed(feedRes.data);

            const predRes = await getPredictions();
            if (predRes.data) setPredictions(predRes.data);

            const actorRes = await getActorNetwork();
            if (actorRes.data && actorRes.data.nodes) setActorNetwork(actorRes.data);

            if (feedRes.data && feedRes.data.length > 0) {
                const authRes = await getLeakAuthenticity(feedRes.data[0].id).catch(() => null);
                if (authRes?.data && !authRes.data.message) setLeakAuth(authRes.data);
            }

            checkDomain(domain);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load Dark Web Intelligence");
        } finally {
            setIsRefreshing(false);
        }
    };

    const checkDomain = async (targetDomain: string) => {
        try {
            const res = await getThreatScore(targetDomain);
            if (res.data) setScoreData(res.data);
            else setScoreData(null);
        } catch (error) {
            console.error(error);
        }
    };

    const runCrawler = async () => {
        toast.promise(
            startDwieMonitor(),
            {
                loading: 'Deploying intelligence crawlers to dark web nodes...',
                success: () => {
                    fetchIntel();
                    return 'Extraction Complete. Entity correlations refreshed.';
                },
                error: 'Pipeline failed.'
            }
        );
    };

    useEffect(() => {
        fetchIntel();
        const interval = setInterval(fetchIntel, 10000);
        return () => clearInterval(interval);
    }, []);

    // Formatting risk color dynamically
    const getRiskColor = (score: number) => {
        if (score > 70) return 'text-red-500';
        if (score > 40) return 'text-orange-400';
        return 'text-emerald-400';
    };
    const getBadgeColor = (category: string) => {
        if (category === "Critical") return 'destructive';
        if (category === "Medium") return 'default';
        return 'secondary';
    };

    // Chart logic
    const scoreGauge = scoreData ? [
        { name: 'Risk', value: scoreData.score, fill: scoreData.score > 70 ? '#ef4444' : scoreData.score > 40 ? '#f59e0b' : '#10b981' },
        { name: 'Safe', value: 100 - scoreData.score, fill: '#1e293b' }
    ] : [];

    const authGauge = leakAuth ? [
        { name: 'Authenticity', value: leakAuth.authenticity_score, fill: leakAuth.authenticity_score > 60 ? '#10b981' : leakAuth.authenticity_score > 30 ? '#f59e0b' : '#ef4444' },
        { name: 'Suspicion', value: 100 - leakAuth.authenticity_score, fill: '#1e293b' }
    ] : [];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.02)]">
                <div className="flex items-center gap-3">
                    <div className="bg-fuchsia-900/30 p-2 rounded-lg border border-fuchsia-500/20">
                        <Eye className="h-6 w-6 text-fuchsia-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-400 to-indigo-400">Dark Web Intelligence Engine (DWIE)</h2>
                        <p className="text-sm text-slate-400">Proactively monitor dark web markets, forums, and ransomware leak sites.</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="flex items-center">
                        <Input
                            value={domain}
                            onChange={e => setDomain(e.target.value)}
                            placeholder="Enter domain to track"
                            className="w-48 bg-slate-950 border-r-0 rounded-r-none border-slate-700 focus-visible:ring-0 text-slate-300"
                        />
                        <Button
                            onClick={() => checkDomain(domain)}
                            className="rounded-l-none bg-slate-800 hover:bg-slate-700 text-slate-300 border border-l-0 border-slate-700"
                        >
                            <Crosshair className="h-4 w-4" />
                        </Button>
                    </div>
                    <Button onClick={runCrawler} disabled={isRefreshing} className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white">
                        <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} /> Run Crawler
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* 1. Tracked Asset Risk (Threat Score) */}
                <Card className="bg-slate-950 border-slate-800">
                    <CardHeader className="pb-2 border-b border-slate-800">
                        <CardTitle className="text-slate-300 flex items-center justify-between text-sm uppercase tracking-wider">
                            <span className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-orange-400" /> Threat Score</span>
                            {scoreData && <Badge variant={getBadgeColor(scoreData.category)}>{scoreData.category}</Badge>}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 relative flex flex-col items-center justify-center min-h-[250px]">
                        {scoreData ? (
                            <>
                                <ResponsiveContainer width="100%" height={180}>
                                    <PieChart>
                                        <Pie data={scoreGauge} dataKey="value" startAngle={180} endAngle={0} innerRadius={60} outerRadius={80} stroke="none">
                                            {scoreGauge.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute top-[130px] flex flex-col items-center">
                                    <span className={`text-6xl font-black ${getRiskColor(scoreData.score)}`}>{scoreData.score}</span>
                                    <span className="text-sm text-slate-500 mt-1 uppercase tracking-widest font-semibold">{domain}</span>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-slate-500 opacity-60">
                                <Box className="h-12 w-12 mb-2" />
                                <p>No exact hits found for domain.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* 2. Live Intelligence Threat Feed */}
                <Card className="bg-slate-950 border-slate-800 lg:col-span-2 shadow-inner shadow-black/50">
                    <CardHeader className="pb-2 border-b border-slate-800 bg-slate-900/50">
                        <CardTitle className="text-slate-300 flex items-center gap-2 text-sm uppercase tracking-wider">
                            <Activity className="h-4 w-4 text-emerald-400" /> Live Threat Feed Matrix
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 h-[250px] overflow-y-auto custom-scrollbar">
                        <div className="flex flex-col">
                            {feed.length > 0 ? feed.map(alert => (
                                <div key={alert.id} className="border-b border-slate-800/60 p-4 hover:bg-slate-900/40 transition">
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="text-slate-200 font-medium font-mono text-sm">Intercept: {alert.post_title}</h4>
                                        <span className="text-[10px] text-slate-500">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-2">
                                        <Badge variant="outline" className="border-fuchsia-500/30 text-fuchsia-400 bg-fuchsia-500/10 text-xs shadow-none">Actor: {alert.threat_actor_alias}</Badge>
                                        <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10 text-xs shadow-none cursor-pointer">Records: {alert.dataset_size?.toLocaleString() || 'Unknown'}</Badge>
                                    </div>
                                </div>
                            )) : (
                                <div className="p-8 text-center text-slate-500">Awaiting intelligence gathering...</div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* 2.5 Leak Authenticity Detection Panel */}
                <Card className="bg-slate-950 border-slate-800">
                    <CardHeader className="pb-2 border-b border-slate-800">
                        <CardTitle className="text-slate-300 flex items-center justify-between text-sm uppercase tracking-wider">
                            <span className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-purple-400" /> Latest Leak Authenticity</span>
                            {leakAuth && <Badge variant={leakAuth.classification === 'likely real' ? 'destructive' : leakAuth.classification === 'uncertain' ? 'default' : 'secondary'}>{leakAuth.classification}</Badge>}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 relative flex flex-col items-center justify-center min-h-[250px]">
                        {leakAuth ? (
                            <>
                                <ResponsiveContainer width="100%" height={180}>
                                    <PieChart>
                                        <Pie data={authGauge} dataKey="value" startAngle={180} endAngle={0} innerRadius={60} outerRadius={80} stroke="none">
                                            {authGauge.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute top-[130px] flex flex-col items-center">
                                    <span className={`text-5xl font-black ${leakAuth.authenticity_score > 60 ? 'text-emerald-500' : leakAuth.authenticity_score > 30 ? 'text-orange-400' : 'text-red-500'}`}>
                                        {leakAuth.authenticity_score}
                                    </span>
                                    <span className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-semibold flex items-center">
                                        Confidence: {leakAuth.confidence}
                                    </span>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-slate-500 opacity-60">
                                <Box className="h-12 w-12 mb-2" />
                                <p>No authenticity data found.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* 3. Predictive Early Breach Models */}
                <Card className="bg-slate-950 border-slate-800 lg:col-span-3">
                    <CardHeader className="pb-2 border-b border-slate-800">
                        <CardTitle className="text-slate-300 flex items-center justify-between text-sm uppercase tracking-wider">
                            <span className="flex items-center gap-2"><Cpu className="h-4 w-4 text-indigo-400" /> Predicted Breach Risk Map</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <ResponsiveContainer width="100%" height={250}>
                            <ComposedChart data={predictions} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                                <XAxis dataKey="domain" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis yAxisId="left" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                                <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" hide />
                                <RechartsTooltip
                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}
                                    cursor={{ fill: '#1e293b' }}
                                />
                                <Bar yAxisId="left" dataKey="predicted_risk" name="Breach Probability (%)" barSize={30} fill="#f43f5e" radius={[4, 4, 0, 0]} />
                                <Line yAxisId="right" type="monotone" dataKey="estimated_records" name="Est. Disclosed Records" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* 4. Threat Actor Network Graph */}
                <Card className="bg-slate-950 border-slate-800 lg:col-span-3">
                    <CardHeader className="pb-2 border-b border-slate-800">
                        <CardTitle className="text-slate-300 flex items-center justify-between text-sm uppercase tracking-wider">
                            <span className="flex items-center gap-2"><Eye className="h-4 w-4 text-rose-400" /> Threat Actor Network Graph</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 border border-slate-700/50 rounded-b-lg overflow-hidden bg-black/40">
                        <div style={{ position: 'relative', width: '100%', height: '400px' }}>
                            <ForceGraph3D
                                ref={actorGraphRef}
                                graphData={actorNetwork}
                                nodeLabel="name"
                                nodeAutoColorBy="group"
                                nodeVal="val"
                                linkDirectionalParticles={2}
                                linkDirectionalParticleSpeed={0.005}
                                onNodeClick={(node) => {
                                    toast(`Selected Node: ${node.name}`, { description: `Type: ${node.group}` });
                                }}
                                width={800} /* Need specific styling for dynamic sizing, assuming flex layout will contain it */
                                height={400}
                                backgroundColor="#0a0a0a"
                            />
                        </div>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
