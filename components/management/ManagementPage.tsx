
import React, { useState, useEffect } from 'react';
import type { Event, View } from '../../types';
import EventForm from './EventForm';
import ConfirmDeleteEvent from '../ConfirmDeleteEvent';
import * as authService from '../../services/authService';

interface ManagementPageProps {
    events: Event[];
    onAddEvent: (eventData: Omit<Event, 'id'>) => Promise<Event>;
    onUpdateEvent: (eventData: Event) => Promise<Event>;
    onDeleteEvent: (eventId: string) => Promise<void>;
    onLogout: () => void;
    selectedEventId: string | null;
    onEventChange: (id: string | null) => void;
    setView: (view: View) => void;
}

const InfoCard: React.FC<{ icon: React.ReactElement; title: string; children: React.ReactNode; delay: number; }> = ({ icon, title, children, delay }) => (
    <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm opacity-0 animate-fadeInUp" style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}>
        <div className="flex items-center gap-3 mb-3">
            <div className="text-green-500">{icon}</div>
            <h2 className="text-md font-bold text-zinc-800">{title}</h2>
        </div>
        <div className="space-y-3 text-sm text-zinc-700">{children}</div>
    </div>
);

const BiometricsCard: React.FC = () => {
    const [isSupported, setIsSupported] = useState(false);
    const [isEnabled, setIsEnabled] = useState(false);
    const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const IconFingerPrint = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A7.5 7.5 0 0119.5 12c0 2.252-.903 4.34-2.378 5.855A7.5 7.5 0 019.622 4.145m1.503 1.498a5.25 5.25 0 00-6.236 6.236l-3.5 3.5a.75.75 0 001.06 1.06l3.5-3.5a5.25 5.25 0 006.236-6.236-1.503-1.503z" /></svg>;

    useEffect(() => {
        const supported = authService.isBiometricSupportAvailable();
        setIsSupported(supported);
        if (supported) {
            setIsEnabled(authService.hasBiometricCredential());
        }
    }, []);

    const handleEnableBiometrics = async () => {
        setStatus('loading');
        setErrorMessage('');
        try {
            await authService.registerBiometricCredential();
            setIsEnabled(true);
            setStatus('idle');
        } catch (err: any) {
            setStatus('error');
            if (err.name === 'NotAllowedError') {
                setErrorMessage('Permissão negada. Tente novamente.');
            } else {
                setErrorMessage('Falha ao habilitar. Tente novamente.');
            }
        }
    };

    const handleDisableBiometrics = () => {
        authService.removeBiometricCredential();
        setIsEnabled(false);
    };

    if (!isSupported) {
        return (
            <InfoCard icon={IconFingerPrint} title="Acesso Rápido" delay={100}>
                <p className="text-sm text-zinc-500">Seu navegador ou dispositivo não é compatível com login por biometria (Face ID/Touch ID).</p>
            </InfoCard>
        );
    }

    return (
        <InfoCard icon={IconFingerPrint} title="Acesso Rápido com Biometria" delay={100}>
            {isEnabled ? (
                <>
                    <p className="text-sm text-green-700 font-semibold">Login por biometria está ativado.</p>
                    <p className="text-xs text-zinc-500">Você pode entrar no aplicativo usando o Face ID ou Touch ID do seu dispositivo.</p>
                    <button onClick={handleDisableBiometrics} className="mt-2 text-sm text-red-600 font-semibold hover:underline">
                        Desabilitar
                    </button>
                </>
            ) : (
                <>
                    <p className="text-sm text-zinc-600">Habilite o login com sua impressão digital ou reconhecimento facial para um acesso mais rápido e seguro.</p>
                    <button
                        onClick={handleEnableBiometrics}
                        disabled={status === 'loading'}
                        className="mt-3 w-full bg-green-500 text-white font-bold py-2 px-4 rounded-full hover:bg-green-600 transition-colors shadow-sm flex items-center justify-center gap-2 disabled:bg-green-400"
                    >
                        {status === 'loading' ? 'Aguardando...' : 'Habilitar Biometria'}
                    </button>
                    {errorMessage && <p className="mt-2 text-sm text-red-600 text-center">{errorMessage}</p>}
                </>
            )}
        </InfoCard>
    );
};

const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC',
    });
};

