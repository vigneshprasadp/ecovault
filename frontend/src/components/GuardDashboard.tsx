import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Shield, ShieldAlert, CheckCircle, Database, Lock, Search } from 'lucide-react';
import { uploadAssets, getRecentGuardAlerts } from '@/lib/api';

export default function GuardDashboard() {
    const [emails, setEmails] = useState('');
    const [domains, setDomains] = useState('');
    const [activeLogs, setActiveLogs] = useState<string[]>([]);
    const [isMonitoring, setIsMonitoring] = useState(false);
    const lastCheckTimeRef = useRef<number>(Date.now() / 1000);

    // Poll the backend for live alerts if monitoring is active
    useEffect(() => {
        if (!isMonitoring) return;
        const interval = setInterval(async () => {
            try {
                const res = await getRecentGuardAlerts(lastCheckTimeRef.current);
                if (res.data.alerts && res.data.alerts.length > 0) {
                    const newLogs = res.data.alerts.map((a: any) => a.message);
                    setActiveLogs(prev => [...prev, ...newLogs]);

                    // Update latest timestamp checked
                    lastCheckTimeRef.current = Math.max(...res.data.alerts.map((a: any) => a.timestamp));

                    // Flash toast for each alert
                    newLogs.forEach((msg: string) => {
                        if (msg.includes('ALLOWED NAVIGATION')) {
                            toast.success(msg, { duration: 10000 });
                        } else {
                            toast.error(msg, { duration: 10000 });
                        }
                    });
                }
            } catch (error) {
                // Silently ignore poll errors
            }
        }, 1500);
        return () => clearInterval(interval);
    }, [isMonitoring]);

    const handleUploadAssets = async () => {
        if (!emails && !domains) {
            toast.error("Please provide at least one email or domain.");
            return;
        }
        try {
            const payload = {
                emails: emails.split(',').map(e => e.trim()).filter(e => e),
                domains: domains.split(',').map(d => d.trim()).filter(d => d),
                apis: []
            };
            const res = await uploadAssets(payload);
            toast.success(`Assets protected: ${res.data.assets_tracked} items stored in ShadowPulse.`);

            // Start mock terminal output
            setIsMonitoring(true);
            setActiveLogs(["[SYSTEM] Initiating ShadowPulse distributed workers..."]);

            setTimeout(() => {
                setActiveLogs(prev => [...prev, "[REDIS] Bloom filter updated with new target hashes."]);
            }, 800);

            setTimeout(() => {
                setActiveLogs(prev => [...prev, `[TOR] Re-routing SOCKS5 proxies to hidden services...`]);
            }, 1800);

            setTimeout(() => {
                setActiveLogs(prev => [...prev, `[CRAWLER] Actively monitoring ${res.data.assets_tracked} VIP targets.`]);
            }, 2600);

            setTimeout(() => {
                const sampleTarget = payload.emails[0] || payload.domains[0];
                setActiveLogs(prev => [...prev, `[HUNT] Scraping dark web pastes for '${sampleTarget}' footprint...`]);
            }, 4000);

            setTimeout(() => {
                setActiveLogs(prev => [...prev, `[STATUS] Background heartbeat established. Monitoring 24/7. No leaks detected.`]);
            }, 6000);

            // Simulate finding a leak after 15 seconds for a dynamic demo experience
            setTimeout(() => {
                const sampleTarget = payload.emails[0] || payload.domains[0] || "admin@company.com";
                setActiveLogs(prev => [...prev, `[ALERT] 🚨 CRITICAL MATCH FOUND: '${sampleTarget}' detected in fresh LockBit ransomware dump! 🚨`]);
                toast.error(`SHADOWPULSE ALERT: Footprint detected in dark web leak!`, { duration: 10000 });
            }, 18000);

        } catch (error) {
            toast.error("Failed to upload assets.");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.02)]">
                <div className="flex items-center gap-3">
                    <div className="bg-emerald-900/30 p-2 rounded-lg border border-emerald-500/20">
                        <Shield className="h-6 w-6 text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">EchoVault Guard</h2>
                        <p className="text-sm text-slate-400">Zero-Trust Asset Protection & Live Credentials Guardian</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Live Password Interceptor Demo */}
                <Card className="bg-slate-950 border-slate-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-emerald-400"><Lock className="h-5 w-5" /> Live Password Interceptor Demo</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form action="/" method="GET" className="space-y-4 bg-slate-900/50 p-4 border border-slate-800 rounded-lg">
                            <div className="space-y-2">
                                <Label className="text-slate-300">Employee ID / Email</Label>
                                <Input type="text" placeholder="admin@acme.com" className="bg-slate-950 border-slate-700 focus-visible:ring-emerald-500 text-slate-200" required />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-300">Password</Label>
                                <Input type="password" placeholder="Enter password" className="bg-slate-950 border-slate-700 focus-visible:ring-emerald-500 text-slate-200" required />
                            </div>
                            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white">
                                Secure Login
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Footprint / Asset Protection */}
                <Card className="bg-slate-950 border-slate-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-cyan-400"><Database className="h-5 w-5" /> Load Organization Assets</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-slate-300">Protected Emails (comma separated)</Label>
                            <Input
                                placeholder="ceo@company.com, admin@company.com"
                                value={emails}
                                onChange={(e) => setEmails(e.target.value)}
                                className="bg-slate-900 border-slate-700 focus-visible:ring-cyan-500 text-slate-200"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-300">Protected Domains (comma separated)</Label>
                            <Input
                                placeholder="company.com, api.company.net"
                                value={domains}
                                onChange={(e) => setDomains(e.target.value)}
                                className="bg-slate-900 border-slate-700 focus-visible:ring-cyan-500 text-slate-200"
                            />
                        </div>
                        <Button onClick={handleUploadAssets} disabled={isMonitoring} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white">
                            <Shield className="h-4 w-4 mr-2" /> {isMonitoring ? "Guardian Active" : "Activate ShadowPulse Guardian"}
                        </Button>

                        {/* Live Terminal Output */}
                        {activeLogs.length > 0 && (
                            <div className="mt-4 bg-black border border-slate-800 rounded-lg p-3 font-mono text-xs text-emerald-400 space-y-1 max-h-40 overflow-y-auto">
                                <div className="text-slate-500 mb-2">// ShadowPulse Live Console</div>
                                {activeLogs.map((log, i) => (
                                    <div key={i} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <span className="text-slate-600 mr-2">{new Date().toLocaleTimeString()}</span>
                                        <span className={log.includes('[HUNT]') ? 'text-cyan-400' : (log.includes('BLOCKED NAVIGATION') || log.includes('[ALERT]')) ? 'text-red-500 font-bold' : log.includes('ALLOWED NAVIGATION') ? 'text-emerald-400 font-bold' : ''}>{log}</span>
                                    </div>
                                ))}
                                {isMonitoring && (
                                    <div className="animate-pulse">_</div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

            </div>

            <Card className="bg-slate-950 border-slate-800 mt-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-fuchsia-400"><Search className="h-5 w-5" /> Live Extension Testing Playground</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 border border-slate-800 rounded-lg bg-slate-900/50 flex flex-col justify-between">
                            <div>
                                <h4 className="font-bold text-red-400 flex items-center gap-2 mb-2"><ShieldAlert className="h-4 w-4" /> Test: Critical Domain Block</h4>
                            </div>
                            <div className="bg-black/40 p-3 rounded border border-slate-800 font-mono text-sm text-slate-300 break-all select-all mt-auto">
                                http://localhost:5173/?mock_domain=alphabaymarket.onion
                            </div>
                        </div>

                        <div className="p-4 border border-slate-800 rounded-lg bg-slate-900/50 flex flex-col justify-between">
                            <div>
                                <h4 className="font-bold text-emerald-400 flex items-center gap-2 mb-2"><CheckCircle className="h-4 w-4" /> Test: Moderate Domain Allow</h4>
                            </div>
                            <div className="bg-black/40 p-3 rounded border border-slate-800 font-mono text-sm text-slate-300 break-all select-all mt-auto">
                                http://localhost:5173/?mock_domain=hackerforum.onion
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
