
import React, { useState, useMemo } from 'react';
import type { Attendee, PartialPaymentDetails, Payment } from '../types';
import { PaymentStatus, PaymentType, PackageType } from '../types';
import { useToast } from '../contexts/ToastContext';

interface RegisterPaymentFormProps {
    attendee: Attendee;
    onRegisterPayment: (attendee: Attendee) => Promise<void>;
    onCancel: () => void;
    onDeletePayment: (attendee: Attendee) => void; // Used only for single-payment packages
    event: any; // Added prop for price access
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
        <div className={`p-4 rounded-xl border shadow-sm space-y-3 transition-colors ${details.isExempt ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-zinc-200'}`}>
            <div className="flex justify-between items-start">
                <div>
                    <h3 className={`text-lg font-bold ${details.isExempt ? 'text-indigo-900' : 'text-zinc-800'}`}>{title}</h3>
                    {details.isExempt ? (
                        <p className="font-semibold text-indigo-600">Isento (R$ 0,00)</p>
                    ) : (
                        <p className="font-semibold text-green-600">R$ {amount.toFixed(2).replace('.', ',')}</p>
                    )}
                </div>
                <div className="flex flex-col items-end gap-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-zinc-600 cursor-pointer select-none">
                        <input 
                            type="checkbox" 
                            checked={!!details.isExempt} 
                            onChange={(e) => {
                                onUpdate('isExempt', e.target.checked);
                                if (e.target.checked) {
                                    onUpdate('isPaid', false); // Unset paid if exempt
                                    onUpdate('date', undefined);
                                    onUpdate('type', undefined);
                                    onUpdate('receiptUrl', null);
                                }
                            }}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        Isentar
                    </label>
                    
                    {!details.isExempt && (
                        <button
                            type="button"
                            onClick={() => onUpdate('isPaid', !details.isPaid)}
                            className={`px-3 py-1 text-sm font-bold rounded-full transition-colors ${details.isPaid ? 'bg-green-100 text-green-800' : 'bg-zinc-100 text-zinc-700'}`}
                        >
                            {details.isPaid ? 'Pago' : 'Marcar como Pago'}
                        </button>
                    )}
                </div>
            </div>
            
            {details.isExempt && (
                <p className="text-sm text-indigo-700 bg-indigo-100 p-2 rounded-md">
                    Este item está marcado como isento e não requer pagamento.
                </p>
            )}

