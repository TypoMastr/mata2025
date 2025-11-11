import React, { useState, useMemo } from 'react';
import type { Attendee, PartialPaymentDetails, Payment } from '../types';
import { PaymentStatus, PaymentType, PackageType } from '../types';
import { useToast } from '../contexts/ToastContext';

interface RegisterPaymentFormProps {
    attendee: Attendee;
    onRegisterPayment: (attendee: Attendee) => Promise<void>;
    onCancel: () => void;
    onDeletePayment: (attendee: Attendee) => void; // Used only for single-payment packages
}

const SpinnerIcon: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

interface PartialPaymentEditorProps {
    title: string;
    amount: number;
    details: PartialPaymentDetails;
    onUpdate: (field: keyof PartialPaymentDetails, value: any) => void;
}

const PartialPaymentEditor: React.FC<PartialPaymentEditorProps> = ({ title, amount, details, onUpdate }) => {
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                onUpdate('receiptUrl', reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
    
    return (
        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm space-y-3">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-lg font-bold text-zinc-800">{title}</h3>
                    <p className="font-semibold text-green-600">R$ {amount.toFixed(2).replace('.', ',')}</p>
                </div>
                <button
                    type="button"
                    onClick={() => onUpdate('isPaid', !details.isPaid)}
                    className={`px-3 py-1 text-sm font-bold rounded-full transition-colors ${details.isPaid ? 'bg-green-100 text-green-800' : 'bg-zinc-100 text-zinc-700'}`}
                >
                    {details.isPaid ? 'Pago' : 'Marcar como Pago'}
                </button>
            </div>
            {details.isPaid && (
                <div className="space-y-3 animate-fadeIn border-t border-zinc-200 pt-3">
                    <div>
                        <label className="block text-sm font-medium text-zinc-700">Data do Pagamento</label>
                        <input
                            type="date"
                            value={details.date ? new Date(details.date).toISOString().split('T')[0] : ''}
                            onChange={(e) => onUpdate('date', e.target.value ? new Date(e.target.value + 'T00:00:00Z').toISOString() : undefined)}
                            className="mt-1 block w-full px-3 py-2 bg-white border border-zinc-300 rounded-md shadow-sm sm:text-sm"
                            autoComplete="off"
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-zinc-700">Tipo de Pagamento</label>
                        <select
                            value={details.type || ''}
                            onChange={(e) => onUpdate('type', e.target.value as PaymentType)}
                            className="mt-1 block w-full px-3 py-2 bg-white border border-zinc-300 rounded-md shadow-sm sm:text-sm"
                            autoComplete="off"
                        >
                            <option value="" disabled>Selecione...</option>
                            <option value={PaymentType.PIX_CONTA}>PIX (Conta)</option>
                            <option value={PaymentType.PIX_MAQUINA}>PIX (Máquina)</option>
                            <option value={PaymentType.DEBITO}>Débito</option>
                            <option value={PaymentType.CREDITO}>Crédito</option>
                            <option value={PaymentType.DINHEIRO}>Dinheiro</option>
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-zinc-700">Comprovante</label>
                        <input type="file" className="sr-only" id={`${title}-receipt`} onChange={handleFileChange} accept="image/*,application/pdf" />
                        <label htmlFor={`${title}-receipt`} className="mt-1 w-full bg-white border border-zinc-300 text-zinc-700 font-semibold py-2 px-4 rounded-md flex items-center justify-center gap-2 hover:bg-zinc-50 cursor-pointer">
                            <span>{details.receiptUrl ? 'Substituir' : 'Anexar'}</span>
                        </label>
                        {details.receiptUrl && <span className="text-xs text-zinc-500 mt-1">Comprovante anexado.</span>}
                    </div>
                     <button
                        type="button"
                        onClick={() => {
                            onUpdate('isPaid', false);
                            onUpdate('date', undefined);
                            onUpdate('type', undefined);
                            onUpdate('receiptUrl', null);
                        }}
                        className="w-full text-red-600 font-semibold text-sm py-2 rounded-lg hover:bg-red-50"
                    >
                        Limpar Pagamento
                    </button>
                </div>
            )}
        </div>
    );
};


const RegisterPaymentForm: React.FC<RegisterPaymentFormProps> = ({ attendee, onRegisterPayment, onCancel, onDeletePayment }) => {
    const { addToast } = useToast();
    const isPaid = attendee.payment.status === PaymentStatus.PAGO;
    const isExempt = attendee.payment.status === PaymentStatus.ISENTO;
    const isMultiPayment = attendee.packageType === PackageType.SITIO_BUS;

    const [paymentState, setPaymentState] = useState<Payment>(attendee.payment);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const updatedAttendee: Attendee = { ...attendee, payment: paymentState };

            if (isMultiPayment) {
                const sitePaid = paymentState.sitePaymentDetails?.isPaid || false;
                const busPaid = paymentState.busPaymentDetails?.isPaid || false;
                if (sitePaid && busPaid) {
                    updatedAttendee.payment.status = PaymentStatus.PAGO;
                } else {
                    updatedAttendee.payment.status = PaymentStatus.PENDENTE;
                }
            } else {
                 updatedAttendee.payment.status = PaymentStatus.PAGO;
            }

            await onRegisterPayment(updatedAttendee);
        } catch (error) {
            // Error toast is handled by the calling component (App.tsx)
            setIsSubmitting(false);
        }
    };

    const handleToggleExemption = async () => {
        setIsSubmitting(true);
        try {
            const isCurrentlyExempt = attendee.payment.status === PaymentStatus.ISENTO;
            const newStatus = isCurrentlyExempt ? PaymentStatus.PENDENTE : PaymentStatus.ISENTO;
            const newAmount = isCurrentlyExempt
                ? (attendee.packageType === PackageType.SITIO_BUS ? 120.00 : 70.00)
                : 0;

            const updatedAttendee: Attendee = {
                ...attendee,
                payment: {
                    ...attendee.payment,
                    amount: newAmount,
                    status: newStatus,
                    date: undefined,
                    type: undefined,
                    receiptUrl: null,
                    sitePaymentDetails: isMultiPayment ? { isPaid: false, receiptUrl: null } : null,
                    busPaymentDetails: isMultiPayment ? { isPaid: false, receiptUrl: null } : null,
                },
            };
            await onRegisterPayment(updatedAttendee);
        } catch (error) {
            // Error toast is handled by the calling component (App.tsx)
        } finally {
            setIsSubmitting(false);
        }
    };
    
    // Single payment form state
    const [paymentDate, setPaymentDate] = useState(
        attendee.payment.date ? new Date(attendee.payment.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    );
    const [dateNotInformed, setDateNotInformed] = useState(isPaid && !attendee.payment.date);
    const [paymentType, setPaymentType] = useState<PaymentType>(attendee.payment.type || PaymentType.PIX_CONTA);
    const [receipt, setReceipt] = useState<string | null>(attendee.payment.receiptUrl);
     const formattedDisplayDate = useMemo(() => {
        if (!paymentDate) return null;
        const [year, month, day] = paymentDate.split('-').map(Number);
        const date = new Date(Date.UTC(year, month - 1, day));
        return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(date);
    }, [paymentDate]);
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setReceipt(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
    const handleSinglePaymentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const updatedAttendee: Attendee = {
                ...attendee,
                payment: {
                    ...attendee.payment,
                    status: PaymentStatus.PAGO,
                    date: dateNotInformed ? undefined : new Date(paymentDate + 'T00:00:00Z').toISOString(),
                    type: paymentType,
                    receiptUrl: receipt,
                },
            };
            await onRegisterPayment(updatedAttendee);
        } catch (error) {
            // Error toast is handled by the calling component (App.tsx)
        } finally {
             setIsSubmitting(false);
        }
    }


    return (
         <div className="animate-fadeIn">
            <header className="sticky top-0 md:static bg-white md:bg-transparent z-10 p-4 md:pt-6 border-b border-zinc-200 flex items-center gap-4">
                <button onClick={onCancel} className="text-zinc-500 hover:text-zinc-800 p-1 rounded-full hover:bg-zinc-100">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h1 className="text-xl md:text-2xl font-bold text-zinc-800">Gerenciar Pagamento</h1>
            </header>

            { isMultiPayment ? (
                // --- MULTI-PAYMENT FORM ---
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm space-y-2">
                        <p className="text-sm text-zinc-500">Participante</p>
                        <p className="font-bold text-lg text-zinc-800">{attendee.name}</p>
                    </div>
                    <PartialPaymentEditor 
                        title="Pagamento Sítio"
                        amount={70}
                        details={paymentState.sitePaymentDetails!}
                        onUpdate={(field, value) => setPaymentState(p => ({ ...p, sitePaymentDetails: { ...p.sitePaymentDetails!, [field]: value }}))}
                    />
                     <PartialPaymentEditor 
                        title="Pagamento Ônibus"
                        amount={50}
                        details={paymentState.busPaymentDetails!}
                        onUpdate={(field, value) => setPaymentState(p => ({ ...p, busPaymentDetails: { ...p.busPaymentDetails!, [field]: value }}))}
                    />
                    <div className="flex flex-col md:flex-row gap-4 pt-2">
                        <button type="button" onClick={onCancel} className="w-full bg-zinc-200 text-zinc-800 font-bold py-3 px-4 rounded-full">Cancelar</button>
                        <button type="submit" disabled={isSubmitting} className="w-full bg-green-500 text-white font-bold py-3 px-4 rounded-full flex items-center justify-center gap-2">
                            {isSubmitting ? <><SpinnerIcon /> Salvando...</> : 'Salvar Pagamentos'}
                        </button>
                    </div>
                </form>
            ) : (
                // --- SINGLE PAYMENT FORM ---
                 <form onSubmit={handleSinglePaymentSubmit} className="p-4 space-y-4">
                     <div className="md:grid md:grid-cols-2 md:gap-6 space-y-4 md:space-y-0">
                        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm space-y-2 md:h-fit">
                            <p className="text-sm text-zinc-500">Participante</p>
                            <p className="font-bold text-lg text-zinc-800">{attendee.name}</p>
                            <p className="text-sm text-zinc-500 pt-1">Pacote</p>
                            <p className="font-semibold text-md text-zinc-700">{attendee.packageType}</p>
                            <p className="text-sm text-zinc-500 pt-1">Valor</p>
                            <p className="font-bold text-lg text-green-600">R$ {attendee.payment.amount.toFixed(2).replace('.', ',')}</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm space-y-4">
                             <div>
                                <label className="block text-sm font-medium text-zinc-700">Data do Pagamento</label>
                                <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-zinc-300 rounded-md shadow-sm sm:text-sm focus:outline-none focus:ring-green-500 focus:border-green-500 disabled:bg-zinc-100" required={!dateNotInformed} disabled={dateNotInformed} autoComplete="off" />
                                <label className="flex items-center space-x-2 mt-2 cursor-pointer w-fit">
                                    <input type="checkbox" checked={dateNotInformed} onChange={(e) => setDateNotInformed(e.target.checked)} className="h-4 w-4 rounded border-zinc-300 text-green-600 focus:ring-green-500" />
                                    <span className="text-sm text-zinc-700">Data não informada</span>
                                </label>
                                {formattedDisplayDate && !dateNotInformed && <p className="mt-2 text-sm text-center text-zinc-600 bg-zinc-100 p-2 rounded-md border border-zinc-200">Confirmação: <strong className="font-bold text-green-700">{formattedDisplayDate}</strong></p>}
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-zinc-700">Tipo de Pagamento</label>
                                <select value={paymentType} onChange={(e) => setPaymentType(e.target.value as PaymentType)} className="mt-1 block w-full px-3 py-2 bg-white border border-zinc-300 rounded-md shadow-sm sm:text-sm focus:outline-none focus:ring-green-500 focus:border-green-500" required autoComplete="off">
                                    <option value={PaymentType.PIX_CONTA}>PIX (Conta)</option>
                                    <option value={PaymentType.PIX_MAQUINA}>PIX (Máquina)</option>
                                    <option value={PaymentType.DEBITO}>Débito</option>
                                    <option value={PaymentType.CREDITO}>Crédito</option>
                                    <option value={PaymentType.DINHEIRO}>Dinheiro</option>
                                </select>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-zinc-700">Comprovante</label>
                                <input type="file" className="sr-only" id="single-payment-receipt" onChange={handleFileChange} accept="image/*,application/pdf" />
                                <label htmlFor="single-payment-receipt" className="mt-1 w-full bg-white border border-zinc-300 text-zinc-700 font-semibold py-2 px-4 rounded-md flex items-center justify-center gap-2 hover:bg-zinc-50 cursor-pointer">
                                    <span>{receipt ? 'Substituir' : 'Anexar'} Comprovante</span>
                                </label>
                                {receipt && <span className="text-xs text-zinc-500 mt-1 block text-center">Comprovante anexado.</span>}
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col md:flex-row gap-4 pt-2">
                        <button type="button" onClick={onCancel} className="w-full bg-zinc-200 text-zinc-800 font-bold py-3 px-4 rounded-full hover:bg-zinc-300 transition-colors">Cancelar</button>
                        <button type="submit" disabled={isSubmitting} className="w-full bg-green-500 text-white font-bold py-3 px-4 rounded-full hover:bg-green-600 transition-colors shadow-sm flex items-center justify-center gap-2 disabled:bg-green-400">
                            {isSubmitting ? <><SpinnerIcon /> Salvando...</> : (isPaid ? 'Salvar Alterações' : 'Confirmar Pagamento')}
                        </button>
                    </div>
                    {isPaid && <div className="pt-2"><button type="button" onClick={() => onDeletePayment(attendee)} className="w-full text-red-600 font-bold py-3 px-4 rounded-full hover:bg-red-50 transition-colors">Excluir Pagamento</button></div>}
                </form>
            )}

            <div className="px-4 pb-4">
                 <button type="button" onClick={handleToggleExemption} disabled={isSubmitting} className={`w-full font-bold py-3 px-4 rounded-full transition-colors ${ isExempt ? 'text-zinc-700 bg-zinc-200 hover:bg-zinc-300' : 'text-blue-600 hover:bg-blue-50' }`}>
                    {isExempt ? 'Remover Isenção (Status: Pendente)' : 'Marcar como Isento'}
                </button>
            </div>
        </div>
    );
};

export default RegisterPaymentForm;