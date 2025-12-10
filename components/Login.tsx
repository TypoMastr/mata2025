
import React, { useState, useEffect } from 'react';
import * as authService from '../services/authService';

interface LoginProps {
    onLoginSuccess: () => void;
}

// Sorted Alphabetically
const USER_OPTIONS = ["Carlos Mauricio", "Fernando Haddad", "Leodeth", "Leonardo"];

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
    // FIX: Initialize selectedUser with useState<string | null>(null)
    const [selectedUser, setSelectedUser] = useState<string | null>(null);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isExiting, setIsExiting] = useState(false);
    const [shakeError, setShakeError] = useState(false);
    const [biometricStatus, setBiometricStatus] = useState<'checking' | 'prompting' | 'failed' | 'idle'>('idle');
    
    // Animation state for switching views
    const [viewState, setViewState] = useState<'users' | 'password'>('users');

    const handleUserSelect = (user: string) => {
        setIsExiting(true);
        setTimeout(() => {
            setSelectedUser(user);
            setError('');
            setViewState('password');
            setIsExiting(false);
            if (authService.hasBiometricCredential()) {
                setBiometricStatus('idle');
            }
        }, 300);
    };

    const handleBackToUserSelect = () => {
        setIsExiting(true);
        setTimeout(() => {
            setSelectedUser(null);
            setPassword('');
            setError('');
            setBiometricStatus('idle');
            setViewState('users');
            setIsExiting(false);
        }, 300);
    };

    const handleBiometricLogin = async () => {
        if (authService.hasBiometricCredential()) {
            setBiometricStatus('prompting');
            const success = await authService.authenticateWithBiometricCredential();
            if (success) {
                performLogin();
            } else {
                setBiometricStatus('failed');
            }
        }
    };

    const performLogin = () => {
        if(selectedUser) {
            sessionStorage.setItem('currentUser', selectedUser);
        }
        setIsExiting(true);
        setTimeout(() => {
            onLoginSuccess();
        }, 300);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isExiting) return;

        if (password === 'umbanda396') {
            setError('');
            performLogin();
        } else {
            setError('Senha incorreta.');
            setPassword('');
            setShakeError(true);
            setTimeout(() => setShakeError(false), 500);
        }
    };

    // Helper for staggered animations
    const getDelay = (index: number) => ({
        animationDelay: `${index * 75}ms`,
        animationFillMode: 'forwards',
    });

    if (biometricStatus === 'prompting') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 font-sans fixed inset-0 z-50">
                <div className="text-center animate-fadeIn bg-white p-8 rounded-3xl shadow-xl border border-zinc-200">
                    <div className="mx-auto bg-green-100 text-green-600 w-20 h-20 rounded-full flex items-center justify-center mb-6 animate-pulse">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A7.5 7.5 0 0119.5 12c0 2.252-.903 4.34-2.378 5.855A7.5 7.5 0 019.622 4.145m1.503 1.498a5.25 5.25 0 00-6.236 6.236l-3.5 3.5a.75.75 0 001.06 1.06l3.5-3.5a5.25 5.25 0 006.236-6.236-1.503-1.503z" /></svg>
                    </div>
                    <h1 className="text-xl font-bold text-zinc-800">Autenticação Biométrica</h1>
                    <p className="text-zinc-500 mt-2">Confirme sua identidade...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-green-500/10 to-transparent pointer-events-none" />
            
            <div className={`w-full max-w-sm mx-auto z-10 transition-opacity duration-300 ease-out ${isExiting ? 'opacity-0' : 'opacity-100'}`}>
                
                {viewState === 'users' ? (
                    // --- VIEW: USER SELECTION ---
                    <>
                        <div className="text-center mb-6">
                            <div className="mx-auto mb-4 h-20 w-20 bg-white rounded-2xl shadow-lg p-3 flex items-center justify-center opacity-0 animate-fadeIn border border-zinc-100">
                                <img
                                    src="https://cdn-icons-png.flaticon.com/512/284/284471.png"
                                    alt="Logo"
                                    className="w-full h-full object-contain"
                                />
                            </div>
                            <h1 className="text-2xl font-bold text-zinc-800 tracking-tight opacity-0 animate-fadeIn" style={getDelay(1)}>
                                Bem-vindo
                            </h1>
                            <p className="text-zinc-500 text-sm mt-1 opacity-0 animate-fadeIn" style={getDelay(2)}>
                                Quem está acessando?
                            </p>
                        </div>
                        
                        <div className="space-y-3">
                            {USER_OPTIONS.map((user, index) => (
                                <button
                                    key={user}
                                    onClick={() => handleUserSelect(user)}
                                    className="group w-full bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-zinc-300 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-200 active:scale-98 touch-manipulation opacity-0 animate-fadeIn"
                                    style={getDelay(3 + index)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 transition-colors">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <span className="font-semibold text-zinc-700 group-hover:text-zinc-900 text-lg">
                                            {user}
                                        </span>
                                    </div>
                                    <div className="text-zinc-300 group-hover:text-green-500 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </>
                ) : (
                    // --- VIEW: PASSWORD INPUT ---
                    <div className={shakeError ? 'animate-shake' : ''}>
                        {/* Header with User Info */}
                        <div className="text-center mb-8">
                            <div className="mx-auto mb-4 w-20 h-20 bg-white border-4 border-white shadow-xl rounded-full flex items-center justify-center text-green-600 opacity-0 animate-fadeIn">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-zinc-800 opacity-0 animate-fadeIn" style={getDelay(1)}>
                                Olá, {selectedUser?.split(' ')[0]}
                            </h2>
                            <button 
                                onClick={handleBackToUserSelect}
                                className="text-sm text-green-600 font-medium mt-1 hover:underline opacity-0 animate-fadeIn flex items-center justify-center gap-1 mx-auto" 
                                style={getDelay(2)}
                            >
                                Não é você? Trocar
                            </button>
                        </div>
                        
                        {/* Form */}
                        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200 space-y-6 opacity-0 animate-fadeIn" style={getDelay(3)}>
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Senha de Acesso</label>
                                <div className="relative">
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.target.value);
                                            if (error) setError('');
                                        }}
                                        className={`w-full bg-zinc-50 text-zinc-900 px-4 py-4 rounded-xl border-2 ${error ? 'border-red-500 focus:border-red-500' : 'border-zinc-100 focus:border-green-500'} focus:outline-none focus:ring-0 transition-colors text-lg tracking-widest placeholder-zinc-300 text-center`}
                                        placeholder="••••"
                                        inputMode="numeric"
                                        autoFocus
                                    />
                                </div>
                                {error && (
                                    <p className="text-red-500 text-sm text-center font-medium mt-2 animate-fadeIn">
                                        {error}
                                    </p>
                                )}
                                {biometricStatus === 'failed' && (
                                    <p className="text-red-500 text-sm text-center font-medium mt-2 animate-fadeIn">
                                        Biometria falhou. Use a senha.
                                    </p>
                                )}
                            </div>

                            <div className="space-y-3">
                                <button
                                    type="submit"
                                    className="w-full bg-green-600 text-white font-bold py-4 rounded-xl hover:bg-green-700 active:scale-95 transition-all shadow-lg shadow-green-200"
                                >
                                    Entrar
                                </button>

                                {authService.hasBiometricCredential() && (
                                    <button
                                        type="button"
                                        onClick={handleBiometricLogin}
                                        className="w-full bg-white border border-zinc-200 text-zinc-700 font-semibold py-4 rounded-xl hover:bg-zinc-50 active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A7.5 7.5 0 0119.5 12c0 2.252-.903 4.34-2.378 5.855A7.5 7.5 0 019.622 4.145m1.503 1.498a5.25 5.25 0 00-6.236 6.236l-3.5 3.5a.75.75 0 001.06 1.06l3.5-3.5a5.25 5.25 0 006.236-6.236-1.503-1.503z" /></svg>
                                        Usar Biometria
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                )}
                
                <p className="text-center text-xs text-zinc-400 mt-8 opacity-0 animate-fadeIn" style={getDelay(8)}>
                    Sistema de Gestão - Gira da Mata
                </p>
            </div>
        </div>
    );
};

export default Login;