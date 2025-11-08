import React, { useState, useEffect, useMemo } from 'react';
import type { AttendeeFormData, Attendee } from '../types';
import { PackageType, DocumentType, PaymentType } from '../types';
import { formatPhoneNumber, formatDocument, getDocumentType } from '../utils/formatters';

interface AddAttendeeFormProps {
    onAddAttendee?: (data: AttendeeFormData & { paymentAmount: number }) => Promise<void>;
    onUpdateAttendee?: (data: Attendee) => Promise<void>;
    onCancel: () => void;
    attendeeToEdit?: Attendee;
}

const InputField: React.FC<{ label: string, name: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, error?: string, placeholder?: string, type?: string, maxLength?: number, delay?: number }> = ({ label, name, value, onChange, error, placeholder, type = 'text', maxLength, delay = 0 }) => (
    <div className="opacity-0 animate-fadeInUp" style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}>
        <label htmlFor={name} className="block text-sm font-medium text-zinc-700">{label}</label>
        <input
            type={type}
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            maxLength={maxLength}
            className={`mt-1 block w-full px-3 py-2 bg-white border ${error ? 'border-red-500 text-red-900 placeholder-red-300' : 'border-zinc-300'} rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm`}
            aria-invalid={!!error}
            aria-describedby={error ? `${name}-error` : undefined}
            autoComplete="off"
        />
        {error && <p id={`${name}-error`} className="mt-1 text-sm text-red-600 animate-fadeIn">{error}</p>}
    </div>
);

const SpinnerIcon: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const SuccessIcon: React.FC = () => (
     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
);


