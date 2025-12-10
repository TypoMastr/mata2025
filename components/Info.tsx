
import React from 'react';
import type { Event } from '../types';
import { useToast } from '../contexts/ToastContext';

// --- Icons (Heroicons Solid - High Quality Paths) ---
const Icons = {
    Calendar: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M12.75 12.75a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM11.25 15.75a.75.75 0 100 1.5.75.75 0 000-1.5zM15.75 12.75a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM15.75 15.75a.75.75 0 100 1.5.75.75 0 000-1.5zM19.5 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path fillRule="evenodd" d="M2.25 13.5a8.25 8.25 0 018.25-8.25.75.75 0 01.75.75v6.75H18a.75.75 0 01.75.75 8.25 8.25 0 01-16.5 0zm1.5 0a6.75 6.75 0 006.75 6.75v-6.625h-6.625a6.761 6.761 0 00-.125-.125z" clipRule="evenodd" />
            <path d="M19.5 6h-2.25V4.5a.75.75 0 00-1.5 0V6H8.25V4.5a.75.75 0 00-1.5 0V6H4.5A2.25 2.25 0 002.25 8.25v11.25A2.25 2.25 0 004.5 21.75h15A2.25 2.25 0 0021.75 19.5V8.25A2.25 2.25 0 0019.5 6zM4.5 8.25h15v9.75h-15V8.25z" />
        </svg>
    ),
    MapPin: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
        </svg>
    ),
    Clock: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd" />
        </svg>
    ),
    Banknotes: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path d="M10.464 8.746c.227-.18.497-.311.786-.394v2.795a2.252 2.252 0 01-.786-.393c-.394-.313-.546-.681-.546-1.004 0-.323.152-.691.546-1.004zM12.75 15.662v-2.824c.347.085.664.228.921.421.427.32.579.686.579.991 0 .305-.152.671-.579.991a2.534 2.534 0 01-.921.42z" />
            <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v.816a3.836 3.836 0 00-1.72.756c-.712.566-1.112 1.35-1.112 2.178 0 .829.4 1.612 1.113 2.178.502.4 1.102.647 1.719.756v2.978a2.536 2.536 0 01-.921-.421l-.879-.66a.75.75 0 00-.9 1.2l.879.66c.533.4 1.169.645 1.821.75V18a.75.75 0 001.5 0v-.81a4.124 4.124 0 001.821-.749c.745-.559 1.179-1.344 1.179-2.191 0-.847-.434-1.632-1.179-2.191a4.122 4.122 0 00-1.821-.75V8.354c.29.082.559.213.786.393l.415.33a.75.75 0 00.933-1.175l-.415-.33a3.836 3.836 0 00-1.719-.755V6z" clipRule="evenodd" />
        </svg>
    ),
    Ticket: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94c-.956.495-1.75.96-1.75 2.06a.75.75 0 01-1.5 0c0-1.844 1.5-2.75 3-3.036v-3.168c-1.5-.286-3-1.192-3-3.036a.75.75 0 011.5 0c0 1.1.794 1.565 1.75 2.06V6A.75.75 0 0020.25 5.25H3.75A.75.75 0 003 6v4.94c.956-.495 1.75-.96 1.75-2.06a.75.75 0 011.5 0c0 1.844-1.5 2.75-3 3.036v3.168c1.5.286 3 1.192 3 3.036a.75.75 0 01-1.5 0c0-1.1-.794-1.565-1.75-2.06z" clipRule="evenodd" />
        </svg>
    ),
    Clipboard: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path fillRule="evenodd" d="M10.5 3A1.501 1.501 0 009 4.5h6A1.5 1.501 0 0013.5 3h-3zm-2.693.178A3 3 0 0110.5 1.5h3a3 3 0 012.694 1.678c.497.042.992.092 1.486.15 1.495.173 2.57 1.46 2.57 2.929V19.5a3 3 0 01-3 3H6.75a3 3 0 01-3-3V6.257c0-1.47 1.075-2.756 2.57-2.93.493-.058.989-.107 1.486-.15z" clipRule="evenodd" />
        </svg>
    ),
    Bus: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path d="M4.5 3.75a3 3 0 00-3 3v.75h21v-.75a3 3 0 00-3-3h-15z" />
            <path fillRule="evenodd" d="M22.5 9.75h-21v7.5a3 3 0 003 3h15a3 3 0 003-3v-7.5zm-18 3.75a.75.75 0 01.75-.75h6a.75.75 0 010 1.5h-6a.75.75 0 01-.75-.75zm.75 2.25a.75.75 0 000 1.5h3a.75.75 0 000-1.5h-3z" clipRule="evenodd" />
        </svg>
    ),
    Copy: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
            <path d="M7.5 3.375c0-1.036.84-1.875 1.875-1.875h.375a3.75 3.75 0 013.75 3.75v1.875C13.5 8.161 12.66 9 11.625 9h-3.75A1.875 1.875 0 016 7.125v-1.5a3.75 3.75 0 011.5-2.25z" />
            <path d="M10.656 11.25c.063.465.094.943.094 1.43 0 1.274-.17 2.492-.484 3.642a4.801 4.801 0 01-.232-.271 2.94 2.94 0 00-.233-.245.75.75 0 01-1.05 1.06 4.43 4.43 0 01.233.246c.325.38.706.706 1.129.967l.063.037.005.002A11.23 11.23 0 0017.5 19.5l.023-.001.025.002A11.223 11.223 0 0024 9.375v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
            <path fillRule="evenodd" d="M1.5 7.125c0-1.036.84-1.875 1.875-1.875h6c1.036 0 1.875.84 1.875 1.875v3.75c0 1.036-.84 1.875-1.875 1.875h-6A1.875 1.875 0 011.5 10.875v-3.75zM8.25 8.625a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5a.75.75 0 01.75-.75zM4.5 8.625a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
        </svg>
    ),
    Close: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
        </svg>
    ),
    Logout: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path fillRule="evenodd" d="M7.5 3.75A1.5 1.5 0 006 5.25v13.5a1.5 1.5 0 001.5 1.5h6a1.5 1.5 0 001.5-1.5V15a.75.75 0 011.5 0v3.75a3 3 0 01-3 3h-6a3 3 0 01-3-3V5.25a3 3 0 013-3h6a3 3 0 013 3V9A.75.75 0 0115 9V5.25a1.5 1.5 0 00-1.5-1.5h-6zm5.03 4.72a.75.75 0 010 1.06l-1.72 1.72h10.94a.75.75 0 010 1.5H10.81l1.72 1.72a.75.75 0 11-1.06 1.06l-3-3a.75.75 0 010-1.06l3-3a.75.75 0 011.06 0z" clipRule="evenodd" />
        </svg>
    )
};

