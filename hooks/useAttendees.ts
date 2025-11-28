
import { useState, useEffect, useCallback } from 'react';
import type { Registration, RegistrationFormData, Payment, Person } from '../types';
import * as api from '../services/api';
import { getDocumentType } from '../utils/formatters';
import { PaymentStatus, PackageType } from '../types';

export const useRegistrations = (eventId: string | null) => {
    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchRegistrations = useCallback(async (id: string, options?: { silent?: boolean }) => {
        // Only trigger loading state if NOT silent
        if (!options?.silent) {
            setIsLoading(true);
        }
        try {
            // API now handles soft deletes, so no change needed here.
            const data = await api.fetchRegistrations(id);
            setRegistrations(data);
        } catch (err) {
            console.error("Failed to fetch registrations:", err);
        } finally {
            if (!options?.silent) {
                setIsLoading(false);
            }
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
    
    // Wrapper to allow components to trigger a refresh manually using the current eventId
    // Accepts options for silent refresh (background update)
    const refresh = useCallback(async (options?: { silent?: boolean }) => {
        if (eventId) {
            await fetchRegistrations(eventId, options);
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

        if (isBusPackage) {
            // Capture Exemptions directly from form data (always valid)
            const siteExempt = formData.sitePayment.isExempt;
            const busExempt = formData.busPayment.isExempt;
            
            // Capture Paid status ONLY if registerPaymentNow is true
            const sitePaid = formData.registerPaymentNow ? formData.sitePayment.isPaid : false;
            const busPaid = formData.registerPaymentNow ? formData.busPayment.isPaid : false;
            
            const siteOk = sitePaid || siteExempt;
            const busOk = busPaid || busExempt;
            
            // Determine Global Status
            if (siteExempt && busExempt) {
                paymentDetails.status = PaymentStatus.ISENTO;
            } else if (siteOk && busOk) {
                paymentDetails.status = PaymentStatus.PAGO; 
            } else {
                paymentDetails.status = PaymentStatus.PENDENTE;
            }

            paymentDetails.sitePaymentDetails = {
                isPaid: sitePaid,
                isExempt: siteExempt,
                date: sitePaid && !formData.sitePayment.dateNotInformed ? new Date(formData.sitePayment.date + 'T00:00:00Z').toISOString() : undefined,
                type: sitePaid ? formData.sitePayment.type : undefined,
                receiptUrl: null,
            };

            paymentDetails.busPaymentDetails = {
                isPaid: busPaid,
                isExempt: busExempt,
                date: busPaid && !formData.busPayment.dateNotInformed ? new Date(formData.busPayment.date + 'T00:00:00Z').toISOString() : undefined,
                type: busPaid ? formData.busPayment.type : undefined,
                receiptUrl: null,
            };
        } else { // Single payment package
            const isExempt = formData.paymentIsExempt;
            const isPaid = formData.registerPaymentNow ? (formData.paymentIsPaid ?? true) : false;
            
            if (isExempt) {
                paymentDetails.status = PaymentStatus.ISENTO;
            } else if (isPaid) {
                paymentDetails.status = PaymentStatus.PAGO;
                paymentDetails.date = formData.paymentDateNotInformed ? undefined : new Date(formData.paymentDate + 'T00:00:00Z').toISOString();
                paymentDetails.type = formData.paymentType;
            } else {
                paymentDetails.status = PaymentStatus.PENDENTE;
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
        refresh
    };
};
// Alias for backwards compatibility
export const useAttendees = useRegistrations;
