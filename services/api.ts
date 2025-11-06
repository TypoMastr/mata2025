import { createClient } from '@supabase/supabase-js';
import type { Attendee } from '../types';
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
 * Converte um registro do Supabase (com colunas snake_case e pagamento "achatado")
 * para um objeto Attendee da aplicação (com propriedades camelCase e um objeto de pagamento aninhado).
 */
const fromSupabase = (record: any): Attendee => {
    if (!record) return record;
    
    return {
        id: record.id,
        name: record.name,
        document: record.document,
        documentType: record.document_type,
        phone: record.phone,
        packageType: record.package_type,
        registrationDate: record.registration_date,
        payment: {
            amount: record.payment_amount || (record.package_type === PackageType.SITIO_BUS ? 120.00 : 70.00),
            status: record.payment_status || PaymentStatus.PENDENTE,
            date: record.payment_date || undefined,
            type: record.payment_type || undefined,
            receiptUrl: record.payment_receipt_url || null,
        },
    };
};


/**
 * Converte um objeto Attendee da aplicação para um registro do Supabase,
 * "achatando" o objeto de pagamento e convertendo os nomes das propriedades para snake_case.
 */
const toSupabase = (attendee: Partial<Attendee>): any => {
    const record: { [key: string]: any } = {};

    if (attendee.name !== undefined) record.name = attendee.name;
    if (attendee.document !== undefined) record.document = attendee.document;
    if (attendee.phone !== undefined) record.phone = attendee.phone;
    if (attendee.documentType !== undefined) record.document_type = attendee.documentType;
    if (attendee.packageType !== undefined) record.package_type = attendee.packageType;
    if (attendee.registrationDate !== undefined) record.registration_date = attendee.registrationDate;

    // "Achata" o objeto de pagamento em colunas individuais
    if (attendee.payment) {
        record.payment_amount = attendee.payment.amount;
        record.payment_status = attendee.payment.status;
        record.payment_date = attendee.payment.date === undefined ? null : attendee.payment.date;
        record.payment_type = attendee.payment.type === undefined ? null : attendee.payment.type;
        record.payment_receipt_url = attendee.payment.receiptUrl === undefined ? null : attendee.payment.receiptUrl;
    }
    
    return record;
};


// --- API Functions ---

// GET /attendees
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

// POST /attendees
export const createAttendee = async (attendeeData: any): Promise<Attendee> => {
     const newAttendeePayload = {
        name: attendeeData.name,
        document: attendeeData.document,
        document_type: attendeeData.documentType,
        phone: attendeeData.phone,
        package_type: attendeeData.packageType,
        payment_amount: attendeeData.payment.amount,
        payment_status: attendeeData.payment.status,
    };

    const { data, error } = await supabase
        .from('attendees')
        .insert(newAttendeePayload)
        .select()
        .single();
    
    if (error) {
        console.error('Error creating attendee:', error);
        throw new Error(`Failed to create attendee: ${error.message}`);
    }
    return fromSupabase(data);
};

// PUT /attendees/:id
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

// DELETE /attendees/:id
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