const CopyButton: React.FC<{ text: string, label: string }> = ({ text, label }) => {
    const { addToast } = useToast();

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            addToast(`${label} copiado!`, 'success');
        } catch (err) {
            addToast('Falha ao copiar.', 'error');
        }
    };

    return (
        <button 
            onClick={handleCopy} 
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-50 border border-zinc-200 hover:bg-zinc-100 hover:border-zinc-300 text-zinc-600 rounded-lg text-xs font-semibold transition-all ml-2 active:scale-95 shadow-sm"
            title="Copiar"
        >
            <span className="font-mono tracking-wide">{text}</span>
            <span className="text-zinc-400">{Icons.Copy}</span>
        </button>
    );
};

const InfoCard: React.FC<{ 
    icon: React.ReactElement; 
    title: string; 
    children: React.ReactNode; 
    delay: number; 
    className?: string;
    headerColor?: string; // Tailwind class, e.g., 'text-emerald-600 bg-emerald-50'
}> = ({ icon, title, children, delay, className = '', headerColor = 'text-zinc-600 bg-zinc-50' }) => (
    <div className={`bg-white p-6 rounded-[2rem] shadow-[0_2px_12px_-3px_rgba(0,0,0,0.08)] border border-zinc-100 opacity-0 animate-fadeInUp flex flex-col h-full ${className}`} style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}>
        <div className="flex items-center gap-4 mb-5">
            <div className={`p-3 rounded-2xl ${headerColor}`}>
                {icon}
            </div>
            <h2 className="text-lg font-bold text-zinc-900 tracking-tight">{title}</h2>
        </div>
        <div className="space-y-4 text-sm text-zinc-600 leading-relaxed flex-grow">{children}</div>
    </div>
);

const InfoItem: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({ label, children, className = '' }) => (
    <div className={`pb-2 last:pb-0 ${className}`}>
        <p className="font-bold text-zinc-400 text-[10px] uppercase tracking-wider mb-1.5">{label}</p>
        <div className="text-zinc-800 text-sm font-medium">{children}</div>
    </div>
);

