import { useState, useEffect, useCallback } from 'react';
import type { Attendee, AttendeeFormData } from '../types';
import { PaymentStatus, DocumentType } from '../types';
import { getDocumentType } from '../utils/formatters';
import * as api from '../services/api';

export const useAttendees = () => {
    const [attendees, setAttendees] = useState<Attendee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadAttendees = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await api.fetchAttendees();
            setAttendees(data);
        } catch (e) {
            console.error("Failed to fetch attendees:", e);
            setError(e instanceof Error ? e.message : 'Erro desconhecido');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAttendees();
    }, [loadAttendees]);

    const addAttendee = async (formData: Omit<AttendeeFormData, 'paymentAmount'> & { paymentAmount: number }) => {
        const { type: documentType } = getDocumentType(formData.document);
        
        // Construct the full Attendee object, but Omit 'id' as Supabase will generate it.
        const newAttendeeData: Omit<Attendee, 'id'> = {
            name: formData.name,
            document: formData.document,
            documentType: documentType,
            phone: formData.phone,
            packageType: formData.packageType,
            registrationDate: new Date().toISOString(),
            payment: {
                amount: formData.paymentAmount,
                status: PaymentStatus.PENDENTE,
                receiptUrl: null,
            },
        };

        try {
            const createdAttendee = await api.createAttendee(newAttendeeData);
            setAttendees(prev => [createdAttendee, ...prev]);
        } catch (e) {
            console.error("Failed to add attendee:", e);
        }
    };

    const updateAttendee = async (updatedAttendee: Attendee) => {
        try {
            const returnedAttendee = await api.updateAttendee(updatedAttendee);
            setAttendees(prev => prev.map(a => (a.id === returnedAttendee.id ? returnedAttendee : a)));
        } catch (e) {
            console.error("Failed to update attendee:", e);
        }
    };

    const deleteAttendee = async (id: string) => {
        try {
            await api.deleteAttendee(id);
            setAttendees(prev => prev.filter(a => a.id !== id));
        } catch (e) {
            console.error("Failed to delete attendee:", e);
        }
    };

    return {
        attendees,
        isLoading,
        error,
        addAttendee,
        updateAttendee,
        deleteAttendee,
    };
};