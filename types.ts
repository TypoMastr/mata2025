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

export interface Payment {
    amount: number;
    status: PaymentStatus;
    date?: string;
    type?: PaymentType;
    receiptUrl: string | null;
}

export interface Attendee {
    id: string;
    name: string;
    document: string;
    documentType: DocumentType;
    phone: string;
    packageType: PackageType;
    registrationDate: string;
    payment: Payment;
}

export interface AttendeeFormData {
    name: string;
    document: string;
    phone: string;
    packageType: PackageType;
    paymentAmount: string;
    registerPaymentNow: boolean;
    paymentDate: string;
    paymentDateNotInformed: boolean;
    paymentType: PaymentType;
}

export type ReportField = 'name' | 'document' | 'phone' | 'packageType' | 'payment.status' | 'payment.amount';

export interface ReportConfig {
    type: 'custom' | 'busList';
    fields: ReportField[];
    filters: {
        status: 'all' | PaymentStatus;
        packageType: 'all' | PackageType;
    };
}


export type View = 'list' | 'detail' | 'form' | 'reports' | 'payment' | 'editForm' | 'editPayment' | 'confirmDeletePayment' | 'info';