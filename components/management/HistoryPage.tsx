
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
    const undoneClasses = "text-zinc-400 bg-zinc-100 border border-zinc-200";
    if (isUndone) {
        return (
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${undoneClasses} z-10 relative`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
            </div>
        );
    }

    let icon;
    let bgClass = "bg-zinc-100 text-zinc-500 border border-zinc-200";

    if (type.startsWith('CREATE')) {
        bgClass = "bg-emerald-100 text-emerald-600 border border-emerald-200";
        icon = <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>;
    } else if (type.startsWith('UPDATE')) {
        bgClass = "bg-blue-100 text-blue-600 border border-blue-200";
        icon = <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>;
    } else if (type.startsWith('DELETE')) {
        bgClass = "bg-rose-100 text-rose-600 border border-rose-200";
        icon = <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
    } else {
        icon = <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    }

    return (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 relative ${bgClass}`}>
            {icon}
        </div>
    );
};

const ActionCard: React.FC<{ item: ActionHistory; onUndoClick: (item: ActionHistory) => void; onViewDetailsClick: (item: ActionHistory) => void; }> = ({ item, onUndoClick, onViewDetailsClick }) => {
    const time = new Date(item.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const isUndoable = !item.is_undone && !item.action_type.startsWith('UNDO');
    const hasDetails = !!item.previous_data || !!item.new_data || !!item.ip_address;
    
    // Get Initials for Avatar
    const actorName = item.actor || 'Sistema';
    const initials = actorName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    return (
        <div className={`group bg-white rounded-2xl border transition-all hover:shadow-md ${item.is_undone ? 'border-zinc-100 opacity-60' : 'border-zinc-200'}`}>
            <div className="p-4">
                <div className="flex items-start gap-4">
                    <ActionIcon type={item.action_type} isUndone={item.is_undone} />
                    
                    <div className="flex-grow min-w-0">
                        {/* Header: Actor & Time */}
                        <div className="flex justify-between items-center mb-1.5">
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-zinc-800 text-white flex items-center justify-center text-[9px] font-bold tracking-wider shadow-sm">
                                    {initials}
                                </div>
                                <span className="text-xs font-bold text-zinc-800">{actorName}</span>
                            </div>
                            <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-50 px-2 py-0.5 rounded-full border border-zinc-100">{time}</span>
                        </div>

                        {/* Description */}
                        <p className={`text-sm leading-relaxed ${item.is_undone ? 'text-zinc-400 line-through' : 'text-zinc-600'}`}>
                            {item.description}
                        </p>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-zinc-50 pl-12">
                    {hasDetails && (
                        <button 
                            onClick={() => onViewDetailsClick(item)} 
                            className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 px-3 py-1.5 rounded-lg transition-colors"
                        >
                            Detalhes
                        </button>
                    )}
                    {isUndoable && (
                        <button 
                            onClick={() => onUndoClick(item)} 
                            className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                        >
                            Desfazer
                        </button>
                    )}
                    {item.is_undone && (
                        <span className="text-[10px] font-semibold text-zinc-400 italic py-1.5 px-3">Desfeito</span>
                    )}
                </div>
            </div>
        </div>
    );
};

const HistoryPage: React.FC<HistoryPageProps> = ({ history, isLoading, onUndo, onBack }) => {
    const [itemToUndo, setItemToUndo] = useState<ActionHistory | null>(null);
    const [itemToView, setItemToView] = useState<ActionHistory | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredHistory = useMemo(() => {
        if (!searchQuery) return history;
        const lowerQ = searchQuery.toLowerCase();
        return history.filter(item => 
            item.description.toLowerCase().includes(lowerQ) ||
            (item.actor && item.actor.toLowerCase().includes(lowerQ)) ||
            item.action_type.toLowerCase().includes(lowerQ)
        );
    }, [history, searchQuery]);

    const groupedHistory = useMemo(() => {
        return filteredHistory.reduce((acc, item) => {
            const date = new Date(item.created_at).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
            // Capitalize first letter
            const formattedDate = date.charAt(0).toUpperCase() + date.slice(1);
            
            if (!acc[formattedDate]) {
                acc[formattedDate] = [];
            }
            acc[formattedDate].push(item);
            return acc;
        }, {} as Record<string, ActionHistory[]>);
    }, [filteredHistory]);

    return (
        <div className="animate-fadeIn min-h-full bg-zinc-50/50">
            {/* Main Header with Search */}
            <header className="sticky top-0 bg-white/90 backdrop-blur-md z-30 px-4 py-3 border-b border-zinc-200 shadow-sm">
                <div className="flex items-center gap-4 mb-3 md:mb-0">
                    <button onClick={onBack} className="p-2 rounded-full text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors -ml-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <h1 className="text-xl font-bold text-zinc-900">Histórico</h1>
                </div>
                
                <div className="relative mt-2 md:mt-0 md:absolute md:right-4 md:top-3 md:w-64">
                    <input
                        type="text"
                        placeholder="Buscar ação, usuário..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-zinc-100 border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-zinc-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
            </header>

            <main className="p-4 max-w-3xl mx-auto">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-zinc-400 gap-3">
                        <svg className="animate-spin h-8 w-8 text-zinc-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        <p className="text-sm font-medium">Carregando histórico...</p>
                    </div>
                ) : Object.keys(groupedHistory).length > 0 ? (
                    <div className="space-y-8 relative pb-20">
                        {/* Vertical Timeline Line - Dashed for cleaner look */}
                        <div className="absolute left-[1.15rem] top-6 bottom-0 w-px border-l-2 border-dashed border-zinc-200 hidden md:block" />

                        {(Object.entries(groupedHistory) as [string, ActionHistory[]][]).map(([date, items], index) => (
                            <div key={date} className="opacity-0 animate-fadeInUp relative group" style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}>
                                {/* Sticky Date Header with Backdrop Blur and Top Spacing Fix */}
                                <div className="sticky top-[4.5rem] md:top-20 z-20 mb-6 -mx-4 px-4 py-2 bg-zinc-50/80 backdrop-blur-md border-b border-zinc-100 md:bg-transparent md:backdrop-blur-none md:border-none md:p-0 md:mx-0 md:static">
                                    <span className="inline-block px-3 py-1 rounded-full bg-white text-zinc-600 text-xs font-bold border border-zinc-200 shadow-sm uppercase tracking-wide">
                                        {date}
                                    </span>
                                </div>
                                <div className="space-y-4 md:pl-10">
                                    {items.map(item => (
                                        <ActionCard 
                                            key={item.id} 
                                            item={item} 
                                            onUndoClick={setItemToUndo} 
                                            onViewDetailsClick={setItemToView} 
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 text-zinc-400">
                         <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                         </div>
                         <p className="font-medium">Nenhuma ação encontrada.</p>
                         <p className="text-xs mt-1">Tente buscar por outro termo ou limpe os filtros.</p>
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
