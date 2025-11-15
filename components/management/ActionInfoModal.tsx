import React from 'react';
import type { ActionHistory } from '../../types';
import ActionChangeDetails from './ActionChangeDetails';

interface ActionInfoModalProps {
    action: ActionHistory;
    onClose: () => void;
}

const InfoRow: React.FC<{ label: string; value?: string }> = ({ label, value }) => (
    <div>
        <p className="text-sm font-semibold text-zinc-500">{label}</p>
        <p className="font-mono text-zinc-800 text-sm">{value || 'N/A'}</p>
    </div>
);

const ActionInfoModal: React.FC<ActionInfoModalProps> = ({ action, onClose }) => {
    const location = action.location_info;
    const locationString = location ? [location.city, location.region, location.country_name].filter(Boolean).join(', ') : 'Não disponível';
    const hasTechnicalInfo = !!action.ip_address;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-lg w-full max-w-lg max-h-[90vh] flex flex-col animate-popIn" onClick={(e) => e.stopPropagation()}>
                <header className="p-4 border-b border-zinc-200 flex justify-between items-center flex-shrink-0">
                    <h3 className="text-lg leading-6 font-bold text-zinc-900">Detalhes da Ação</h3>
                    <button onClick={onClose} className="p-1 -mt-1 -mr-1 rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </header>
                <main className="p-4 space-y-4 overflow-y-auto">
                    <div>
                        <ActionChangeDetails previousData={action.previous_data} newData={action.new_data} />
                    </div>
                    {hasTechnicalInfo && (
                        <div className="pt-4 border-t border-zinc-200">
                             <h4 className="text-base font-bold text-zinc-700 mb-2">Informações Técnicas</h4>
                             <div className="space-y-3 p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                                <InfoRow label="Endereço IP" value={action.ip_address} />
                                <InfoRow label="Localização Aproximada" value={locationString} />
                            </div>
                            <p className="text-xs text-zinc-500 mt-2">
                                A localização é uma estimativa baseada no endereço IP e pode não ser precisa.
                            </p>
                        </div>
                    )}
                </main>
                 <footer className="p-3 border-t border-zinc-200 flex-shrink-0">
                     <button onClick={onClose} className="w-full bg-zinc-200 text-zinc-800 font-bold py-2 px-4 rounded-full hover:bg-zinc-300 transition-colors">
                        Fechar
                    </button>
                 </footer>
            </div>
        </div>
    );
};

export default ActionInfoModal;
