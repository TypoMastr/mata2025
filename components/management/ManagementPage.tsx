import React, { useState } from 'react';
import type { Event } from '../../types';
import EventForm from './EventForm';

interface ManagementPageProps {
    events: Event[];
    onAddEvent: (eventData: Omit<Event, 'id'>) => Promise<Event>;
    onUpdateEvent: (eventData: Event) => Promise<Event>;
    onLogout: () => void;
}

const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC',
    });
};

const ManagementPage: React.FC<ManagementPageProps> = ({ events, onAddEvent, onUpdateEvent, onLogout }) => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [eventToEdit, setEventToEdit] = useState<Event | null>(null);

    const handleOpenForm = (event?: Event) => {
        setEventToEdit(event || null);
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEventToEdit(null);
    };

    return (
        <div className="animate-fadeIn">
            <header className="sticky top-0 md:static bg-white md:bg-transparent z-10 p-4 border-b border-zinc-200 md:border-b-0 md:pt-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-xl md:text-2xl font-bold text-zinc-800">Gestão de Eventos</h1>
                    <div className="flex items-center gap-2">
                         <button
                            onClick={() => handleOpenForm()}
                            className="bg-green-500 text-white font-bold py-2 px-4 rounded-full flex items-center gap-2 hover:bg-green-600 transition-colors shadow-sm"
                        >
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                            Novo Evento
                        </button>
                        <button onClick={onLogout} className="p-2 text-zinc-500 rounded-full hover:bg-zinc-200 hover:text-zinc-800 transition-colors" aria-label="Sair">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    </div>
                </div>
            </header>

            <main className="p-4 space-y-3">
                {events.length > 0 ? (
                    events.map((event, index) => (
                        <div key={event.id}
                            className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm flex justify-between items-center opacity-0 animate-fadeInUp"
                            style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}
                        >
                            <div>
                                <p className="font-bold text-zinc-800">{event.name}</p>
                                <p className="text-sm text-zinc-500 mt-1">{formatDate(event.event_date)}</p>
                            </div>
                            <button
                                onClick={() => handleOpenForm(event)}
                                className="text-sm font-semibold text-green-600 hover:bg-green-50 px-3 py-1.5 rounded-lg transition-colors"
                            >
                                Editar
                            </button>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-20 text-zinc-500">
                        <p className="font-semibold">Nenhum evento criado.</p>
                        <p className="mt-2 text-sm">Clique em "Novo Evento" para começar.</p>
                    </div>
                )}
            </main>

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
