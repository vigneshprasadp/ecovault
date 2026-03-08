import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { sendChat } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, Terminal, ShieldAlert } from 'lucide-react';

export default function ChatInterface() {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<{ user: string; bot: string; risk: number }[]>([]);
    const [loading, setLoading] = useState(false);

    const handleSend = async () => {
        if (!input.trim()) return;
        const userMsg = input;
        setMessages((prev) => [...prev, { user: userMsg, bot: '', risk: 0 }]);
        setInput('');
        setLoading(true);

        try {
            const { data } = await sendChat(userMsg);
            setMessages((prev) =>
                prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, bot: data.response, risk: data.risk } : m
                )
            );
            if (data.risk > 0.8) {
                toast.warning(`High Risk Echo Detected: ${data.risk.toFixed(2)}`, {
                    description: 'Check countermeasures below.',
                });
            }
        } catch (err) {
            toast.error('Chat failed', { description: 'Backend may be offline.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="bg-slate-900/80 border-cyan-500/30 backdrop-blur-sm min-h-[600px] font-sans">
            <CardHeader className="pb-3 border-b border-slate-800">
                <CardTitle className="flex justify-between items-center text-cyan-400">
                    <span className="flex items-center gap-2">
                        <Terminal className="h-5 w-5" /> AI Security Copilot
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="h-[450px] flex flex-col font-mono text-sm bg-black border border-slate-800 rounded-lg overflow-hidden shadow-[0_0_20px_rgba(6,182,212,0.15)] relative">
                    <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center gap-2">
                        <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                            <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                            <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                        </div>
                        <span className="text-slate-500 text-xs ml-2">root@echovault:~/copilot/osint_engine</span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        <div className="text-slate-500 mb-4 font-mono text-xs">
                            {"// Initializing EchoVault Intelligence Engine..."}<br />
                            {"// Loading OSINT APIs and Neural Models... READY."}
                        </div>

                        {messages.map((msg, i) => (
                            <div key={i} className="flex flex-col space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300 mb-4">
                                <div className="self-end text-emerald-400 bg-emerald-950/20 px-4 py-2 rounded-md border border-emerald-900/50 max-w-[85%] text-right font-mono">
                                    {msg.user}
                                </div>
                                {msg.bot && (
                                    <div className={`self-start w-full pl-4 border-l-2 ${msg.risk > 0.8 ? 'border-red-500/50 bg-red-950/10' : 'border-cyan-500/50 bg-cyan-950/10'} py-2 pr-4`}>
                                        <div className="flex items-center gap-2 mb-2">
                                            {msg.risk > 0.8 ? <ShieldAlert className="h-4 w-4 text-red-500" /> : <Terminal className="h-4 w-4 text-cyan-400" />}
                                            <span className={`text-xs font-bold font-sans tracking-widest uppercase ${msg.risk > 0.8 ? 'text-red-500' : 'text-cyan-400'}`}>
                                                [SYSTEM RESPONSE]
                                            </span>
                                        </div>
                                        <div className="text-slate-300 whitespace-pre-wrap leading-relaxed">
                                            {msg.bot}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                        {loading && (
                            <div className="flex items-center justify-end pr-2 text-slate-400 gap-2 mb-4 animate-pulse">
                                <span className="bg-emerald-400/50 w-2 h-4 block"></span> PROCESSING
                                <Loader2 className="animate-spin h-4 w-4 text-cyan-400 ml-2" />
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-2">
                    <Textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Execute query... (e.g., Show echoes for vignesh@example.com)"
                        className="min-h-[60px] bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500 font-mono text-sm focus-visible:ring-cyan-500"
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                    />
                    <Button onClick={handleSend} disabled={loading} className="bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                        Execute
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
