import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getGraph } from '@/lib/api';
import { Loader2 } from 'lucide-react';

export default function GraphDashboard() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<{ nodes: any[]; links: any[] }>({ nodes: [], links: [] });

    useEffect(() => {
        // Fetch graph data on mount
        getGraph()
            .then((res) => setData(res.data))
            .catch((err) => console.error("Failed to fetch graph data", err))
            .finally(() => setLoading(false));
    }, []);

    return (
        <Card className="bg-slate-800/50 border-slate-700 min-h-[400px]">
            <CardHeader>
                <CardTitle className="text-purple-400">Dark Web Echo Network</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center p-6 h-full min-h-[300px]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center text-slate-400">
                        <Loader2 className="h-8 w-8 animate-spin mb-4 text-purple-500" />
                        <p>Loading Force Directed Graph...</p>
                    </div>
                ) : (
                    <div className="text-center text-slate-400">
                        {/* Placeholder for actual recharts or react-force-graph implementation */}
                        <div className="w-full h-64 border border-slate-700/50 rounded flex items-center justify-center bg-slate-900/50">
                            <p>Graph Visualizer Mount Point. Loaded {data.nodes?.length || 0} nodes.</p>
                        </div>
                        <p className="mt-4 text-sm">Integrate recharts or force-graph here to render active traces.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
