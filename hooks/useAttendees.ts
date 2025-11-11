import { useState, useEffect, useCallback } from 'react';
import type { Attendee, AttendeeFormData, Payment } from '../types';
import * as api from '../services/api';
import { getDocumentType } from '../utils/formatters';
import { PaymentStatus, PackageType } from '../types';

export const useAttendees = () => {
    const [attendees, setAttendees] = useState<Attendee[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchAttendees = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await api.fetchAttendees();
            setAttendees(data);
        } catch (err) {
            console.error("Failed to fetch attendees:", err);
            // In a real app, you might want a global error state here
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAttendees();
    }, [fetchAttendees]);

    // FIX: Changed the type of `formData` to correctly override `paymentAmount` from string to number.
    // The previous type `AttendeeFormData & { paymentAmount: number }` resulted in `paymentAmount: never`.
    const addAttendee = async (formData: Omit<AttendeeFormData, 'paymentAmount'> & { paymentAmount: number }) => {
        const { type: documentType } = getDocumentType(formData.document);
        const isBusPackage = formData.packageType === PackageType.SITIO_BUS;

        const paymentDetails: Payment = {
            amount: formData.paymentAmount,
            status: PaymentStatus.PENDENTE, // Default, will be updated based on registration details
            receiptUrl: null,
        };

        if (formData.registerPaymentNow) {
            if (isBusPackage) {
                const sitePaid = formData.sitePayment.isPaid;
                const busPaid = formData.busPayment.isPaid;
                
                // Overall status is PAGO only if both parts are paid
                paymentDetails.status = (sitePaid && busPaid) ? PaymentStatus.PAGO : PaymentStatus.PENDENTE;

                paymentDetails.sitePaymentDetails = {
                    isPaid: sitePaid,
                    date: sitePaid && !formData.sitePayment.dateNotInformed ? new Date(formData.sitePayment.date + 'T00:00:00Z').toISOString() : undefined,
                    type: sitePaid ? formData.sitePayment.type : undefined,
                    receiptUrl: null,
                };

                paymentDetails.busPaymentDetails = {
                    isPaid: busPaid,
                    date: busPaid && !formData.busPayment.dateNotInformed ? new Date(formData.busPayment.date + 'T00:00:00Z').toISOString() : undefined,
                    type: busPaid ? formData.busPayment.type : undefined,
                    receiptUrl: null,
                };
            } else { // Single payment package
                paymentDetails.status = PaymentStatus.PAGO;
                paymentDetails.date = formData.paymentDateNotInformed ? undefined : new Date(formData.paymentDate + 'T00:00:00Z').toISOString();
                paymentDetails.type = formData.paymentType;
            }
        } else {
             paymentDetails.status = PaymentStatus.PENDENTE;
             if (isBusPackage) {
                paymentDetails.sitePaymentDetails = { isPaid: false, receiptUrl: null };
                paymentDetails.busPaymentDetails = { isPaid: false, receiptUrl: null };
             }
        }


        const newAttendeeData: Omit<Attendee, 'id' | 'registrationDate'> = {
            name: formData.name,
            document: formData.document,
            documentType: documentType,
            phone: formData.phone,
            packageType: formData.packageType,
            payment: paymentDetails,
            notes: formData.notes,
        };
        
        try {
            const createdAttendee = await api.createAttendee(newAttendeeData);
            setAttendees(prev => [createdAttendee, ...prev]);
        } catch (err) {
            console.error("Failed to add attendee:", err);
            throw err;
        }
    };

    const updateAttendee = async (updatedAttendee: Attendee) => {
        try {
            const savedAttendee = await api.updateAttendee(updatedAttendee);
            setAttendees(prev => prev.map(a => a.id === savedAttendee.id ? savedAttendee : a));
        } catch (err) {
            console.error("Failed to update attendee:", err);
            throw err;
        }
    };

    const deleteAttendee = async (id: string) => {
        try {
            await api.deleteAttendee(id);
            setAttendees(prev => prev.filter(a => a.id !== id));
        } catch (err) {
            console.error("Failed to delete attendee:", err);
            throw err;
        }
    };

    return {
        attendees,
        isLoading,
        addAttendee,
        updateAttendee,
        deleteAttendee,
    };
};