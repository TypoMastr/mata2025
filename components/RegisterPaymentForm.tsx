import React, { useState, useEffect, useMemo } from 'react';
import type { Attendee } from '../types';
import { PaymentStatus, PaymentType, PackageType } from '../types';

interface RegisterPaymentFormProps {
    attendee: Attendee;
    onRegisterPayment: (attendee: Attendee) => Promise<void>;
    onCancel: () => void;
    onDeletePayment: (attendee: Attendee) => void;
}

const SpinnerIcon: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const RegisterPaymentForm: React.FC<RegisterPaymentFormProps> = ({ attendee, onRegisterPayment, onCancel, onDeletePayment }) => {
    const isPaid = attendee.payment.status === PaymentStatus.PAGO;
    const isExempt = attendee.payment.status === PaymentStatus.ISENTO;

    const [paymentDate, setPaymentDate] = useState(
        attendee.payment.date 
            ? new Date(attendee.payment.date).toISOString().split('T')[0] 
            : new Date().toISOString().split('T')[0]
    );
    const [dateNotInformed, setDateNotInformed] = useState(isPaid && !attendee.payment.date);
    const [paymentType, setPaymentType] = useState<PaymentType>(attendee.payment.type || PaymentType.PIX_CONTA);
    const [receipt, setReceipt] = useState<string | null>(attendee.payment.receiptUrl);
    const [fileName, setFileName] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionError, setSubmissionError] = useState<string | null>(null);
    
    const formattedDisplayDate = useMemo(() => {
        if (!paymentDate) return null;
        const [year, month, day] = paymentDate.split('-').map(Number);
        const date = new Date(Date.UTC(year, month - 1, day));
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            timeZone: 'UTC'
        }).format(date);
    }, [paymentDate]);

    useEffect(() => {
        if (isPaid && receipt) {
            setFileName("Comprovante salvo. Anexe um novo para substituir.");
        }
    }, [isPaid, receipt]);


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setReceipt(reader.result as string);
                setFileName(file.name);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmissionError(null);
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
            // Parent component handles navigation on success
        } catch (error) {
            console.error("Failed to register payment:", error);
            setSubmissionError("Falha ao salvar pagamento. Tente novamente.");
            setIsSubmitting(false);
        }
    };

    const handleToggleExemption = async () => {
        setIsSubmitting(true);
        setSubmissionError(null);
        try {
            const isCurrentlyExempt = attendee.payment.status === PaymentStatus.ISENTO;
            const newStatus = isCurrentlyExempt ? PaymentStatus.PENDENTE : PaymentStatus.ISENTO;
            const newAmount = isCurrentlyExempt
                ? (attendee.packageType === PackageType.SITIO_BUS ? 120.00 : 70.00)
                : 0;

            const updatedAttendee: Attendee = {
                ...attendee,
                payment: {
                    amount: newAmount,
                    status: newStatus,
                    date: undefined,
                    type: undefined,
                    receiptUrl: null,
                },
            };
            await onRegisterPayment(updatedAttendee);
        } catch (error) {
            console.error("Failed to toggle exemption:", error);
            setSubmissionError("Falha ao alterar status. Tente novamente.");
            setIsSubmitting(false);
        }
    };


    const getAnimationStyle = (delay: number) => ({
        animationDelay: `${delay}ms`,
        animationFillMode: 'forwards',
    });

    return (
         <div className="animate-fadeIn">
            <header className="sticky top-0 md:static bg-white md:bg-transparent z-10 p-4 md:pt-6 border-b border-zinc-200 flex items-center gap-4">
                <button onClick={onCancel} className="text-zinc-500 hover:text-zinc-800 p-1 rounded-full hover:bg-zinc-100">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h1 className="text-xl md:text-2xl font-bold text-zinc-800">{isPaid ? 'Editar' : (isExempt ? 'Alterar Status' : 'Registrar')} Pagamento</h1>
            </header>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <div className="md:grid md:grid-cols-2 md:gap-6 space-y-4 md:space-y-0">
                    <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm space-y-2 opacity-0 animate-fadeInUp md:h-fit" style={getAnimationStyle(100)}>
                        <p className="text-sm text-zinc-500">Participante</p>
                        <p className="font-bold text-lg text-zinc-800">{attendee.name}</p>
                        <p className="text-sm text-zinc-500 pt-1">Pacote</p>
                        <p className="font-semibold text-md text-zinc-700">{attendee.packageType}</p>
                        <p className="text-sm text-zinc-500 pt-1">Valor</p>
                        <p className="font-bold text-lg text-green-600">R$ {attendee.payment.amount.toFixed(2).replace('.', ',')}</p>
                    </div>

                    <div className="space-y-4">
                        <div className="opacity-0 animate-fadeInUp" style={getAnimationStyle(150)}>
                            <label htmlFor="paymentDate" className="block text-sm font-medium text-zinc-700">Data do Pagamento</label>
                            <input
                                type="date"
                                id="paymentDate"
                                name="paymentDate"
                                value={paymentDate}
                                onChange={(e) => setPaymentDate(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 bg-white border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm disabled:bg-zinc-100"
                                required={!dateNotInformed}
                                disabled={dateNotInformed}
                                autoComplete="off"
                            />
                             <label className="flex items-center space-x-2 mt-2 cursor-pointer w-fit">
                                <input
                                    type="checkbox"
                                    checked={dateNotInformed}
                                    onChange={(e) => setDateNotInformed(e.target.checked)}
                                    className="h-4 w-4 rounded border-zinc-300 text-green-600 focus:ring-green-500"
                                />
                                <span className="text-sm text-zinc-700">Data não informada</span>
                            </label>
                            {formattedDisplayDate && !dateNotInformed && (
                                <p className="mt-2 text-sm text-center text-zinc-600 bg-zinc-100 p-2 rounded-md border border-zinc-200">
                                    Confirmação: <strong className="font-bold text-green-700">{formattedDisplayDate} (dd/mm/aaaa)</strong>
                                </p>
                            )}
                        </div>
                        <div className="opacity-0 animate-fadeInUp" style={getAnimationStyle(200)}>
                            <label htmlFor="paymentType" className="block text-sm font-medium text-zinc-700">Tipo de Pagamento</label>
                            <select
                                id="paymentType"
                                name="paymentType"
                                value={paymentType}
                                onChange={(e) => setPaymentType(e.target.value as PaymentType)}
                                className="mt-1 block w-full px-3 py-2 bg-white border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
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
                        <div className="opacity-0 animate-fadeInUp" style={getAnimationStyle(250)}>
                             <label htmlFor="receipt-upload" className="block text-sm font-medium text-zinc-700 mb-1">Comprovante</label>
                             <label className="w-full bg-white border border-zinc-300 text-zinc-700 font-semibold py-2 px-4 rounded-md flex items-center justify-center gap-2 hover:bg-zinc-50 transition-colors cursor-pointer">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                </svg>
                                <span>Anexar Comprovante</span>
                                <input id="receipt-upload" name="receipt-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/*,application/pdf" />
                            </label>
                            {fileName && (
                                <div className="mt-2 text-sm text-zinc-600 animate-fadeIn">
                                    <strong>Arquivo:</strong> {fileName}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 pt-2 opacity-0 animate-fadeInUp" style={getAnimationStyle(300)}>
                    <button type="button" onClick={onCancel} className="w-full bg-zinc-200 text-zinc-800 font-bold py-3 px-4 rounded-full hover:bg-zinc-300 transition-colors">Cancelar</button>
                    <button type="submit" disabled={isSubmitting} className="w-full bg-green-500 text-white font-bold py-3 px-4 rounded-full hover:bg-green-600 transition-colors shadow-sm flex items-center justify-center gap-2 disabled:bg-green-400 disabled:cursor-not-allowed">
                        {isSubmitting ? (
                            <>
                                <SpinnerIcon />
                                <span>Salvando...</span>
                            </>
                        ) : (
                            isPaid ? 'Salvar Alterações' : 'Confirmar Pagamento'
                        )}
                    </button>
                </div>
                 {submissionError && <p className="text-center text-sm text-red-600 animate-fadeIn">{submissionError}</p>}
                 {isPaid && (
                    <div className="pt-2 opacity-0 animate-fadeInUp" style={getAnimationStyle(350)}>
                        <button
                            type="button"
                            onClick={() => onDeletePayment(attendee)}
                            className="w-full text-red-600 font-bold py-3 px-4 rounded-full hover:bg-red-50 transition-colors"
                        >
                            Excluir Pagamento
                        </button>
                    </div>
                )}
                <div className="pt-2 opacity-0 animate-fadeInUp" style={getAnimationStyle(isPaid ? 400 : 350)}>
                    <button
                        type="button"
                        onClick={handleToggleExemption}
                        disabled={isSubmitting}
                        className={`w-full font-bold py-3 px-4 rounded-full transition-colors ${
                            isExempt 
                                ? 'text-zinc-700 bg-zinc-200 hover:bg-zinc-300'
                                : 'text-blue-600 hover:bg-blue-50'
                        }`}
                    >
                        {isExempt ? 'Remover Isenção (Status: Pendente)' : 'Marcar como Isento'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default RegisterPaymentForm;