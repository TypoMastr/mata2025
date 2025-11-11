import { createClient } from '@supabase/supabase-js';
import type { Attendee, Payment, PartialPaymentDetails } from '../types';
import { PackageType, PaymentStatus } from '../types';

// --- Supabase Client Setup ---
const supabaseUrl = 'https://bjuzljwcbtnzylyirkzu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqdXpsandjYnRuenlseWlya3p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzOTEyNDIsImV4cCI6MjA3Nzk2NzI0Mn0.VGB0hLfDHAo1jXSXFTf_xm5PecwEq0h2rQmuD-fo0Zk';

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL and Anon Key must be provided.");
}
const supabase = createClient(supabaseUrl, supabaseAnonKey);


// --- Data Mapping Helpers ---

/**
 * Converts a Supabase record to an application Attendee object.
 * It handles both the new JSONB `payment_details` structure and falls back to legacy
 * flat columns for backward compatibility.
 */
const fromSupabase = (record: any): Attendee => {
    if (!record) return record;

    const isMultiPayment = record.package_type === PackageType.SITIO_BUS;
    const paymentDetails = record.payment_details || {}; // Read from the new JSONB column

    const payment: Payment = {
        amount: record.payment_amount || (record.package_type === PackageType.SITIO_BUS ? 120.00 : 70.00),
        status: record.payment_status || PaymentStatus.PENDENTE,
        // Populate from new JSON structure, with fallback to legacy columns
        date: paymentDetails.date || record.payment_date || undefined,
        type: paymentDetails.type || record.payment_type || undefined,
        receiptUrl: paymentDetails.receiptUrl || record.payment_receipt_url || null,
        sitePaymentDetails: isMultiPayment ? (paymentDetails.site || null) : null,
        busPaymentDetails: isMultiPayment ? (paymentDetails.bus || null) : null,
    };
    
    // Data migration on-the-fly for old 'Pago' records without the new structure
    if (isMultiPayment && record.payment_status === PaymentStatus.PAGO && !payment.sitePaymentDetails && !payment.busPaymentDetails) {
        const migratedDetails: PartialPaymentDetails = {
            isPaid: true,
            date: record.payment_date || undefined,
            type: record.payment_type || undefined,
            receiptUrl: record.payment_receipt_url || null,
        };
        payment.sitePaymentDetails = migratedDetails;
        payment.busPaymentDetails = migratedDetails;
    }
    
    // Ensure details objects exist for multi-payment records to prevent UI errors
    if (isMultiPayment && !payment.sitePaymentDetails) {
        payment.sitePaymentDetails = { isPaid: false, receiptUrl: null };
    }
    if (isMultiPayment && !payment.busPaymentDetails) {
        payment.busPaymentDetails = { isPaid: false, receiptUrl: null };
    }

    return {
        id: record.id,
        name: record.name,
        document: record.document,
        documentType: record.document_type,
        phone: record.phone,
        packageType: record.package_type,
        registrationDate: record.registration_date,
        payment: payment,
        notes: record.notes || undefined,
    };
};


/**
 * Converts an application Attendee object to a Supabase record.
 * It serializes all payment details into a single `payment_details` JSONB column
 * and nullifies legacy columns to facilitate migration.
 */
const toSupabase = (attendee: Partial<Attendee>): any => {
    const record: { [key: string]: any } = {};

    if (attendee.name !== undefined) record.name = attendee.name;
    if (attendee.document !== undefined) record.document = attendee.document;
    if (attendee.phone !== undefined) record.phone = attendee.phone;
    if (attendee.documentType !== undefined) record.document_type = attendee.documentType;
    if (attendee.packageType !== undefined) record.package_type = attendee.packageType;
    if (attendee.registrationDate !== undefined) record.registration_date = attendee.registrationDate;
    if (attendee.notes !== undefined) record.notes = attendee.notes;


    if (attendee.payment) {
        record.payment_amount = attendee.payment.amount;
        record.payment_status = attendee.payment.status;

        const paymentDetails: { [key: string]: any } = {};

        if (attendee.packageType === PackageType.SITIO_BUS) {
            const sitePaid = !!attendee.payment.sitePaymentDetails?.isPaid;
            const busPaid = !!attendee.payment.busPaymentDetails?.isPaid;
            
            if (attendee.payment.status !== PaymentStatus.ISENTO) {
                 record.payment_status = (sitePaid && busPaid) ? PaymentStatus.PAGO : PaymentStatus.PENDENTE;
            }

            paymentDetails.site = attendee.payment.sitePaymentDetails || { isPaid: false, receiptUrl: null };
            paymentDetails.bus = attendee.payment.busPaymentDetails || { isPaid: false, receiptUrl: null };

        } else { // Single payment package
             paymentDetails.date = attendee.payment.date || null;
             paymentDetails.type = attendee.payment.type || null;
             paymentDetails.receiptUrl = attendee.payment.receiptUrl || null;
        }

        record.payment_details = paymentDetails;

        // Nullify legacy columns to clean up data upon update
        record.payment_date = null;
        record.payment_type = null;
        record.payment_receipt_url = null;
    }
    
    return record;
};


// --- API Functions ---

export const fetchAttendees = async (): Promise<Attendee[]> => {
    const { data, error } = await supabase
        .from('attendees')
        .select('*')
        .order('registration_date', { ascending: false });

    if (error) {
        console.error('Error fetching attendees:', error);
        throw new Error(`Failed to fetch attendees: ${error.message}`);
    }
    return data.map(fromSupabase);
};

export const createAttendee = async (attendeeData: Omit<Attendee, 'id' | 'registrationDate'>): Promise<Attendee> => {
    const recordToInsert = toSupabase(attendeeData);
    recordToInsert.registration_date = new Date().toISOString();

    const { data, error } = await supabase
        .from('attendees')
        .insert(recordToInsert)
        .select()
        .single();
    
    if (error) {
        console.error('Error creating attendee:', error);
        throw new Error(`Failed to create attendee: ${error.message}`);
    }
    return fromSupabase(data);
};

export const updateAttendee = async (attendeeToUpdate: Attendee): Promise<Attendee> => {
    const { id, ...updateData } = attendeeToUpdate;

    const { data, error } = await supabase
        .from('attendees')
        .update(toSupabase(updateData))
        .eq('id', id)
        .select()
        .single();
    
    if (error) {
        console.error('Error updating attendee:', error);
        throw new Error(`Failed to update attendee: ${error.message}`);
    }
    return fromSupabase(data);
};

export const deleteAttendee = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('attendees')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting attendee:', error);
        throw new Error(`Failed to delete attendee: ${error.message}`);
    }
};