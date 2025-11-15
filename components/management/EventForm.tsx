import React, { useState } from 'react';
import type { Event } from '../../types';

interface EventFormProps {
    event: Event | null;
    onSave: (eventData: any) => Promise<any>;
    onClose: () => void;
}

const SpinnerIcon: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const FormField: React.FC<{ label: string; id: string; children: React.ReactNode }> = ({ label, id, children }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-zinc-700">{label}</label>
        <div className="mt-1">{children}</div>
    </div>
);

const EventForm: React.FC<EventFormProps> = ({ event, onSave, onClose }) => {
    const isEditMode = !!event;
    const [formData, setFormData] = useState({
        name: event?.name || '',
        event_date: event?.event_date ? new Date(event.event_date).toISOString().split('T')[0] : '',
        location: event?.location || '',
        activity_time: event?.activity_time || '',
        site_price: event?.site_price || 70,
        bus_price: event?.bus_price || 50,
        pix_key: event?.pix_key || '',
        bus_departure_time: event?.bus_departure_time || '',
        bus_return_time: event?.bus_return_time || '',
        payment_deadline: event?.payment_deadline ? new Date(event.payment_deadline).toISOString().split('T')[0] : '',
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) : value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const dataToSave = {
                ...formData,
                event_date: formData.event_date ? new Date(formData.event_date).toISOString() : null,
                payment_deadline: formData.payment_deadline ? new Date(formData.payment_deadline).toISOString() : null,
            };

            if (isEditMode) {
                await onSave({ ...event, ...dataToSave });
            } else {
                await onSave(dataToSave);
            }
            onClose();
        } catch (error) {
            console.error('Failed to save event', error);
            // In a real app, show a toast notification
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-lg max-h-[90vh] flex flex-col animate-popIn">
                <header className="p-4 border-b border-zinc-200 flex justify-between items-center flex-shrink-0">
                    <h2 className="text-lg font-bold text-zinc-800">{isEditMode ? 'Editar Evento' : 'Criar Novo Evento'}</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-zinc-500 hover:bg-zinc-100">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </header>
                <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto">
                    <FormField label="Nome do Evento" id="name">
                        <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="block w-full px-3 py-2 bg-white border border-zinc-300 rounded-md shadow-sm sm:text-sm" />
                    </FormField>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField label="Data do Evento" id="event_date">
                            <input type="date" name="event_date" id="event_date" value={formData.event_date} onChange={handleChange} required className="block w-full px-3 py-2 bg-white border border-zinc-300 rounded-md shadow-sm sm:text-sm" />
                        </FormField>
                        <FormField label="Local" id="location">
                            <input type="text" name="location" id="location" value={formData.location} onChange={handleChange} className="block w-full px-3 py-2 bg-white border border-zinc-300 rounded-md shadow-sm sm:text-sm" />
                        </FormField>
                    </div>
                     <FormField label="Horário das Atividades" id="activity_time">
                        <input type="text" name="activity_time" id="activity_time" value={formData.activity_time} onChange={handleChange} placeholder="Ex: 9:30 às 18:00" className="block w-full px-3 py-2 bg-white border border-zinc-300 rounded-md shadow-sm sm:text-sm" />
                    </FormField>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField label="Valor Apenas Sítio (R$)" id="site_price">
                            <input type="number" step="0.01" name="site_price" id="site_price" value={formData.site_price} onChange={handleChange} required className="block w-full px-3 py-2 bg-white border border-zinc-300 rounded-md shadow-sm sm:text-sm" />
                        </FormField>
                        <FormField label="Valor Ônibus (R$)" id="bus_price">
                            <input type="number" step="0.01" name="bus_price" id="bus_price" value={formData.bus_price} onChange={handleChange} required className="block w-full px-3 py-2 bg-white border border-zinc-300 rounded-md shadow-sm sm:text-sm" />
                        </FormField>
                    </div>
                     <FormField label="Chave PIX" id="pix_key">
                        <input type="text" name="pix_key" id="pix_key" value={formData.pix_key} onChange={handleChange} className="block w-full px-3 py-2 bg-white border border-zinc-300 rounded-md shadow-sm sm:text-sm" />
                    </FormField>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField label="Horário Saída Ônibus" id="bus_departure_time">
                            <input type="text" name="bus_departure_time" id="bus_departure_time" value={formData.bus_departure_time} onChange={handleChange} placeholder="Ex: 7:30" className="block w-full px-3 py-2 bg-white border border-zinc-300 rounded-md shadow-sm sm:text-sm" />
                        </FormField>
                        <FormField label="Horário Retorno Ônibus" id="bus_return_time">
                            <input type="text" name="bus_return_time" id="bus_return_time" value={formData.bus_return_time} onChange={handleChange} placeholder="Ex: 19:00" className="block w-full px-3 py-2 bg-white border border-zinc-300 rounded-md shadow-sm sm:text-sm" />
                        </FormField>
                    </div>
                     <FormField label="Data Limite Pagamento Ônibus" id="payment_deadline">
                        <input type="date" name="payment_deadline" id="payment_deadline" value={formData.payment_deadline} onChange={handleChange} className="block w-full px-3 py-2 bg-white border border-zinc-300 rounded-md shadow-sm sm:text-sm" />
                    </FormField>
                </form>
                <footer className="p-4 border-t border-zinc-200 flex justify-end gap-3 flex-shrink-0">
                    <button type="button" onClick={onClose} className="bg-zinc-200 text-zinc-800 font-bold py-2 px-4 rounded-full hover:bg-zinc-300 transition-colors">Cancelar</button>
                    <button type="submit" onClick={handleSubmit} disabled={isSaving} className="bg-green-500 text-white font-bold py-2 px-4 rounded-full flex items-center justify-center gap-2 hover:bg-green-600 disabled:bg-green-400">
                        {isSaving ? <><SpinnerIcon /> Salvando...</> : 'Salvar Evento'}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default EventForm;
