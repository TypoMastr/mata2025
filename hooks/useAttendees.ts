import { useState, useEffect } from 'react';
import type { Attendee, AttendeeFormData } from '../types';
import { PaymentStatus, PackageType, DocumentType, PaymentType } from '../types';
import { getDocumentType } from '../utils/formatters';

const MOCK_ATTENDEES: Attendee[] = [
    {
        id: '1',
        name: 'Ana Silva',
        document: '123.456.789-00',
        documentType: DocumentType.CPF,
        phone: '(11) 98765-4321',
        // FIX: Use enum for package type
        packageType: PackageType.SITIO_BUS,
        registrationDate: new Date('2024-07-20T10:00:00Z').toISOString(),
        payment: {
            amount: 120.00,
            status: PaymentStatus.PAGO,
            date: new Date('2024-07-21T11:00:00Z').toISOString(),
            type: PaymentType.PIX_CONTA,
            receiptUrl: null,
        },
    },
    {
        id: '2',
        name: 'Bruno Costa',
        document: '987.654.321-11',
        documentType: DocumentType.CPF,
        phone: '(21) 91234-5678',
        // FIX: Use enum for package type
        packageType: PackageType.SITIO_ONLY,
        registrationDate: new Date('2024-07-22T14:30:00Z').toISOString(),
        payment: {
            amount: 70.00,
            status: PaymentStatus.PENDENTE,
            receiptUrl: null,
        },
    },
];


const LOCAL_STORAGE_KEY = 'gira-da-mata-attendees';

export const useAttendees = () => {
    const [attendees, setAttendees] = useState<Attendee[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        try {
            const storedAttendees = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (storedAttendees) {
                setAttendees(JSON.parse(storedAttendees));
            } else {
                setAttendees(MOCK_ATTENDEES);
                 localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(MOCK_ATTENDEES));
            }
        } catch (error) {
            console.error("Failed to load attendees from local storage", error);
            setAttendees(MOCK_ATTENDEES); // Fallback to mock
        } finally {
            setIsLoading(false);
        }
    }, []);

    const saveAttendees = (newAttendees: Attendee[]) => {
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newAttendees));
            setAttendees(newAttendees);
        } catch (error) {
            console.error("Failed to save attendees to local storage", error);
        }
    };

    const addAttendee = (formData: Omit<AttendeeFormData, 'paymentAmount'> & { paymentAmount: number }) => {
        const { type: documentType } = getDocumentType(formData.document);
        const newAttendee: Attendee = {
            id: crypto.randomUUID(),
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
        saveAttendees([newAttendee, ...attendees]);
    };

    const updateAttendee = (updatedAttendee: Attendee) => {
        const newAttendees = attendees.map(a => a.id === updatedAttendee.id ? updatedAttendee : a);
        saveAttendees(newAttendees);
    };

    const deleteAttendee = (id: string) => {
        const newAttendees = attendees.filter(a => a.id !== id);
        saveAttendees(newAttendees);
    };

    return {
        attendees,
        isLoading,
        addAttendee,
        updateAttendee,
        deleteAttendee,
    };
};
