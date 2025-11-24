
import React, { useState, useEffect, useCallback } from 'react';
import type { Attendee, AttendeeFormData, PartialPaymentFormDetails, Event, Person } from '../types';
import { PackageType, PaymentType } from '../types';
import { formatPhoneNumber, formatDocument, getDocumentType, normalizeString } from '../utils/formatters';
import { useToast } from '../contexts/ToastContext';
import * as api from '../services/api';

const SpinnerIcon: React.FC<{ white?: boolean }> = ({ white = true }) => (
    <svg className={`animate-spin h-5 w-5 ${white ? 'text-white' : 'text-zinc-700'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

// Utility to handle paste with error handling
const PasteButton: React.FC<{ onPaste: (text: string) => void }> = ({ onPaste }) => {
    const { addToast } = useToast();

    const handleClick = async (e: React.MouseEvent) => {
        e.preventDefault(); 
        
        if (!navigator.clipboard || !navigator.clipboard.readText) {
             addToast('Colar não suportado neste navegador.', 'error');
             return;
        }

        try {
            const text = await navigator.clipboard.readText();
            if (text) onPaste(text);
            else addToast('Área de transferência vazia.', 'info');
        } catch (err) {
            console.error('Failed to read clipboard', err);
            addToast('Falha ao acessar área de transferência. Verifique as permissões.', 'error');
        }
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-green-600 p-1.5 rounded-md hover:bg-zinc-100 transition-colors z-10"
            title="Colar"
            tabIndex={-1}
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
        </button>
    );
};

const FormField: React.FC<{ label: string; id: string; error?: string; children: React.ReactNode; onPaste?: (text: string) => void; className?: string }> = ({ label, id, error, children, onPaste, className = '' }) => (
    <div className={className}>
        <label htmlFor={id} className="block text-sm font-medium text-zinc-700">{label}</label>
        <div className="mt-1 relative">
            {children}
            {onPaste && <PasteButton onPaste={onPaste} />}
        </div>
        {error && <p className="mt-1 text-xs text-red-600 animate-fadeIn">{error}</p>}
    </div>
);

interface PartialPaymentFieldsProps {
    idPrefix: string;
    details: PartialPaymentFormDetails;
    onUpdate: (updates: Partial<PartialPaymentFormDetails>) => void;
}

const PartialPaymentFields: React.FC<PartialPaymentFieldsProps> = ({ idPrefix, details, onUpdate }) => {
    return (
        <div className="space-y-2">
            <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-2 md:gap-3 pl-3 md:pl-4 border-l-2 border-green-300 animate-fadeIn">
                <FormField label="Data do Pagamento" id={`${idPrefix}-date`}>
                    <input
                        type="date"
                        id={`${idPrefix}-date`}
                        value={details.date}
                        onChange={(e) => onUpdate({ date: e.target.value })}
                        className="block w-full max-w-full min-w-0 px-2 py-1.5 bg-white border border-zinc-300 rounded-md shadow-sm sm:text-sm focus:outline-none focus:ring-green-500 focus:border-green-500 disabled:bg-zinc-100"
                        required={!details.dateNotInformed}
                        disabled={details.dateNotInformed}
                        autoComplete="off"
                        style={{ maxWidth: '100%' }}
                    />
                     <label className="flex items-center space-x-2 mt-1.5 cursor-pointer w-fit">
                        <input type="checkbox" checked={details.dateNotInformed} onChange={(e) => onUpdate({ dateNotInformed: e.target.checked })} className="h-4 w-4 rounded border-zinc-300 text-green-600 focus:ring-green-500" />
                        <span className="text-xs text-zinc-700">Data não informada</span>
                    </label>
                </FormField>
                <FormField label="Tipo de Pagamento" id={`${idPrefix}-type`}>
                    <select
                        id={`${idPrefix}-type`}
                        value={details.type || ''}
                        onChange={(e) => onUpdate({ type: e.target.value as PaymentType })}
                        className="block w-full px-2 py-1.5 bg-white border border-zinc-300 rounded-md shadow-sm sm:text-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                        required
                        autoComplete="off"
                    >
                        <option value={PaymentType.PIX_CONTA}>PIX (Conta)</option>
                        <option value={PaymentType.PIX_MAQUINA}>PIX (Máquina)</option>
                        <option value={PaymentType.DEBITO}>Débito</option>
                        <option value={PaymentType.CREDITO}>Crédito</option>
                        <option value={PaymentType.DINHEIRO}>Dinheiro</option>
                    </select>
                </FormField>
            </div>
        </div>
    );
};

interface AddAttendeeFormProps {
    onAddAttendee?: (formData: AttendeeFormData) => Promise<void>;
    onUpdateAttendee?: (attendee: Attendee) => Promise<void>;
    onCancel: () => void;
    attendeeToEdit?: Attendee | null;
    registrations: Attendee[];
    event: Event | null;
}

const getInitialPartialPayment = (): PartialPaymentFormDetails => ({
    isPaid: false,
    isExempt: false,
    date: new Date().toISOString().split('T')[0],
    dateNotInformed: false,
    type: PaymentType.PIX_CONTA,
});

const getInitialFormData = (attendee?: Attendee | null): AttendeeFormData => {
    if (attendee) {
        const isBus = attendee.packageType === PackageType.SITIO_BUS;
        return {
            personId: attendee.person.id,
            name: attendee.person.name,
            document: attendee.person.document,
            phone: attendee.person.phone,
            packageType: attendee.packageType,
            notes: attendee.notes || '',
            paymentAmount: attendee.payment.amount.toString(),
            registerPaymentNow: false,
            paymentDate: attendee.payment.date ? new Date(attendee.payment.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            paymentDateNotInformed: !attendee.payment.date,
            paymentType: attendee.payment.type || PaymentType.PIX_CONTA,
            paymentIsExempt: !isBus && attendee.payment.status === 'Isento',
            paymentIsPaid: !isBus && attendee.payment.status === 'Pago',
            sitePayment: isBus ? (attendee.payment.sitePaymentDetails ? {
                isPaid: attendee.payment.sitePaymentDetails.isPaid,
                isExempt: attendee.payment.sitePaymentDetails.isExempt,
                date: attendee.payment.sitePaymentDetails.date ? new Date(attendee.payment.sitePaymentDetails.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                dateNotInformed: !attendee.payment.sitePaymentDetails.date,
                type: attendee.payment.sitePaymentDetails.type || PaymentType.PIX_CONTA
            } : getInitialPartialPayment()) : getInitialPartialPayment(),
            busPayment: isBus ? (attendee.payment.busPaymentDetails ? {
                isPaid: attendee.payment.busPaymentDetails.isPaid,
                isExempt: attendee.payment.busPaymentDetails.isExempt,
                date: attendee.payment.busPaymentDetails.date ? new Date(attendee.payment.busPaymentDetails.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                dateNotInformed: !attendee.payment.busPaymentDetails.date,
                type: attendee.payment.busPaymentDetails.type || PaymentType.PIX_CONTA
            } : getInitialPartialPayment()) : getInitialPartialPayment(),
        };
    }
    return {
        personId: null,
        name: '',
        document: '',
        phone: '',
        packageType: PackageType.SITIO_ONLY,
        paymentAmount: '70.00',
        registerPaymentNow: false,
        notes: '',
        paymentDate: new Date().toISOString().split('T')[0],
        paymentDateNotInformed: false,
        paymentType: PaymentType.PIX_CONTA,
        paymentIsExempt: false,
        paymentIsPaid: true,
        sitePayment: getInitialPartialPayment(),
        busPayment: getInitialPartialPayment(),
    };
};

const AddAttendeeForm: React.FC<AddAttendeeFormProps> = ({ onAddAttendee, onUpdateAttendee, onCancel, attendeeToEdit, registrations, event }) => {
    const { addToast } = useToast();
    const isEditMode = !!attendeeToEdit;

    const [formData, setFormData] = useState<AttendeeFormData>(getInitialFormData(attendeeToEdit));
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // State for person search
    const [personSearchQuery, setPersonSearchQuery] = useState('');
    const [personSearchResults, setPersonSearchResults] = useState<Person[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isPersonSelected, setIsPersonSelected] = useState(false);


    useEffect(() => {
        setFormData(getInitialFormData(attendeeToEdit));
        if(isEditMode) {
             setIsPersonSelected(true);
        }
    }, [attendeeToEdit, isEditMode]);

    // Debounced search for people
    useEffect(() => {
        if (personSearchQuery.length < 3 || isPersonSelected) {
            setPersonSearchResults([]);
            return;
        }

        const search = async () => {
            setIsSearching(true);
            try {
                const results = await api.searchPeople(personSearchQuery);
                // Filter out people already registered for the current event
                const registeredPersonIds = new Set(registrations.map(r => r.person.id));
                const availableResults = results.filter(p => !registeredPersonIds.has(p.id));
                setPersonSearchResults(availableResults);
            } catch (error) {
                console.error("Failed to search people:", error);
                addToast('Erro ao buscar pessoas.', 'error');
            } finally {
                setIsSearching(false);
            }
        };

        const debounceTimer = setTimeout(() => {
            search();
        }, 300);

        return () => clearTimeout(debounceTimer);
    }, [personSearchQuery, isPersonSelected, registrations, addToast]);


    useEffect(() => {
        if (!isEditMode) {
            const sitePrice = event?.site_price ?? 70;
            const busPrice = event?.bus_price ?? 50;
            
            let amount = 0;
            if (formData.packageType === PackageType.SITIO_BUS) {
                if (!formData.sitePayment.isExempt) amount += sitePrice;
                if (!formData.busPayment.isExempt) amount += busPrice;
            } else {
                if (!formData.paymentIsExempt) amount += sitePrice;
            }
            
            setFormData(fd => ({ ...fd, paymentAmount: amount.toFixed(2) }));
        }
    }, [formData.packageType, formData.sitePayment.isExempt, formData.busPayment.isExempt, formData.paymentIsExempt, isEditMode, event]);

    const handleSelectPerson = (person: Person) => {
        // Immediate check for duplicates when selecting a person
        const duplicate = registrations.find(r => r.person.id === person.id);
        if (duplicate) {
            addToast(`"${person.name}" já está inscrito neste evento.`, 'error');
            return;
        }

        setFormData(prev => ({
            ...prev,
            personId: person.id,
            name: person.name,
            document: person.document,
            phone: person.phone,
        }));
        setIsPersonSelected(true);
        setPersonSearchQuery(person.name);
        setPersonSearchResults([]);
        setErrors({});
    };

    const handleClearPersonSelection = () => {
        setFormData(prev => ({
            ...prev,
            personId: null,
            name: '',
            document: '',
            phone: '',
        }));
        setIsPersonSelected(false);
        setPersonSearchQuery('');
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!formData.name.trim()) newErrors.name = 'Nome é obrigatório.';
        
        const isBusPackage = formData.packageType === PackageType.SITIO_BUS;

        if (isBusPackage) {
            if (!formData.document.trim()) {
                newErrors.document = 'Documento é obrigatório para pacote com ônibus.';
            } else if (!getDocumentType(formData.document).valid) {
                newErrors.document = 'Documento inválido.';
            }
        }

        if (!formData.phone.trim() || formData.phone.replace(/\D/g, '').length < 10) newErrors.phone = 'Telefone inválido.';
        
        // Check for duplicate person ID selection
        if (isPersonSelected && formData.personId) {
             const duplicate = registrations.find(r => r.person.id === formData.personId);
             // Ignore the duplicate if it is the same record we are currently editing
             const isSelf = isEditMode && attendeeToEdit && duplicate?.id === attendeeToEdit.id;
             
             if (duplicate && !isSelf) {
                 newErrors.name = `"${formData.name}" já está na lista deste evento.`;
             }
        }

        // Only check for duplicates by text if it's a new person being registered
        if (!isPersonSelected) {
            const normalizedName = normalizeString(formData.name);
            const normalizedDocument = formData.document.replace(/[^\d]/g, '');

            if (normalizedName || normalizedDocument) {
                const duplicate = registrations.find(a => {
                    const existingName = normalizeString(a.person.name);
                    const existingDoc = a.person.document.replace(/[^\d]/g, '');
                    if (normalizedDocument && existingDoc && normalizedDocument.length > 3) {
                        return existingDoc === normalizedDocument;
                    }
                    return existingName === normalizedName;
                });
                if (duplicate) {
                    if (normalizeString(duplicate.person.name) === normalizedName) newErrors.name = `"${formData.name}" já está na lista deste evento.`;
                    else newErrors.document = 'Este documento já foi cadastrado para este evento.';
                }
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const isCheckbox = type === 'checkbox';
        const checked = (e.target as HTMLInputElement).checked;

        let finalValue: string | boolean = isCheckbox ? checked : value;

        // FIX: Do NOT uppercase name here to avoid cursor jumping. It is uppercased via CSS and onSubmit.
        
        if (name === 'phone') {
            finalValue = formatPhoneNumber(value);
        } else if (name === 'document') {
            finalValue = formatDocument(value);
        }

        setFormData(prev => ({ ...prev, [name]: finalValue }));
    };
    
    const handlePaste = (field: keyof AttendeeFormData, text: string) => {
        let finalValue = text;
        if (field === 'phone') finalValue = formatPhoneNumber(text);
        if (field === 'document') finalValue = formatDocument(text);
        setFormData(prev => ({ ...prev, [field]: finalValue }));
    };
    
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setPersonSearchQuery(value);
        if (isPersonSelected) {
            setIsPersonSelected(false);
            setFormData(prev => ({ ...prev, personId: null }));
        }
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) {
            addToast('Por favor, corrija os erros no formulário.', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const finalName = formData.name.trim().toUpperCase(); // Uppercase applied on submit
            
            if (isEditMode && onUpdateAttendee && attendeeToEdit) {
                const { type } = getDocumentType(formData.document);
                const updatedAttendee: Attendee = {
                    ...attendeeToEdit,
                    person: {
                        ...attendeeToEdit.person,
                        name: finalName,
                        document: formData.document,
                        documentType: type,
                        phone: formData.phone,
                    },
                    packageType: formData.packageType,
                    notes: formData.notes.trim(),
                    payment: {
                        ...attendeeToEdit.payment,
                        amount: parseFloat(formData.paymentAmount),
                    },
                };
                
                await onUpdateAttendee(updatedAttendee);
                addToast('Inscrição atualizada com sucesso!', 'success');
                onCancel();
            } else if (!isEditMode && onAddAttendee) {
                await onAddAttendee({
                    ...formData,
                    name: finalName,
                    notes: formData.notes.trim(),
                });
                addToast('Inscrição adicionada com sucesso!', 'success');
                onCancel();
            }
        } catch (error) {
            console.error(error);
            if (error instanceof Error && error.message.includes('duplicate key value')) {
                 addToast('Esta pessoa já está inscrita neste evento.', 'error');
            } else {
                 addToast('Falha ao salvar inscrição.', 'error');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const isBusPackage = formData.packageType === PackageType.SITIO_BUS;
    const sitePriceText = (event?.site_price ?? 70).toFixed(2).replace('.', ',');
    const totalBusPriceText = ((event?.site_price ?? 70) + (event?.bus_price ?? 50)).toFixed(2).replace('.', ',');

    const isFullyExempt = isBusPackage 
        ? (formData.sitePayment.isExempt && formData.busPayment.isExempt)
        : formData.paymentIsExempt;

    return (
        <div className="animate-fadeIn w-full">
             <header className="sticky top-0 md:static bg-white md:bg-transparent z-10 p-3 md:pt-4 border-b border-zinc-200 flex items-center gap-4">
                <button onClick={onCancel} className="text-zinc-500 hover:text-zinc-800 p-1 rounded-full hover:bg-zinc-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h1 className="text-xl md:text-2xl font-bold text-zinc-800">{isEditMode ? 'Editar Inscrição' : 'Nova Inscrição'}</h1>
            </header>
            <form onSubmit={handleSubmit} className="p-3">
                <div className="grid grid-cols-1 md:grid-cols-12 xl:grid-cols-3 gap-4 items-start">
                    
                    {/* Left Column Wrapper (Personal & Package) */}
                    <div className="md:col-span-7 xl:col-span-2 space-y-3 xl:space-y-0 xl:grid xl:grid-cols-2 xl:gap-4">
                        {/* Personal Data Card */}
                        <div className="bg-white p-3 rounded-xl border border-zinc-200 shadow-sm space-y-3 h-full">
                            <h2 className="text-lg font-bold text-zinc-800">Dados Pessoais</h2>
                            
                            {!isEditMode && (
                                <div className="relative">
                                    <FormField label="1. Buscar Participante Existente" id="personSearch">
                                        <input
                                            type="search"
                                            id="personSearch"
                                            value={personSearchQuery}
                                            onChange={handleSearchChange}
                                            placeholder="Digite um nome para buscar..."
                                            className="block w-full px-3 py-2 bg-white border border-zinc-300 rounded-md shadow-sm sm:text-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                                            autoComplete="off"
                                        />
                                    </FormField>
                                    {isSearching && <div className="absolute right-3 top-9"><SpinnerIcon white={false} /></div>}
                                    {personSearchResults.length > 0 && (
                                        <div className="absolute z-10 w-full mt-1 bg-white border border-zinc-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                            <ul className="py-1">
                                                {personSearchResults.map(person => (
                                                    <li key={person.id} onClick={() => handleSelectPerson(person)} className="px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 cursor-pointer">
                                                        <p className="font-semibold">{person.name}</p>
                                                        <p className="text-xs text-zinc-500">{person.document} &bull; {person.phone}</p>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            {isPersonSelected && !isEditMode && (
                                <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded-r-lg animate-fadeIn">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-green-800">{formData.name}</p>
                                            <p className="text-sm text-green-700">{formData.document}</p>
                                            <p className="text-sm text-green-700 mt-1">{formData.phone}</p>
                                        </div>
                                        <button type="button" onClick={handleClearPersonSelection} className="text-sm font-semibold text-zinc-600 hover:text-zinc-800">
                                            Alterar
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className={isPersonSelected ? 'hidden' : 'space-y-3'}>
                                <p className="text-sm text-zinc-500 text-center border-b pb-3">
                                    {isEditMode ? 'Edite os dados abaixo:' : 'Ou cadastre uma nova pessoa:'}
                                </p>
                                <FormField label="Nome Completo" id="name" error={errors.name} onPaste={(text) => handlePaste('name', text)}>
                                    <input 
                                        type="text" 
                                        id="name" 
                                        name="name" 
                                        value={formData.name} 
                                        onChange={handleInputChange} 
                                        className="block w-full px-3 py-2 bg-white border border-zinc-300 rounded-md shadow-sm sm:text-sm focus:outline-none focus:ring-green-500 focus:border-green-500 uppercase pr-8" 
                                        required 
                                        autoComplete="off" 
                                        disabled={isPersonSelected} 
                                    />
                                </FormField>
                                <div className="md:grid md:grid-cols-2 md:gap-3 space-y-3 md:space-y-0">
                                    <FormField label={`Documento (CPF ou RG)${formData.packageType === PackageType.SITIO_BUS ? '' : ' - Opcional'}`} id="document" error={errors.document} onPaste={(text) => handlePaste('document', text)}>
                                        <input type="tel" id="document" name="document" value={formData.document} onChange={handleInputChange} className="block w-full px-3 py-2 bg-white border border-zinc-300 rounded-md shadow-sm sm:text-sm focus:outline-none focus:ring-green-500 focus:border-green-500 pr-8" required={formData.packageType === PackageType.SITIO_BUS} autoComplete="off" disabled={isPersonSelected} />
                                    </FormField>
                                    <FormField label="Telefone (com DDD)" id="phone" error={errors.phone} onPaste={(text) => handlePaste('phone', text)}>
                                        <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="(21) 99999-9999" className="block w-full px-3 py-2 bg-white border border-zinc-300 rounded-md shadow-sm sm:text-sm focus:outline-none focus:ring-green-500 focus:border-green-500 pr-8" required autoComplete="off" disabled={isPersonSelected} />
                                    </FormField>
                                </div>
                            </div>

                            {isEditMode && (
                                <div className="space-y-3">
                                    <FormField label="Nome Completo" id="name" error={errors.name} onPaste={(text) => handlePaste('name', text)}>
                                        <input type="text" id="name" name="name" value={formData.name} onChange={handleInputChange} className="block w-full px-3 py-2 bg-white border border-zinc-300 rounded-md shadow-sm sm:text-sm uppercase pr-8" required autoComplete="off" />
                                    </FormField>
                                    <div className="md:grid md:grid-cols-2 md:gap-3 space-y-3 md:space-y-0">
                                        <FormField label={`Documento (CPF ou RG)${formData.packageType === PackageType.SITIO_BUS ? '' : ' - Opcional'}`} id="document" error={errors.document} onPaste={(text) => handlePaste('document', text)}>
                                            <input type="tel" id="document" name="document" value={formData.document} onChange={handleInputChange} className="block w-full px-3 py-2 bg-white border border-zinc-300 rounded-md shadow-sm sm:text-sm pr-8" required={formData.packageType === PackageType.SITIO_BUS} autoComplete="off" />
                                        </FormField>
                                        <FormField label="Telefone (com DDD)" id="phone" error={errors.phone} onPaste={(text) => handlePaste('phone', text)}>
                                            <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="(21) 99999-9999" className="block w-full px-3 py-2 bg-white border border-zinc-300 rounded-md shadow-sm sm:text-sm pr-8" required autoComplete="off" />
                                        </FormField>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Package and Notes Card */}
                        <div className="bg-white p-3 rounded-xl border border-zinc-200 shadow-sm space-y-3 h-full">
                            <h2 className="text-lg font-bold text-zinc-800">Pacote e Observações</h2>
                            <FormField label="Pacote" id="packageType" error={errors.packageType}>
                                <select id="packageType" name="packageType" value={formData.packageType} onChange={handleInputChange} className="block w-full px-3 py-2 bg-white border border-zinc-300 rounded-md shadow-sm sm:text-sm focus:outline-none focus:ring-green-500 focus:border-green-500">
                                    <option value={PackageType.SITIO_ONLY}>Apenas Sítio - R$ {sitePriceText}</option>
                                    <option value={PackageType.SITIO_BUS}>Sítio + Ônibus - R$ {totalBusPriceText}</option>
                                </select>
                            </FormField>
                            <FormField label="Observações" id="notes" error={errors.notes} className="flex-grow">
                                <textarea id="notes" name="notes" value={formData.notes} onChange={handleInputChange} rows={3} className="block w-full px-3 py-2 bg-white border border-zinc-300 rounded-md shadow-sm sm:text-sm focus:outline-none focus:ring-green-500 focus:border-green-500" placeholder="Alergias, restrições alimentares, etc."></textarea>
                            </FormField>
                        </div>
                    </div>

                    {/* Right Column Wrapper: Exemption & Payment */}
                    <div className="md:col-span-5 xl:col-span-1 space-y-3 mt-3 md:mt-0">
                        {!isEditMode && (
                            <div className="bg-white p-3 rounded-xl border border-zinc-200 shadow-sm space-y-3">
                                <h2 className="text-lg font-bold text-zinc-800">Definição de Isenção</h2>
                                <p className="text-xs text-zinc-500">Marque abaixo caso o inscrito seja isento de alguma taxa.</p>
                                
                                {isBusPackage ? (
                                    <div className="space-y-2">
                                        <label className="flex items-center space-x-2 cursor-pointer bg-zinc-50 p-2 rounded-lg border border-zinc-100 hover:bg-zinc-100">
                                            <input 
                                                type="checkbox" 
                                                checked={formData.sitePayment.isExempt} 
                                                onChange={(e) => {
                                                    const isExempt = e.target.checked;
                                                    setFormData(fd => ({
                                                        ...fd,
                                                        sitePayment: { ...fd.sitePayment, isExempt, isPaid: isExempt ? false : fd.sitePayment.isPaid }
                                                    }));
                                                }} 
                                                className="h-5 w-5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span className="text-sm font-bold text-zinc-700">Isento da Taxa do Sítio</span>
                                        </label>
                                        <label className="flex items-center space-x-2 cursor-pointer bg-zinc-50 p-2 rounded-lg border border-zinc-100 hover:bg-zinc-100">
                                            <input 
                                                type="checkbox" 
                                                checked={formData.busPayment.isExempt} 
                                                onChange={(e) => {
                                                    const isExempt = e.target.checked;
                                                    setFormData(fd => ({
                                                        ...fd,
                                                        busPayment: { ...fd.busPayment, isExempt, isPaid: isExempt ? false : fd.busPayment.isPaid }
                                                    }));
                                                }} 
                                                className="h-5 w-5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span className="text-sm font-bold text-zinc-700">Isento da Taxa do Ônibus</span>
                                        </label>
                                    </div>
                                ) : (
                                    <label className="flex items-center space-x-2 cursor-pointer bg-zinc-50 p-2 rounded-lg border border-zinc-100 hover:bg-zinc-100">
                                        <input 
                                            type="checkbox" 
                                            name="paymentIsExempt" 
                                            checked={formData.paymentIsExempt} 
                                            onChange={(e) => setFormData(prev => ({ ...prev, paymentIsExempt: e.target.checked, paymentIsPaid: e.target.checked ? false : true }))} 
                                            className="h-5 w-5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="text-sm font-bold text-zinc-700">Isento de Pagamento</span>
                                    </label>
                                )}
                                
                                {(isBusPackage && formData.sitePayment.isExempt && formData.busPayment.isExempt) || (!isBusPackage && formData.paymentIsExempt) ? (
                                    <div className="p-2 bg-indigo-50 text-indigo-800 text-sm font-semibold rounded-lg text-center">
                                        Inscrito totalmente isento. Nenhum pagamento necessário.
                                    </div>
                                ) : null}
                            </div>
                        )}

                        {!isEditMode && !isFullyExempt && (
                            <div className="bg-white p-3 rounded-xl border border-zinc-200 shadow-sm space-y-3">
                                <label className="flex items-center space-x-2 cursor-pointer w-fit">
                                    <input type="checkbox" name="registerPaymentNow" checked={formData.registerPaymentNow} onChange={handleInputChange} className="h-4 w-4 rounded border-zinc-300 text-green-600 focus:ring-green-500"/>
                                    <span className="text-lg text-zinc-800 font-bold">Registrar Pagamento Agora?</span>
                                </label>

                                {formData.registerPaymentNow && (
                                    <div className="pt-3 border-t border-zinc-200 animate-fadeIn">
                                        {isBusPackage ? (
                                            <div className="space-y-3">
                                                {!formData.sitePayment.isExempt && (
                                                    <div>
                                                        <h3 className="font-bold text-zinc-700 mb-1.5">Pagamento Sítio (R$ {sitePriceText})</h3>
                                                        <label className="flex items-center space-x-2 mb-2 cursor-pointer w-fit">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={formData.sitePayment.isPaid} 
                                                                onChange={(e) => setFormData(fd => ({ ...fd, sitePayment: { ...fd.sitePayment, isPaid: e.target.checked } }))} 
                                                                className="h-4 w-4 rounded border-zinc-300 text-green-600 focus:ring-green-500"
                                                            />
                                                            <span className="text-sm text-zinc-700 font-medium">Pagamento realizado?</span>
                                                        </label>
                                                        {formData.sitePayment.isPaid && (
                                                            <PartialPaymentFields idPrefix="site" details={formData.sitePayment} onUpdate={(updates) => setFormData(fd => ({ ...fd, sitePayment: { ...fd.sitePayment, ...updates } }))} />
                                                        )}
                                                    </div>
                                                )}
                                                
                                                {!formData.busPayment.isExempt && (
                                                    <div>
                                                        <h3 className="font-bold text-zinc-700 mb-1.5">Pagamento Ônibus (R$ {(event?.bus_price ?? 50).toFixed(2).replace('.',',')})</h3>
                                                        <label className="flex items-center space-x-2 mb-2 cursor-pointer w-fit">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={formData.busPayment.isPaid} 
                                                                onChange={(e) => setFormData(fd => ({ ...fd, busPayment: { ...fd.busPayment, isPaid: e.target.checked } }))} 
                                                                className="h-4 w-4 rounded border-zinc-300 text-green-600 focus:ring-green-500"
                                                            />
                                                            <span className="text-sm text-zinc-700 font-medium">Pagamento realizado?</span>
                                                        </label>
                                                        {formData.busPayment.isPaid && (
                                                            <PartialPaymentFields idPrefix="bus" details={formData.busPayment} onUpdate={(updates) => setFormData(fd => ({ ...fd, busPayment: { ...fd.busPayment, ...updates } }))} />
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div>
                                                <h3 className="font-bold text-zinc-700 mb-1.5">Pagamento (R$ {sitePriceText})</h3>
                                                <PartialPaymentFields 
                                                    idPrefix="single" 
                                                    details={{ 
                                                        isPaid: formData.paymentIsPaid ?? true, 
                                                        isExempt: false, 
                                                        date: formData.paymentDate, 
                                                        dateNotInformed: formData.paymentDateNotInformed, 
                                                        type: formData.paymentType 
                                                    }} 
                                                    onUpdate={(updates) => setFormData(fd => ({
                                                        ...fd, 
                                                        paymentDate: updates.date !== undefined ? updates.date : fd.paymentDate, 
                                                        paymentDateNotInformed: updates.dateNotInformed !== undefined ? updates.dateNotInformed : fd.paymentDateNotInformed, 
                                                        paymentType: updates.type !== undefined ? updates.type : fd.paymentType,
                                                    }))} 
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Footer Actions - Sticky at bottom of form on Desktop */}
                <div className="mt-4 pt-3 border-t border-zinc-200 md:border-t md:sticky md:bottom-0 bg-zinc-50 md:z-10 md:-mx-4 md:px-4 md:py-3 md:shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] flex justify-center items-center">
                    <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                        <button type="button" onClick={onCancel} className="w-full md:w-32 bg-zinc-200 text-zinc-800 font-bold py-3 px-4 rounded-full hover:bg-zinc-300 transition-colors">Cancelar</button>
                        <button type="submit" disabled={isSubmitting || (!isPersonSelected && !formData.name)} className="w-full md:w-48 bg-green-500 text-white font-bold py-3 px-4 rounded-full flex items-center justify-center gap-2 hover:bg-green-600 shadow-sm disabled:bg-green-400 disabled:cursor-not-allowed">
                            {isSubmitting ? <><SpinnerIcon /> Salvando...</> : (isEditMode ? 'Salvar Alterações' : 'Salvar Inscrição')}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default AddAttendeeForm;
