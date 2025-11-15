import React from 'react';
import type { ActionHistory } from '../../types';

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

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full animate-popIn" onClick={(e) => e.stopPropagation()}>
                 <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg leading-6 font-bold text-zinc-900">Detalhes da Ação</h3>
                    <button onClick={onClose} className="p-1 -mt-1 -mr-1 rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="space-y-4">
                    <InfoRow label="Endereço IP" value={action.ip_address} />
                    <InfoRow label="Localização Aproximada" value={locationString} />
                    <p className="text-xs text-zinc-500 pt-3 border-t border-zinc-200">
                        A localização é uma estimativa baseada no endereço IP e pode não ser precisa.
                    </p>
                </div>
                 <button onClick={onClose} className="mt-6 w-full bg-zinc-200 text-zinc-800 font-bold py-2 px-4 rounded-full hover:bg-zinc-300 transition-colors">
                    Fechar
                </button>
            </div>
        </div>
    );
};

export default ActionInfoModal;