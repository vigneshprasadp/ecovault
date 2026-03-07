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

export default api;
