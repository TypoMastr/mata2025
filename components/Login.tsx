import React, { useState } from 'react';

interface LoginProps {
    onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isExiting, setIsExiting] = useState(false);
    const [shakeError, setShakeError] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isExiting) return;

        if (password === 'umbanda396') {
            setError('');
            setIsExiting(true);
            setTimeout(() => {
                onLoginSuccess();
            }, 500); // Wait for animation to complete
        } else {
            setError('Senha incorreta. Tente novamente.');
            setPassword('');
            setShakeError(true);
            setTimeout(() => setShakeError(false), 500);
        }
    };

    const animationClass = isExiting ? 'animate-fadeOutDown' : 'animate-fadeInUp';
    
    const getAnimationStyle = (entryDelay: number, exitDelay: number) => ({
        animationDelay: isExiting ? `${exitDelay}ms` : `${entryDelay}ms`,
        animationFillMode: 'forwards',
    });

    return (
        <div className="bg-zinc-50 flex flex-col items-center justify-center min-h-screen p-4 font-sans overflow-hidden">
            <div className={`w-full max-w-sm mx-auto text-center ${shakeError ? 'animate-shake' : ''}`}>
                <div 
                    className={`mx-auto mb-6 h-48 w-48 ${!isExiting ? 'opacity-0' : ''} ${animationClass}`}
                    style={getAnimationStyle(0, 200)}
                >
                    <img
                        src="https://cdn-icons-png.flaticon.com/512/284/284471.png"
                        alt="Gira da Mata Logo"
                        className="w-full h-full object-contain"
                    />
                </div>
                <h1 
                    className={`text-2xl font-bold text-zinc-800 mb-2 ${!isExiting ? 'opacity-0' : ''} ${animationClass}`}
                    style={getAnimationStyle(100, 150)}
                >
                    Gira da Mata
                </h1>
                <p 
                    className={`text-zinc-500 mb-8 ${!isExiting ? 'opacity-0' : ''} ${animationClass}`}
                    style={getAnimationStyle(200, 100)}
                >
                    Acesso ao painel de controle
                </p>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div 
                        className={`relative ${!isExiting ? 'opacity-0' : ''} ${animationClass}`}
                        style={getAnimationStyle(300, 50)}
                    >
                         <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                            <svg className="h-5 w-5 text-zinc-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </span>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Senha"
                            className={`w-full pl-10 pr-4 py-3 bg-white border ${error ? 'border-red-500' : 'border-zinc-300'} rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors`}
                            required
                        />
                    </div>
                     {error && <p className={`text-sm text-red-600 opacity-0 animate-fadeInUp`} style={{ animationFillMode: 'forwards' }}>{error}</p>}
                    <button
                        type="submit"
                        className={`w-full bg-green-500 text-white font-bold py-3 px-4 rounded-full hover:bg-green-600 transition-all duration-300 shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${!isExiting ? 'opacity-0' : ''} ${animationClass}`}
                        style={getAnimationStyle(400, 0)}
                    >
                        Entrar
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;