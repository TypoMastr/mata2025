import React, { useState } from 'react';
import type { Attendee } from '../types';
import { PaymentStatus } from '../types';
import ReceiptViewer from './ReceiptViewer';

interface AttendeeDetailProps {
    attendee: Attendee;
    onBack: () => void;
    onEdit: () => void;
    onDelete: (attendee: Attendee) => void;
    onRegisterPayment: () => void;
    onEditPayment: () => void;
}

const DetailRow: React.FC<{ label: string; value?: string; children?: React.ReactNode }> = ({ label, value, children }) => (
    <div>
        <p className="text-sm text-zinc-500">{label}</p>
        {children || <p className="font-semibold text-zinc-800">{value}</p>}
    </div>
);

const AttendeeDetail: React.FC<AttendeeDetailProps> = ({ attendee, onBack, onEdit, onDelete, onRegisterPayment, onEditPayment }) => {
    const [showReceipt, setShowReceipt] = useState(false);
    const isPaid = attendee.payment.status === PaymentStatus.PAGO;

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            timeZone: 'UTC',
        });
    };
    
    const getAnimationStyle = (delay: number) => ({
        animationDelay: `${delay}ms`,
        animationFillMode: 'forwards',
    });

    return (
        <div className="animate-fadeIn">
            <header className="sticky top-0 md:static bg-white/80 md:bg-transparent backdrop-blur-sm z-10 p-4 md:pt-6 border-b border-zinc-200 flex items-center gap-4">
                <button onClick={onBack} className="text-zinc-500 hover:text-zinc-800 p-1 rounded-full hover:bg-zinc-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h1 className="text-xl md:text-2xl font-bold text-zinc-800">Detalhes da Inscrição</h1>
            </header>
            
            <div className="p-4">
                <div className="md:grid md:grid-cols-2 md:gap-6 space-y-6 md:space-y-0">
                    <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm space-y-4 opacity-0 animate-fadeInUp" style={getAnimationStyle(100)}>
                        <DetailRow label="Nome" value={attendee.name} />
                        <DetailRow label="Documento" value={`${attendee.document} (${attendee.documentType})`} />
                        <DetailRow label="Telefone" value={attendee.phone} />
                        <DetailRow label="Pacote" value={attendee.packageType} />
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm opacity-0 animate-fadeInUp" style={getAnimationStyle(200)}>
                        <h2 className="text-lg font-bold text-zinc-800 mb-3">Pagamento</h2>
                        <div className="space-y-4">
                            <DetailRow label="Status">
                                 <span className={`px-3 py-1 text-sm font-bold rounded-full ${isPaid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {attendee.payment.status}
                                </span>
                            </DetailRow>
                            <DetailRow label="Valor" value={`R$ ${attendee.payment.amount.toFixed(2).replace('.', ',')}`} />
                            {isPaid && (
                                <>
                                    <DetailRow label="Data do Pagamento" value={formatDate(attendee.payment.date)} />
                                    <DetailRow label="Tipo de Pagamento" value={attendee.payment.type || 'N/A'} />
                                    {attendee.payment.receiptUrl && (
                                         <button onClick={() => setShowReceipt(true)} className="text-sm font-semibold text-green-600 hover:underline">
                                            Ver Comprovante
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    <div className="space-y-3 opacity-0 animate-fadeInUp md:col-span-2" style={getAnimationStyle(300)}>
                         {!isPaid && (
                            <button onClick={onRegisterPayment} className="w-full bg-green-500 text-white font-bold py-3 px-4 rounded-full hover:bg-green-600 transition-colors shadow-sm">
                                Registrar Pagamento
                            </button>
                        )}
                        {isPaid && (
                             <button onClick={onEditPayment} className="w-full bg-blue-500 text-white font-bold py-3 px-4 rounded-full hover:bg-blue-600 transition-colors shadow-sm">
                                Editar Pagamento
                            </button>
                        )}
                        <div className="flex flex-col md:flex-row gap-3">
                            <button onClick={onEdit} className="w-full bg-zinc-200 text-zinc-800 font-bold py-3 px-4 rounded-full hover:bg-zinc-300 transition-colors">
                                Editar Inscrição
                            </button>
                             <button onClick={() => onDelete(attendee)} className="w-full bg-red-100 text-red-700 font-bold py-3 px-4 rounded-full hover:bg-red-200 transition-colors">
                                Excluir Inscrição
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            {showReceipt && attendee.payment.receiptUrl && (
                <ReceiptViewer receiptUrl={attendee.payment.receiptUrl} onClose={() => setShowReceipt(false)} />
            )}
        </div>
    );
};

export default AttendeeDetail;