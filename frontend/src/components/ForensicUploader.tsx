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
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleUpload = async () => {
        if (!file) {
            toast.error("Please select a file to trace.");
            return;
        }
        setLoading(true);
        try {
            const res = await uploadForensic(file, query);
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
                <div className="space-y-2">
                    <Label htmlFor="file-upload" className="text-slate-300">Target File / Exported Dump (.json/.csv)</Label>
                    <Input
                        id="file-upload"
                        type="file"
                        className="cursor-pointer bg-slate-900 border-slate-700 file:bg-slate-800 file:text-slate-300 file:border-0"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="search-query" className="text-slate-300">Associated Context (Optional)</Label>
                    <Input
                        id="search-query"
                        placeholder="e.g., Target origin IP 192.168.1.50"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="bg-slate-900 border-slate-700"
                    />
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
                    <div className="mt-6 p-4 bg-slate-900 border border-slate-700 rounded-md">
                        <h3 className="font-semibold text-slate-200 mb-2">Trace Results:</h3>
                        <pre className="text-xs text-slate-400 whitespace-pre-wrap overflow-hidden">
                            {JSON.stringify(result, null, 2)}
                        </pre>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
