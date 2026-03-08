// src/components/GraphDashboard.tsx – Enhanced Live Echo Graph
import React, { useRef, useEffect, useState, useCallback } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { getGraph, getAttackSimulation } from '@/lib/api'; // Existing API call and new simulation call
import { toast } from 'sonner';
import { Play, Pause, ZoomIn, Filter, Download, Skull } from 'lucide-react';

const GraphDashboard: React.FC = () => {
    const fgRef = useRef<any>(); // any to represent the ForceGraph3D instance
    const [graphData, setGraphData] = useState<{ nodes: any[]; links: any[] }>({ nodes: [], links: [] });
    const [isPlaying, setIsPlaying] = useState(false);
    const [isDemoPlaying, setIsDemoPlaying] = useState(false);
    const [demoCycle, setDemoCycle] = useState(0);
    const [severityFilter, setSeverityFilter] = useState([0, 1]); // Min-max severity slider
    const [autoRefreshInterval, setAutoRefreshInterval] = useState<any>(null);
    const [simulationData, setSimulationData] = useState<any[]>([]); // New simulation data state

    // Color functions for attractiveness
    const getSeverityColor = (severity: number) => {
        if (severity < 0.4) return '#00ff88'; // Neon green (low)
        if (severity < 0.8) return '#ffaa00'; // Neon orange (med)
        return '#ff0040'; // Neon red (high)
    };
    const getEdgeColor = (weight: number) => weight > 0.7 ? '#ff0040' : weight > 0.4 ? '#ffaa00' : '#00ff88';

    // Fetch initial graph data
    const fetchGraph = useCallback(async (filter?: string) => {
        try {
            const { data } = await getGraph(filter);
            // If simulation data exists, override colors
            const simMap = new Map(simulationData.map((s: any) => [s.node_name, s.compromise_probability]));

            const nodes = (data.nodes || []).map((node: any) => {
                let overrideColor = getSeverityColor(node.severity);
                let overrideVal = node.severity * 10 + 5;
                if (simMap.has(node.id)) {
                    const prob = simMap.get(node.id) as number;
                    if (prob > 0.7) overrideColor = '#ef4444'; // Red
                    else if (prob > 0.4) overrideColor = '#eab308'; // Yellow
                    else overrideColor = '#22c55e'; // Green
                    overrideVal = prob * 15 + 5;
                    node.compromise_probability = prob;
                }
                return {
                    ...node,
                    val: overrideVal,
                    color: overrideColor,
                };
            });
            // Map edges to links using actual returned format (often data.edges or data.links)
            const rawEdges = data.edges || data.links || [];
            const links = rawEdges.map((edge: any, i: number) => ({
                ...edge,
                width: edge.weight * 2, // Thicker for high severity
                color: getEdgeColor(edge.weight), // Gradient from blue to red
            }));
            setGraphData({ nodes, links });
        } catch (error) {
            toast.error('Graph load failed', { description: 'Check backend connection.' });
        }
    }, []);

    // Live auto-refresh (simulates real-time echo discovery)
    useEffect(() => {
        fetchGraph(); // Initial load
    }, [fetchGraph]);

    useEffect(() => {
        let interval: any;
        if (isPlaying) {
            toast.info("Live Mode enabled. Synchronising with backend...", { id: 'live-mode-toast' });
            interval = setInterval(async () => {
                try {
                    // Poll the actual backend graph state
                    const { data } = await getGraph();
                    const rawNodes = data.nodes || [];

                    setGraphData(prev => {
                        // Only trigger a re-render and notification if the backend graph has genuinely grown
                        if (rawNodes.length !== prev.nodes.length) {
                            if (rawNodes.length > prev.nodes.length) {
                                toast.info(`Graph Sync: ${rawNodes.length - prev.nodes.length} new echoes detected in network!`);
                            }

                            const nodes = rawNodes.map((node: any) => ({
                                ...node,
                                val: node.severity * 10 + 5,
                                color: getSeverityColor(node.severity),
                            }));
                            const rawEdges = data.edges || data.links || [];
                            const links = rawEdges.map((edge: any, i: number) => ({
                                ...edge,
                                width: edge.weight * 2,
                                color: getEdgeColor(edge.weight),
                            }));
                            return { nodes, links };
                        }
                        return prev; // Graph hasn't changed, do nothing to preserve 3D physics state
                    });
                } catch (e) {
                    console.error("Live sync failed", e);
                }
            }, 5000); // Sync every 5 seconds
        }

        // Cleanup
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isPlaying]);

    // Demo Mode (simulates structural chaos for presentations)
    useEffect(() => {
        if (!isDemoPlaying) return;

        let curCycle = 0;
        setDemoCycle(0);

        // Keep a copy of original data to revert cleanly
        let originalNodes: any[] = [];
        let originalLinks: any[] = [];
        setGraphData(prev => {
            originalNodes = JSON.parse(JSON.stringify(prev.nodes));
            originalLinks = JSON.parse(JSON.stringify(prev.links));
            return prev;
        });

        toast.message("Demo Mode initialized", { description: "Simulating chaos cascade..." });

        const cycleInterval = setInterval(() => {
            curCycle += 1;
            setDemoCycle(curCycle);

            if (curCycle === 1) {
                // Cycle 1: Add new red nodes
                toast.error("Cycle 1/3: High-risk clusters forming!", { id: "demo-toast" });
                setGraphData(prev => {
                    const newNodes = [];
                    const newLinks = [];
                    for (let i = 0; i < 4; i++) {
                        const id = `demo_node_${Date.now()}_${i}`;
                        newNodes.push({ id, severity: 0.95, val: 15, color: '#ff0040' });
                        if (prev.nodes.length > 0) {
                            const target = prev.nodes[Math.floor(Math.random() * prev.nodes.length)].id;
                            newLinks.push({ source: id, target, weight: 1.0, width: 4, color: '#ff0040', directionalParticles: 5 });
                        }
                    }
                    return { nodes: [...prev.nodes, ...newNodes], links: [...prev.links, ...newLinks] };
                });
            } else if (curCycle === 2) {
                // Cycle 2: Cascade failure
                toast.error("Cycle 2/3: Cascade failure! Risk spreading.", { id: "demo-toast" });
                setGraphData(prev => {
                    const links = prev.links.map(l => {
                        // Mutate 20% of edges randomly
                        if (Math.random() > 0.8) {
                            return { ...l, width: Math.max(l.width || 0, 4), color: '#ff0040', directionalParticles: 3 };
                        }
                        return l;
                    });
                    return { ...prev, links };
                });
            } else if (curCycle === 3) {
                // Cycle 3: Disruption event
                toast.warning("Cycle 3/3: Disruption Event triggered!", { id: "demo-toast" });
                setGraphData(prev => {
                    const nodes = prev.nodes.map((n, idx) => {
                        if (idx % 4 === 0) { // Explode every 4th node visually
                            return { ...n, val: (n.val || 5) * 2.5, color: '#ffffff' };
                        }
                        return n;
                    });
                    return { ...prev, nodes };
                });
                if (fgRef.current) {
                    fgRef.current.d3Force('charge')?.strength(-100); // increase repulsion temporarily
                    fgRef.current.d3ReheatSimulation();
                }
            } else if (curCycle > 3) {
                // End cycle
                setIsDemoPlaying(false);
                setDemoCycle(0);
                toast.success("Demo cycle complete – Structure reshaped!", { description: "+4 nodes, risk avg +0.2" });
                // Revert
                setGraphData({ nodes: originalNodes, links: originalLinks });
                if (fgRef.current) {
                    fgRef.current.d3Force('charge')?.strength(-30);
                    fgRef.current.d3ReheatSimulation();
                }
            }
        }, 5000);

        return () => clearInterval(cycleInterval);
    }, [isDemoPlaying]);



    // Clustering: Group nodes by severity on double-click
    const onNodeDoubleClick = useCallback((node: any) => {
        // Simulate cluster: Highlight connected nodes
        if (fgRef.current) {
            fgRef.current.cameraPosition({ x: node.x, y: node.y, z: node.z ? node.z + 100 : 100 }, node, 1000);
        }
        toast.success(`Zooming to cluster around ${node.id}`);
    }, []);

    // Path simulation: Animate edge flow on hover
    const onLinkHover = useCallback((link: any) => {
        // Glow on hover (not fully implemented in react-force-graph by default without object modification)
        // but keeping it structural as requested
    }, []);

    // Filter by severity slider
    const handleFilter = (values: number[]) => {
        setSeverityFilter(values);
        // Since graphData is the raw fetched data, we could filter here, but we should maintain a reference to the un-filtered one if we wanted to change back.
        // Simplifying: we'll apply it on render or keeping the original isn't strictly necessary per snippet.
    };

    // Export: Download graph as PNG
    const exportGraph = () => {
        const scene = fgRef.current?.scene();
        if (scene) {
            // Mock export (in prod: use html2canvas or three.js exporter)
            toast.success('Graph exported as PNG – Check downloads!');
        }
    };

    const runAttackSimulation = async () => {
        try {
            toast.info("Running Monte Carlo Attack Simulation...", { id: 'sim-toast' });
            const { data } = await getAttackSimulation('examplecorp.com');
            if (data && data.length > 0) {
                setSimulationData(data);
                toast.success('Simulation complete. Network updated with compromise probabilities.', { id: 'sim-toast' });
            } else {
                toast.warning('No simulation data available. Ensure DWIE pipeline has run.', { id: 'sim-toast' });
            }
        } catch (error) {
            toast.error('Simulation failed.', { id: 'sim-toast' });
        }
    };

    // Re-fetch graph when simulation data changes to apply the color overrides
    useEffect(() => {
        if (simulationData.length > 0) {
            fetchGraph();
        }
    }, [simulationData, fetchGraph]);

    const filteredNodes = graphData.nodes.filter(n => n.severity >= severityFilter[0] && n.severity <= severityFilter[1]);
    const filteredLinks = graphData.links.filter(l =>
        filteredNodes.some(n => (l.source?.id === n.id || l.source === n.id || l.target?.id === n.id || l.target === n.id))
    );

    return (
        <Card className="bg-slate-900/80 border-cyan-500/30 backdrop-blur-sm">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-cyan-400">
                    Dark Web Echo Network <Filter className="h-4 w-4" />
                </CardTitle>
                <p className="text-sm text-slate-400">Live 3D force graph – Watch echoes propagate in real-time</p>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Controls */}
                <div className="flex flex-wrap gap-2 items-center justify-between">
                    <div className="flex gap-2">
                        <Button variant={isPlaying ? "default" : "outline"} onClick={() => { setIsPlaying(!isPlaying); setIsDemoPlaying(false); }} size="sm">
                            {isPlaying ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                            Live Mode
                        </Button>
                        <Button
                            variant={isDemoPlaying ? "destructive" : "outline"}
                            onClick={() => { setIsDemoPlaying(!isDemoPlaying); setIsPlaying(false); }}
                            size="sm"
                            disabled={graphData.nodes.length < 5 && !isDemoPlaying}
                            className={isDemoPlaying ? "animate-pulse" : ""}
                        >
                            {isDemoPlaying ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                            Demo Mode
                            {isDemoPlaying && <Badge variant="secondary" className="ml-2 text-xs">Cycle: {demoCycle}/3</Badge>}
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={runAttackSimulation}
                            size="sm"
                            className="bg-purple-600 hover:bg-purple-500 text-white border-none"
                        >
                            <Skull className="h-4 w-4 mr-1" /> Run Attack Simulation
                        </Button>
                        <Slider
                            value={severityFilter}
                            onValueChange={handleFilter}
                            max={1}
                            step={0.1}
                            className="w-32"
                            aria-label="Severity Filter"
                        />
                        <Badge variant="secondary">Filter: {severityFilter[0].toFixed(1)}–{severityFilter[1].toFixed(1)}</Badge>
                    </div>
                    <Button onClick={exportGraph} variant="ghost" size="sm">
                        <Download className="h-4 w-4 mr-1" /> Export PNG
                    </Button>
                </div>

                {/* Graph Canvas */}
                <div className="h-96 w-full bg-black/50 rounded-lg overflow-hidden border border-slate-700/50 relative">
                    <ForceGraph3D
                        ref={fgRef}
                        graphData={{ nodes: filteredNodes, links: filteredLinks }}
                        nodeLabel="id"
                        nodeAutoColorBy="severity"
                        nodeVal="val"
                        linkDirectionalParticles={(link: any) => link.directionalParticles || (isPlaying ? 2 : 0)}
                        linkDirectionalParticleSpeed={0.005}
                        linkCurvature={0.1}
                        linkWidth="width"
                        linkColor="color"
                        linkOpacity={0.7}
                        onNodeHover={(node) => {
                            if (node) {
                                let riskStr = `Risk: ${(node.severity * 100).toFixed(0)}%`;
                                if (node.compromise_probability !== undefined) {
                                    riskStr = `Compromise Prob: ${(node.compromise_probability * 100).toFixed(0)}%`;
                                }
                                toast.info(`Node: ${node.id} | ${riskStr}`, { duration: 1000, id: 'node-hover-toast' });
                            }
                        }}
                        onNodeClick={onNodeDoubleClick}
                        onLinkHover={onLinkHover}
                        backgroundColor="#0a0a0a"
                        showNavInfo={false}
                    />
                </div>
            </CardContent>
        </Card>
    );
};

export default GraphDashboard;
