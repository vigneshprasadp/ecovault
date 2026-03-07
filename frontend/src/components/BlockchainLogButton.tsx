import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { logToBlockchain } from '@/lib/api';
import { toast } from 'sonner';
import { Link2, Loader2 } from 'lucide-react';

export default function BlockchainLogButton() {
    const [loading, setLoading] = useState(false);
    const [txHash, setTxHash] = useState<string | null>(null);

    const logIncident = async () => {
        setLoading(true);
        try {
            // Stub values for demo
            const res = await logToBlockchain(42, "Test echo from Vignesh", 0.92);
            setTxHash(res.data?.tx_hash || '0xabc123...def456');
            toast.success("Incident logged to Blockchain", { description: "Immutable record created." });
        } catch (err) {
            toast.error("Blockchain Logging Failed", { description: "Is Ganache running?" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 border border-slate-700 bg-slate-800/50 rounded-md">
            <h3 className="text-amber-400 font-semibold mb-2 flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Immutable Ledger
            </h3>
            <p className="text-xs text-slate-400 mb-4">
                Log the current high-risk incident to the local Ganache network for tamper-proof forensics.
            </p>
            <Button
                onClick={logIncident}
                disabled={loading}
                variant="outline"
                className="w-full border-amber-500/50 text-amber-500 hover:bg-amber-500/10 hover:text-amber-400"
            >
                {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                Communicate to Chain
            </Button>

            {txHash && (
                <div className="mt-4 p-2 bg-slate-900 border border-slate-700 rounded text-xs">
                    <span className="text-slate-500">Tx Hash: </span>
                    <span className="text-amber-300 font-mono break-all">{txHash}</span>
                </div>
            )}
        </div>
    );
}
