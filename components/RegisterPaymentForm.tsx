import React, { useState, useEffect } from 'react';
import type { Attendee } from '../types';
import { PaymentStatus, PaymentType } from '../types';

interface RegisterPaymentFormProps {
    attendee: Attendee;
    onRegisterPayment: (attendee: Attendee) => void;
    onCancel: () => void;
    onDeletePayment: (attendee: Attendee) => void;
}

const RegisterPaymentForm: React.FC<RegisterPaymentFormProps> = ({ attendee, onRegisterPayment, onCancel, onDeletePayment }) => {
    const isEditMode = attendee.payment.status === PaymentStatus.PAGO;

    const [paymentDate, setPaymentDate] = useState(
        attendee.payment.date 
            ? new Date(attendee.payment.date).toISOString().split('T')[0] 
            : new Date().toISOString().split('T')[0]
    );
    const [paymentType, setPaymentType] = useState<PaymentType>(attendee.payment.type || PaymentType.PIX_MAQUINA);
    const [receipt, setReceipt] = useState<string | null>(attendee.payment.receiptUrl);
    const [fileName, setFileName] = useState<string>('');
    
    useEffect(() => {
        if (isEditMode && receipt) {
            setFileName("Comprovante salvo. Anexe um novo para substituir.");
        }
    }, [isEditMode, receipt]);


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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const updatedAttendee: Attendee = {
            ...attendee,
            payment: {
                ...attendee.payment,
                status: PaymentStatus.PAGO,
                date: new Date(paymentDate).toISOString(),
                type: paymentType,
                receiptUrl: receipt,
            },
        };
        onRegisterPayment(updatedAttendee);
    };

    const getAnimationStyle = (delay: number) => ({
        animationDelay: `${delay}ms`,
        animationFillMode: 'forwards',
    });

    return (
         <div className="animate-fadeIn">
            <header className="sticky top-0 md:static bg-white/80 md:bg-transparent backdrop-blur-sm z-10 p-4 md:pt-6 border-b border-zinc-200 flex items-center gap-4">
                <button onClick={onCancel} className="text-zinc-500 hover:text-zinc-800 p-1 rounded-full hover:bg-zinc-100">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h1 className="text-xl md:text-2xl font-bold text-zinc-800">{isEditMode ? 'Editar' : 'Registrar'} Pagamento</h1>
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
                                className="mt-1 block w-full px-3 py-2 bg-white border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                                required
                            />
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
                            >
                                <option value={PaymentType.PIX_MAQUINA}>PIX (Máquina)</option>
                                <option value={PaymentType.PIX_CONTA}>PIX (Conta)</option>
                                <option value={PaymentType.DEBITO}>Débito</option>
                                <option value={PaymentType.CREDITO}>Crédito</option>
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
                    <button type="submit" className="w-full bg-green-500 text-white font-bold py-3 px-4 rounded-full hover:bg-green-600 transition-colors shadow-sm">{isEditMode ? 'Salvar Alterações' : 'Confirmar Pagamento'}</button>
                </div>
                 {isEditMode && (
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
            </form>
        </div>
    );
};

export default RegisterPaymentForm;
