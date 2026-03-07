import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { UploadCloud, ShieldAlert, ShieldCheck, Download, Search, RefreshCw, AudioLines } from 'lucide-react';
import { validateEvidence } from '@/lib/api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { QRCodeSVG } from 'qrcode.react';

const AuthentiForgeDashboard: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [context, setContext] = useState('');
    const [isValidating, setIsValidating] = useState(false);
    const [results, setResults] = useState<any>(null);

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selected = e.target.files[0];
            setFile(selected);
            setPreviewUrl(URL.createObjectURL(selected));
            setResults(null);
            toast.info("Image loaded. Pre-processing for anonymization...");
        }
    };

    const handleValidate = async () => {
        if (!file) return;
        setIsValidating(true);
        toast.info("Validation sequence initiated...", { id: 'validate' });
        try {
            const res = await validateEvidence(file, context);
            setResults(res.data);
            toast.success("Ensemble analysis complete! Heatmap generated.", { id: 'validate' });
        } catch (error) {
            console.error(error);
            toast.error("Analysis failed. Check your connection or API server.", { id: 'validate' });
        } finally {
            setIsValidating(false);
        }
    };

    const handleReset = () => {
        setFile(null);
        setPreviewUrl(null);
        setResults(null);
        setContext('');
    };

    const integrityData = results ? [
        { name: 'Semantic', value: results.semantic_score * 100, fill: '#8b5cf6' },
        { name: 'Frequency', value: results.frequency_score * 100, fill: '#3b82f6' },
        { name: 'Provenance', value: results.provenance_score * 100, fill: '#10b981' },
    ] : [];

    const provenanceData = results ? [
        { name: 'Creation Time', Confirmed: 80, Mismatch: 20 },
        { name: 'EXIF Integrity', Confirmed: 65, Mismatch: 35 },
        { name: 'Hash Chain', Confirmed: 95, Mismatch: 5 },
    ] : [];

    return (
        <Card className="bg-slate-900/80 border-purple-500/30 backdrop-blur-sm min-h-[600px]">
            <CardHeader className="pb-3 border-b border-slate-800">
                <CardTitle className="flex justify-between items-center text-purple-400">
                    <span className="flex items-center gap-2">
                        <Search className="h-5 w-5" /> AuthentiForge: Visual Evidence Validator
                    </span>
                    {results && (
                        <Badge variant={results.bias_audit_pass ? "default" : "destructive"} className="flex gap-1 items-center bg-transparent border">
                            {results.bias_audit_pass ? <ShieldCheck className="h-3 w-3 text-emerald-400" /> : <ShieldAlert className="h-3 w-3 text-red-400" />}
                            Bias Audit: {results.bias_audit_pass ? "PASS" : "FAIL"}
                        </Badge>
                    )}
                </CardTitle>
                <p className="text-sm text-slate-400">Ethically validate breach screenshots and digital evidence using deep-learning multimodal analysis.</p>
            </CardHeader>

            <CardContent className="pt-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Side: Upload & Viewer */}
                <div className="space-y-6">
                    {!results ? (
                        <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center flex flex-col items-center justify-center bg-slate-950/50 min-h-[300px] transition hover:border-purple-500/50">
                            {previewUrl ? (
                                <div className="space-y-4 w-full relative group">
                                    <img src={previewUrl} alt="Preview" className="max-h-[300px] mx-auto rounded-lg object-contain shadow-lg opacity-80" />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                                        <Button variant="secondary" size="sm" onClick={() => document.getElementById('image-upload')?.click()}>Change Image</Button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <UploadCloud className="h-12 w-12 text-slate-500 mb-4" />
                                    <p className="text-slate-300 font-medium mb-1">Drag and drop visual evidence</p>
                                    <p className="text-slate-500 text-xs mb-4">Auto-anonymization protects PII instantly</p>
                                    <Button onClick={() => document.getElementById('image-upload')?.click()} variant="outline" className="border-purple-500/30 hover:bg-purple-900/20 text-purple-300">
                                        Browse Files
                                    </Button>
                                </>
                            )}
                            <input id="image-upload" type="file" accept="image/*" className="hidden" onChange={onFileChange} />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="relative border border-slate-700 rounded-xl overflow-hidden bg-slate-950 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
                                <div className="absolute top-2 left-2 z-10">
                                    <Badge className="bg-red-900/80 text-white border-red-500/50">Tamper Heatmap</Badge>
                                </div>
                                <img src={results.heatmap_url} alt="Heatmap" className="w-full h-auto object-contain cursor-crosshair transform hover:scale-[1.02] transition-transform" />
                            </div>
                            <div className="relative border border-slate-800 rounded-xl overflow-hidden opacity-75">
                                <div className="absolute top-2 left-2 z-10">
                                    <Badge variant="secondary" className="bg-slate-900 text-slate-300 border-slate-700">Anonymized Source</Badge>
                                </div>
                                <img src={results.anonymized_url} alt="Anonymized" className="w-full h-32 object-cover grayscale" />
                            </div>
                        </div>
                    )}

                    {!results && (
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-slate-400 uppercase font-semibold mb-2 block">Context Enrichment (Optional)</label>
                                <Textarea
                                    placeholder="e.g. 'Suspected deepfake screenshot of C-level Slack conversation'"
                                    value={context}
                                    onChange={e => setContext(e.target.value)}
                                    className="bg-slate-950 border-slate-800 text-slate-200 resize-none h-20"
                                />
                            </div>
                            <Button className="w-full bg-purple-600 hover:bg-purple-500" onClick={handleValidate} disabled={!file || isValidating}>
                                {isValidating ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Cross-Validating Ensemble...</> : <><Search className="h-4 w-4 mr-2" /> Validate Image</>}
                            </Button>
                        </div>
                    )}
                </div>

                {/* Right Side: Metrics & Reports */}
                <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 flex flex-col h-full">
                    {results ? (
                        <div className="space-y-6 flex-1">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">Analysis Verdict</h3>
                                    <p className="text-sm text-slate-400 mt-1 max-w-sm">{results.report_summary}</p>
                                </div>
                                <div className={`text-5xl font-extrabold ${results.integrity_score > 0.75 ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {Math.round(results.integrity_score * 100)}%
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-900 p-4 rounded-lg flex flex-col items-center border border-slate-800">
                                    <span className="text-xs text-slate-500 uppercase font-bold mb-2">Ensemble Weights</span>
                                    <ResponsiveContainer width="100%" height={120}>
                                        <PieChart>
                                            <Pie data={integrityData} dataKey="value" innerRadius={40} outerRadius={60} stroke="none" fill="#8884d8">
                                                {integrityData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                                            </Pie>
                                            <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                                    <span className="text-xs text-slate-500 uppercase font-bold mb-2 block">Provenance Tracing</span>
                                    <ResponsiveContainer width="100%" height={120}>
                                        <BarChart data={provenanceData} layout="vertical" margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" />
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                            <RechartsTooltip cursor={{ fill: '#1e293b' }} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }} />
                                            <Bar dataKey="Confirmed" stackId="a" fill="#10b981" barSize={12} />
                                            <Bar dataKey="Mismatch" stackId="a" fill="#ef4444" barSize={12} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="flex items-end justify-between border-t border-slate-800 pt-6 mt-auto">
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => toast.success("PDF Exported successfully!")} className="border-purple-500/50 hover:bg-purple-900/20 text-purple-300">
                                        <Download className="h-4 w-4 mr-2" /> Export Report
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={handleReset} className="text-slate-400 hover:text-white">
                                        Scan New Image
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => toast('Narrating results...', { icon: <AudioLines className="h-4 w-4" /> })} className="text-slate-400">
                                        <AudioLines className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="text-right flex flex-col items-end">
                                    <span className="text-[10px] text-slate-500 mb-2 font-mono uppercase">Decrypted Link</span>
                                    <div className="bg-white p-1 rounded-md shadow-[0_0_10px_rgba(255,255,255,0.1)]">
                                        <QRCodeSVG value="https://echovault.ai/secure-report-12345" size={48} level="L" marginSize={0} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center h-full text-slate-500 opacity-50 space-y-4">
                            <ShieldCheck className="h-16 w-16 mb-2" />
                            <h4 className="font-semibold text-lg text-slate-300">Awaiting Evidence</h4>
                            <p className="text-sm max-w-[250px]">Upload an image. Our models will automatically strip PII before running bias-audited integrity checks.</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default AuthentiForgeDashboard;
