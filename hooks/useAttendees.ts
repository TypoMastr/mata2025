import { useState, useEffect, useCallback } from 'react';
import type { Registration, RegistrationFormData, Payment, Person } from '../types';
import * as api from '../services/api';
import { getDocumentType } from '../utils/formatters';
import { PaymentStatus, PackageType } from '../types';

export const useRegistrations = (eventId: string | null) => {
    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchRegistrations = useCallback(async (id: string) => {
        setIsLoading(true);
        try {
            const data = await api.fetchRegistrations(id);
            setRegistrations(data);
        } catch (err) {
            console.error("Failed to fetch registrations:", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (eventId) {
            fetchRegistrations(eventId);
        } else {
            setRegistrations([]);
            setIsLoading(false);
        }
    }, [eventId, fetchRegistrations]);
    
    const addRegistration = async (formData: RegistrationFormData, eventId: string) => {
        let personId = formData.personId;

        // Step 1: Find or Create the Person
        if (!personId) {
             const { type: documentType } = getDocumentType(formData.document);
             const newPersonData: Omit<Person, 'id'> = {
                 name: formData.name,
                 document: formData.document,
                 documentType: documentType,
                 phone: formData.phone,
             };
             const newPerson = await api.createPerson(newPersonData);
             personId = newPerson.id;
        }

        if (!personId) {
            throw new Error("Could not determine person to register.");
        }

        // Step 2: Prepare Payment Details
        const isBusPackage = formData.packageType === PackageType.SITIO_BUS;
        const paymentDetails: Payment = {
            amount: parseFloat(formData.paymentAmount),
            status: PaymentStatus.PENDENTE,
            receiptUrl: null,
        };

         if (formData.registerPaymentNow) {
            if (isBusPackage) {
                const sitePaid = formData.sitePayment.isPaid;
                const busPaid = formData.busPayment.isPaid;
                
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

        // Step 3: Create the Registration
        const newRegistrationData = {
            personId,
            eventId,
            packageType: formData.packageType,
            payment: paymentDetails,
            notes: formData.notes,
        };
        
        try {
            const createdRegistration = await api.createRegistration(newRegistrationData);
            setRegistrations(prev => [createdRegistration, ...prev]);
        } catch (err) {
            console.error("Failed to add registration:", err);
            throw err;
        }
    };

    const updateRegistration = async (updatedRegistration: Registration) => {
        try {
            // Only update the person details if they have changed.
            const original = registrations.find(r => r.id === updatedRegistration.id);
            if (original && JSON.stringify(original.person) !== JSON.stringify(updatedRegistration.person)) {
                 await api.updatePerson(updatedRegistration.person);
            }

            const savedRegistration = await api.updateRegistration(updatedRegistration);
            setRegistrations(prev => prev.map(a => a.id === savedRegistration.id ? savedRegistration : a));
        } catch (err) {
            console.error("Failed to update registration:", err);
            throw err;
        }
    };

    const deleteRegistration = async (id: string) => {
        try {
            await api.deleteRegistration(id);
            setRegistrations(prev => prev.filter(a => a.id !== id));
        } catch (err) {
            console.error("Failed to delete registration:", err);
            throw err;
        }
    };

    return {
        registrations,
        isLoading,
        addRegistration,
        updateRegistration,
        deleteRegistration,
    };
};
// Alias for backwards compatibility
export const useAttendees = useRegistrations;
