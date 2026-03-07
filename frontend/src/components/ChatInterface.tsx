import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { sendChat } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

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
        <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
                <CardTitle className="text-cyan-400">AI Security Copilot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="h-96 overflow-y-auto p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                    {messages.map((msg, i) => (
                        <div key={i} className="mb-4">
                            <div className="text-right">
                                <span className="inline-block bg-cyan-600/30 px-4 py-2 rounded-tl-xl rounded-bl-xl rounded-tr-xl">
                                    {msg.user}
                                </span>
                            </div>
                            {msg.bot && (
                                <div className="mt-2 text-left">
                                    <span className="inline-block bg-purple-600/30 px-4 py-2 rounded-tr-xl rounded-br-xl rounded-tl-xl">
                                        {msg.bot}
                                        <span className="ml-2 text-xs text-slate-400">Risk: {msg.risk.toFixed(2)}</span>
                                    </span>
                                </div>
                            )}
                        </div>
                    ))}
                    {loading && <Loader2 className="animate-spin mx-auto my-4 text-cyan-400" />}
                </div>

                <div className="flex gap-2">
                    <Textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about any breach or echo... e.g., Show echoes for vignesh@example.com"
                        className="min-h-[60px] bg-slate-900 border-slate-700"
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                    />
                    <Button onClick={handleSend} disabled={loading} className="bg-cyan-600 hover:bg-cyan-500">
                        Send
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
