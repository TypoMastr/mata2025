const CREDENTIAL_ID_KEY = 'webauthnCredentialId';

// Helper functions to convert between ArrayBuffer and Base64URL
// WebAuthn uses Base64URL encoding, which is slightly different from standard Base64.
const bufferToBase64Url = (buffer: ArrayBuffer): string => {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
};

const base64UrlToBuffer = (base64url: string): ArrayBuffer => {
    // Add padding back
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    const padded = base64 + '==='.slice(0, pad === 0 ? 0 : 4 - pad);
    const binaryString = atob(padded);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
};


// Check for WebAuthn support
export const isBiometricSupportAvailable = (): boolean => {
    return !!(navigator.credentials && navigator.credentials.create && window.PublicKeyCredential);
};

// Register a new biometric credential
export const registerBiometricCredential = async (): Promise<void> => {
    if (!isBiometricSupportAvailable()) {
        throw new Error('Biometria não é suportada neste navegador.');
    }

    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const userId = new Uint8Array(16);
    window.crypto.getRandomValues(userId);

    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
            name: 'Gira da Mata',
        },
        user: {
            id: userId,
            name: 'usuario@giradamata',
            displayName: 'Usuário Gira da Mata',
        },
        pubKeyCredParams: [
            { type: 'public-key', alg: -7 },   // ES256
            { type: 'public-key', alg: -257 }, // RS256
        ],
        authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            requireResidentKey: false,
        },
        timeout: 60000,
        attestation: 'none',
    };

    try {
        const credential = await navigator.credentials.create({
            publicKey: publicKeyCredentialCreationOptions,
        }) as PublicKeyCredential;

        if (credential && credential.rawId) {
            const credentialIdBase64Url = bufferToBase64Url(credential.rawId);
            localStorage.setItem(CREDENTIAL_ID_KEY, credentialIdBase64Url);
        } else {
            throw new Error('A criação da credencial falhou.');
        }
    } catch (err: any) {
        console.error("Biometric registration failed:", err.name, err.message);
        
        const errorMessage = (err.message || '').toLowerCase();

        if (err.name === 'NotAllowedError') {
            throw new Error('Operação cancelada pelo usuário.');
        }
        
        // Broader check for iframe/permission errors, which is the most likely cause
        // for the "publickey-credentials-create" feature not being enabled.
        if (err.name === 'SecurityError' || errorMessage.includes('publickey-credentials-create') || errorMessage.includes('permissions policy')) {
            throw new Error('Biometria indisponível no ambiente de preview (iframe). Funciona em produção.');
        }

        // Generic fallback for other potential issues
        throw new Error(err.message || 'Falha desconhecida ao registrar biometria.');
    }
};

// Authenticate using an existing biometric credential
export const authenticateWithBiometricCredential = async (): Promise<boolean> => {
    const credentialIdBase64Url = localStorage.getItem(CREDENTIAL_ID_KEY);
    if (!credentialIdBase64Url) {
        return false;
    }

    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    try {
        const credential = await navigator.credentials.get({
            publicKey: {
                challenge,
                allowCredentials: [{
                    type: 'public-key',
                    id: base64UrlToBuffer(credentialIdBase64Url),
                }],
                userVerification: 'required',
                timeout: 60000,
            },
        });

        return !!credential;
    } catch (err) {
        console.error('Biometric authentication failed:', err);
        return false;
    }
};

export const hasBiometricCredential = (): boolean => {
    return !!localStorage.getItem(CREDENTIAL_ID_KEY);
};

export const removeBiometricCredential = (): void => {
    localStorage.removeItem(CREDENTIAL_ID_KEY);
};