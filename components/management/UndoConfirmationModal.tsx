import React, { useState } from 'react';
import type { ActionHistory } from '../../types';

const SpinnerIcon: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

interface UndoConfirmationModalProps {
    action: ActionHistory;
    onConfirm: (historyId: string, password: string) => Promise<boolean>;
    onClose: () => void;
}

const generateUndoDescription = (action: ActionHistory): React.ReactNode => {
    const { action_type, previous_data, new_data, description } = action;

    const getPersonName = (data: any): string => data?.person?.name || data?.name || 'Pessoa desconhecida';

    switch (action_type) {
        case 'CREATE_REGISTRATION':
        case 'CREATE_PERSON':
        case 'CREATE_EVENT':
            return <>A criação de <strong>{getPersonName(new_data)}</strong> será revertida (o item será marcado como excluído).</>;

        case 'DELETE_REGISTRATION':
        case 'DELETE_PERSON':
        case 'DELETE_EVENT':
            return <>O item <strong>{getPersonName(previous_data)}</strong> que foi excluído será restaurado.</>;

        case 'UPDATE_REGISTRATION':
        case 'UPDATE_PERSON':
        case 'UPDATE_EVENT':
             return (
                <div>
                    <p className="mb-2">As seguintes alterações serão desfeitas:</p>
                    <ul className="list-disc list-inside text-sm text-zinc-700 space-y-1">
                        {description.split('\n').map((line, index) => <li key={index}>{line}</li>)}
                    </ul>
                     <p className="mt-2">O registro voltará ao seu estado anterior.</p>
                </div>
            );
        
        default:
            return <>A ação <strong>"{description.split('\n')[0]}"</strong> será revertida para o seu estado anterior.</>;
    }
};


const UndoConfirmationModal: React.FC<UndoConfirmationModalProps> = ({ action, onConfirm, onClose }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!password) {
            setError('A senha é obrigatória.');
            return;
        }
        setIsSubmitting(true);
        const success = await onConfirm(action.id, password);
        setIsSubmitting(false);
        if (success) {
            onClose();
        } else {
            setError('Senha incorreta ou falha ao desfazer.');
            setPassword('');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full animate-popIn">
                <form onSubmit={handleSubmit}>
                    <div className="sm:flex sm:items-start">
                         <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                            <svg className="h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                            </svg>
                        </div>
                        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                            <h3 className="text-lg leading-6 font-bold text-zinc-900">Desfazer Ação</h3>
                            <div className="mt-2 space-y-3">
                                <div className="text-sm text-zinc-800 bg-zinc-100 p-3 rounded-md border border-zinc-200">
                                    {generateUndoDescription(action)}
                                </div>
                                <p className="text-sm text-zinc-500">
                                    Para confirmar, por favor, insira sua senha de administrador.
                                </p>
                                <div>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className={`w-full px-3 py-2 bg-white border ${error ? 'border-red-500' : 'border-zinc-300'} rounded-md shadow-sm sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                        placeholder="Sua senha"
                                        autoFocus
                                        autoComplete="current-password"
                                    />
                                    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="mt-5 sm:mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                        <button type="button" onClick={onClose} disabled={isSubmitting} className="w-full justify-center rounded-full border border-zinc-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-zinc-700 hover:bg-zinc-50 sm:w-auto sm:text-sm">
                            Cancelar
                        </button>
                        <button type="submit" disabled={isSubmitting} className="w-full justify-center rounded-full border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 sm:w-auto sm:text-sm disabled:bg-blue-400 flex items-center gap-2 min-w-[120px]">
                            {isSubmitting ? <SpinnerIcon /> : null}
                            {isSubmitting ? 'Aguarde...' : 'Confirmar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UndoConfirmationModal;