const ManagementPage: React.FC<ManagementPageProps> = ({ events, onAddEvent, onUpdateEvent, onDeleteEvent, onLogout, selectedEventId, onEventChange, setView }) => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [eventToEdit, setEventToEdit] = useState<Event | null>(null);
    const [eventToDelete, setEventToDelete] = useState<Event | null>(null);

    const handleOpenForm = (event?: Event) => {
        setEventToEdit(event || null);
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEventToEdit(null);
    };

    const handleConfirmDelete = async () => {
        if (eventToDelete) {
            await onDeleteEvent(eventToDelete.id);
            if (selectedEventId === eventToDelete.id) {
                const remainingEvents = events.filter(e => e.id !== eventToDelete.id);
                onEventChange(remainingEvents.length > 0 ? remainingEvents[0].id : null);
            }
            setEventToDelete(null);
        }
    };

    const IconDatabase = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" /></svg>;

    return (
        <div className="animate-fadeIn">
            <header className="sticky top-0 md:static bg-white md:bg-transparent z-10 p-4 border-b border-zinc-200 md:border-b-0 md:pt-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-xl md:text-2xl font-bold text-zinc-800">Gestão</h1>
                    <div className="flex items-center gap-2">
                        <button onClick={onLogout} className="p-2 text-zinc-500 rounded-full hover:bg-zinc-200 hover:text-zinc-800 transition-colors" aria-label="Sair">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    </div>
                </div>
            </header>

            <main className="p-4 space-y-4">
                 <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm space-y-3">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-bold text-zinc-700">Eventos</h2>
                        <button
                            onClick={() => handleOpenForm()}
                            className="bg-green-500 text-white font-bold py-2 px-4 rounded-full flex items-center gap-2 hover:bg-green-600 transition-colors shadow-sm"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                            <span className="hidden sm:inline">Novo Evento</span>
                            <span className="sm:hidden">Novo</span>
                        </button>
                    </div>
                    {events.length > 0 ? (
                        events.map((event, index) => (
                            <div key={event.id}
                                className="bg-zinc-50 p-3 rounded-lg border border-zinc-200 flex flex-col md:flex-row justify-between md:items-center gap-3 opacity-0 animate-fadeInUp"
                                style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}
                            >
                                <div className="flex-grow">
                                    <p className="font-bold text-zinc-800">{event.name}</p>
                                    <p className="text-sm text-zinc-500 mt-1">{formatDate(event.event_date)}</p>
                                </div>
                                <div className="flex items-center gap-2 self-end md:self-center">
                                     {selectedEventId === event.id ? (
                                        <span className="px-3 py-1.5 text-xs font-bold text-green-700 bg-green-100 rounded-full">
                                            Ativo
                                        </span>
                                    ) : (
                                        <button
                                            onClick={() => onEventChange(event.id)}
                                            className="text-sm font-semibold text-zinc-600 hover:bg-zinc-100 px-3 py-1.5 rounded-lg transition-colors"
                                        >
                                            Tornar Ativo
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleOpenForm(event)}
                                        className="text-sm font-semibold text-green-600 hover:bg-green-50 px-3 py-1.5 rounded-lg transition-colors"
                                    >
                                        Editar
                                    </button>
                                    {selectedEventId !== event.id && (
                                        <button
                                            onClick={() => setEventToDelete(event)}
                                            className="text-sm font-semibold text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                                        >
                                            Excluir
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-12 text-zinc-500">
                            <p className="font-semibold">Nenhum evento criado.</p>
                            <p className="mt-2 text-sm">Clique em "Novo Evento" para começar.</p>
                        </div>
                    )}
                </div>
                
                <div className="pt-4 border-t border-zinc-200">
                     <h2 className="text-lg font-bold text-zinc-700 mb-3">Configurações</h2>
                     <div className="space-y-4">
                        <InfoCard icon={IconDatabase} title="Banco de Dados" delay={50}>
                             <p className="text-sm text-zinc-600">
                                Gerencie a lista central de todas as pessoas já cadastradas no sistema,
                                independentemente dos eventos em que participaram.
                            </p>
                            <button
                                onClick={() => setView('peopleManagement')}
                                className="mt-3 w-full bg-blue-500 text-white font-bold py-2 px-4 rounded-full hover:bg-blue-600 transition-colors shadow-sm flex items-center justify-center gap-2"
                            >
                                Gerenciar Pessoas
                            </button>
                        </InfoCard>
                        <BiometricsCard />
                     </div>
                </div>
            </main>

            {eventToDelete && (
                <ConfirmDeleteEvent
                    event={eventToDelete}
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setEventToDelete(null)}
                />
            )}

            {isFormOpen && (
                <EventForm
                    event={eventToEdit}
                    onSave={eventToEdit ? onUpdateEvent : onAddEvent}
                    onClose={handleCloseForm}
                />
            )}
        </div>
    );
};

export default ManagementPage;
