
import { createClient } from '@supabase/supabase-js';
import type { Registration, Payment, Person, Event, ActionHistory } from '../types';
import { PackageType, PaymentStatus } from '../types';

// --- Supabase Client Setup ---
const supabaseUrl = 'https://bjuzljwcbtnzylyirkzu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqdXpsandjYnRuenlseWlya3p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzOTEyNDIsImV4cCI6MjA3Nzk2NzI0Mn0.VGB0hLfDHAo1jXSXFTf_xm5PecwEq0h2rQmuD-fo0Zk';

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("As credenciais do Supabase não estão configuradas corretamente no arquivo services/api.ts.");
}
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- Action Logging ---
const getIpInfo = async (): Promise<{ ip_address: string, location_info: any } | null> => {
    try {
        // Using a CORS-friendly public API to get IP info
        const response = await fetch('https://ipapi.co/json/');
        if (!response.ok) {
            console.warn(`IP API request failed with status: ${response.status}`);
            return null;
        }
        const data = await response.json();
        return {
            ip_address: data.ip,
            location_info: { city: data.city, region: data.region, country_name: data.country_name },
        };
    } catch (error) {
        console.warn('Could not fetch IP info:', error);
        return null; // Don't block logging if IP fetch fails
    }
};


const logAction = async (
    action_type: string,
    table_name: string,
    record_id: string,
    description: string,
    previous_data: any,
    new_data: any
) => {
    const ipInfo = await getIpInfo();

    const logEntry = {
        action_type,
        table_name,
        record_id,
        description,
        previous_data,
        new_data,
        ip_address: ipInfo?.ip_address,
        location_info: ipInfo?.location_info,
    };

    const { error } = await supabase.from('action_history').insert(logEntry);
    if (error) {
        console.error('Failed to log action:', error);
    }
};

// --- Data Mapping Helpers ---
const fromSupabase = (record: any): Registration => {
    if (!record) return record;
    const personRecord = record.people || {};
    const person: Person = {
        id: personRecord.id, name: personRecord.name, document: personRecord.document,
        documentType: personRecord.document_type, phone: personRecord.phone,
    };
    const isMultiPayment = record.package_type === PackageType.SITIO_BUS;
    const paymentDetails = record.payment_details || {};
    const payment: Payment = {
        amount: record.payment_amount, status: record.payment_status, date: paymentDetails.date,
        type: paymentDetails.type, receiptUrl: paymentDetails.receiptUrl || null,
        sitePaymentDetails: isMultiPayment ? (paymentDetails.site || null) : null,
        busPaymentDetails: isMultiPayment ? (paymentDetails.bus || null) : null,
    };
    if (isMultiPayment && !payment.sitePaymentDetails) payment.sitePaymentDetails = { isPaid: false, receiptUrl: null };
    if (isMultiPayment && !payment.busPaymentDetails) payment.busPaymentDetails = { isPaid: false, receiptUrl: null };
    return {
        id: record.id, person, eventId: record.event_id, packageType: record.package_type,
        registrationDate: record.registration_date, payment: payment, notes: record.notes || undefined,
        busNumber: record.bus_number || null, is_deleted: record.is_deleted,
    };
};

