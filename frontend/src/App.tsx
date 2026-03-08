import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toaster } from 'sonner';
import ChatInterface from './components/ChatInterface';
import GraphDashboard from './components/GraphDashboard';
import AuthentiForgeDashboard from './components/AuthentiForgeDashboard';
import OptimizerDashboard from './components/OptimizerDashboard';
import GuardDashboard from './components/GuardDashboard';
import CyberBackground from './components/CyberBackground';

function App() {
  const [activeTab, setActiveTab] = useState('guard');

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))] text-white p-6 font-sans relative overflow-hidden">
      <CyberBackground />
      <div className="max-w-7xl mx-auto relative z-10">
        <header className="mb-10 text-center py-8">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 drop-shadow-sm">
            EchoVault
          </h1>
          <p className="text-lg md:text-xl text-slate-400 mt-3 tracking-wide">
            Proactive Dark Web Intelligence
          </p>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 gap-2 bg-slate-900/80 p-1 border border-slate-800 rounded-xl">
            <TabsTrigger className="cursor-pointer select-none data-[state=active]:bg-cyan-950 data-[state=active]:text-cyan-400 rounded-lg" value="chat">Chat Copilot</TabsTrigger>
            <TabsTrigger className="cursor-pointer select-none data-[state=active]:bg-purple-950 data-[state=active]:text-purple-400 rounded-lg" value="graph">Echo Graph</TabsTrigger>
            <TabsTrigger className="cursor-pointer select-none data-[state=active]:bg-emerald-950 data-[state=active]:text-emerald-400 rounded-lg" value="guard">EchoGuard</TabsTrigger>
            <TabsTrigger className="cursor-pointer select-none data-[state=active]:bg-pink-950 data-[state=active]:text-pink-400 rounded-lg" value="authentiforge">AuthentiForge</TabsTrigger>
            <TabsTrigger className="cursor-pointer select-none data-[state=active]:bg-indigo-950 data-[state=active]:text-indigo-400 rounded-lg" value="optimize">Response Optimizer</TabsTrigger>
          </TabsList>


          <div className="mt-6">
            <TabsContent value="chat" className="focus-visible:outline-none focus-visible:ring-0 mt-0">
              <ChatInterface />
            </TabsContent>

            <TabsContent value="graph" className="focus-visible:outline-none focus-visible:ring-0 mt-0">
              <GraphDashboard />
            </TabsContent>

            <TabsContent value="guard" className="focus-visible:outline-none focus-visible:ring-0 mt-0">
              <GuardDashboard />
            </TabsContent>

            <TabsContent value="authentiforge" className="focus-visible:outline-none focus-visible:ring-0 mt-0">
              <AuthentiForgeDashboard />
            </TabsContent>

            <TabsContent value="optimize" className="focus-visible:outline-none focus-visible:ring-0 mt-0">
              <OptimizerDashboard />
            </TabsContent>
          </div>
        </Tabs>

        <Toaster position="top-right" richColors theme="dark" />
      </div>
    </div>
  );
}

export default App;