const AddAttendeeForm: React.FC<AddAttendeeFormProps> = ({ onAddAttendee, onUpdateAttendee, onCancel, attendeeToEdit }) => {
    const isEditMode = !!attendeeToEdit;
    
    const [formState, setFormState] = useState<AttendeeFormData>(() => {
        if (isEditMode) {
            return {
                name: attendeeToEdit.name,
                document: attendeeToEdit.document,
                phone: attendeeToEdit.phone,
                packageType: attendeeToEdit.packageType,
                paymentAmount: attendeeToEdit.payment.amount.toFixed(2),
                registerPaymentNow: false,
                paymentDate: new Date().toISOString().split('T')[0],
                paymentType: PaymentType.PIX_CONTA,
            };
        }
        return {
            name: '',
            document: '',
            phone: '',
            packageType: PackageType.SITIO_BUS,
            paymentAmount: '120.00',
            registerPaymentNow: false,
            paymentDate: new Date().toISOString().split('T')[0],
            paymentType: PaymentType.PIX_CONTA,
        };
    });

    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [docType, setDocType] = useState<DocumentType>(() => 
        isEditMode ? getDocumentType(attendeeToEdit.document).type : DocumentType.OUTRO
    );
    const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
    const [submissionError, setSubmissionError] = useState<string | null>(null);

    const formattedDisplayDate = useMemo(() => {
        if (!formState.paymentDate) return null;
        const [year, month, day] = formState.paymentDate.split('-').map(Number);
        const date = new Date(Date.UTC(year, month - 1, day));
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            timeZone: 'UTC'
        }).format(date);
    }, [formState.paymentDate]);

    useEffect(() => {
        const newAmount = formState.packageType === PackageType.SITIO_ONLY ? '70.00' : '120.00';
        if (formState.paymentAmount !== newAmount) {
            setFormState(prev => ({ ...prev, paymentAmount: newAmount }));
        }
    }, [formState.packageType, formState.paymentAmount]);

    // FIX: Safely handle checkbox changes by checking the event target's type before accessing the `checked` property.
    // This resolves a TypeScript error and ensures correct type inference for the form state.
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        
        if (type === 'checkbox' && e.target instanceof HTMLInputElement) {
            setFormState(prev => ({
                ...prev,
                [name]: e.target.checked,
            }));
        } else {
            let formattedValue = value;
            if (name === 'phone') {
                formattedValue = formatPhoneNumber(value);
            } else if (name === 'document') {
                formattedValue = formatDocument(value);
                const { type: docTypeResult } = getDocumentType(formattedValue);
                setDocType(docTypeResult);
            }
            setFormState(prev => ({ ...prev, [name]: formattedValue }));
        }
    };
    
    const validate = (): boolean => {
        const newErrors: { [key: string]: string } = {};
        if (!formState.name.trim()) newErrors.name = 'Nome é obrigatório.';
        
        const docInfo = getDocumentType(formState.document);
        if (!docInfo.valid) newErrors.document = 'Documento inválido.';
        
        if (formState.phone.replace(/[^\d]/g, '').length < 10) newErrors.phone = 'Telefone inválido.';
        
        const paymentAmount = parseFloat(formState.paymentAmount);
        if (isNaN(paymentAmount) || paymentAmount <= 0) newErrors.paymentAmount = 'Valor de pagamento deve ser positivo.';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmissionError(null);
        if (validate()) {
            setSubmissionStatus('submitting');
            try {
                const { type: docType } = getDocumentType(formState.document);
                if (isEditMode && onUpdateAttendee && attendeeToEdit) {
                     const updatedAttendee: Attendee = {
                        ...attendeeToEdit,
                        name: formState.name,
                        document: formState.document,
                        documentType: docType,
                        phone: formState.phone,
                        packageType: formState.packageType,
                        payment: {
                            ...attendeeToEdit.payment,
                            amount: parseFloat(formState.paymentAmount),
                        },
                    };
                    await onUpdateAttendee(updatedAttendee);
                } else if (!isEditMode && onAddAttendee) {
                    await onAddAttendee({
                        ...formState,
                        paymentAmount: parseFloat(formState.paymentAmount),
                    });
                }
                setSubmissionStatus('success');
                // The parent component will handle navigation on success.
            } catch (error) {
                console.error("Submission failed:", error);
                setSubmissionStatus('error');
                setSubmissionError('Falha ao salvar os dados. Por favor, tente novamente.');
            }
        }
    };
    
    const isSubmitting = submissionStatus === 'submitting';

    return (
        <div className="animate-fadeIn">
            <header className="sticky top-0 md:static bg-white md:bg-transparent z-10 p-4 md:pt-6 border-b border-zinc-200 flex items-center gap-4">
                <button onClick={onCancel} className="text-zinc-500 hover:text-zinc-800 p-1 rounded-full hover:bg-zinc-100">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h1 className="text-xl md:text-2xl font-bold text-zinc-800">{isEditMode ? 'Editar' : 'Adicionar'} Inscrição</h1>
            </header>
            <form onSubmit={handleSubmit} className="p-4">
                <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-6 md:gap-y-4">
                    <InputField label="Nome Completo" name="name" value={formState.name} onChange={handleInputChange} error={errors.name} placeholder="Nome do participante" delay={100} />
                    
                    <div className="opacity-0 animate-fadeInUp" style={{ animationDelay: '150ms', animationFillMode: 'forwards' }}>
                        <label htmlFor="document" className="block text-sm font-medium text-zinc-700">Documento (CPF/RG)</label>
                        <div className="mt-1 relative">
                            <input
                                type="text"
                                id="document"
                                name="document"
                                value={formState.document}
                                onChange={handleInputChange}
                                placeholder="000.000.000-00"
                                maxLength={18}
                                className={`block w-full pr-16 px-3 py-2 bg-white border ${errors.document ? 'border-red-500 text-red-900 placeholder-red-300' : 'border-zinc-300'} rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm`}
                                aria-invalid={!!errors.document}
                                aria-describedby={errors.document ? `document-error` : undefined}
                                autoComplete="off"
                            />
                             {docType !== DocumentType.OUTRO && formState.document.length > 0 && (
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                    <span className="text-zinc-500 sm:text-sm font-semibold bg-zinc-100 px-2 py-0.5 rounded-md animate-fadeIn">
                                        {docType}
                                    </span>
                                </div>
                            )}
                        </div>
                        {errors.document && <p id={`document-error`} className="mt-1 text-sm text-red-600 animate-fadeIn">{errors.document}</p>}
                    </div>

                    <InputField label="Telefone" name="phone" value={formState.phone} onChange={handleInputChange} error={errors.phone} placeholder="(00) 00000-0000" maxLength={15} delay={200} />
                    <div className="opacity-0 animate-fadeInUp" style={{ animationDelay: '250ms', animationFillMode: 'forwards' }}>
                        <label htmlFor="packageType" className="block text-sm font-medium text-zinc-700">Pacote</label>
                        <select name="packageType" id="packageType" value={formState.packageType} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 bg-white border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm" autoComplete="off">
                            <option value={PackageType.SITIO_BUS}>Sítio + Ônibus</option>
                            <option value={PackageType.SITIO_ONLY}>Apenas Sítio</option>
                        </select>
                    </div>
                    <div className="opacity-0 animate-fadeInUp md:col-span-2" style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}>
                        <label htmlFor="paymentAmount" className="block text-sm font-medium text-zinc-700">Valor a Pagar (R$)</label>
                        <input
                            type="text"
                            id="paymentAmount"
                            name="paymentAmount"
                            value={formState.paymentAmount}
                            readOnly
                            className="mt-1 block w-full px-3 py-2 bg-zinc-100 border border-zinc-300 rounded-md shadow-sm focus:outline-none sm:text-sm text-zinc-500 cursor-not-allowed"
                            autoComplete="off"
                        />
                    </div>
                    
                    {!isEditMode && (
                         <div className="md:col-span-2 space-y-4 border-t border-zinc-200 pt-4">
                             <div className="opacity-0 animate-fadeInUp" style={{ animationDelay: '350ms', animationFillMode: 'forwards' }}>
                                <label className="flex items-center space-x-2 p-2 rounded-md hover:bg-zinc-50 cursor-pointer w-fit">
                                    <input
                                        type="checkbox"
                                        name="registerPaymentNow"
                                        checked={formState.registerPaymentNow}
                                        onChange={handleInputChange}
                                        className="h-4 w-4 rounded border-zinc-300 text-green-600 focus:ring-green-500"
                                    />
                                    <span className="text-sm font-medium text-zinc-700">Registrar pagamento agora</span>
                                </label>
                            </div>
                            
                            {formState.registerPaymentNow && (
                                <div className="md:grid md:grid-cols-2 md:gap-x-6 md:gap-y-4 space-y-4 md:space-y-0 animate-fadeIn">
                                    <div className="opacity-0 animate-fadeInUp" style={{ animationDelay: '50ms', animationFillMode: 'forwards' }}>
                                        <label htmlFor="paymentDate" className="block text-sm font-medium text-zinc-700">Data do Pagamento</label>
                                        <input
                                            type="date"
                                            id="paymentDate"
                                            name="paymentDate"
                                            value={formState.paymentDate}
                                            onChange={handleInputChange}
                                            className="mt-1 block w-full px-3 py-2 bg-white border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                                            required
                                            autoComplete="off"
                                        />
                                        {formattedDisplayDate && (
                                            <p className="mt-2 text-sm text-center text-zinc-600 bg-zinc-100 p-2 rounded-md border border-zinc-200">
                                                Confirmação: <strong className="font-bold text-green-700">{formattedDisplayDate} (dd/mm/aaaa)</strong>
                                            </p>
                                        )}
                                    </div>
                                    <div className="opacity-0 animate-fadeInUp" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
                                        <label htmlFor="paymentType" className="block text-sm font-medium text-zinc-700">Tipo de Pagamento</label>
                                        <select
                                            id="paymentType"
                                            name="paymentType"
                                            value={formState.paymentType}
                                            onChange={handleInputChange}
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
                                </div>
                            )}
                         </div>
                    )}


                    <div className="flex flex-col md:flex-row gap-4 pt-4 md:col-span-2 opacity-0 animate-fadeInUp" style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}>
                        <button type="button" onClick={onCancel} className="w-full bg-zinc-200 text-zinc-800 font-bold py-3 px-4 rounded-full hover:bg-zinc-300 transition-colors">Cancelar</button>
                        <button type="submit" disabled={isSubmitting} className="w-full bg-green-500 text-white font-bold py-3 px-4 rounded-full hover:bg-green-600 transition-colors shadow-sm flex items-center justify-center gap-2 disabled:bg-green-400 disabled:cursor-not-allowed">
                            {isSubmitting ? (
                                <>
                                    <SpinnerIcon />
                                    <span>Salvando...</span>
                                </>
                            ) : (
                                isEditMode ? 'Salvar Alterações' : 'Salvar'
                            )}
                        </button>
                    </div>
                     {submissionError && <p className="text-center text-sm text-red-600 animate-fadeIn md:col-span-2">{submissionError}</p>}
                </div>
            </form>
        </div>
    );
};

export default AddAttendeeForm;