const registrationToSupabase = (registration: Partial<Registration>): any => {
    const record: { [key: string]: any } = {};
    if (registration.person?.id) record.person_id = registration.person.id;
    if (registration.eventId) record.event_id = registration.eventId;
    if (registration.packageType) record.package_type = registration.packageType;
    if (registration.notes !== undefined) record.notes = registration.notes;
    if (registration.busNumber !== undefined) record.bus_number = registration.busNumber;
    if (registration.is_deleted !== undefined) record.is_deleted = registration.is_deleted;
    if (registration.payment) {
        record.payment_amount = registration.payment.amount;
        record.payment_status = registration.payment.status;
        const paymentDetails: { [key: string]: any } = {};
        if (registration.packageType === PackageType.SITIO_BUS) {
            // FIX: Consider "Paid" if it is explicitly paid OR if it is exempt.
            const siteOk = !!registration.payment.sitePaymentDetails?.isPaid || !!registration.payment.sitePaymentDetails?.isExempt;
            const busOk = !!registration.payment.busPaymentDetails?.isPaid || !!registration.payment.busPaymentDetails?.isExempt;
            
            const siteExempt = !!registration.payment.sitePaymentDetails?.isExempt;
            const busExempt = !!registration.payment.busPaymentDetails?.isExempt;
            
            // If both are exempt, force status to ISENTO.
            // If not fully exempt, determine PAGO vs PENDENTE based on if all parts are "Ok"
            if (siteExempt && busExempt) {
                record.payment_status = PaymentStatus.ISENTO;
            } else if (registration.payment.status !== PaymentStatus.ISENTO) {
                record.payment_status = (siteOk && busOk) ? PaymentStatus.PAGO : PaymentStatus.PENDENTE;
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
    name: person.name, document: person.document, document_type: person.documentType, phone: person.phone, is_deleted: person.is_deleted,
});

const eventToSupabase = (event: Partial<Event>): any => ({
    name: event.name, event_date: event.event_date, location: event.location, activity_time: event.activity_time,
    site_price: event.site_price, bus_price: event.bus_price, pix_key: event.pix_key,
    bus_departure_time: event.bus_departure_time, bus_return_time: event.bus_return_time,
    payment_deadline: event.payment_deadline, is_deleted: event.is_deleted, is_archived: event.is_archived,
});

// --- Contextual Description Generator ---
const getEvent = async (eventId: string): Promise<Event | null> => {
    const { data } = await supabase.from('events').select('*').eq('id', eventId).maybeSingle();
    return data;
};

const getEventName = async (eventId: string): Promise<string> => {
    const event = await getEvent(eventId);
    return event?.name || 'Evento desconhecido';
};

const generateActionDescription = async (action_type: string, previous_data: any, new_data: any): Promise<string> => {
    try {
        const getPersonName = (data: any): string => `'${data?.person?.name || data?.name || 'Pessoa desconhecida'}'`;

        switch (action_type) {
            case 'CREATE_REGISTRATION': {
                const eventName = await getEventName(new_data.eventId);
                return `Inscrição de ${getPersonName(new_data)} criada para o evento '${eventName}'.`;
            }
            case 'DELETE_REGISTRATION': {
                const eventName = await getEventName(previous_data.eventId);
                return `Inscrição de ${getPersonName(previous_data)} no evento '${eventName}' excluída.`;
            }
            case 'UPDATE_REGISTRATION': {
                const before = previous_data as Registration;
                const after = new_data as Registration;
                const personName = getPersonName(after);
                const changes: string[] = [];
                const event = await getEvent(after.eventId);

                // Person data changes
                if (before.person.phone !== after.person.phone) changes.push(`Telefone de ${personName} alterado de "${before.person.phone}" para "${after.person.phone}".`);
                if (before.person.document !== after.person.document) changes.push(`Documento de ${personName} alterado de "${before.person.document}" para "${after.person.document}".`);

                // Registration changes
                if (before.packageType !== after.packageType) changes.push(`Pacote de ${personName} alterado de "${before.packageType}" para "${after.packageType}".`);
                if (before.busNumber !== after.busNumber) {
                    const fromBus = before.busNumber ? `Ônibus ${before.busNumber}` : 'nenhum';
                    const toBus = after.busNumber ? `Ônibus ${after.busNumber}` : 'nenhum';
                    changes.push(`Atribuição de ônibus para ${personName} alterada de ${fromBus} para ${toBus}.`);
                }
                if ((before.notes || '').trim() !== (after.notes || '').trim()) changes.push(`Observações da inscrição de ${personName} foram atualizadas.`);
                
                // Payment changes
                if (before.payment.status !== after.payment.status && after.payment.status === PaymentStatus.ISENTO) return `Inscrição de ${personName} marcada como ISENTA.`;
                if (before.payment.status === PaymentStatus.ISENTO && after.payment.status !== PaymentStatus.ISENTO) return `Isenção da inscrição de ${personName} removida.`;

                if (after.packageType === PackageType.SITIO_BUS) {
                    const beforeSitePaid = before.payment.sitePaymentDetails?.isPaid;
                    const afterSitePaid = after.payment.sitePaymentDetails?.isPaid;
                    if (!beforeSitePaid && afterSitePaid) changes.push(`Pagamento do Sítio (R$ ${(event?.site_price ?? 70).toFixed(2).replace('.', ',')}) de ${personName} registrado.`);
                    if (beforeSitePaid && !afterSitePaid) changes.push(`Pagamento do Sítio de ${personName} removido.`);
                    
                    const beforeBusPaid = before.payment.busPaymentDetails?.isPaid;
                    const afterBusPaid = after.payment.busPaymentDetails?.isPaid;
                    if (!beforeBusPaid && afterBusPaid) changes.push(`Pagamento do Ônibus (R$ ${(event?.bus_price ?? 50).toFixed(2).replace('.', ',')}) de ${personName} registrado.`);
                    if (beforeBusPaid && !afterBusPaid) changes.push(`Pagamento do Ônibus de ${personName} removido.`);
                } else {
                    if (before.payment.status === PaymentStatus.PENDENTE && after.payment.status === PaymentStatus.PAGO) changes.push(`Pagamento de R$ ${after.payment.amount.toFixed(2).replace('.', ',')} referente à inscrição de ${personName} foi registrado.`);
                    if (before.payment.status === PaymentStatus.PAGO && after.payment.status === PaymentStatus.PENDENTE) changes.push(`Pagamento da inscrição de ${personName} foi removido (status alterado para Pendente).`);
                }
                
                if (changes.length === 0) return `Inscrição de ${personName} verificada (sem alterações).`;
                return changes.join('\n');
            }
            case 'CREATE_PERSON': return `Pessoa ${getPersonName(new_data)} adicionada ao sistema.`;
            case 'DELETE_PERSON': return `Pessoa ${getPersonName(previous_data)} excluída do sistema.`;
            case 'UPDATE_PERSON': {
                 const before = previous_data as Person;
                 const after = new_data as Person;
                 const personName = getPersonName(after);
                 const changes: string[] = [];
                 if (before.name !== after.name) changes.push(`Nome de ${personName} alterado de "${before.name}" para "${after.name}".`);
                 if (before.phone !== after.phone) changes.push(`Telefone de ${personName} alterado de "${before.phone}" para "${after.phone}".`);
                 if (before.document !== after.document) changes.push(`Documento de ${personName} alterado de "${before.document}" para "${after.document}".`);
                 if (changes.length === 0) return `Dados de ${personName} verificados (sem alterações).`;
                 return changes.join('\n');
            }
            case 'CREATE_EVENT': return `Evento '${new_data.name}' criado.`;
            case 'DELETE_EVENT': return `Evento '${previous_data.name}' excluído.`;
            case 'UPDATE_EVENT': {
                const before = previous_data as Event;
                const after = new_data as Event;
                if (before.is_archived !== after.is_archived) {
                    return after.is_archived ? `Evento '${after.name}' arquivado.` : `Evento '${after.name}' desarquivado.`;
                }
                return `Dados do evento '${after.name}' atualizados.`;
            }
            case 'UNDO_ACTION': return `Ação "${previous_data.description.split('\n')[0]}" foi desfeita.`;
            default: return `Ação do tipo ${action_type} executada.`;
        }
    } catch (e) {
        console.error("Error generating description", e);
        return "Descrição da ação não pôde ser gerada."
    }
};


// --- Schema Verification ---
export const verifySchema = async (): Promise<{ success: boolean, missingIn: string[] }> => {
    const columnChecks = ['people', 'events', 'event_registrations'];
    const tableChecks = ['action_history'];
    const missingIn: string[] = [];

    // Check for missing columns
    for (const table of columnChecks) {
        const { error } = await supabase
            .from(table)
            .select('is_deleted')
            .limit(1);

        if (error && error.message.includes('does not exist')) {
            missingIn.push(table);
        }
    }

    // Check for missing tables
    for (const table of tableChecks) {
        const { error } = await supabase
            .from(table)
            .select('id')
            .limit(1);

        if (error && (error.message.includes('Could not find the table') || error.message.includes('does not exist'))) {
            missingIn.push(`table:${table}`);
        }
    }

    return {
        success: missingIn.length === 0,
        missingIn,
    };
};


// --- API Functions ---
// REGISTRATIONS
export const fetchRegistrations = async (eventId: string): Promise<Registration[]> => {
    const { data, error } = await supabase.from('event_registrations').select('*, people(*)')
        .eq('event_id', eventId).eq('is_deleted', false).order('registration_date', { ascending: false });
    if (error) throw new Error(`Failed to fetch registrations: ${error.message}`);
    return data.map(fromSupabase);
};

export const createRegistration = async (regData: {personId: string, eventId: string, packageType: PackageType, payment: Payment, notes?: string}): Promise<Registration> => {
    // 1. Check if registration already exists (active or soft-deleted)
    // Note: maybeSingle() finds rows that are visible. If RLS hides soft-deleted rows, this might return null.
    const { data: existing } = await supabase
        .from('event_registrations')
        .select('id, is_deleted')
        .eq('person_id', regData.personId)
        .eq('event_id', regData.eventId)
        .maybeSingle();

    const paymentDetails: any = {};
    if (regData.packageType === PackageType.SITIO_BUS) {
        paymentDetails.site = regData.payment.sitePaymentDetails || { isPaid: false, receiptUrl: null };
        paymentDetails.bus = regData.payment.busPaymentDetails || { isPaid: false, receiptUrl: null };
    } else {
        paymentDetails.date = regData.payment.date || null;
        paymentDetails.type = regData.payment.type || null;
        paymentDetails.receiptUrl = regData.payment.receiptUrl || null;
    }

    const commonData = {
        package_type: regData.packageType,
        payment_amount: regData.payment.amount,
        payment_status: regData.payment.status,
        payment_details: paymentDetails,
        notes: regData.notes,
        is_deleted: false,
        registration_date: new Date().toISOString(),
    };

    if (existing) {
        if (existing.is_deleted) {
            // Restore soft-deleted registration
            const { data, error } = await supabase.from('event_registrations')
                .update(commonData)
                .eq('id', existing.id)
                .select('*, people(*)')
                .single();
            
            if (error) throw new Error(`Failed to restore registration: ${error.message}`);
            
            const newRegistration = fromSupabase(data);
            // Log as CREATE because for the user it is a new registration
            const description = await generateActionDescription('CREATE_REGISTRATION', null, newRegistration);
            await logAction('CREATE_REGISTRATION', 'event_registrations', newRegistration.id, description, null, newRegistration);
            return newRegistration;
        } else {
            // It exists and is active. Throw specific error to be caught by UI.
            throw new Error(`duplicate key value violates unique constraint "event_registrations_person_id_event_id_key"`);
        }
    }

    // 2. Insert new registration
    const recordToInsert = {
        person_id: regData.personId, 
        event_id: regData.eventId, 
        ...commonData
    };
    
    const { data, error } = await supabase.from('event_registrations').insert(recordToInsert).select('*, people(*)').single();
    
    if (error) {
        // FIX: Handle soft-deleted records that might be hidden from SELECT by RLS but still trigger unique constraint on INSERT.
        if (error.message.includes('duplicate key value') || error.code === '23505') {
             // Attempt to restore the "hidden" soft-deleted record
             const { data: restoredData, error: restoreError } = await supabase
                .from('event_registrations')
                .update(commonData)
                .eq('person_id', regData.personId)
                .eq('event_id', regData.eventId)
                .select('*, people(*)')
                .single();

             if (restoreError) {
                 // If restore also fails, we really have a problem or it's a genuine conflict we can't resolve.
                 throw new Error(`Failed to create registration: ${error.message}`);
             }
             
             const restoredRegistration = fromSupabase(restoredData);
             const description = await generateActionDescription('CREATE_REGISTRATION', null, restoredRegistration);
             await logAction('CREATE_REGISTRATION', 'event_registrations', restoredRegistration.id, description, null, restoredRegistration);
             return restoredRegistration;
        }
        throw new Error(`Failed to create registration: ${error.message}`);
    }
    const newRegistration = fromSupabase(data);
    const description = await generateActionDescription('CREATE_REGISTRATION', null, newRegistration);
    await logAction('CREATE_REGISTRATION', 'event_registrations', newRegistration.id, description, null, newRegistration);
    return newRegistration;
};

export const updateRegistration = async (registration: Registration): Promise<Registration> => {
    const { data: beforeData, error: beforeError } = await supabase.from('event_registrations').select('*, people(*)').eq('id', registration.id).single();
    if (beforeError) throw new Error(`Failed to fetch before-update state: ${beforeError.message}`);
    
    const { id, person, ...updateData } = registration;
    const record = registrationToSupabase(updateData);
    const { data, error } = await supabase.from('event_registrations').update(record).eq('id', id).select('*, people(*)').single();
    if (error) throw new Error(`Failed to update registration: ${error.message}`);

    const beforeRegistration = fromSupabase(beforeData);
    const updatedRegistration = fromSupabase(data);
    const description = await generateActionDescription('UPDATE_REGISTRATION', beforeRegistration, updatedRegistration);
    await logAction('UPDATE_REGISTRATION', 'event_registrations', updatedRegistration.id, description, beforeRegistration, updatedRegistration);
    return updatedRegistration;
};

export const deleteRegistration = async (id: string): Promise<void> => {
    const { data: beforeData, error: beforeError } = await supabase.from('event_registrations').select('*, people(*)').eq('id', id).single();
    if (beforeError || !beforeData) throw new Error(`Registration not found: ${beforeError?.message}`);
    const registration = fromSupabase(beforeData);

    const { error } = await supabase.from('event_registrations').update({ is_deleted: true }).eq('id', id);
    if (error) throw new Error(`Failed to delete registration: ${error.message}`);
    // FIX: Replaced incorrect function call with separate calls to generate description and log the action, consistent with other delete functions.
    const description = await generateActionDescription('DELETE_REGISTRATION', registration, null);
    await logAction('DELETE_REGISTRATION', 'event_registrations', id, description, registration, { ...registration, is_deleted: true });
};

// PEOPLE
export const fetchAllPeople = async (): Promise<Person[]> => {
    const { data, error } = await supabase.from('people').select('*').eq('is_deleted', false).order('name', { ascending: true });
    if (error) throw new Error(`Failed to fetch people: ${error.message}`);
    return data;
};

export const searchPeople = async (query: string): Promise<Person[]> => {
    const { data, error } = await supabase.from('people').select('*').eq('is_deleted', false).ilike('name', `%${query}%`).limit(10);
    if (error) throw new Error(error.message);
    return data;
};

export const createPerson = async (personData: Omit<Person, 'id'>): Promise<Person> => {
    const { data, error } = await supabase.from('people').insert(personToSupabase({ ...personData, is_deleted: false })).select().single();
    if (error) throw new Error(error.message);
    const description = await generateActionDescription('CREATE_PERSON', null, data);
    await logAction('CREATE_PERSON', 'people', data.id, description, null, data);
    return data;
};

export const updatePerson = async (person: Person): Promise<Person> => {
    const { data: beforeData, error: beforeError } = await supabase.from('people').select('*').eq('id', person.id).single();
    if (beforeError) throw new Error(beforeError.message);

    const { id, ...updateData } = person;
    const { data, error } = await supabase.from('people').update(personToSupabase(updateData)).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    const description = await generateActionDescription('UPDATE_PERSON', beforeData, data);
    await logAction('UPDATE_PERSON', 'people', data.id, description, beforeData, data);
    return data;
};

export const deletePerson = async (personId: string): Promise<void> => {
    const { count, error: checkError } = await supabase.from('event_registrations').select('*', { count: 'exact', head: true }).eq('person_id', personId).eq('is_deleted', false);
    if (checkError) throw new Error(`Failed to verify person's registrations: ${checkError.message}`);
    if (count !== null && count > 0) throw new Error(`PERSON_HAS_REGISTRATIONS`);

    const { data: beforeData, error: beforeError } = await supabase.from('people').select('*').eq('id', personId).single();
    if(beforeError || !beforeData) throw new Error("Person not found");

    const { error } = await supabase.from('people').update({ is_deleted: true }).eq('id', personId);
    if (error) throw new Error(`Failed to delete person: ${error.message}`);
    const description = await generateActionDescription('DELETE_PERSON', beforeData, null);
    await logAction('DELETE_PERSON', 'people', personId, description, beforeData, { ...beforeData, is_deleted: true });
};

// EVENTS
export const fetchEvents = async (): Promise<Event[]> => {
    const { data, error } = await supabase.from('events').select('*').eq('is_deleted', false).order('event_date', { ascending: false });
    if (error) throw new Error(`Failed to fetch events: ${error.message}`);
    return data;
};

export const createEvent = async (eventData: Omit<Event, 'id'>): Promise<Event> => {
    const { data, error } = await supabase.from('events').insert(eventToSupabase({ ...eventData, is_deleted: false })).select().single();
    if (error) throw new Error(error.message);
    const description = await generateActionDescription('CREATE_EVENT', null, data);
    await logAction('CREATE_EVENT', 'events', data.id, description, null, data);
    return data;
};

export const updateEvent = async (eventData: Event): Promise<Event> => {
    const { data: beforeData, error: beforeError } = await supabase.from('events').select('*').eq('id', eventData.id).single();
    if(beforeError) throw new Error(beforeError.message);

    const { id, ...updateData } = eventData;
    const { data, error } = await supabase.from('events').update(eventToSupabase(updateData)).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    const description = await generateActionDescription('UPDATE_EVENT', beforeData, data);
    await logAction('UPDATE_EVENT', 'events', data.id, description, beforeData, data);
    return data;
};

export const getRegistrationCountForEvent = async (eventId: string): Promise<number> => {
    const { count, error } = await supabase.from('event_registrations').select('*', { count: 'exact', head: true }).eq('event_id', eventId).eq('is_deleted', false);
    if (error) throw new Error(error.message);
    return count || 0;
};

export const deleteEvent = async (eventId: string): Promise<void> => {
    const { data: beforeData, error: beforeError } = await supabase.from('events').select('*').eq('id', eventId).single();
    if(beforeError || !beforeData) throw new Error("Event not found");

    const { error } = await supabase.from('events').update({ is_deleted: true }).eq('id', eventId);
    if (error) throw new Error(`Failed to delete event: ${error.message}`);
    const description = await generateActionDescription('DELETE_EVENT', beforeData, null);
    await logAction('DELETE_EVENT', 'events', eventId, description, beforeData, { ...beforeData, is_deleted: true });
};

// HISTORY
export const fetchHistory = async (limit?: number): Promise<ActionHistory[]> => {
    let query = supabase.from('action_history').select('*').order('created_at', { ascending: false });
    if (limit) {
        query = query.limit(limit);
    }
    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch history: ${error.message}`);
    return data as ActionHistory[];
};

export const undoAction = async (historyId: string, password: string): Promise<void> => {
    if (password !== 'umbanda396') {
        throw new Error("Senha incorreta.");
    }

    const { data: historyEntry, error: fetchError } = await supabase.from('action_history').select('*').eq('id', historyId).single();
    if (fetchError || !historyEntry) throw new Error("Ação não encontrada.");
    if (historyEntry.is_undone) throw new Error("Esta ação já foi desfeita.");

    const { action_type, table_name, record_id, previous_data } = historyEntry;
    
    let undoError;

    if (action_type.startsWith('CREATE')) {
        const { error } = await supabase.from(table_name).update({ is_deleted: true }).eq('id', record_id);
        undoError = error;
    } else if (action_type.startsWith('DELETE')) {
        const { error } = await supabase.from(table_name).update({ is_deleted: false }).eq('id', record_id);
        undoError = error;
    } else if (action_type.startsWith('UPDATE')) {
        let dataToRestore;
        if (table_name === 'events') dataToRestore = eventToSupabase(previous_data);
        else if (table_name === 'people') dataToRestore = personToSupabase(previous_data);
        else if (table_name === 'event_registrations') dataToRestore = registrationToSupabase(fromSupabase(previous_data));
        else dataToRestore = previous_data;

        // Remove fields that shouldn't be in an update payload
        const { id, created_at, registration_date, person, people, ...restorePayload } = dataToRestore;
        delete restorePayload.person_id; // prevent trying to update person_id relation

        const { error } = await supabase.from(table_name).update(restorePayload).eq('id', record_id);
        undoError = error;
    } else {
        throw new Error("Tipo de ação desconhecido, não pode ser desfeito.");
    }
    
    if (undoError) throw new Error(`Falha ao reverter a ação: ${undoError.message}`);
    
    await supabase.from('action_history').update({ is_undone: true }).eq('id', historyId);
    const description = await generateActionDescription('UNDO_ACTION', historyEntry, null);
    await logAction('UNDO_ACTION', 'action_history', historyId, description, historyEntry, { ...historyEntry, is_undone: true });
};
