
import React, { useState, useEffect } from 'react';
import type { Event } from '../types';
import * as api from '../services/api';

// Spinner Icon
const SpinnerIcon: React.FC<{ white?: boolean }> = ({ white = true }) => (
    <svg className={`animate-spin h-5 w-5 ${white ? 'text-white' : 'text-zinc-700'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

interface ConfirmDeleteEventProps {
    event: Event;
    onConfirm: () => Promise<void>;
    onCancel: () => void;
}

const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC',
    });
};

const ConfirmDeleteEvent: React.FC<ConfirmDeleteEventProps> = ({ event, onConfirm, onCancel }) => {
    const [isDeleting, setIsDeleting] = useState(false);
    const [isLoadingCount, setIsLoadingCount] = useState(true);
    const [registrationCount, setRegistrationCount] = useState<number | null>(null);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [shakeError, setShakeError] = useState(false);


    useEffect(() => {
        const fetchCount = async () => {
            try {
                const count = await api.getRegistrationCountForEvent(event.id);
                setRegistrationCount(count);
            } catch (error) {
                console.error("Failed to fetch registration count:", error);
                setRegistrationCount(0); // Default to 0 on error
            } finally {
                setIsLoadingCount(false);
            }
        };
        fetchCount();
    }, [event.id]);

    const handleConfirmClick = async () => {
        if (password !== 'umbanda396') {
            setError('Senha incorreta.');
            setPassword('');
            setShakeError(true);
            setTimeout(() => setShakeError(false), 500);
            return;
        }
        setError('');
        setIsDeleting(true);
        try {
            await onConfirm();
        } catch (error) {
            console.error("Failed to delete event:", error);
            setIsDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className={`bg-white rounded-xl shadow-lg p-6 max-w-md w-full animate-popIn ${shakeError ? 'animate-shake' : ''}`}>
                <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                        <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                        <h3 className="text-lg leading-6 font-bold text-zinc-900" id="modal-title">
                            Excluir Evento
                        </h3>
                        <div className="mt-2">
                            <p className="text-sm text-zinc-500">
                                Esta ação é <strong className="font-semibold text-red-600">IRREVERSÍVEL</strong>. Você tem certeza que deseja excluir permanentemente o evento abaixo e todos os seus dados?
                            </p>
                            <div className="mt-4 p-3 bg-zinc-50 border border-zinc-200 rounded-lg space-y-2 text-sm">
                                <p><span className="font-semibold text-zinc-500">Nome:</span> <span className="font-bold text-zinc-800">{event.name}</span></p>
                                <p><span className="font-semibold text-zinc-500">Data:</span> <span className="text-zinc-800">{formatDate(event.event_date)}</span></p>
                                <div className="flex items-center">
                                    <span className="font-semibold text-zinc-500">Inscrições:</span>
                                    {isLoadingCount ? (
                                        <div className="ml-2"><SpinnerIcon white={false} /></div>
                                    ) : (
                                        <span className="ml-2 font-bold text-zinc-800">{registrationCount}</span>
                                    )}
                                </div>
                            </div>
                            <div className="mt-4">
                                <label htmlFor="password-confirm-event" className="sr-only">Senha de confirmação</label>
                                <input
                                    id="password-confirm-event"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Senha para confirmar"
                                    className={`w-full px-3 py-2 bg-white border ${error ? 'border-red-500' : 'border-zinc-300'} rounded-md shadow-sm sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-500`}
                                    required
                                    autoComplete="off"
                                />
                                {error && <p className="mt-1 text-xs text-red-600 animate-fadeIn">{error}</p>}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="mt-5 sm:mt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isDeleting}
                        className="w-full justify-center rounded-full border border-zinc-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-zinc-700 hover:bg-zinc-50 sm:w-auto sm:text-sm"
                    >
                        Cancelar
                    </button>
                     <button
                        type="button"
                        onClick={handleConfirmClick}
                        disabled={isDeleting || isLoadingCount}
                        className="w-full justify-center rounded-full border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 sm:w-auto sm:text-sm disabled:bg-red-400 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isDeleting ? <SpinnerIcon /> : null}
                        {isDeleting ? 'Excluindo...' : 'Confirmar Exclusão'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDeleteEvent;