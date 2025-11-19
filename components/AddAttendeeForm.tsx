
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

const FormField: React.FC<{ label: string; id: string; error?: string; children: React.ReactNode }> = ({ label, id, error, children }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-zinc-700">{label}</label>
        <div className="mt-1">{children}</div>
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
        <div className="space-y-3">
            <label className="flex items-center space-x-2 cursor-pointer w-fit">
                <input type="checkbox" checked={details.isPaid} onChange={(e) => onUpdate({ isPaid: e.target.checked })} className="h-4 w-4 rounded border-zinc-300 text-green-600 focus:ring-green-500"/>
                <span className="text-sm text-zinc-700 font-medium">Pagamento realizado?</span>
            </label>
            {details.isPaid && (
                <div className="space-y-3 pl-6 border-l-2 border-zinc-200 animate-fadeIn">
                    <FormField label="Data do Pagamento" id={`${idPrefix}-date`}>
                        <input
                            type="date"
                            id={`${idPrefix}-date`}
                            value={details.date}
                            onChange={(e) => onUpdate({ date: e.target.value })}
                            className="block w-full px-3 py-2 bg-white border border-zinc-300 rounded-md shadow-sm sm:text-sm focus:outline-none focus:ring-green-500 focus:border-green-500 disabled:bg-zinc-100"
                            required={!details.dateNotInformed}
                            disabled={details.dateNotInformed}
                            autoComplete="off"
                        />
                         <label className="flex items-center space-x-2 mt-2 cursor-pointer w-fit">
                            <input type="checkbox" checked={details.dateNotInformed} onChange={(e) => onUpdate({ dateNotInformed: e.target.checked })} className="h-4 w-4 rounded border-zinc-300 text-green-600 focus:ring-green-500" />
                            <span className="text-sm text-zinc-700">Data não informada</span>
                        </label>
                    </FormField>
                    <FormField label="Tipo de Pagamento" id={`${idPrefix}-type`}>
                        <select
                            id={`${idPrefix}-type`}
                            value={details.type}
                            onChange={(e) => onUpdate({ type: e.target.value as PaymentType })}
                            className="block w-full px-3 py-2 bg-white border border-zinc-300 rounded-md shadow-sm sm:text-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
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
            )}
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
    date: new Date().toISOString().split('T')[0],
    dateNotInformed: false,
    type: PaymentType.PIX_CONTA,
});

