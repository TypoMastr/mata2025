import { useState, useEffect, useCallback } from 'react';
import type { Attendee, AttendeeFormData, Payment } from '../types';
import * as api from '../services/api';
import { getDocumentType } from '../utils/formatters';
import { PaymentStatus, PackageType } from '../types';

export const useAttendees = () => {
    const [attendees, setAttendees] = useState<Attendee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAttendees = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await api.fetchAttendees();
            setAttendees(data);
        } catch (err) {
            console.error("Failed to fetch attendees:", err);
            setError("Não foi possível carregar os dados. Verifique sua conexão ou a API.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAttendees();
    }, [fetchAttendees]);

    const addAttendee = async (formData: AttendeeFormData & { paymentAmount: number }) => {
        const { type: documentType } = getDocumentType(formData.document);

        const isBusPackage = formData.packageType === PackageType.SITIO_BUS;

        const paymentDetails: Payment = {
                amount: formData.paymentAmount,
                status: formData.registerPaymentNow ? PaymentStatus.PAGO : PaymentStatus.PENDENTE,
                receiptUrl: null, // Ensure the object conforms to the Payment type
        };

        if (formData.registerPaymentNow) {
            paymentDetails.date = formData.paymentDateNotInformed ? undefined : new Date(formData.paymentDate + 'T00:00:00Z').toISOString();
            paymentDetails.type = formData.paymentType;
        }

        if (isBusPackage) {
             const paid = formData.registerPaymentNow;
             const paymentPart = {
                isPaid: paid,
                date: paid ? paymentDetails.date : undefined,
                type: paid ? paymentDetails.type : undefined,
                receiptUrl: null
             };
             paymentDetails.sitePaymentDetails = { ...paymentPart };
             paymentDetails.busPaymentDetails = { ...paymentPart };
        }

        const newAttendeeData: Omit<Attendee, 'id' | 'registrationDate'> = {
            name: formData.name,
            document: formData.document,
            documentType: documentType,
            phone: formData.phone,
            packageType: formData.packageType,
            payment: paymentDetails,
        };
        
        try {
            const createdAttendee = await api.createAttendee(newAttendeeData);
            setAttendees(prev => [createdAttendee, ...prev]);
        } catch (err) {
            console.error("Failed to add attendee:", err);
            setError("Falha ao adicionar inscrição.");
        }
    };

    const updateAttendee = async (updatedAttendee: Attendee) => {
        try {
            const savedAttendee = await api.updateAttendee(updatedAttendee);
            setAttendees(prev => prev.map(a => a.id === savedAttendee.id ? savedAttendee : a));
        } catch (err) {
            console.error("Failed to update attendee:", err);
            setError("Falha ao atualizar inscrição.");
        }
    };

    const deleteAttendee = async (id: string) => {
        try {
            await api.deleteAttendee(id);
            setAttendees(prev => prev.filter(a => a.id !== id));
        } catch (err) {
            console.error("Failed to delete attendee:", err);
            setError("Falha ao excluir inscrição.");
        }
    };

    return {
        attendees,
        isLoading,
        error, // You can use this to display an error message in the UI if needed
        addAttendee,
        updateAttendee,
        deleteAttendee,
    };
};