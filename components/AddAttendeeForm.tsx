
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
    <div className={`w-full ${className}`}>
        <label htmlFor={id} className="block text-sm font-bold text-zinc-600 mb-1">{label}</label>
        <div className="relative">
            {children}
            {onPaste && <PasteButton onPaste={onPaste} />}
        </div>
        {error && <p className="mt-1 text-xs text-red-600 animate-fadeIn font-medium">{error}</p>}
    </div>
);

interface PartialPaymentFieldsProps {
    idPrefix: string;
    details: PartialPaymentFormDetails;
    onUpdate: (updates: Partial<PartialPaymentFormDetails>) => void;
}

const PartialPaymentFields: React.FC<PartialPaymentFieldsProps> = ({ idPrefix, details, onUpdate }) => {
    return (
        <div className="space-y-3 p-3 bg-zinc-50 rounded-xl border border-zinc-100 animate-fadeIn">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Data do Pagamento" id={`${idPrefix}-date`}>
                    <input
                        type="date"
                        id={`${idPrefix}-date`}
                        value={details.date}
                        onChange={(e) => onUpdate({ date: e.target.value })}
                        className="block w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg shadow-sm sm:text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-zinc-100 disabled:text-zinc-400"
                        required={!details.dateNotInformed}
                        disabled={details.dateNotInformed}
                        autoComplete="off"
                    />
                     <label className="flex items-center space-x-2 mt-2 cursor-pointer w-fit">
                        <input type="checkbox" checked={details.dateNotInformed} onChange={(e) => onUpdate({ dateNotInformed: e.target.checked })} className="h-4 w-4 rounded border-zinc-300 text-green-600 focus:ring-green-500" />
                        <span className="text-xs text-zinc-500 font-semibold">Data não informada</span>
                    </label>
                </FormField>
                <FormField label="Tipo de Pagamento" id={`${idPrefix}-type`}>
                    <select
                        id={`${idPrefix}-type`}
                        value={details.type || ''}
                        onChange={(e) => onUpdate({ type: e.target.value as PaymentType })}
                        className="block w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg shadow-sm sm:text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
    
    const [personSearchQuery, setPersonSearchQuery] = useState('');
    const [personSearchResults, setPersonSearchResults] = useState<Person[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isPersonSelected, setIsPersonSelected] = useState(false);

    // Refs for auto-scrolling
    const manualEntryRef = useRef<HTMLDivElement>(null);
    const paymentSectionRef = useRef<HTMLDivElement>(null);
    const sitePaymentRef = useRef<HTMLDivElement>(null);
    const busPaymentRef = useRef<HTMLDivElement>(null);

    // Helper function to scroll to a ref
    const scrollToElement = (ref: React.RefObject<HTMLDivElement | null>) => {
        setTimeout(() => {
            if (ref.current) {
                ref.current.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'nearest' 
                });
            }
        }, 150); // Delay to allow animation/render to complete
    };

    useEffect(() => {
        setFormData(getInitialFormData(attendeeToEdit));
        if(isEditMode) {
             setIsPersonSelected(true);
        }
    }, [attendeeToEdit, isEditMode]);

    // Auto-scroll logic for various triggers
    useEffect(() => {
        if (!isPersonSelected && !isEditMode && personSearchQuery.length > 0) {
            scrollToElement(manualEntryRef);
        }
    }, [isPersonSelected, isEditMode]);

    useEffect(() => {
        if (formData.registerPaymentNow) {
            scrollToElement(paymentSectionRef);
        }
    }, [formData.registerPaymentNow]);

    useEffect(() => {
        if (formData.registerPaymentNow && formData.sitePayment.isPaid) {
            scrollToElement(sitePaymentRef);
        }
    }, [formData.sitePayment.isPaid]);

    useEffect(() => {
        if (formData.registerPaymentNow && formData.busPayment.isPaid) {
            scrollToElement(busPaymentRef);
        }
    }, [formData.busPayment.isPaid]);

    useEffect(() => {
        if (personSearchQuery.length < 3 || isPersonSelected) {
            setPersonSearchResults([]);
            return;
        }

        const search = async () => {
            setIsSearching(true);
            try {
                const results = await api.searchPeople(personSearchQuery);
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
        
        if (isPersonSelected && formData.personId) {
             const duplicate = registrations.find(r => r.person.id === formData.personId);
             const isSelf = isEditMode && attendeeToEdit && duplicate?.id === attendeeToEdit.id;
             
             if (duplicate && !isSelf) {
                 newErrors.name = `"${formData.name}" já está na lista deste evento.`;
             }
        }

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
            const finalName = formData.name.trim().toUpperCase();
            
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
        <div className="animate-fadeIn w-full h-full flex flex-col bg-zinc-50">
             <header className="sticky top-0 bg-white/90 backdrop-blur-md z-30 px-4 py-4 border-b border-zinc-200 flex items-center gap-4 shadow-sm">
                <button onClick={onCancel} className="text-zinc-500 hover:text-zinc-800 p-2 rounded-full hover:bg-zinc-100 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h1 className="text-xl font-black text-zinc-900 tracking-tight">{isEditMode ? 'Editar Inscrição' : 'Nova Inscrição'}</h1>
            </header>

            <form onSubmit={handleSubmit} className="flex-grow flex flex-col relative">
                {/* Increased bottom padding further (pb-80) to ensure content can always be scrolled fully above footer */}
                <div className="p-4 space-y-6 pb-80 md:pb-24 max-w-5xl mx-auto w-full overflow-x-hidden">
                    
                    {/* Responsive Grid System */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                        
                        {/* Section: Dados Pessoais */}
                        <div className="bg-white p-5 rounded-[2rem] border border-zinc-200 shadow-sm space-y-4 opacity-0 animate-fadeInUp" style={{ animationFillMode: 'forwards' }}>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-2 bg-green-50 text-green-600 rounded-xl">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                                </div>
                                <h2 className="text-lg font-black text-zinc-800 tracking-tight">Dados do Participante</h2>
                            </div>
                            
                            {!isEditMode && (
                                <div className="relative">
                                    <FormField label="Buscar na Base" id="personSearch">
                                        <input
                                            type="search"
                                            id="personSearch"
                                            value={personSearchQuery}
                                            onChange={handleSearchChange}
                                            placeholder="Nome do participante..."
                                            className="block w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                                            autoComplete="off"
                                        />
                                    </FormField>
                                    {isSearching && <div className="absolute right-3 top-10"><SpinnerIcon white={false} /></div>}
                                    {personSearchResults.length > 0 && (
                                        <div className="absolute z-40 w-full mt-2 bg-white border border-zinc-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto animate-popIn">
                                            <ul className="py-1">
                                                {personSearchResults.map(person => (
                                                    <li key={person.id} onClick={() => handleSelectPerson(person)} className="px-4 py-3 text-sm text-zinc-700 hover:bg-zinc-50 cursor-pointer border-b border-zinc-50 last:border-0 transition-colors">
                                                        <p className="font-bold text-zinc-900">{person.name}</p>
                                                        <p className="text-xs text-zinc-500 font-medium">{person.document} &bull; {person.phone}</p>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            {isPersonSelected && !isEditMode && (
                                <div className="bg-emerald-50 border-2 border-emerald-100 p-4 rounded-2xl animate-popIn flex justify-between items-center group">
                                    <div className="min-w-0">
                                        <p className="font-black text-emerald-900 truncate uppercase tracking-tight">{formData.name}</p>
                                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                                            <span className="text-xs font-bold text-emerald-700/70">{formData.document || 'Sem doc'}</span>
                                            <span className="text-xs font-bold text-emerald-700/70">{formData.phone}</span>
                                        </div>
                                    </div>
                                    <button type="button" onClick={handleClearPersonSelection} className="ml-4 p-2 bg-white text-emerald-600 rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                    </button>
                                </div>
                            )}

                            <div ref={manualEntryRef} className={isPersonSelected ? 'hidden' : 'space-y-4'}>
                                {!isEditMode && <div className="h-px bg-zinc-100 w-full my-4" />}
                                <FormField label="Nome Completo" id="name" error={errors.name} onPaste={(text) => handlePaste('name', text)}>
                                    <input 
                                        type="text" 
                                        id="name" 
                                        name="name" 
                                        value={formData.name} 
                                        onChange={handleInputChange} 
                                        className="block w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent uppercase transition-all" 
                                        required 
                                        autoComplete="off" 
                                        disabled={isPersonSelected} 
                                        placeholder="EX: MARIA DA SILVA"
                                    />
                                </FormField>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <FormField label={`Doc (CPF/RG)${formData.packageType === PackageType.SITIO_BUS ? '' : ' - Op'}`} id="document" error={errors.document} onPaste={(text) => handlePaste('document', text)}>
                                        <input type="tel" id="document" name="document" value={formData.document} onChange={handleInputChange} className="block w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all" required={formData.packageType === PackageType.SITIO_BUS} autoComplete="off" disabled={isPersonSelected} placeholder="000.000.000-00" />
                                    </FormField>
                                    <FormField label="Celular (WhatsApp)" id="phone" error={errors.phone} onPaste={(text) => handlePaste('phone', text)}>
                                        <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="(21) 99999-9999" className="block w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all" required autoComplete="off" disabled={isPersonSelected} />
                                    </FormField>
                                </div>
                            </div>
                        </div>

                        {/* Section: Pacote e Obs */}
                        <div className="bg-white p-5 rounded-[2rem] border border-zinc-200 shadow-sm space-y-4 opacity-0 animate-fadeInUp" style={{ animationFillMode: 'forwards', animationDelay: '100ms' }}>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1a1 1 0 10-2 0v1a1 1 0 102 0zM13 16v-1a1 1 0 10-2 0v1a1 1 0 102 0zM16.464 14.95a1 1 0 11-1.414 1.414l-.707-.707a1 1 0 011.414-1.414l.707.707zM6.464 14.95a1 1 0 111.414 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707z" /></svg>
                                </div>
                                <h2 className="text-lg font-black text-zinc-800 tracking-tight">Evento e Logística</h2>
                            </div>
                            
                            <FormField label="Pacote Escolhido" id="packageType" error={errors.packageType}>
                                <select id="packageType" name="packageType" value={formData.packageType} onChange={handleInputChange} className="block w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all">
                                    <option value={PackageType.SITIO_ONLY}>Apenas Sítio - R$ {sitePriceText}</option>
                                    <option value={PackageType.SITIO_BUS}>Sítio + Ônibus - R$ {totalBusPriceText}</option>
                                </select>
                            </FormField>
                            
                            <FormField label="Observações (Alergias, etc)" id="notes" error={errors.notes}>
                                <textarea id="notes" name="notes" value={formData.notes} onChange={handleInputChange} rows={3} className="block w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none" placeholder="Ex: Alérgico a camarão, restrição de mobilidade..."></textarea>
                            </FormField>
                        </div>

                        {/* Section: Financeiro e Isenção */}
                        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                            
                            {/* Card: Definição de Isenção */}
                            {!isEditMode && (
                                <div className="bg-white p-5 rounded-[2rem] border border-zinc-200 shadow-sm space-y-4 opacity-0 animate-fadeInUp" style={{ animationFillMode: 'forwards', animationDelay: '200ms' }}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                                        </div>
                                        <h2 className="text-lg font-black text-zinc-800 tracking-tight">Isenção de Taxa</h2>
                                    </div>
                                    
                                    {isBusPackage ? (
                                        <div className="space-y-3">
                                            <label className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100 cursor-pointer active:scale-[0.99] transition-all">
                                                <span className="text-sm font-bold text-zinc-700">Taxa do Sítio</span>
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
                                                    className="h-6 w-6 rounded-lg border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                            </label>
                                            <label className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100 cursor-pointer active:scale-[0.99] transition-all">
                                                <span className="text-sm font-bold text-zinc-700">Taxa do Ônibus</span>
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
                                                    className="h-6 w-6 rounded-lg border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                            </label>
                                        </div>
                                    ) : (
                                        <label className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100 cursor-pointer active:scale-[0.99] transition-all">
                                            <span className="text-sm font-bold text-zinc-700">Isento de Pagamento</span>
                                            <input 
                                                type="checkbox" 
                                                name="paymentIsExempt" 
                                                checked={formData.paymentIsExempt} 
                                                onChange={(e) => setFormData(prev => ({ ...prev, paymentIsExempt: e.target.checked, paymentIsPaid: e.target.checked ? false : true }))} 
                                                className="h-6 w-6 rounded-lg border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                        </label>
                                    )}
                                    
                                    {isFullyExempt && (
                                        <div className="p-3 bg-indigo-100 text-indigo-900 text-xs font-black rounded-xl text-center uppercase tracking-widest animate-popIn">
                                            Totalmente Isento
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Card: Registrar Pagamento */}
                            {!isEditMode && !isFullyExempt && (
                                <div ref={paymentSectionRef} className="bg-white p-5 rounded-[2rem] border border-zinc-200 shadow-sm space-y-4 opacity-0 animate-fadeInUp" style={{ animationFillMode: 'forwards', animationDelay: '300ms' }}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" /><path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" /></svg>
                                            </div>
                                            <h2 className="text-lg font-black text-zinc-800 tracking-tight">Pagamento</h2>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" name="registerPaymentNow" checked={formData.registerPaymentNow} onChange={handleInputChange} className="sr-only peer"/>
                                            <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                                        </label>
                                    </div>

                                    {formData.registerPaymentNow ? (
                                        <div className="space-y-6 pt-2">
                                            {isBusPackage ? (
                                                <div className="space-y-6">
                                                    {!formData.sitePayment.isExempt && (
                                                        <div ref={sitePaymentRef} className="space-y-3">
                                                            <div className="flex justify-between items-center px-1">
                                                                <h3 className="font-black text-xs text-zinc-400 uppercase tracking-widest">Taxa do Sítio (R$ {sitePriceText})</h3>
                                                                <label className="flex items-center gap-2 cursor-pointer group">
                                                                    <span className="text-xs font-bold text-zinc-500 group-hover:text-emerald-600 transition-colors">Está pago?</span>
                                                                    <input 
                                                                        type="checkbox" 
                                                                        checked={formData.sitePayment.isPaid} 
                                                                        onChange={(e) => setFormData(fd => ({ ...fd, sitePayment: { ...fd.sitePayment, isPaid: e.target.checked } }))} 
                                                                        className="h-5 w-5 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                                                                    />
                                                                </label>
                                                            </div>
                                                            {formData.sitePayment.isPaid && (
                                                                <PartialPaymentFields idPrefix="site" details={formData.sitePayment} onUpdate={(updates) => setFormData(fd => ({ ...fd, sitePayment: { ...fd.sitePayment, ...updates } }))} />
                                                            )}
                                                        </div>
                                                    )}
                                                    
                                                    {!formData.busPayment.isExempt && (
                                                        <div ref={busPaymentRef} className="space-y-3">
                                                            <div className="flex justify-between items-center px-1">
                                                                <h3 className="font-black text-xs text-zinc-400 uppercase tracking-widest">Passagem Ônibus (R$ {(event?.bus_price ?? 50).toFixed(2).replace('.',',')})</h3>
                                                                <label className="flex items-center gap-2 cursor-pointer group">
                                                                    <span className="text-xs font-bold text-zinc-500 group-hover:text-emerald-600 transition-colors">Está pago?</span>
                                                                    <input 
                                                                        type="checkbox" 
                                                                        checked={formData.busPayment.isPaid} 
                                                                        onChange={(e) => setFormData(fd => ({ ...fd, busPayment: { ...fd.busPayment, isPaid: e.target.checked } }))} 
                                                                        className="h-5 w-5 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                                                                    />
                                                                </label>
                                                            </div>
                                                            {formData.busPayment.isPaid && (
                                                                <PartialPaymentFields idPrefix="bus" details={formData.busPayment} onUpdate={(updates) => setFormData(fd => ({ ...fd, busPayment: { ...fd.busPayment, ...updates } }))} />
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    <h3 className="font-black text-xs text-zinc-400 uppercase tracking-widest px-1">Detalhamento (R$ {sitePriceText})</h3>
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
                                    ) : (
                                        <p className="text-sm text-zinc-400 font-medium italic text-center py-4 bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
                                            Aguardando confirmação de pagamento...
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                
                {/* Fixed Footer - Adjusted for BottomNav and Safe Areas */}
                <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-t border-zinc-200 px-4 py-4 pb-[calc(1.5rem+env(safe-area-inset-bottom)+70px)] md:pb-6 shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
                    <div className="max-w-md mx-auto flex gap-3">
                        <button type="button" onClick={onCancel} className="flex-1 bg-zinc-100 text-zinc-600 font-black py-4 px-6 rounded-2xl hover:bg-zinc-200 transition-all uppercase tracking-widest text-xs active:scale-[0.98]">
                            Cancelar
                        </button>
                        <button type="submit" disabled={isSubmitting || (!isPersonSelected && !formData.name)} className="flex-[2] bg-emerald-500 text-white font-black py-4 px-6 rounded-2xl flex items-center justify-center gap-2 hover:bg-emerald-600 shadow-lg shadow-emerald-200 transition-all uppercase tracking-widest text-xs active:scale-[0.98] disabled:bg-zinc-300 disabled:shadow-none disabled:cursor-not-allowed">
                            {isSubmitting ? <><SpinnerIcon /> Salvando...</> : (isEditMode ? 'Confirmar' : 'Salvar')}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default AddAttendeeForm;