const Highlight: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = 'text-emerald-600' }) => (
    <strong className={`font-bold ${className}`}>{children}</strong>
);

const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
    });
};

const InfoPage: React.FC<{ onLogout: () => void; event: Event | null }> = ({ onLogout, event }) => {
    if (!event) {
        return (
             <div className="flex justify-center items-center h-full p-8 bg-zinc-50">
                <div className="text-center">
                    <h2 className="text-xl font-bold text-zinc-700 tracking-tight">Nenhum evento selecionado</h2>
                    <p className="text-zinc-500 mt-2 text-sm">Vá para a página de 'Gestão' para criar um novo evento.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="pb-6 animate-fadeIn min-h-full">
            {/* Header */}
            <header className="sticky top-0 md:static bg-white/90 backdrop-blur-md z-10 p-4 border-b border-zinc-100 flex justify-between items-center shadow-sm">
                <h1 className="text-lg font-bold text-zinc-900 tracking-tight">Informações</h1>
                 <button onClick={onLogout} className="p-2 text-zinc-400 rounded-full hover:bg-zinc-100 hover:text-zinc-700 transition-colors" aria-label="Sair">
                    {Icons.Logout}
                </button>
            </header>

            <main className="p-4 md:p-8 space-y-8 max-w-5xl mx-auto">
                {/* Hero / Header Section */}
                <div className="text-center space-y-4 py-4 opacity-0 animate-fadeInUp" style={{ animationDelay: '50ms', animationFillMode: 'forwards' }}>
                    <h1 className="text-3xl md:text-5xl font-black text-zinc-900 leading-tight tracking-tighter">
                        {event.name}
                    </h1>
                    <div className="flex flex-col md:flex-row justify-center items-center gap-2 md:gap-4 text-zinc-600 text-sm font-semibold">
                        <span className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-zinc-100">
                            <span className="text-emerald-500">{Icons.Calendar}</span>
                            <span className="capitalize">{formatDate(event.event_date)}</span>
                        </span>
                        <div className="flex gap-2">
                            <span className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-zinc-100">
                                <span className="text-emerald-500">{Icons.MapPin}</span>
                                {event.location}
                            </span>
                            <span className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-zinc-100">
                                <span className="text-emerald-500">{Icons.Clock}</span>
                                {event.activity_time}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Financeiro */}
                    <InfoCard 
                        icon={Icons.Banknotes} 
                        title="Investimento" 
                        delay={150} 
                        headerColor="bg-emerald-50 text-emerald-600"
                    >
                        <div className="flex justify-between items-center bg-zinc-50 p-4 rounded-2xl border border-zinc-100 mb-3">
                            <span className="font-semibold text-zinc-700">Entrada (Sítio + Tenda)</span>
                            <span className="text-2xl font-black text-emerald-600 tracking-tight">R$ {event.site_price.toFixed(2)}</span>
                        </div>
                        <p className="text-xs text-zinc-500 ml-1 mb-4 font-medium flex items-center gap-1">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            Menores de 14 anos não pagam entrada.
                        </p>
                        
                        <div className="space-y-4 pt-4 border-t border-zinc-100">
                            <InfoItem label="Métodos de Pagamento">
                                <p>Aceitamos Cartão (Débito/Crédito) e PIX.</p>
                            </InfoItem>
                            <InfoItem label="Chave PIX">
                                <div className="flex items-center">
                                    <CopyButton text={event.pix_key} label="Chave PIX" />
                                </div>
                            </InfoItem>
                        </div>
                        <div className="bg-amber-50 text-amber-900 text-xs font-medium p-3 rounded-xl mt-3 border border-amber-100">
                            <strong>Atenção:</strong> Pagamentos devem ser feitos no Bazar. Apresente o comprovante.
                        </div>
                    </InfoCard>
                    
                    {/* Transporte */}
                    <InfoCard 
                        icon={Icons.Bus} 
                        title="Ônibus Fretado" 
                        delay={200}
                        headerColor="bg-blue-50 text-blue-600"
                    >
                        <div className="flex justify-between items-center bg-zinc-50 p-4 rounded-2xl border border-zinc-100 mb-5">
                            <span className="font-semibold text-zinc-700">Passagem (Ida e Volta)</span>
                            <span className="text-2xl font-black text-blue-600 tracking-tight">R$ {event.bus_price.toFixed(2)}</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="bg-zinc-50 p-3 rounded-2xl text-center border border-zinc-100">
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Saída T.E.U.CO</p>
                                <p className="text-xl font-black text-zinc-800 mt-1">{event.bus_departure_time}</p>
                                <p className="text-[10px] text-rose-500 font-bold mt-1 uppercase tracking-wide">Sem atrasos!</p>
                            </div>
                            <div className="bg-zinc-50 p-3 rounded-2xl text-center border border-zinc-100">
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Retorno</p>
                                <p className="text-xl font-black text-zinc-800 mt-1">{event.bus_return_time}</p>
                                <p className="text-[10px] text-zinc-500 mt-1 font-medium">Desembarque na Tenda</p>
                            </div>
                        </div>

                        <InfoItem label="Prazo de Pagamento">
                            Pagamento até <Highlight className="text-blue-600">{new Date(event.payment_deadline).toLocaleDateString('pt-BR', {day: '2-digit', month: 'long'})}</Highlight>.
                        </InfoItem>
                        <p className="text-xs text-zinc-400 mt-2 font-medium">Crianças até 6 anos no colo não pagam passagem.</p>
                    </InfoCard>

                    {/* Orientações */}
                    <InfoCard 
                        icon={Icons.Clipboard} 
                        title="Orientações Gerais" 
                        delay={250}
                        className="md:col-span-2"
                        headerColor="bg-violet-50 text-violet-600"
                    >
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <InfoItem label="Transporte Próprio">
                                    <p>Responsabilidade individual. Há estacionamento na rua e opções de transporte público.</p>
                                </InfoItem>
                                <InfoItem label="Alimentação">
                                    <p>Venda de lanches e almoço no local. <span className="text-violet-700 font-bold bg-violet-100 px-2 py-0.5 rounded-md text-xs">Reserve na cantina</span></p>
                                </InfoItem>
                            </div>
                            <div className="space-y-6">
                                <InfoItem label="Crianças">
                                    <p>Responsabilidade total dos pais.</p>
                                    <div className="flex items-center gap-2 mt-2 text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-100">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 flex-shrink-0">
                                            <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                                        </svg>
                                        <span className="text-xs font-bold">Uso da piscina proibido.</span>
                                    </div>
                                </InfoItem>
                                <InfoItem label="O que levar">
                                    <p>Repelente, remédios de uso pessoal, cadeiras de praia, toalhas e agasalhos.</p>
                                </InfoItem>
                            </div>
                        </div>
                        <div className="mt-6 pt-4 border-t border-zinc-100 text-center">
                             <p className="text-xs text-zinc-500 font-medium">
                                <strong className="text-zinc-800">Importante:</strong> Não é permitido fazer oferendas no local do sítio.
                            </p>
                        </div>
                    </InfoCard>
                </div>

                {/* Footer Message */}
                <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-8 md:p-12 rounded-[2.5rem] border border-emerald-100 text-center opacity-0 animate-fadeInUp shadow-sm md:col-span-2 group" style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}>
                    <div className="relative z-10">
                        <p className="text-zinc-700 text-sm md:text-lg leading-relaxed font-serif italic max-w-3xl mx-auto">
                            "Quaisquer fatores que impossibilitem o pagamento do Sítio e/ou transporte, procurem o Pai Carlinhos para expor a situação. Lembrem-se sempre, Nossa Casa é do Caboclo de Oxóssi e nunca deixamos um filho(a) desamparado."
                        </p>
                        <div className="mt-8 flex items-center justify-center gap-4 opacity-80">
                            <span className="h-px w-12 bg-emerald-300"></span>
                            <p className="font-black text-emerald-700 text-xl tracking-[0.2em] uppercase">Axé!</p>
                            <span className="h-px w-12 bg-emerald-300"></span>
                        </div>
                    </div>
                    {/* Decorative background elements */}
                    <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-emerald-200/20 rounded-full blur-3xl transition-transform duration-1000 group-hover:scale-110"></div>
                    <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-56 h-56 bg-teal-200/20 rounded-full blur-3xl transition-transform duration-1000 group-hover:scale-110"></div>
                </div>
            </main>
        </div>
    );
};

export default InfoPage;