const getInitialFormData = (attendee?: Attendee | null): AttendeeFormData => {
    if (attendee) {
        return {
            personId: attendee.person.id,
            name: attendee.person.name,
            document: attendee.person.document,
            phone: attendee.person.phone,
            packageType: attendee.packageType,
            notes: attendee.notes || '',
            paymentAmount: attendee.payment.amount.toString(),
            registerPaymentNow: false,
            paymentDate: new Date().toISOString().split('T')[0],
            paymentDateNotInformed: true,
            paymentType: PaymentType.PIX_CONTA,
            sitePayment: getInitialPartialPayment(),
            busPayment: getInitialPartialPayment(),
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
            const amount = formData.packageType === PackageType.SITIO_BUS ? (sitePrice + busPrice).toFixed(2) : sitePrice.toFixed(2);
            setFormData(fd => ({ ...fd, paymentAmount: amount }));
        }
    }, [formData.packageType, isEditMode, event]);

    const handleSelectPerson = (person: Person) => {
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
             if (duplicate) {
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

        if (name === 'name') {
            finalValue = value.toUpperCase();
        } else if (name === 'phone') {
            finalValue = formatPhoneNumber(value);
        } else if (name === 'document') {
            finalValue = formatDocument(value);
        }

        setFormData(prev => ({ ...prev, [name]: finalValue }));
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
            if (isEditMode && onUpdateAttendee && attendeeToEdit) {
                const { type } = getDocumentType(formData.document);
                const updatedAttendee: Attendee = {
                    ...attendeeToEdit,
                    person: {
                        ...attendeeToEdit.person,
                        name: formData.name.trim(),
                        document: formData.document,
                        documentType: type,
                        phone: formData.phone,
                    },
                    packageType: formData.packageType,
                    notes: formData.notes.trim(),
                    payment: {
                        ...attendeeToEdit.payment,
                        amount: formData.packageType === PackageType.SITIO_BUS ? ((event?.site_price ?? 70) + (event?.bus_price ?? 50)) : (event?.site_price ?? 70),
                    },
                };
                await onUpdateAttendee(updatedAttendee);
                addToast('Inscrição atualizada com sucesso!', 'success');
                onCancel();
            } else if (!isEditMode && onAddAttendee) {
                await onAddAttendee({
                    ...formData,
                    name: formData.name.trim(),
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

    return (
        <div className="animate-fadeIn">
             <header className="sticky top-0 md:static bg-white md:bg-transparent z-10 p-4 md:pt-6 border-b border-zinc-200 flex items-center gap-4">
                <button onClick={onCancel} className="text-zinc-500 hover:text-zinc-800 p-1 rounded-full hover:bg-zinc-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h1 className="text-xl md:text-2xl font-bold text-zinc-800">{isEditMode ? 'Editar Inscrição' : 'Nova Inscrição'}</h1>
            </header>
            <form onSubmit={handleSubmit} className="p-4 space-y-6">
                <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm space-y-4">
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

                    <div className={isPersonSelected ? 'hidden' : 'space-y-4'}>
                         <p className="text-sm text-zinc-500 text-center border-b pb-4">
                            {isEditMode ? 'Edite os dados abaixo:' : 'Ou cadastre uma nova pessoa:'}
                         </p>
                        <FormField label="Nome Completo" id="name" error={errors.name}>
                            <input type="text" id="name" name="name" value={formData.name} onChange={handleInputChange} className="block w-full px-3 py-2 bg-white border border-zinc-300 rounded-md shadow-sm sm:text-sm focus:outline-none focus:ring-green-500 focus:border-green-500" required autoComplete="off" disabled={isPersonSelected} />
                        </FormField>
                         <FormField label={`Documento (CPF ou RG)${formData.packageType === PackageType.SITIO_BUS ? '' : ' - Opcional'}`} id="document" error={errors.document}>
                            <input type="tel" id="document" name="document" value={formData.document} onChange={handleInputChange} className="block w-full px-3 py-2 bg-white border border-zinc-300 rounded-md shadow-sm sm:text-sm focus:outline-none focus:ring-green-500 focus:border-green-500" required={formData.packageType === PackageType.SITIO_BUS} autoComplete="off" disabled={isPersonSelected} />
                        </FormField>
                         <FormField label="Telefone (com DDD)" id="phone" error={errors.phone}>
                            <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="(21) 99999-9999" className="block w-full px-3 py-2 bg-white border border-zinc-300 rounded-md shadow-sm sm:text-sm focus:outline-none focus:ring-green-500 focus:border-green-500" required autoComplete="off" disabled={isPersonSelected} />
                        </FormField>
                    </div>

                    {isEditMode && (
                         <div className="space-y-4">
                            <FormField label="Nome Completo" id="name" error={errors.name}>
                                <input type="text" id="name" name="name" value={formData.name} onChange={handleInputChange} className="block w-full px-3 py-2 bg-white border border-zinc-300 rounded-md shadow-sm sm:text-sm" required autoComplete="off" />
                            </FormField>
                            <FormField label={`Documento (CPF ou RG)${formData.packageType === PackageType.SITIO_BUS ? '' : ' - Opcional'}`} id="document" error={errors.document}>
                                <input type="tel" id="document" name="document" value={formData.document} onChange={handleInputChange} className="block w-full px-3 py-2 bg-white border border-zinc-300 rounded-md shadow-sm sm:text-sm" required={formData.packageType === PackageType.SITIO_BUS} autoComplete="off" />
                            </FormField>
                            <FormField label="Telefone (com DDD)" id="phone" error={errors.phone}>
                                <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="(21) 99999-9999" className="block w-full px-3 py-2 bg-white border border-zinc-300 rounded-md shadow-sm sm:text-sm" required autoComplete="off" />
                            </FormField>
                        </div>
                    )}
                </div>
                
                <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm space-y-4">
                    <h2 className="text-lg font-bold text-zinc-800">Pacote e Observações</h2>
                     <FormField label="Pacote" id="packageType" error={errors.packageType}>
                        <select id="packageType" name="packageType" value={formData.packageType} onChange={handleInputChange} className="block w-full px-3 py-2 bg-white border border-zinc-300 rounded-md shadow-sm sm:text-sm focus:outline-none focus:ring-green-500 focus:border-green-500">
                            <option value={PackageType.SITIO_ONLY}>Apenas Sítio - R$ {sitePriceText}</option>
                            <option value={PackageType.SITIO_BUS}>Sítio + Ônibus - R$ {totalBusPriceText}</option>
                        </select>
                    </FormField>
                    <FormField label="Observações" id="notes" error={errors.notes}>
                        <textarea id="notes" name="notes" value={formData.notes} onChange={handleInputChange} rows={3} className="block w-full px-3 py-2 bg-white border border-zinc-300 rounded-md shadow-sm sm:text-sm focus:outline-none focus:ring-green-500 focus:border-green-500" placeholder="Alergias, restrições alimentares, etc."></textarea>
                    </FormField>
                </div>

                {!isEditMode && (
                    <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm space-y-4">
                        <label className="flex items-center space-x-2 cursor-pointer w-fit">
                            <input type="checkbox" name="registerPaymentNow" checked={formData.registerPaymentNow} onChange={handleInputChange} className="h-4 w-4 rounded border-zinc-300 text-green-600 focus:ring-green-500"/>
                            <span className="text-lg text-zinc-800 font-bold">Registrar Pagamento Agora?</span>
                        </label>

                        {formData.registerPaymentNow && (
                            <div className="pt-4 border-t border-zinc-200 animate-fadeIn">
                                {isBusPackage ? (
                                    <div className="space-y-4">
                                        <div>
                                            <h3 className="font-bold text-zinc-700 mb-2">Pagamento Sítio (R$ {sitePriceText})</h3>
                                            <PartialPaymentFields idPrefix="site" details={formData.sitePayment} onUpdate={(updates) => setFormData(fd => ({ ...fd, sitePayment: { ...fd.sitePayment, ...updates } }))} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-zinc-700 mb-2">Pagamento Ônibus (R$ {(event?.bus_price ?? 50).toFixed(2).replace('.',',')})</h3>
                                            <PartialPaymentFields idPrefix="bus" details={formData.busPayment} onUpdate={(updates) => setFormData(fd => ({ ...fd, busPayment: { ...fd.busPayment, ...updates } }))} />
                                        </div>
                                    </div>
                                ) : (
                                    <PartialPaymentFields idPrefix="single" details={{ isPaid: true, date: formData.paymentDate, dateNotInformed: formData.paymentDateNotInformed, type: formData.paymentType }} onUpdate={({date, dateNotInformed, type}) => setFormData(fd => ({...fd, paymentDate: date !== undefined ? date : fd.paymentDate, paymentDateNotInformed: dateNotInformed !== undefined ? dateNotInformed : fd.paymentDateNotInformed, type: type !== undefined ? type : fd.paymentType }))} />
                                )}
                            </div>
                        )}
                    </div>
                )}
                
                <div className="flex flex-col md:flex-row gap-4 pt-2">
                    <button type="button" onClick={onCancel} className="w-full bg-zinc-200 text-zinc-800 font-bold py-3 px-4 rounded-full hover:bg-zinc-300 transition-colors">Cancelar</button>
                    <button type="submit" disabled={isSubmitting || (!isPersonSelected && !formData.name)} className="w-full bg-green-500 text-white font-bold py-3 px-4 rounded-full flex items-center justify-center gap-2 hover:bg-green-600 shadow-sm disabled:bg-green-400 disabled:cursor-not-allowed">
                        {isSubmitting ? <><SpinnerIcon /> Salvando...</> : (isEditMode ? 'Salvar Alterações' : 'Salvar Inscrição')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddAttendeeForm;
