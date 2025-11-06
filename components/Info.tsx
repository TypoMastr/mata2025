import React from 'react';

const InfoCard: React.FC<{ icon: React.ReactElement; title: string; children: React.ReactNode; delay: number; }> = ({ icon, title, children, delay }) => (
    <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm opacity-0 animate-fadeInUp" style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}>
        <div className="flex items-center gap-3 mb-3">
            {/* FIX: Removed React.cloneElement to avoid typing errors. The className is now on the SVG definition. */}
            <div className="text-green-500">{React.cloneElement(icon, {})}</div>
            <h2 className="text-md font-bold text-zinc-800">{title}</h2>
        </div>
        <div className="space-y-3 text-sm text-zinc-700">{children}</div>
    </div>
);

const InfoItem: React.FC<{ label: string; children: React.ReactNode; }> = ({ label, children }) => (
    <div className="border-b border-zinc-100 pb-2 last:border-b-0 last:pb-0">
        <p className="font-semibold text-zinc-500">{label}</p>
        <div className="mt-1">{children}</div>
    </div>
);

const Highlight: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <strong className="font-bold text-green-600">{children}</strong>
);

const InfoPage: React.FC<{ onLogout: () => void; }> = ({ onLogout }) => {
    // FIX: Added className to SVG elements to avoid using React.cloneElement.
    const IconCalendar = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0h18M-4.5 12h22.5" /></svg>;
    const IconDollar = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    const IconClipboard = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75c0-.231-.035-.454-.1-.664M6.75 7.5h10.5a2.25 2.25 0 012.25 2.25v7.5a2.25 2.25 0 01-2.25-2.25H6.75a2.25 2.25 0 01-2.25-2.25v-7.5a2.25 2.25 0 012.25-2.25z" /></svg>;
    const IconBus = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125V14.25m-17.25 4.5v-1.875a3.375 3.375 0 013.375-3.375h9.75a3.375 3.375 0 013.375 3.375v1.875m-17.25 4.5h15M6.375 12h11.25" /></svg>;

    return (
        <div className="pb-4 animate-fadeIn">
            <header className="sticky top-0 md:static bg-white md:bg-transparent z-10 p-4 md:pt-6 border-b border-zinc-200 flex justify-between items-center">
                <h1 className="text-xl md:text-2xl font-bold text-zinc-800">Informações do Evento</h1>
                 <button onClick={onLogout} className="p-2 text-zinc-500 rounded-full hover:bg-zinc-200 hover:text-zinc-800 transition-colors" aria-label="Sair">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                </button>
            </header>
            <main className="p-4 space-y-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
                <InfoCard icon={IconCalendar} title="Gira da Mata 2025" delay={100}>
                    <InfoItem label="Data"><Highlight>06/12/2025</Highlight></InfoItem>
                    <InfoItem label="Local"><p>Maricá</p></InfoItem>
                    <InfoItem label="Horário das atividades"><p>9:30 às 18:00</p></InfoItem>
                </InfoCard>

                <InfoCard icon={IconDollar} title="Valores e Pagamento" delay={150}>
                    <InfoItem label="Entrada (Sítio + Tenda)"><p><Highlight>R$ 70,00</Highlight> por pessoa. Menores de 14 anos não pagam.</p></InfoItem>
                    <InfoItem label="Formas de Pagamento"><p>Cartão de Débito/Crédito e PIX.</p><p className="mt-1 p-2 bg-zinc-100 rounded-md text-center font-mono">Chave Pix: <Highlight>teuco@teuco.com.br</Highlight></p></InfoItem>
                    <InfoItem label="Condição Especial (Médiuns)"><p>Pagamento parcelado em 2x (outubro e novembro) incluindo o ônibus.</p></InfoItem>
                    <InfoItem label="Local de Pagamento"><p>Todos os pagamentos devem ser feitos no Bazar, apresentando o comprovante PIX. Não pagar na cantina.</p></InfoItem>
                </InfoCard>
                
                <InfoCard icon={IconBus} title="Ônibus Fretado" delay={200}>
                    <InfoItem label="Valor"><p><Highlight>R$ 50,00</Highlight> por pessoa. Crianças até 6 anos, no colo, não pagam.</p></InfoItem>
                    <InfoItem label="Saída"><p>T.E.U.CO. às <Highlight>7:30</Highlight> (chegar com 20 min de antecedência). <strong className="text-red-600">Sem tolerância de atraso.</strong></p></InfoItem>
                    <InfoItem label="Retorno"><p><Highlight>19:00</Highlight>, com desembarque apenas na T.E.U.CO.</p></InfoItem>
                    <InfoItem label="Compromisso de Pagamento"><p>Reserva de vaga implica pagamento até <Highlight>22/11/2025</Highlight>.</p></InfoItem>
                    <InfoItem label="Obrigatório"><p>Informar nome completo e RG/CPF de todos os passageiros para o seguro e levar documento com foto no dia.</p></InfoItem>
                </InfoCard>

                <InfoCard icon={IconClipboard} title="Orientações e Recomendações" delay={250}>
                    <InfoItem label="Transporte Individual"><p>É de responsabilidade de cada um. Há estacionamento na rua e opções de transporte público/Uber.</p></InfoItem>
                    <InfoItem label="Alimentação"><p>Haverá venda de bebidas, lanches e almoço. O almoço deve ser reservado com antecedência na cantina.</p></InfoItem>
                    <InfoItem label="Crianças"><p>A responsabilidade é dos responsáveis. <strong className="text-red-600">O uso da piscina não é permitido.</strong></p></InfoItem>
                    <InfoItem label="O que levar"><p>Repelente, remédios de uso pessoal, cadeiras de praia, toalhas e agasalhos.</p></InfoItem>
                    <InfoItem label="Importante"><p>Não será permitido fazer oferendas no sítio.</p></InfoItem>
                </InfoCard>

                <div className="text-center text-sm text-zinc-600 bg-green-50 p-4 rounded-xl border border-green-200 opacity-0 animate-fadeInUp md:col-span-2" style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}>
                    <p className="leading-relaxed">Quaisquer fatores que impossibilitem o pagamento do Sítio e/ou transporte, procurem o Pai Carlinhos para expor a situação. Lembrem-se sempre, Nossa Casa é do Caboclo de Oxóssi e nunca deixamos um filho(a) desamparado.</p>
                    <p className="font-bold mt-3 text-green-700">Axé!</p>
                </div>
            </main>
        </div>
    );
};

export default InfoPage;