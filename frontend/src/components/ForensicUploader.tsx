import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { uploadForensic } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, FileSearch } from 'lucide-react';

export default function ForensicUploader() {
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleUpload = async () => {
        if (!file) {
            toast.error("Please select a file to trace.");
            return;
        }
        setLoading(true);
        try {
            // Send a generic context payload since we are only focusing on Adversarial image checks now
            const res = await uploadForensic(file, "Cyber intelligence scan target");
            setResult(res.data);
            toast.success("Forensic trace completed.");
        } catch (err) {
            toast.error("Failed to analyze file.", { description: "Is the backend running?" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
                <CardTitle className="text-pink-400 flex items-center gap-2">
                    <FileSearch className="h-5 w-5" />
                    Forensic Trace Uploader
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4">
                    <Label className="text-slate-300">Deepfake & Image Authenticity Target (.png/.jpg/.webp)</Label>

                    <div className="flex items-center justify-center w-full">
                        <label htmlFor="file-upload" className={`flex flex-col items-center justify-center w-full h-56 border-2 border-dashed rounded-lg cursor-pointer ${file ? 'border-pink-500/50 bg-pink-950/10' : 'border-slate-700 bg-slate-900/50 hover:bg-slate-800/50'} transition-colors overflow-hidden relative`}>
                            {previewUrl ? (
                                <img src={previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-contain p-2 bg-slate-950/50 backdrop-blur-sm" />
                            ) : (
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <FileSearch className="w-12 h-12 mb-4 text-slate-500" />
                                    <p className="mb-2 text-sm text-slate-400"><span className="font-semibold text-pink-400">Click to upload</span> or drag and drop</p>
                                    <p className="text-xs text-slate-500">Analyze images for synthetic corruption</p>
                                </div>
                            )}
                            <Input
                                id="file-upload"
                                type="file"
                                accept="image/png, image/jpeg, image/webp"
                                className="hidden"
                                onChange={(e) => {
                                    const selectedFile = e.target.files?.[0];
                                    if (selectedFile) {
                                        setFile(selectedFile);
                                        setPreviewUrl(URL.createObjectURL(selectedFile));
                                        setResult(null);
                                    }
                                }}
                            />
                        </label>
                    </div>
                </div>

                <Button
                    onClick={handleUpload}
                    disabled={loading || !file}
                    className="w-full bg-pink-600 hover:bg-pink-500"
                >
                    {loading ? <Loader2 className="animate-spin mr-2" /> : null}
                    Initiate Trace
                </Button>

                {result && (
                    <div className="mt-6 p-4 bg-slate-900 border border-slate-700 rounded-md shadow-inner">
                        <h3 className="font-semibold text-pink-400 mb-4 border-b border-slate-800 pb-2 flex items-center gap-2">
                            <FileSearch className="w-4 h-4" /> Trace Report Auto-Generated
                        </h3>

                        <div className="grid gap-4">
                            {/* Adversarial Tamper Row Only */}
                            <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/80 border border-slate-700">
                                <div>
                                    <p className="text-sm font-medium text-slate-300">Deepfake Counter-Intelligence Scan</p>
                                    <p className="text-xs text-slate-500 mt-1">Generative Adversarial Network (GAN) synthetic anomaly detection</p>
                                </div>
                                <div className="text-right">
                                    <p className={`text-lg tracking-wide font-bold ${result.robust_against_adversary ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {result.robust_against_adversary ? 'GENUINE (PASSED)' : 'TAMPERING DETECTED'}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1">AI Anomaly Confidence Score: {(result.adv_score).toFixed(3)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
