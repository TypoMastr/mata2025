import { DocumentType } from '../types';

export const formatPhoneNumber = (value: string): string => {
    if (!value) return value;
    const phoneNumber = value.replace(/[^\d]/g, '');
    const phoneNumberLength = phoneNumber.length;

    if (phoneNumberLength < 3) return `(${phoneNumber}`;
    if (phoneNumberLength < 8) return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2)}`;
    return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2, 7)}-${phoneNumber.slice(7, 11)}`;
};

export const formatDocument = (value: string): string => {
    const numbers = value.replace(/[^\d]/g, '');
    if (numbers.length <= 11) { // CPF
        return numbers
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})/, '$1-$2')
            .substring(0, 14);
    } else { // Assume RG for longer numbers, basic formatting
         return numbers
            .replace(/(\d{2})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1})/, '$1-$2')
            .substring(0, 12);
    }
};

export const validateCPF = (cpf: string): boolean => {
    cpf = cpf.replace(/[^\d]+/g, '');
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

    let sum = 0;
    let remainder: number;

    for (let i = 1; i <= 9; i++) sum = sum + parseInt(cpf.substring(i - 1, i)) * (11 - i);
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.substring(9, 10))) return false;

    sum = 0;
    for (let i = 1; i <= 10; i++) sum = sum + parseInt(cpf.substring(i - 1, i)) * (12 - i);
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.substring(10, 11))) return false;
    
    return true;
};

export const getDocumentType = (doc: string): { type: DocumentType, valid: boolean } => {
    const numbers = doc.replace(/[^\d]/g, '');
    if (numbers.length === 11 && validateCPF(numbers)) {
        return { type: DocumentType.CPF, valid: true };
    }
    // Basic RG check, can be improved for specific state formats
    if (numbers.length > 5 && numbers.length < 12) {
        return { type: DocumentType.RG, valid: true };
    }
    return { type: DocumentType.OUTRO, valid: false };
};

/**
 * Normalizes a string by converting it to lowercase and removing diacritical marks (accents).
 * This is useful for accent-insensitive searching.
 * Example: "José" becomes "jose".
 */
export const normalizeString = (str: string): string => {
    if (!str) return '';
    return str
        .toLowerCase()
        .normalize('NFD') // Normalization Form Decomposed
        .replace(/[\u0300-\u036f]/g, ''); // Remove combining diacritical marks
};
