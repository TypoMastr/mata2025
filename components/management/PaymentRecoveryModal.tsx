
import React, { useState, useEffect } from 'react';
import * as api from '../../services/api';
import type { ActionHistory, Registration } from '../../types';
import { PaymentStatus } from '../../types';

interface PaymentRecoveryModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

const SpinnerIcon: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const PaymentRecoveryModal: React.FC<PaymentRecoveryModalProps> = ({ onClose, onSuccess }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [candidates, setCandidates] = useState<{ history: ActionHistory, currentRegistration: Registration }[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isRestoring, setIsRestoring] = useState(false);
    const [isAllSelected, setIsAllSelected] = useState(true);

    useEffect(() => {
        const analyzeHistory = async () => {
            try {
                // Fetch recent history (last 500 actions to ensure we catch everything)
                const history = await api.fetchHistory(500);
                
                // Filter for UPDATE_REGISTRATION where status went from PAGO to PENDENTE
                const potentialBugs = history.filter(item => {
                    if (item.action_type !== 'UPDATE_REGISTRATION') return false;
                    if (item.is_undone) return false;

                    const prev = item.previous_data as Registration;
                    const curr = item.new_data as Registration;

                    // Check if status changed from PAGO to PENDENTE
                    return prev?.payment?.status === PaymentStatus.PAGO && 
                           curr?.payment?.status === PaymentStatus.PENDENTE;
                });

                if (potentialBugs.length === 0) {
                    setIsLoading(false);
                    return;
                }

                // Verify current status in database to ensure it's still wrong
                // We group by eventId to minimize requests
                const eventIds = new Set(potentialBugs.map(p => (p.new_data as Registration).eventId));
                const currentRegistrationsMap = new Map<string, Registration>();

                for (const eventId of eventIds) {
                    const eventRegs = await api.fetchRegistrations(eventId);
                    eventRegs.forEach(r => currentRegistrationsMap.set(r.id, r));
                }

                const finalCandidates: { history: ActionHistory, currentRegistration: Registration }[] = [];

                potentialBugs.forEach(h => {
                    const regId = h.record_id;
                    const current = currentRegistrationsMap.get(regId);

                    // Only include if the person is currently PENDENTE in the database
                    if (current && current.payment.status === PaymentStatus.PENDENTE) {
                        // Avoid duplicates if the person was updated multiple times
                        if (!finalCandidates.find(c => c.currentRegistration.id === regId)) {
                            finalCandidates.push({ history: h, currentRegistration: current });
                        }
                    }
                });

                setCandidates(finalCandidates);
                // Select all by default
                setSelectedIds(new Set(finalCandidates.map(c => c.currentRegistration.id)));
                setIsAllSelected(true);

            } catch (error) {
                console.error("Error analyzing history:", error);
            } finally {
                setIsLoading(false);
            }
        };

        analyzeHistory();
    }, []);

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
        setIsAllSelected(newSet.size === candidates.length);
    };

    const toggleAll = () => {
        if (isAllSelected) {
            setSelectedIds(new Set());
            setIsAllSelected(false);
        } else {
            setSelectedIds(new Set(candidates.map(c => c.currentRegistration.id)));
            setIsAllSelected(true);
        }
    };

    const handleRestore = async () => {
        setIsRestoring(true);
        try {
            const promises = candidates
                .filter(c => selectedIds.has(c.currentRegistration.id))
                .map(async (c) => {
                    // IMPORTANT: We use the *current* registration data from the database
                    // and ONLY override the payment status. This preserves any other changes
                    // (like manual bus assignment) that were made when the bug occurred.
                    const restored: Registration = {
                        ...c.currentRegistration,
                        payment: {
                            ...c.currentRegistration.payment,
                            status: PaymentStatus.PAGO
                        }
                    };
                    return api.updateRegistration(restored);
                });

            await Promise.all(promises);
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Failed to restore", error);
            alert("Erro ao restaurar alguns registros. Verifique o console.");
            setIsRestoring(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fadeIn">
            {/* Reduced max-height to 85dvh for better mobile compatibility and ensured flex layout works with scrolling */}
            <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[85dvh] flex flex-col animate-popIn overflow-hidden">
                <header className="p-4 border-b border-zinc-200 flex justify-between items-center bg-red-50 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-red-100 p-2 rounded-full">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-zinc-800">Recuperar Status</h2>
                            <p className="text-xs text-zinc-500">Corrigir pagamentos alterados indevidamente</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full text-zinc-500 hover:bg-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </header>
                
                <main className="p-4 overflow-y-auto flex-grow min-h-0">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                            <SpinnerIcon />
                            <p className="mt-4 text-sm font-medium text-zinc-700">Analisando histórico...</p>
                        </div>
                    ) : candidates.length === 0 ? (
                        <div className="text-center py-12 text-zinc-500">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-green-200 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="font-bold text-lg text-zinc-800">Tudo certo!</p>
                            <p className="mt-2 text-sm max-w-sm mx-auto">Não encontramos registros alterados de 'Pago' para 'Pendente' que ainda estejam pendentes.</p>
                        </div>
                    ) : (
                        <div>
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800 mb-4 flex items-start gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                                <span>Encontramos <strong>{candidates.length} registros</strong> que mudaram de <strong>PAGO</strong> para <strong>PENDENTE</strong> recentemente. Selecione abaixo para restaurar o status PAGO (sem alterar o ônibus atual).</span>
                            </div>
                            
                            <div className="flex justify-between items-center mb-2 px-1">
                                <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-zinc-600 select-none">
                                    <input type="checkbox" checked={isAllSelected} onChange={toggleAll} className="rounded text-green-600 focus:ring-green-500" />
                                    Selecionar Todos
                                </label>
                                <span className="text-xs text-zinc-400">{selectedIds.size} selecionados</span>
                            </div>

                            <div className="space-y-2">
                                {candidates.map(({ history, currentRegistration }) => {
                                    const changeTime = new Date(history.created_at).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
                                    const personName = currentRegistration.person.name;
                                    
                                    return (
                                        <label key={currentRegistration.id} className="flex items-center p-3 border border-zinc-200 rounded-lg hover:bg-zinc-50 cursor-pointer transition-colors bg-white shadow-sm">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedIds.has(currentRegistration.id)} 
                                                onChange={() => toggleSelection(currentRegistration.id)}
                                                className="h-5 w-5 rounded border-zinc-300 text-green-600 focus:ring-green-500 mr-3"
                                            />
                                            <div className="flex-grow min-w-0">
                                                <p className="font-bold text-zinc-800 truncate">{personName}</p>
                                                <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1">
                                                    <span>Alterado em: {changeTime}</span>
                                                </p>
                                                <p className="text-xs text-zinc-400 mt-0.5 truncate">{history.description.split('\n')[0]}</p>
                                                {currentRegistration.busNumber && (
                                                    <p className="text-xs text-blue-600 mt-0.5 font-medium">
                                                        Ônibus Atual: {currentRegistration.busNumber}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex flex-col items-end gap-1 ml-2">
                                                <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Pago</span>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                                                <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">Pendente</span>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </main>

                <footer className="p-4 border-t border-zinc-200 flex justify-end gap-3 bg-zinc-50 flex-shrink-0">
                    <button onClick={onClose} disabled={isRestoring} className="px-4 py-2 bg-white border border-zinc-300 rounded-full font-bold text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-50">
                        Cancelar
                    </button>
                    {candidates.length > 0 && (
                        <button 
                            onClick={handleRestore} 
                            disabled={isRestoring || selectedIds.size === 0}
                            className="px-6 py-2 bg-green-500 text-white rounded-full font-bold hover:bg-green-600 transition-colors shadow-sm disabled:bg-green-300 flex items-center gap-2"
                        >
                            {isRestoring ? <SpinnerIcon /> : null}
                            {isRestoring ? 'Restaurando...' : `Restaurar (${selectedIds.size})`}
                        </button>
                    )}
                </footer>
            </div>
        </div>
    );
};

export default PaymentRecoveryModal;
