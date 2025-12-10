import React, { useState, useEffect, useMemo } from 'react';
import type { Event, View, ActionHistory } from '../../types';
import EventForm from './EventForm';
import ConfirmDeleteEvent from '../ConfirmDeleteEvent';
import * as authService from '../../services/authService';
import { useToast } from '../../contexts/ToastContext';

interface ManagementPageProps {
    events: Event[];
    onAddEvent: (eventData: Omit<Event, 'id'>) => Promise<Event>;
    onUpdateEvent: (eventData: Event) => Promise<Event>;
    onDeleteEvent: (eventId: string) => Promise<void>;
    onLogout: () => void;
    selectedEventId: string | null;
    onEventChange: (id: string | null) => void;
    setView: (view: View) => void;
    latestHistory: ActionHistory[];
}

// Icons
const Icons = {
    Plus: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>,
    Calendar: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    Dots: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>,
    FaceScan: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" /></svg>,
    Database: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" /></svg>,
    Clock: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
};

const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
    }).replace('.', '');
};

const SettingsCard: React.FC<{ 
    icon: React.ReactElement; 
    title: string; 
    description: string; 
    action: React.ReactNode;
    colorClass?: string;
}> = ({ icon, title, description, action, colorClass = "text-blue-500 bg-blue-50" }) => (
    <div className="bg-white p-4 rounded-3xl border border-zinc-100 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] flex items-center justify-between gap-4 transition-all hover:shadow-md">
        <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${colorClass}`}>
                {icon}
            </div>
            <div>
                <h3 className="font-bold text-zinc-800 text-sm md:text-base">{title}</h3>
                <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
            </div>
        </div>
        <div className="flex-shrink-0">
            {action}
        </div>
    </div>
);

const BiometricsWidget: React.FC = () => {
    const { addToast } = useToast();
    const [isSupported, setIsSupported] = useState(false);
    const [isEnabled, setIsEnabled] = useState(false);
    const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

    useEffect(() => {
        const supported = authService.isBiometricSupportAvailable();
        setIsSupported(supported);
        if (supported) {
            setIsEnabled(authService.hasBiometricCredential());
        }
    }, []);

    const handleToggle = async () => {
        if (isEnabled) {
            authService.removeBiometricCredential();
            setIsEnabled(false);
            addToast('Biometria desativada.', 'info');
        } else {
            setStatus('loading');
            try {
                await authService.registerBiometricCredential();
                setIsEnabled(true);
                setStatus('idle');
                addToast('Biometria ativada com sucesso!', 'success');
            } catch (err: any) {
                setStatus('error');
                setTimeout(() => setStatus('idle'), 3000);
                addToast(`Erro ao ativar: ${err.message || 'Verifique se seu dispositivo suporta.'}`, 'error');
            }
        }
    };

    if (!isSupported) return null;

    return (
        <SettingsCard
            icon={Icons.FaceScan}
            title="Acesso Biométrico"
            description="Entrar com Face ID ou Touch ID"
            colorClass="text-violet-600 bg-violet-50"
            action={
                <button
                    onClick={handleToggle}
                    disabled={status === 'loading'}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 ${isEnabled ? 'bg-violet-600' : 'bg-zinc-200'}`}
                >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
            }
        />
    );
};

