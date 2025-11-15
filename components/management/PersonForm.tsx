
import React, { useState, useEffect } from 'react';
import type { Person } from '../../types';
import { formatPhoneNumber, formatDocument } from '../../utils/formatters';

interface PersonFormData {
    name: string;
    document: string;
    phone: string;
}

interface PersonFormProps {
    person: Person | null;
    onSave: (data: PersonFormData) => Promise<void>;
    onClose: () => void;
}

const SpinnerIcon: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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

const PersonForm: React.FC<PersonFormProps> = ({ person, onSave, onClose }) => {
    const isEditMode = !!person;
    const [formData, setFormData] = useState<PersonFormData>({
        name: person?.name || '',
        document: person?.document || '',
        phone: person?.phone || '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setFormData({
            name: person?.name || '',
            document: person?.document || '',
            phone: person?.phone || '',
        });
    }, [person]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        let finalValue = value;

        if (name === 'name') finalValue = value.toUpperCase();
        else if (name === 'phone') finalValue = formatPhoneNumber(value);
        else if (name === 'document') finalValue = formatDocument(value);

        setFormData(prev => ({ ...prev, [name]: finalValue }));
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.name.trim()) newErrors.name = 'Nome é obrigatório.';
        if (!formData.phone.trim() || formData.phone.replace(/\D/g, '').length < 10) newErrors.phone = 'Telefone inválido.';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setIsSaving(true);
        try {
            await onSave({
                name: formData.name.trim(),
                document: formData.document,
                phone: formData.phone,
            });
            // The parent component handles closing the form on success
        } catch (error) {
            console.error('Failed to save person', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-lg flex flex-col animate-popIn">
                <header className="p-4 border-b border-zinc-200 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-zinc-800">{isEditMode ? 'Editar Pessoa' : 'Adicionar Nova Pessoa'}</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-zinc-500 hover:bg-zinc-100">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </header>
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <FormField label="Nome Completo" id="name" error={errors.name}>
                        <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="block w-full px-3 py-2 bg-white border border-zinc-300 rounded-md shadow-sm sm:text-sm" autoFocus />
                    </FormField>
                    <FormField label="Documento (CPF ou RG)" id="document" error={errors.document}>
                        <input type="tel" name="document" id="document" value={formData.document} onChange={handleChange} className="block w-full px-3 py-2 bg-white border border-zinc-300 rounded-md shadow-sm sm:text-sm" />
                    </FormField>
                    <FormField label="Telefone (com DDD)" id="phone" error={errors.phone}>
                        <input type="tel" name="phone" id="phone" value={formData.phone} onChange={handleChange} required placeholder="(21) 99999-9999" className="block w-full px-3 py-2 bg-white border border-zinc-300 rounded-md shadow-sm sm:text-sm" />
                    </FormField>
                </form>
                 <footer className="p-4 border-t border-zinc-200 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="bg-zinc-200 text-zinc-800 font-bold py-2 px-4 rounded-full hover:bg-zinc-300 transition-colors">Cancelar</button>
                    <button type="submit" onClick={handleSubmit} disabled={isSaving} className="bg-green-500 text-white font-bold py-2 px-4 rounded-full flex items-center justify-center gap-2 hover:bg-green-600 disabled:bg-green-400 min-w-[120px]">
                        {isSaving ? <><SpinnerIcon /> Salvando...</> : (isEditMode ? 'Salvar' : 'Adicionar')}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default PersonForm;