            {!details.isExempt && details.isPaid && (
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


const RegisterPaymentForm: React.FC<RegisterPaymentFormProps> = ({ attendee, onRegisterPayment, onCancel, onDeletePayment, event }) => {
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
                const sitePaid = paymentState.sitePaymentDetails?.isPaid;
                const siteExempt = paymentState.sitePaymentDetails?.isExempt;
                const busPaid = paymentState.busPaymentDetails?.isPaid;
                const busExempt = paymentState.busPaymentDetails?.isExempt;
                
                const siteOk = sitePaid || siteExempt;
                const busOk = busPaid || busExempt;

                // Recalculate amount based on exemptions
                const sitePrice = event?.site_price ?? 70;
                const busPrice = event?.bus_price ?? 50;
                let newAmount = 0;
                if (!siteExempt) newAmount += sitePrice;
                if (!busExempt) newAmount += busPrice;
                
                updatedAttendee.payment.amount = newAmount;

                if (siteOk && busOk) {
                    // If everything is exempt, use ISENTO status, otherwise if settled (paid or mixed), use PAGO.
                    if (siteExempt && busExempt) {
                        updatedAttendee.payment.status = PaymentStatus.ISENTO;
                    } else {
                        updatedAttendee.payment.status = PaymentStatus.PAGO;
                    }
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
                ? (attendee.packageType === PackageType.SITIO_BUS ? ((event?.site_price ?? 70) + (event?.bus_price ?? 50)) : (event?.site_price ?? 70))
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
                    sitePaymentDetails: isMultiPayment ? { isPaid: false, isExempt: !isCurrentlyExempt, receiptUrl: null } : null,
                    busPaymentDetails: isMultiPayment ? { isPaid: false, isExempt: !isCurrentlyExempt, receiptUrl: null } : null,
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
            // Error is handled by App.tsx, which shows a toast
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <div className="animate-fadeIn">
            <header className="sticky top-0 md:static bg-white md:bg-transparent z-10 p-4 md:pt-6 border-b border-zinc-200 flex items-center gap-4">
                <button onClick={onCancel} className="text-zinc-500 hover:text-zinc-800 p-1 rounded-full hover:bg-zinc-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div className="flex flex-col">
                    <h1 className="text-xl md:text-2xl font-bold text-zinc-800">Gerenciar Pagamento</h1>
                    {/* FIX: Access name from the nested person object. */}
                    <p className="text-sm text-zinc-500 -mt-1">{attendee.person.name}</p>
                </div>
            </header>
            
            <main className="p-4">
                {isMultiPayment ? (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <PartialPaymentEditor
                            title="Pagamento Sítio"
                            amount={event?.site_price ?? 70}
                            details={paymentState.sitePaymentDetails || { isPaid: false, receiptUrl: null }}
                            onUpdate={(field, value) => setPaymentState(p => ({...p, sitePaymentDetails: { ...(p.sitePaymentDetails || { isPaid: false, receiptUrl: null }), [field]: value }}))}
                        />
                         <PartialPaymentEditor
                            title="Pagamento Ônibus"
                            amount={event?.bus_price ?? 50}
                            details={paymentState.busPaymentDetails || { isPaid: false, receiptUrl: null }}
                            onUpdate={(field, value) => setPaymentState(p => ({...p, busPaymentDetails: { ...(p.busPaymentDetails || { isPaid: false, receiptUrl: null }), [field]: value }}))}
                        />
                         <div className="flex flex-col md:flex-row gap-4 pt-2">
                            <button type="button" onClick={onCancel} className="w-full bg-zinc-200 text-zinc-800 font-bold py-3 px-4 rounded-full hover:bg-zinc-300 transition-colors">Cancelar</button>
                            <button type="submit" disabled={isSubmitting} className="w-full bg-green-500 text-white font-bold py-3 px-4 rounded-full flex items-center justify-center gap-2 hover:bg-green-600 shadow-sm disabled:bg-green-400">
                                {isSubmitting ? <><SpinnerIcon /> Salvando...</> : 'Salvar Pagamentos'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <>
                        {isExempt ? (
                             <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm space-y-4">
                                <p className="text-center font-semibold text-blue-800">Este inscrito está isento de pagamento.</p>
                                <button
                                    type="button"
                                    onClick={handleToggleExemption}
                                    disabled={isSubmitting}
                                    className="w-full bg-zinc-200 text-zinc-800 font-bold py-3 px-4 rounded-full hover:bg-zinc-300 transition-colors"
                                >
                                    {isSubmitting ? 'Aguarde...' : 'Remover Isenção'}
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSinglePaymentSubmit} className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm space-y-4">
                                 <div>
                                    <label className="block text-sm font-medium text-zinc-700">Data do Pagamento</label>
                                    <input
                                        type="date"
                                        value={paymentDate}
                                        onChange={(e) => setPaymentDate(e.target.value)}
                                        className="mt-1 block w-full px-3 py-2 bg-white border border-zinc-300 rounded-md shadow-sm sm:text-sm disabled:bg-zinc-100"
                                        required={!dateNotInformed}
                                        disabled={dateNotInformed}
                                        autoComplete="off"
                                    />
                                     <label className="flex items-center space-x-2 mt-2 cursor-pointer w-fit">
                                        <input type="checkbox" checked={dateNotInformed} onChange={(e) => setDateNotInformed(e.target.checked)} className="h-4 w-4 rounded border-zinc-300 text-green-600 focus:ring-green-500" />
                                        <span className="text-sm text-zinc-700">Data não informada</span>
                                    </label>
                                </div>
                                 <div>
                                    <label className="block text-sm font-medium text-zinc-700">Tipo de Pagamento</label>
                                    <select
                                        value={paymentType}
                                        onChange={(e) => setPaymentType(e.target.value as PaymentType)}
                                        className="mt-1 block w-full px-3 py-2 bg-white border border-zinc-300 rounded-md shadow-sm sm:text-sm"
                                        required
                                        autoComplete="off"
                                    >
                                        <option value={PaymentType.PIX_CONTA}>PIX (Conta)</option>
                                        <option value={PaymentType.PIX_MAQUINA}>PIX (Máquina)</option>
                                        <option value={PaymentType.DEBITO}>Débito</option>
                                        <option value={PaymentType.CREDITO}>Crédito</option>
                                        <option value={PaymentType.DINHEIRO}>Dinheiro</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700">Comprovante</label>
                                    <input type="file" id="receipt-upload" className="sr-only" onChange={handleFileChange} accept="image/*,application/pdf" />
                                    <label htmlFor="receipt-upload" className="mt-1 w-full bg-white border border-zinc-300 text-zinc-700 font-semibold py-2 px-4 rounded-md flex items-center justify-center gap-2 hover:bg-zinc-50 cursor-pointer">
                                        <span>{receipt ? 'Substituir' : 'Anexar'}</span>
                                    </label>
                                    {receipt && <span className="text-xs text-zinc-500 mt-1">Comprovante anexado.</span>}
                                </div>
                                <div className="flex flex-col md:flex-row gap-4 pt-2">
                                     <button type="button" onClick={onCancel} className="w-full bg-zinc-200 text-zinc-800 font-bold py-3 px-4 rounded-full hover:bg-zinc-300 transition-colors">Cancelar</button>
                                     <button type="submit" disabled={isSubmitting} className="w-full bg-green-500 text-white font-bold py-3 px-4 rounded-full flex items-center justify-center gap-2 hover:bg-green-600 shadow-sm disabled:bg-green-400">
                                        {isSubmitting ? <><SpinnerIcon /> Salvando...</> : 'Salvar Pagamento'}
                                    </button>
                                </div>
                                {isPaid && (
                                    <div className="pt-4 border-t border-zinc-200">
                                        <button
                                            type="button"
                                            onClick={() => onDeletePayment(attendee)}
                                            className="w-full bg-red-100 text-red-700 font-bold py-3 px-4 rounded-full hover:bg-red-200 transition-colors"
                                        >
                                            Excluir Pagamento
                                        </button>
                                    </div>
                                )}
                            </form>
                        )}
                         <div className="mt-4">
                            <button
                                type="button"
                                onClick={handleToggleExemption}
                                disabled={isSubmitting}
                                className={`w-full font-bold py-3 px-4 rounded-full transition-colors ${isExempt ? 'bg-zinc-200 text-zinc-800 hover:bg-zinc-300' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                            >
                                {isSubmitting ? 'Aguarde...' : (isExempt ? 'Remover Isenção' : 'Marcar como Isento')}
                            </button>
                         </div>
                    </>
                 )}
            </main>
        </div>
    );
};

export default RegisterPaymentForm;
