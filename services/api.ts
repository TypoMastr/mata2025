import type { Attendee } from '../types';
import { PaymentStatus, DocumentType, PackageType, PaymentType } from '../types';

const STORAGE_KEY = 'gira_da_mata_2025_attendees';

// --- Mock Data ---
const initialAttendees: Attendee[] = [
    {
        id: 'c8a6b0c9-4d5e-4c1b-9f2a-8d0c2b3d4e5f',
        name: 'Maria da Guia',
        document: '987.654.321-99',
        documentType: DocumentType.CPF,
        phone: '(21) 91234-5678',
        packageType: PackageType.SITIO_ONLY,
        registrationDate: new Date('2024-07-22T14:00:00Z').toISOString(),
        payment: {
            amount: 70.00,
            status: PaymentStatus.PENDENTE,
            receiptUrl: null,
        },
    },
    {
        id: 'd9b7a1b0-5e6a-4b0c-8f3a-9e1b3c4d5e6f',
        name: 'Carlos de Oxóssi',
        document: '123.456.789-00',
        documentType: DocumentType.CPF,
        phone: '(21) 98765-4321',
        packageType: PackageType.SITIO_BUS,
        registrationDate: new Date('2024-07-20T10:00:00Z').toISOString(),
        payment: {
            amount: 120.00,
            status: PaymentStatus.PAGO,
            date: new Date('2024-07-21T15:30:00Z').toISOString(),
            type: PaymentType.PIX_CONTA,
            receiptUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
        },
    },
     {
        id: 'b795a9d8-3c4d-4b0a-8e1b-7c9b1a2c3d4e',
        name: 'João do Coco',
        document: '111.222.333-44',
        documentType: DocumentType.CPF,
        phone: '(21) 99999-8888',
        packageType: PackageType.SITIO_BUS,
        registrationDate: new Date('2024-07-18T09:00:00Z').toISOString(),
        payment: {
            amount: 120.00,
            status: PaymentStatus.PENDENTE,
            receiptUrl: null,
        },
    },
];


const getAttendeesFromStorage = (): Attendee[] => {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
            return JSON.parse(data);
        } else {
            // Seed with initial data if nothing is in storage
            localStorage.setItem(STORAGE_KEY, JSON.stringify(initialAttendees));
            return initialAttendees;
        }
    } catch (error) {
        console.error("Failed to read from localStorage", error);
        return initialAttendees; // fallback to initial data
    }
};

const saveAttendeesToStorage = (attendees: Attendee[]) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(attendees));
    } catch (error) {
        console.error("Failed to write to localStorage", error);
    }
};

const simulateDelay = (ms: number) => new Promise(res => setTimeout(res, ms));

// GET /attendees
export const fetchAttendees = async (): Promise<Attendee[]> => {
    await simulateDelay(500); // Simulate network latency
    const attendees = getAttendeesFromStorage();
    // Sort by registration date descending to mimic a real API that often returns newest first
    return attendees.sort((a, b) => new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime());
};

// POST /attendees
export const createAttendee = async (attendeeData: any): Promise<Attendee> => {
    await simulateDelay(500);
    const attendees = getAttendeesFromStorage();
    const newAttendee: Attendee = {
        ...attendeeData,
        id: crypto.randomUUID(),
        registrationDate: new Date().toISOString(),
        payment: {
            ...attendeeData.payment,
            receiptUrl: null, // Ensure receiptUrl is null on creation
        }
    };
    const updatedAttendees = [newAttendee, ...attendees];
    saveAttendeesToStorage(updatedAttendees);
    return newAttendee;
};

// PUT /attendees
export const updateAttendee = async (attendeeToUpdate: Attendee): Promise<Attendee> => {
    await simulateDelay(500);
    let attendees = getAttendeesFromStorage();
    const index = attendees.findIndex(a => a.id === attendeeToUpdate.id);
    if (index !== -1) {
        attendees[index] = attendeeToUpdate;
        saveAttendeesToStorage(attendees);
        return attendeeToUpdate;
    }
    throw new Error("Attendee not found");
};

// DELETE /attendees?id=:id
export const deleteAttendee = async (id: string): Promise<void> => {
    await simulateDelay(500);
    let attendees = getAttendeesFromStorage();
    const updatedAttendees = attendees.filter(a => a.id !== id);
    if (attendees.length === updatedAttendees.length) {
         throw new Error("Attendee not found for deletion");
    }
    saveAttendeesToStorage(updatedAttendees);
};
