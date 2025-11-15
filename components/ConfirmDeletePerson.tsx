import React, { useState } from 'react';
import type { Person } from '../types';

interface ConfirmDeletePersonProps {
    person: Person;
    onConfirm: () => Promise<void>;
    onCancel: () => void;
}

const SpinnerIcon: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const ConfirmDeletePerson: React.FC<ConfirmDeletePersonProps> = ({ person, onConfirm, onCancel }) => {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleConfirmClick = async () => {
        setIsDeleting(true);
        try {
            await onConfirm();
            // On success, the parent component will unmount this modal.
        } catch (error) {
            // Error is handled by the usePeople hook's toast.
            // The modal remains open so the user understands the context of the error.
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full animate-popIn">
                <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                        <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                        <h3 className="text-lg leading-6 font-bold text-zinc-900" id="modal-title">
                            Excluir Pessoa
                        </h3>
                        <div className="mt-2">
                            <p className="text-sm text-zinc-500">
                                Você tem certeza que deseja excluir <strong className="font-semibold text-zinc-700">{person.name}</strong>? 
                                Esta ação removerá o registro da pessoa permanentemente. Esta ação não pode ser desfeita.
                            </p>
                        </div>
                    </div>
                </div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
                     <button
                        type="button"
                        onClick={handleConfirmClick}
                        disabled={isDeleting}
                        className="w-full inline-flex justify-center rounded-full border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 sm:w-auto sm:text-sm disabled:bg-red-400"
                    >
                        {isDeleting ? <SpinnerIcon /> : 'Excluir'}
                    </button>
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isDeleting}
                        className="mt-3 w-full inline-flex justify-center rounded-full border border-zinc-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-zinc-700 hover:bg-zinc-50 sm:mt-0 sm:w-auto sm:text-sm"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDeletePerson;