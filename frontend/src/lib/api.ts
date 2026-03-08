import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000,
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('API Error:', error.response?.data || error.message);
        return Promise.reject(error);
    }
);

export const detectEcho = (query: string, topK = 5) =>
    api.post('/detection/', { query_text: query, top_k: topK });

export const sendChat = (input: string) =>
    api.post('/chat/', { user_input: input });

export const simulatePropagation = (source: string) =>
    api.post('/simulation/', { source_node: source });

export const uploadForensic = (file: File, textQuery: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('text_query', textQuery);
    return api.post('/forensics/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};

export const logToBlockchain = (echoId: number, data: string, severity: number) =>
    api.post('/blockchain/log/', { echo_id: echoId, data, severity });

export const getGraph = (filter?: string) =>
    api.get('/graph/', { params: filter ? { filter } : undefined });

export const triggerAlert = (risk: number, echoId: string) =>
    api.post('/alerts/', { risk, echo_id: echoId });

export const optimizeScenario = (sourceNode: string, interventions: any[]) =>
    api.post('/optimize/', { source_node: sourceNode, interventions });

export const validateEvidence = (file: File, contextText: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('context_text', contextText);
    return api.post('/authentiforge/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};

// DWIE feature endpoints
export const startDwieMonitor = () => api.post('/dwie/start-monitor');
export const getThreatFeed = () => api.get('/dwie/threat-feed');
export const getThreatScore = (domain: string) => api.get(`/dwie/threat-score/${domain}`);
export const getPredictions = () => api.get('/dwie/predictions');
export const getActorNetwork = () => api.get('/dwie/actor-network');
export const getLeakAuthenticity = (postId: number) => api.get(`/dwie/leak-authenticity/${postId}`);
export const getAttackSimulation = (domain: string) => api.get(`/dwie/attack-simulation/${domain}`);

// Guard Endpoints
export const uploadAssets = (data: any) => api.post('/guard/upload-assets', data);
export const checkPasswordHash = (data: any) => api.post('/guard/check-password', data);
export const getRecentGuardAlerts = (since: number) => api.get(`/guard/recent-alerts?since=${since}`);

export default api;
