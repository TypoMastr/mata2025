import React, { useState, useEffect } from 'react';
import * as authService from '../services/authService';

const InfoCard: React.FC<{ icon: React.ReactElement; title: string; children: React.ReactNode; delay: number; }> = ({ icon, title, children, delay }) => (
    <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm opacity-0 animate-fadeInUp" style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}>
        <div className="flex items-center gap-3 mb-3">
            <div className="text-green-500">{icon}</div>
            <h2 className="text-md font-bold text-zinc-800">{title}</h2>
        </div>
        <div className="space-y-3 text-sm text-zinc-700">{children}</div>
    </div>
);

const BiometricsCard: React.FC = () => {
    const [isSupported, setIsSupported] = useState(false);
    const [isEnabled, setIsEnabled] = useState(false);
    const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const IconFingerPrint = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A7.5 7.5 0 0119.5 12c0 2.252-.903 4.34-2.378 5.855A7.5 7.5 0 019.622 4.145m1.503 1.498a5.25 5.25 0 00-6.236 6.236l-3.5 3.5a.75.75 0 001.06 1.06l3.5-3.5a5.25 5.25 0 006.236-6.236-1.503-1.503z" /></svg>;

    useEffect(() => {
        const supported = authService.isBiometricSupportAvailable();
        setIsSupported(supported);
        if (supported) {
            setIsEnabled(authService.hasBiometricCredential());
        }
    }, []);

    const handleEnableBiometrics = async () => {
        setStatus('loading');
        setErrorMessage('');
        try {
            await authService.registerBiometricCredential();
            setIsEnabled(true);
            setStatus('idle');
        } catch (err: any) {
            setStatus('error');
            if (err.name === 'NotAllowedError') {
                setErrorMessage('Permissão negada. Tente novamente.');
            } else {
                setErrorMessage(err.message || 'Ocorreu um erro ao ativar a biometria.');
            }
        }
    };

    const handleDisableBiometrics = () => {
        authService.removeBiometricCredential();
        setIsEnabled(false);
    };

    return (
        <InfoCard icon={IconFingerPrint} title="Acesso Rápido (Biometria)" delay={200}>
            {!isSupported ? (
                <p className="text-sm text-zinc-500">Seu navegador ou dispositivo não suporta acesso por biometria.</p>
            ) : (
                <div className="space-y-3">
                    <p>
                        {isEnabled
                            ? 'O acesso rápido está ativado. Você pode entrar no aplicativo usando sua biometria, sem precisar digitar a senha.'
                            : 'Ative o acesso rápido para entrar com sua digital ou reconhecimento facial.'}
                    </p>
                    {isEnabled ? (
                        <button onClick={handleDisableBiometrics} className="w-full bg-red-100 text-red-700 font-bold py-2 px-4 rounded-full hover:bg-red-200 transition-colors">
                            Desativar Acesso Rápido
                        </button>
                    ) : (
                        <button onClick={handleEnableBiometrics} disabled={status === 'loading'} className="w-full bg-green-500 text-white font-bold py-2 px-4 rounded-full hover:bg-green-600 transition-colors disabled:bg-green-400">
                            {status === 'loading' ? 'Aguarde...' : 'Ativar Acesso Rápido'}
                        </button>
                    )}
                    {status === 'error' && <p className="text-xs text-red-600 animate-fadeIn">{errorMessage}</p>}
                </div>
            )}
        </InfoCard>
    );
};

interface InfoPageProps {
    onLogout: () => void;
}

const InfoPage: React.FC<InfoPageProps> = ({ onLogout }) => {
    const IconInfo = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    const IconLogout = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;

    return (
        <div className="animate-fadeIn">
            <header className="sticky top-0 md:static bg-white z-10 p-4 md:pt-6 border-b border-zinc-200 flex justify-between items-center">
                <h1 className="text-xl md:text-2xl font-bold text-zinc-800">Informações</h1>
                <button onClick={onLogout} className="p-2 text-zinc-500 rounded-full hover:bg-zinc-200 hover:text-zinc-800 transition-colors" aria-label="Sair">
                    {/* FIX: `IconLogout` is a variable holding a JSX element, not a component. It should be rendered directly using curly braces. */}
                    {IconLogout}
                </button>
            </header>
            <main className="p-4 space-y-4">
                <InfoCard icon={IconInfo} title="Sobre o Aplicativo" delay={100}>
                   <p>Este é o painel de controle para o evento Gira da Mata 2025.</p>
                   <p>Aqui você pode gerenciar as inscrições, pagamentos e gerar relatórios detalhados.</p>
                </InfoCard>
                <BiometricsCard />
            </main>
        </div>
    );
};

export default InfoPage;