const ManagementPage: React.FC<ManagementPageProps> = ({ events, onAddEvent, onUpdateEvent, onDeleteEvent, onLogout, selectedEventId, onEventChange, setView, latestHistory }) => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [eventToEdit, setEventToEdit] = useState<Event | null>(null);
    const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    const activeEvents = useMemo(() => events.filter(e => !e.is_archived), [events]);
    const archivedEvents = useMemo(() => events.filter(e => e.is_archived), [events]);

    const handleOpenForm = (event?: Event) => {
        setEventToEdit(event || null);
        setIsFormOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (eventToDelete) {
            await onDeleteEvent(eventToDelete.id);
            if (selectedEventId === eventToDelete.id) {
                const remaining = events.filter(e => e.id !== eventToDelete.id && !e.is_archived);
                onEventChange(remaining.length > 0 ? remaining[0].id : null);
            }
            setEventToDelete(null);
        }
    };

    const handleToggleArchive = async (event: Event) => {
        await onUpdateEvent({ ...event, is_archived: !event.is_archived });
    };

    // Close menus on click outside
    useEffect(() => {
        const clickHandler = (e: MouseEvent) => {
            if (!(e.target as Element).closest('[data-menu-trigger]')) setOpenMenuId(null);
        };
        document.addEventListener('click', clickHandler);
        return () => document.removeEventListener('click', clickHandler);
    }, []);

    return (
        <div className="animate-fadeIn pb-20 md:pb-0">
            {/* Header */}
            <header className="sticky top-0 md:static bg-white/90 backdrop-blur-md z-20 p-4 border-b border-zinc-200 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Gestão</h1>
                    <p className="text-xs text-zinc-500 font-medium">Administração do Sistema</p>
                </div>
                <button onClick={onLogout} className="p-2 bg-zinc-100 rounded-full text-zinc-500 hover:text-zinc-900 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                </button>
            </header>

            <main className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
                
                {/* Left Column: Events */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Active Events Section */}
                    <section>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-zinc-800">Eventos</h2>
                            <button onClick={() => handleOpenForm()} className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold py-2 px-4 rounded-full flex items-center gap-2 transition-all shadow-sm active:scale-95">
                                {Icons.Plus} Novo Evento
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {activeEvents.map((event, index) => {
                                const isActive = selectedEventId === event.id;
                                return (
                                    <div 
                                        key={event.id} 
                                        className={`group relative bg-white p-5 rounded-3xl border transition-all duration-300 opacity-0 animate-fadeInUp ${isActive ? 'border-emerald-500 ring-1 ring-emerald-500 shadow-md' : 'border-zinc-200 hover:border-zinc-300 hover:shadow-sm'}`}
                                        style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="bg-emerald-50 text-emerald-700 p-2.5 rounded-2xl">
                                                {Icons.Calendar}
                                            </div>
                                            <div className="relative">
                                                <button 
                                                    data-menu-trigger
                                                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === event.id ? null : event.id); }}
                                                    className="p-1 rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
                                                >
                                                    {Icons.Dots}
                                                </button>
                                                {openMenuId === event.id && (
                                                    <div className="absolute right-0 mt-2 w-32 bg-white rounded-xl shadow-xl border border-zinc-100 z-30 overflow-hidden animate-popIn">
                                                        <button onClick={() => { handleToggleArchive(event); setOpenMenuId(null); }} className="w-full text-left px-4 py-2.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50">Arquivar</button>
                                                        {!isActive && <button onClick={() => { setEventToDelete(event); setOpenMenuId(null); }} className="w-full text-left px-4 py-2.5 text-xs font-medium text-red-600 hover:bg-red-50">Excluir</button>}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <h3 className="font-bold text-zinc-900 text-lg leading-tight mb-1 truncate">{event.name}</h3>
                                        <p className="text-sm text-zinc-500 font-medium mb-4">{formatDate(event.event_date)}</p>
                                        
                                        <div className="flex gap-2 mt-auto">
                                            {isActive ? (
                                                <span className="flex-1 text-center py-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">Selecionado</span>
                                            ) : (
                                                <button onClick={() => onEventChange(event.id)} className="flex-1 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800 transition-colors">
                                                    Selecionar
                                                </button>
                                            )}
                                            <button onClick={() => handleOpenForm(event)} className="px-4 py-2.5 rounded-xl border border-zinc-200 text-zinc-600 text-xs font-bold hover:bg-zinc-50 transition-colors">
                                                Editar
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                            
                            {activeEvents.length === 0 && (
                                <div className="col-span-full py-10 text-center bg-zinc-50 rounded-3xl border border-dashed border-zinc-300">
                                    <p className="text-zinc-500 font-medium">Nenhum evento ativo.</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Archived Events - Collapsible look */}
                    {archivedEvents.length > 0 && (
                        <section className="pt-4 border-t border-zinc-200">
                            <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-3">Arquivados</h3>
                            <div className="space-y-2">
                                {archivedEvents.map(event => (
                                    <div key={event.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-2xl border border-zinc-200">
                                        <div className="opacity-60">
                                            <p className="font-bold text-zinc-800 text-sm">{event.name}</p>
                                            <p className="text-xs text-zinc-500">{formatDate(event.event_date)}</p>
                                        </div>
                                        <button onClick={() => handleToggleArchive(event)} className="text-xs font-semibold text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors">
                                            Restaurar
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>

                {/* Right Column: Settings & History */}
                <div className="space-y-6">
                    {/* Settings Group */}
                    <section className="space-y-4">
                        <h2 className="text-lg font-bold text-zinc-800">Configurações</h2>
                        <SettingsCard 
                            icon={Icons.Database}
                            title="Banco de Pessoas"
                            description="Gerenciar lista global"
                            action={
                                <button onClick={() => setView('peopleManagement')} className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold py-2 px-4 rounded-xl transition-colors shadow-sm active:scale-95">
                                    Acessar
                                </button>
                            }
                        />
                        <BiometricsWidget />
                    </section>

                    {/* Recent History Widget */}
                    <section className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col h-96">
                        <div className="p-4 border-b border-zinc-100 bg-zinc-50/50">
                            <h2 className="font-bold text-zinc-800">Histórico Recente</h2>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {latestHistory.length > 0 ? (
                                latestHistory.map(item => (
                                    <div key={item.id} className="p-3 hover:bg-zinc-50 rounded-xl transition-colors">
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">
                                                    {item.actor ? item.actor.charAt(0).toUpperCase() : 'S'}
                                                </div>
                                                <span className="text-xs font-bold text-zinc-700">{item.actor || 'Sistema'}</span>
                                            </div>
                                            <span className="text-[10px] font-medium text-zinc-400">
                                                {new Date(item.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                                            </span>
                                        </div>
                                        <p className="text-xs text-zinc-600 leading-snug line-clamp-2 pl-6.5">
                                            {item.description}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <div className="h-full flex items-center justify-center text-zinc-400 text-xs">
                                    Nenhuma atividade recente.
                                </div>
                            )}
                        </div>
                        {/* Footer Action Button - Fixed at bottom */}
                        <div className="p-3 border-t border-zinc-100 bg-zinc-50/50 mt-auto">
                            <button onClick={() => setView('history')} className="w-full py-3 text-xs font-bold text-zinc-600 bg-white border border-zinc-200 rounded-2xl hover:bg-zinc-50 hover:border-zinc-300 transition-all shadow-sm active:scale-95">
                                Ver Histórico Completo
                            </button>
                        </div>
                    </section>
                </div>
            </main>

            {/* Modals */}
            {eventToDelete && <ConfirmDeleteEvent event={eventToDelete} onConfirm={handleConfirmDelete} onCancel={() => setEventToDelete(null)} />}
            {isFormOpen && <EventForm event={eventToEdit} onSave={eventToEdit ? onUpdateEvent : onAddEvent} onClose={() => { setIsFormOpen(false); setEventToEdit(null); }} />}
        </div>
    );
};

export default ManagementPage;
