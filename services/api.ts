import { createClient } from '@supabase/supabase-js';
import type { Registration, Payment, PartialPaymentDetails, Person, Event } from '../types';
import { PackageType, PaymentStatus } from '../types';

// --- Supabase Client Setup ---
const supabaseUrl = 'https://bjuzljwcbtnzylyirkzu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqdXpsandjYnRuenlseWlya3p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzOTEyNDIsImV4cCI6MjA3Nzk2NzI0Mn0.VGB0hLfDHAo1jXSXFTf_xm5PecwEq0h2rQmuD-fo0Zk';

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL and Anon Key must be provided.");
}
const supabase = createClient(supabaseUrl, supabaseAnonKey);


// --- Data Mapping Helpers ---

const fromSupabase = (record: any): Registration => {
    if (!record) return record;

    const personRecord = record.people || {};
    const person: Person = {
        id: personRecord.id,
        name: personRecord.name,
        document: personRecord.document,
        documentType: personRecord.document_type,
        phone: personRecord.phone,
    };

    const isMultiPayment = record.package_type === PackageType.SITIO_BUS;
    const paymentDetails = record.payment_details || {}; 

    const payment: Payment = {
        amount: record.payment_amount,
        status: record.payment_status,
        date: paymentDetails.date,
        type: paymentDetails.type,
        receiptUrl: paymentDetails.receiptUrl || null,
        sitePaymentDetails: isMultiPayment ? (paymentDetails.site || null) : null,
        busPaymentDetails: isMultiPayment ? (paymentDetails.bus || null) : null,
    };
    
    // Ensure details objects exist for multi-payment records to prevent UI errors
    if (isMultiPayment && !payment.sitePaymentDetails) {
        payment.sitePaymentDetails = { isPaid: false, receiptUrl: null };
    }
    if (isMultiPayment && !payment.busPaymentDetails) {
        payment.busPaymentDetails = { isPaid: false, receiptUrl: null };
    }

    return {
        id: record.id,
        person,
        eventId: record.event_id,
        packageType: record.package_type,
        registrationDate: record.registration_date,
        payment: payment,
        notes: record.notes || undefined,
        busNumber: record.bus_number || null,
    };
};

const registrationToSupabase = (registration: Partial<Registration>): any => {
    const record: { [key: string]: any } = {};

    if (registration.person?.id) record.person_id = registration.person.id;
    if (registration.eventId) record.event_id = registration.eventId;
    if (registration.packageType) record.package_type = registration.packageType;
    if (registration.notes !== undefined) record.notes = registration.notes;
    if (registration.busNumber !== undefined) record.bus_number = registration.busNumber;

    if (registration.payment) {
        record.payment_amount = registration.payment.amount;
        record.payment_status = registration.payment.status;

        const paymentDetails: { [key: string]: any } = {};
        if (registration.packageType === PackageType.SITIO_BUS) {
            const sitePaid = !!registration.payment.sitePaymentDetails?.isPaid;
            const busPaid = !!registration.payment.busPaymentDetails?.isPaid;
            
            if (registration.payment.status !== PaymentStatus.ISENTO) {
                 record.payment_status = (sitePaid && busPaid) ? PaymentStatus.PAGO : PaymentStatus.PENDENTE;
            }
            paymentDetails.site = registration.payment.sitePaymentDetails || { isPaid: false, receiptUrl: null };
            paymentDetails.bus = registration.payment.busPaymentDetails || { isPaid: false, receiptUrl: null };
        } else {
             paymentDetails.date = registration.payment.date || null;
             paymentDetails.type = registration.payment.type || null;
             paymentDetails.receiptUrl = registration.payment.receiptUrl || null;
        }
        record.payment_details = paymentDetails;
    }
    
    return record;
};

const personToSupabase = (person: Partial<Person>): any => ({
    name: person.name,
    document: person.document,
    document_type: person.documentType,
    phone: person.phone,
});


// --- API Functions ---

// REGISTRATIONS
export const fetchRegistrations = async (eventId: string): Promise<Registration[]> => {
    const { data, error } = await supabase
        .from('event_registrations')
        .select('*, people(*)')
        .eq('event_id', eventId)
        .order('registration_date', { ascending: false });

    if (error) {
        console.error('Error fetching registrations:', error);
        throw new Error(`Failed to fetch registrations: ${error.message}`);
    }
    return data.map(fromSupabase);
};

export const createRegistration = async (regData: {personId: string, eventId: string, packageType: PackageType, payment: Payment, notes?: string}): Promise<Registration> => {
    const recordToInsert = {
        person_id: regData.personId,
        event_id: regData.eventId,
        package_type: regData.packageType,
        payment_amount: regData.payment.amount,
        payment_status: regData.payment.status,
        payment_details: {
            site: regData.payment.sitePaymentDetails,
            bus: regData.payment.busPaymentDetails,
            date: regData.payment.date,
            type: regData.payment.type,
            receiptUrl: regData.payment.receiptUrl,
        },
        notes: regData.notes,
        registration_date: new Date().toISOString(),
    };

    const { data, error } = await supabase
        // FIX: Corrected table name from 'event_registregitrations' to 'event_registrations'
        .from('event_registrations')
        .insert(recordToInsert)
        .select('*, people(*)')
        .single();
    
    if (error) {
        console.error('Error creating registration:', error);
        throw new Error(`Failed to create registration: ${error.message}`);
    }
    return fromSupabase(data);
};

export const updateRegistration = async (registration: Registration): Promise<Registration> => {
    const { id, person, ...updateData } = registration;
    const record = registrationToSupabase(updateData);

    const { data, error } = await supabase
        .from('event_registrations')
        .update(record)
        .eq('id', id)
        .select('*, people(*)')
        .single();
    
    if (error) {
        console.error('Error updating registration:', error);
        throw new Error(`Failed to update registration: ${error.message}`);
    }
    return fromSupabase(data);
};

export const deleteRegistration = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('event_registrations')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting registration:', error);
        throw new Error(`Failed to delete registration: ${error.message}`);
    }
};

// PEOPLE
export const searchPeople = async (query: string): Promise<Person[]> => {
    const { data, error } = await supabase
        .from('people')
        .select('*')
        .ilike('name', `%${query}%`)
        .limit(10);
    
    if (error) throw new Error(error.message);
    return data as Person[];
}

export const createPerson = async (personData: Omit<Person, 'id'>): Promise<Person> => {
    const { data, error } = await supabase
        .from('people')
        .insert(personToSupabase(personData))
        .select()
        .single();
    if (error) throw new Error(error.message);
    return data as Person;
};

export const updatePerson = async (person: Person): Promise<Person> => {
    const { id, ...updateData } = person;
    const { data, error } = await supabase
        .from('people')
        .update(personToSupabase(updateData))
        .eq('id', id)
        .select()
        .single();
    if (error) throw new Error(error.message);
    return data as Person;
};

// EVENTS
export const fetchEvents = async (): Promise<Event[]> => {
    const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: false });
    
    if (error) throw new Error(error.message);
    return data as Event[];
};

export const createEvent = async (eventData: Omit<Event, 'id'>): Promise<Event> => {
    const { data, error } = await supabase
        .from('events')
        .insert(eventData)
        .select()
        .single();
    if (error) throw new Error(error.message);
    return data as Event;
};

export const updateEvent = async (eventData: Event): Promise<Event> => {
    const { id, ...updateData } = eventData;
    const { data, error } = await supabase
        .from('events')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
    if (error) throw new Error(error.message);
    return data as Event;
};
