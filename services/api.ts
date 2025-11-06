import { supabase } from './supabaseClient';
import type { Attendee } from '../types';

// Helper to map from database row to application's nested Attendee type
const mapRowToAttendee = (row: any): Attendee => ({
    id: row.id,
    name: row.name,
    document: row.document,
    documentType: row.document_type,
    phone: row.phone,
    packageType: row.package_type,
    registrationDate: row.registration_date,
    payment: {
        amount: row.payment_amount,
        status: row.payment_status,
        date: row.payment_date,
        type: row.payment_type,
        receiptUrl: row.payment_receipt_url,
    },
});

// Helper to map from application's Attendee type to a flat database row
const mapAttendeeToRow = (attendee: Attendee) => ({
    id: attendee.id,
    name: attendee.name,
    document: attendee.document,
    document_type: attendee.documentType,
    phone: attendee.phone,
    package_type: attendee.packageType,
    registration_date: attendee.registrationDate,
    payment_amount: attendee.payment.amount,
    payment_status: attendee.payment.status,
    payment_date: attendee.payment.date,
    payment_type: attendee.payment.type,
    payment_receipt_url: attendee.payment.receiptUrl,
});

export const fetchAttendees = async (): Promise<Attendee[]> => {
    const { data, error } = await supabase
        .from('attendees')
        .select('*');

    if (error) {
        console.error('Error fetching attendees:', error);
        throw new Error(error.message);
    }
    return data.map(mapRowToAttendee);
};

export const createAttendee = async (attendeeData: Omit<Attendee, 'id'>): Promise<Attendee> => {
    // Supabase generates the UUID, so we omit 'id'
    const rowData = {
        name: attendeeData.name,
        document: attendeeData.document,
        document_type: attendeeData.documentType,
        phone: attendeeData.phone,
        package_type: attendeeData.packageType,
        registration_date: attendeeData.registrationDate,
        payment_amount: attendeeData.payment.amount,
        payment_status: attendeeData.payment.status,
        payment_date: attendeeData.payment.date,
        payment_type: attendeeData.payment.type,
        payment_receipt_url: attendeeData.payment.receiptUrl,
    };
    
    const { data, error } = await supabase
        .from('attendees')
        .insert(rowData)
        .select()
        .single(); // .single() returns the created object

    if (error) {
        console.error('Error creating attendee:', error);
        throw new Error(error.message);
    }
    return mapRowToAttendee(data);
};


export const updateAttendee = async (attendee: Attendee): Promise<Attendee> => {
    const { data, error } = await supabase
        .from('attendees')
        .update(mapAttendeeToRow(attendee))
        .eq('id', attendee.id)
        .select()
        .single();
    
    if (error) {
        console.error('Error updating attendee:', error);
        throw new Error(error.message);
    }
     return mapRowToAttendee(data);
};

export const deleteAttendee = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('attendees')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting attendee:', error);
        throw new Error(error.message);
    }
};