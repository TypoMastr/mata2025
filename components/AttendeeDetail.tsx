import React, { useState } from 'react';
import type { Attendee, PartialPaymentDetails } from '../types';
import { PaymentStatus, PackageType } from '../types';
import ReceiptViewer from './ReceiptViewer';

interface AttendeeDetailProps {
    attendee: Attendee;
    onBack: () => void;
    onEdit: () => void;
    onDelete: (attendee: Attendee) => void;
    onManagePayment: () => void;
}

const DetailRow: React.FC<{ label: string; value?: string; children?: React.ReactNode }> = ({ label, value, children }) => (
    <div>
        <p className="text-sm text-zinc-500">{label}</p>
        {children || <p className="font-semibold text-zinc-800">{value}</p>}
    </div>
);

const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'UTC',
    });
};

const PartialPaymentDetail: React.FC<{
    title: string;
    amount: number;
    details: PartialPaymentDetails | null | undefined;
    onViewReceipt: (url: string) => void;
}> = ({ title, amount, details, onViewReceipt }) => {
    const isPaid = details?.isPaid || false;
    return (
        <div className={`p-3 rounded-lg border ${isPaid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex justify-between items-center">
                <h3 className="font-bold text-zinc-800">{title}</h3>
                <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${isPaid ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                    {isPaid ? 'PAGO' : 'PENDENTE'}
                </span>
            </div>
            <div className="text-sm text-zinc-600 mt-2 space-y-2">
                <div className="flex justify-between"><span className="font-medium">Valor:</span><span>R$ {amount.toFixed(2).replace('.', ',')}</span></div>
                {isPaid && (
                    <>
                        <div className="flex justify-between"><span className="font-medium">Data:</span><span>{formatDate(details?.date)}</span></div>
                        <div className="flex justify-between"><span className="font-medium">Tipo:</span><span>{details?.type || 'N/A'}</span></div>
                        {details?.receiptUrl && (
                             <button onClick={() => onViewReceipt(details.receiptUrl!)} className="text-sm font-semibold text-green-600 hover:underline pt-1">
                                Ver Comprovante
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    )
};


const AttendeeDetail: React.FC<AttendeeDetailProps> = ({ attendee, onBack, onEdit, onDelete, onManagePayment }) => {
    const [receiptToView, setReceiptToView] = useState<string | null>(null);
    const status = attendee.payment.status;

    let statusClasses = '';
    switch (status) {
        case PaymentStatus.PAGO:
            statusClasses = 'bg-green-100 text-green-800';
            break;
        case PaymentStatus.PENDENTE:
            statusClasses = 'bg-red-100 text-red-800';
            break;
        case PaymentStatus.ISENTO:
            statusClasses = 'bg-blue-100 text-blue-800';
            break;
        default:
            statusClasses = 'bg-zinc-100 text-zinc-800';
    }
    
    const getAnimationStyle = (delay: number) => ({
        animationDelay: `${delay}ms`,
        animationFillMode: 'forwards',
    });

    const isMultiPayment = attendee.packageType === PackageType.SITIO_BUS;
    const isPartiallyPaid = isMultiPayment &&
                            status === PaymentStatus.PENDENTE &&
                            (attendee.payment.sitePaymentDetails?.isPaid || attendee.payment.busPaymentDetails?.isPaid);


    return (
        <div className="animate-fadeIn">
            <header className="sticky top-0 md:static bg-white md:bg-transparent z-10 p-4 md:pt-6 border-b border-zinc-200 flex items-center gap-4">
                <button onClick={onBack} className="text-zinc-500 hover:text-zinc-800 p-1 rounded-full hover:bg-zinc-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h1 className="text-xl md:text-2xl font-bold text-zinc-800">Detalhes da Inscrição</h1>
            </header>
            
            <div className="p-4">
                <div className="md:grid md:grid-cols-2 md:gap-6 space-y-6 md:space-y-0">
                    <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm space-y-4 opacity-0 animate-fadeInUp" style={getAnimationStyle(100)}>
                        <DetailRow label="Nome" value={attendee.name} />
                        {attendee.packageType === PackageType.SITIO_BUS && (
                             <DetailRow label="Documento" value={`${attendee.document} (${attendee.documentType})`} />
                        )}
                        <DetailRow label="Telefone" value={attendee.phone} />
                        <DetailRow label="Pacote" value={attendee.packageType} />
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm opacity-0 animate-fadeInUp" style={getAnimationStyle(200)}>
                        <h2 className="text-lg font-bold text-zinc-800 mb-3">Pagamento</h2>
                        <div className="space-y-4">
                            <DetailRow label="Status Geral">
                                <div className="flex items-center gap-2">
                                     <span className={`px-3 py-1 text-sm font-bold rounded-full ${statusClasses}`}>
                                        {attendee.payment.status}
                                    </span>
                                    {isPartiallyPaid && (
                                         <span className="px-3 py-1 text-sm font-bold rounded-full bg-yellow-100 text-yellow-800">
                                            PARCIAL
                                        </span>
                                    )}
                                </div>
                            </DetailRow>
                            <DetailRow label="Valor Total" value={`R$ ${attendee.payment.amount.toFixed(2).replace('.', ',')}`} />
                            
                            {!isMultiPayment && status === PaymentStatus.PAGO && (
                                <>
                                    <DetailRow label="Data do Pagamento" value={formatDate(attendee.payment.date)} />
                                    <DetailRow label="Tipo de Pagamento" value={attendee.payment.type || 'N/A'} />
                                    {attendee.payment.receiptUrl && (
                                         <button onClick={() => setReceiptToView(attendee.payment.receiptUrl)} className="text-sm font-semibold text-green-600 hover:underline">
                                            Ver Comprovante
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                    
                    {isMultiPayment && (
                        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm space-y-3 opacity-0 animate-fadeInUp md:col-span-2" style={getAnimationStyle(250)}>
                            <PartialPaymentDetail title="Pagamento Sítio" amount={70} details={attendee.payment.sitePaymentDetails} onViewReceipt={setReceiptToView} />
                            <PartialPaymentDetail title="Pagamento Ônibus" amount={50} details={attendee.payment.busPaymentDetails} onViewReceipt={setReceiptToView} />
                        </div>
                    )}

                    <div className="space-y-3 opacity-0 animate-fadeInUp md:col-span-2" style={getAnimationStyle(300)}>
                        <button onClick={onManagePayment} className="w-full bg-blue-500 text-white font-bold py-3 px-4 rounded-full hover:bg-blue-600 transition-colors shadow-sm">
                            Gerenciar Pagamentos
                        </button>
                        
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
            
            {receiptToView && (
                <ReceiptViewer receiptUrl={receiptToView} onClose={() => setReceiptToView(null)} />
            )}
        </div>
    );
};

export default AttendeeDetail;