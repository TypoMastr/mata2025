export enum PackageType {
    SITIO_ONLY = 'Apenas Sítio',
    SITIO_BUS = 'Sítio + Ônibus',
}

export enum PaymentStatus {
    PAGO = 'Pago',
    PENDENTE = 'Pendente',
    ISENTO = 'Isento',
}

export enum DocumentType {
    CPF = 'CPF',
    RG = 'RG',
    OUTRO = 'Outro',
}

export enum PaymentType {
    PIX_CONTA = 'PIX (Conta)',
    PIX_MAQUINA = 'PIX (Máquina)',
    DEBITO = 'Débito',
    CREDITO = 'Crédito',
    DINHEIRO = 'Dinheiro',
}

export interface PartialPaymentDetails {
    isPaid: boolean;
    date?: string;
    type?: PaymentType;
    receiptUrl: string | null;
}


export interface Payment {
    amount: number;
    status: PaymentStatus;
    // Legacy/single payment fields
    date?: string;
    type?: PaymentType;
    receiptUrl: string | null;
    // New fields for multi-part payments
    sitePaymentDetails?: PartialPaymentDetails | null;
    busPaymentDetails?: PartialPaymentDetails | null;
}

export interface Person {
    id: string;
    name: string;
    document: string;
    documentType: DocumentType;
    phone: string;
    is_deleted?: boolean;
}

// This type represents a registration for an event, joining data from
// the 'event_registrations' table and the linked 'people' table.
// It's named 'Registration' to distinguish it from the old 'Attendee' structure.
export interface Registration {
    id: string; // This is the ID of the event_registration record
    person: Person;
    eventId: string;
    packageType: PackageType;
    registrationDate: string;
    payment: Payment;
    notes?: string;
    busNumber?: number | null;
    is_deleted?: boolean;
}

// Alias for backwards compatibility in components.
// The data structure is now `Registration`.
export type Attendee = Registration;


export interface PartialPaymentFormDetails {
    isPaid: boolean;
    date: string;
    dateNotInformed: boolean;
    type: PaymentType;
}

// Form data for creating a new registration
export interface RegistrationFormData {
    personId: string | null; // null if it's a new person
    // Person fields (only used if personId is null)
    name: string;
    document: string;
    phone: string;
    
    // Registration fields
    packageType: PackageType;
    paymentAmount: string;
    registerPaymentNow: boolean;
    notes: string;
    
    // For single payment
    paymentDate: string;
    paymentDateNotInformed: boolean;
    paymentType: PaymentType;

    // For multi-payment
    sitePayment: PartialPaymentFormDetails;
    busPayment: PartialPaymentFormDetails;
}

export type AttendeeFormData = RegistrationFormData; // Alias for form compatibility

export type ReportField = 'person.name' | 'person.document' | 'person.phone' | 'packageType' | 'payment.status' | 'payment.amount';

export interface ReportConfig {
    type: 'custom' | 'busList';
    fields: ReportField[];
    filters: {
        status: 'all' | PaymentStatus;
        packageType: 'all' | PackageType;
    };
}

export interface Event {
    id: string;
    name: string;
    event_date: string;
    location: string;
    activity_time: string;
    site_price: number;
    bus_price: number;
    pix_key: string;
    bus_departure_time: string;
    bus_return_time: string;
    payment_deadline: string;
    is_deleted?: boolean;
    is_archived?: boolean;
}

export interface ActionHistory {
    id: string;
    created_at: string;
    action_type: string; // e.g., 'CREATE_REGISTRATION'
    table_name: string;
    record_id: string;
    previous_data: any | null;
    new_data: any | null;
    description: string;
    ip_address?: string;
    location_info?: any;
    is_undone: boolean;
}


export type View = 'list' | 'detail' | 'form' | 'reports' | 'payment' | 'editForm' | 'info' | 'management' | 'peopleManagement' | 'history';