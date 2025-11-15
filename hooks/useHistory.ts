import { useState, useCallback } from 'react';
import type { ActionHistory } from '../types';
import * as api from '../services/api';
import { useToast } from '../contexts/ToastContext';

export const useHistory = () => {
    const { addToast } = useToast();
    const [history, setHistory] = useState<ActionHistory[]>([]);
    const [latestHistory, setLatestHistory] = useState<ActionHistory[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchAllHistory = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await api.fetchHistory();
            setHistory(data);
        } catch (err: any) {
            addToast(`Falha ao carregar histórico: ${err.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

    const fetchLatestHistory = useCallback(async () => {
        try {
            const data = await api.fetchHistory(3);
            setLatestHistory(data);
        } catch (err: any) {
             addToast(`Falha ao carregar últimas ações: ${err.message}`, 'error');
        }
    }, [addToast]);

    const undoAction = async (historyId: string, password: string): Promise<boolean> => {
        try {
            await api.undoAction(historyId, password);
            addToast('Ação desfeita com sucesso!', 'success');
            // Refresh both lists after undoing
            fetchAllHistory();
            fetchLatestHistory();
            return true;
        } catch (err: any) {
            addToast(`Falha ao desfazer ação: ${err.message}`, 'error');
            return false;
        }
    };

    return {
        history,
        latestHistory,
        isLoading,
        fetchAllHistory,
        fetchLatestHistory,
        undoAction,
    };
};
