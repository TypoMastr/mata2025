import React, { useState, useMemo } from 'react';
import type { ActionHistory } from '../../types';
import UndoConfirmationModal from './UndoConfirmationModal';
import ActionInfoModal from './ActionInfoModal';

interface HistoryPageProps {
    history: ActionHistory[];
    isLoading: boolean;
    onUndo: (historyId: string, password: string) => Promise<boolean>;
    onBack: () => void;
}

const ActionIcon: React.FC<{ type: string, isUndone: boolean }> = ({ type, isUndone }) => {
    const undoneClasses = "text-zinc-400";
    if (isUndone) {
        return <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${undoneClasses}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" /></svg>;
    }

    if (type.startsWith('CREATE')) {
        return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    }
    if (type.startsWith('UPDATE')) {
        return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L14.732 3.732z" /></svg>;
    }
    if (type.startsWith('DELETE')) {
        return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    }
    return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
};

const ActionCard: React.FC<{ item: ActionHistory; onUndoClick: (item: ActionHistory) => void; onViewDetailsClick: (item: ActionHistory) => void; }> = ({ item, onUndoClick, onViewDetailsClick }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const time = new Date(item.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const isUndoable = !item.is_undone && !item.action_type.startsWith('UNDO');
    const hasDetails = !!item.previous_data || !!item.new_data || !!item.ip_address;

    return (
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="p-3 flex items-start gap-4 cursor-pointer hover:bg-zinc-50 transition-colors" onClick={() => setIsExpanded(!isExpanded)}>
                <div className={`mt-1 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${ item.is_undone ? 'bg-zinc-100' : 'bg-green-50' }`}>
                    <ActionIcon type={item.action_type} isUndone={item.is_undone} />
                </div>
                <div className="flex-grow min-w-0">
                    <p className={`text-sm break-words whitespace-pre-wrap ${item.is_undone ? 'text-zinc-500 line-through' : 'text-zinc-800'}`}>{item.description}</p>
                    <span className="text-xs font-semibold text-zinc-500">{time}</span>
                </div>
                 <div className="flex-shrink-0 mt-1">
                    <svg className={`h-5 w-5 text-zinc-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                </div>
            </div>
            
            {isExpanded && (
                <div className="bg-zinc-50 px-4 pb-3 pt-2 border-t border-zinc-200 animate-fadeIn">
                    <div className="flex justify-end items-center gap-4">
                        {hasDetails && (
                            <button onClick={() => onViewDetailsClick(item)} className="text-sm font-bold text-zinc-600 hover:text-zinc-900 transition-colors py-1 px-2 rounded-lg hover:bg-zinc-200">
                                Ver Detalhes
                            </button>
                        )}
                        {isUndoable ? (
                            <button onClick={() => onUndoClick(item)} className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors py-1 px-2 rounded-lg hover:bg-blue-100">
                                Desfazer
                            </button>
                        ) : (
                            <span className="text-sm font-semibold text-zinc-400 italic">
                                {item.is_undone ? 'Ação desfeita' : 'Não pode ser desfeito'}
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const HistoryPage: React.FC<HistoryPageProps> = ({ history, isLoading, onUndo, onBack }) => {
    const [itemToUndo, setItemToUndo] = useState<ActionHistory | null>(null);
    const [itemToView, setItemToView] = useState<ActionHistory | null>(null);

    const groupedHistory = useMemo(() => {
        return history.reduce((acc, item) => {
            const date = new Date(item.created_at).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' });
            if (!acc[date]) {
                acc[date] = [];
            }
            acc[date].push(item);
            return acc;
        }, {} as Record<string, ActionHistory[]>);
    }, [history]);

    return (
        <div className="animate-fadeIn">
            <header className="sticky top-0 md:static bg-white md:bg-transparent z-10 p-4 border-b border-zinc-200 md:border-b-0 md:pt-6">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-zinc-500 hover:text-zinc-800 p-1 rounded-full hover:bg-zinc-100">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <h1 className="text-xl md:text-2xl font-bold text-zinc-800">Histórico Completo</h1>
                </div>
            </header>

            <main className="p-4">
                {isLoading ? (
                    <p className="text-center text-zinc-500 py-8">Carregando histórico...</p>
                ) : Object.keys(groupedHistory).length > 0 ? (
                    <div className="space-y-6">
                        {(Object.entries(groupedHistory) as [string, ActionHistory[]][]).map(([date, items], index) => (
                            <div key={date} className="opacity-0 animate-fadeInUp" style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'forwards' }}>
                                <h2 className="text-md font-bold text-zinc-800 mb-3">{date}</h2>
                                <div className="space-y-3">
                                    {items.map(item => <ActionCard key={item.id} item={item} onUndoClick={setItemToUndo} onViewDetailsClick={setItemToView} />)}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 text-zinc-500">
                         <p className="font-semibold">Nenhuma ação encontrada.</p>
                         <p className="mt-2 text-sm">O histórico de alterações aparecerá aqui.</p>
                    </div>
                )}
            </main>

            {itemToUndo && (
                <UndoConfirmationModal
                    action={itemToUndo}
                    onConfirm={onUndo}
                    onClose={() => setItemToUndo(null)}
                />
            )}
            
            {itemToView && (
                <ActionInfoModal action={itemToView} onClose={() => setItemToView(null)} />
            )}
        </div>
    );
};

export default HistoryPage;
