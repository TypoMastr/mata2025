import React, { useState, useMemo } from 'react';
import type { Attendee, ReportConfig, ReportField } from '../types';
import { PackageType, PaymentStatus } from '../types';

// --- Componente: Formulário de Geração de Relatório ---
const InteractiveReportForm: React.FC<{ onGenerate: (config: ReportConfig) => void; onCancel: () => void; }> = ({ onGenerate, onCancel }) => {
    const allFields: { id: ReportField; label: string }[] = [
        { id: 'name', label: 'Nome' },
        { id: 'document', label: 'Documento' },
        { id: 'phone', label: 'Telefone' },
        { id: 'packageType', label: 'Pacote' },
        { id: 'payment.status', label: 'Status do Pagamento' },
        { id: 'payment.amount', label: 'Valor' },
    ];

    const [selectedFields, setSelectedFields] = useState<ReportField[]>(['name', 'phone', 'packageType', 'payment.status']);
    const [statusFilter, setStatusFilter] = useState<'all' | PaymentStatus>('all');
    const [packageFilter, setPackageFilter] = useState<'all' | PackageType>('all');

    const handleFieldChange = (field: ReportField) => {
        setSelectedFields(prev =>
            prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]
        );
    };

    const handleGenerateClick = () => {
        if (selectedFields.length > 0) {
            onGenerate({
                fields: selectedFields,
                filters: { status: statusFilter, packageType: packageFilter }
            });
        }
    };
    
    return (
        <div className="animate-fadeIn">
            <header className="sticky top-0 md:static bg-white md:bg-transparent z-10 p-4 md:pt-6 border-b border-zinc-200 flex items-center gap-4">
                 <button onClick={onCancel} className="text-zinc-500 hover:text-zinc-800 p-1 rounded-full hover:bg-zinc-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h1 className="text-xl md:text-2xl font-bold text-zinc-800">Gerar Relatório</h1>
            </header>
            <main className="p-4 space-y-6">
                <div className="md:grid md:grid-cols-2 md:gap-6 space-y-6 md:space-y-0">
                    <div className="opacity-0 animate-fadeInUp" style={{ animationFillMode: 'forwards', animationDelay: '100ms' }}>
                        <h3 className="text-md font-semibold text-zinc-700 mb-2">1. Selecione os campos</h3>
                        <div className="grid grid-cols-2 gap-2 bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                            {allFields.map(({ id, label }) => (
                                <label key={id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-zinc-50 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedFields.includes(id)}
                                        onChange={() => handleFieldChange(id)}
                                        className="h-4 w-4 rounded border-zinc-300 text-green-600 focus:ring-green-500"
                                    />
                                    <span className="text-sm text-zinc-700">{label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="opacity-0 animate-fadeInUp" style={{ animationFillMode: 'forwards', animationDelay: '200ms' }}>
                         <h3 className="text-md font-semibold text-zinc-700 mb-2">2. Aplique filtros (opcional)</h3>
                         <div className="space-y-3 bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                             <div>
                                 <label htmlFor="statusFilter" className="block text-sm font-medium text-zinc-700">Status do Pagamento</label>
                                 <select id="statusFilter" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="mt-1 block w-full px-3 py-2 bg-white border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm">
                                     <option value="all">Todos</option>
                                     <option value={PaymentStatus.PAGO}>Pago</option>
                                     <option value={PaymentStatus.PENDENTE}>Pendente</option>
                                 </select>
                             </div>
                             <div>
                                <label htmlFor="packageFilter" className="block text-sm font-medium text-zinc-700">Tipo de Pacote</label>
                                 <select id="packageFilter" value={packageFilter} onChange={e => setPackageFilter(e.target.value as any)} className="mt-1 block w-full px-3 py-2 bg-white border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm">
                                     <option value="all">Todos</option>
                                     <option value={PackageType.SITIO_ONLY}>Apenas Sítio</option>
                                     <option value={PackageType.SITIO_BUS}>Sítio + Ônibus</option>
                                </select>
                            </div>
                         </div>
                    </div>
                </div>

                 <div className="flex flex-col md:flex-row gap-3 pt-2 opacity-0 animate-fadeInUp" style={{ animationFillMode: 'forwards', animationDelay: '300ms' }}>
                    <button onClick={onCancel} className="w-full bg-zinc-200 text-zinc-800 font-bold py-3 px-4 rounded-full hover:bg-zinc-300 transition-colors">Cancelar</button>
                    <button onClick={handleGenerateClick} disabled={selectedFields.length === 0} className="w-full bg-green-500 text-white font-bold py-3 px-4 rounded-full hover:bg-green-600 transition-colors shadow-sm disabled:bg-zinc-400 disabled:cursor-not-allowed">Gerar Relatório</button>
                </div>
            </main>
        </div>
    );
};

// --- Componente: Visualização do Relatório ---
const InteractiveReportPreview: React.FC<{ data: Attendee[]; config: ReportConfig; onBack: () => void; }> = ({ data, config, onBack }) => {
    const fieldNames: Record<ReportField, string> = {
        name: 'Nome', document: 'Documento', phone: 'Telefone', packageType: 'Pacote',
        'payment.status': 'Status', 'payment.amount': 'Valor (R$)',
    };

    const getNestedProperty = (obj: any, path: string) => path.split('.').reduce((o, i) => (o ? o[i] : undefined), obj);

    const formatValue = (attendee: Attendee, field: ReportField): string => {
        if (field === 'document') {
            return `${attendee.document} (${attendee.documentType})`;
        }
        let value = getNestedProperty(attendee, field);
        if (field === 'payment.amount') return value.toFixed(2).replace('.', ',');
        return value || 'N/A';
    };
    
    const handlePrintAndExport = () => {
        const tableHeaders = config.fields.map(field => `<th>${fieldNames[field]}</th>`).join('');
        const tableRows = data.map(attendee => `<tr>${config.fields.map(field => `<td>${formatValue(attendee, field)}</td>`).join('')}</tr>`).join('');
        const appliedFilters = `Status: ${config.filters.status}, Pacote: ${config.filters.packageType}`;
        const printableHtml = `
            <!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Relatório Gira da Mata 2025</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 1.5rem; color: #333; }
                h1 { color: #10B981; border-bottom: 2px solid #10B981; padding-bottom: 0.5rem; }
                .print-info { display: none; }
                p { font-size: 0.9rem; }
                table { width: 100%; border-collapse: collapse; margin-top: 1rem; font-size: 0.8rem; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f7f7f7; font-weight: 600; }
                tr:nth-child(even) { background-color: #fcfcfc; }
                @page { size: A4; margin: 1in; }
            </style></head><body>
                <h1>Relatório - Gira da Mata 2025</h1>
                <p><strong>Data de Geração:</strong> ${new Date().toLocaleString('pt-BR')}</p>
                <p><strong>Filtros Aplicados:</strong> ${appliedFilters}</p>
                <p><strong>Total de Registros:</strong> ${data.length}</p>
                <table><thead><tr>${tableHeaders}</tr></thead><tbody>${tableRows}</tbody></table>
            </body></html>`;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(printableHtml);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => printWindow.print(), 500);
        }
    };
    
    const handleShare = async () => {
        const title = `Relatório Gira da Mata 2025 (${data.length} registros)`;
        let text = `${title}\n\n`;
        data.forEach((attendee, index) => {
            text += `Registro ${index + 1}:\n`;
            config.fields.forEach(field => {
                text += `  - ${fieldNames[field]}: ${formatValue(attendee, field)}\n`;
            });
            text += '\n';
        });

        if (navigator.share) {
            try {
                await navigator.share({ title, text });
            } catch (error) {
                if (!(error instanceof DOMException && error.name === 'AbortError')) {
                    console.error('Erro ao compartilhar:', error);
                }
            }
        } else {
            alert('Seu navegador não suporta compartilhamento direto. Use a opção "Imprimir / Salvar PDF" e compartilhe o arquivo.');
        }
    };

    return (
        <div className="flex flex-col animate-fadeIn">
             <header className="sticky top-0 md:static bg-white md:bg-transparent z-10 p-4 md:pt-6 border-b border-zinc-200 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-zinc-500 hover:text-zinc-800 p-1 rounded-full hover:bg-zinc-100">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <h1 className="text-xl md:text-2xl font-bold text-zinc-800">Relatório ({data.length})</h1>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleShare} className="p-2 rounded-full text-zinc-700 bg-zinc-200 hover:bg-zinc-300 transition-colors" aria-label="Compartilhar">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg>
                    </button>
                    <button onClick={handlePrintAndExport} className="p-2 rounded-full text-white bg-blue-500 hover:bg-blue-600 transition-colors shadow-sm" aria-label="Imprimir / PDF">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v-2a1 1 0 011-1h8a1 1 0 011 1v2h1a2 2 0 002-2v-3a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" /></svg>
                    </button>
                </div>
            </header>
            <main className="flex-grow p-4 space-y-4">
                {data.length > 0 ? (
                    <>
                        <div className="md:hidden space-y-3">
                            {data.map((attendee, index) => (
                                <div key={attendee.id} className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm opacity-0 animate-fadeInUp" style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}>
                                    {config.fields.map(field => (
                                        <div key={field} className="flex justify-between items-start py-1 border-b border-zinc-100 last:border-b-0">
                                            <span className="text-sm font-semibold text-zinc-500">{fieldNames[field]}</span>
                                            <span className="text-sm text-zinc-800 text-right">{formatValue(attendee, field)}</span>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                        <div className="hidden md:block bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
                            <table className="min-w-full divide-y divide-zinc-200">
                                <thead className="bg-zinc-50"><tr >{config.fields.map(field => <th key={field} className="px-4 py-3 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">{fieldNames[field]}</th>)}</tr></thead>
                                <tbody className="bg-white divide-y divide-zinc-200">{data.map(attendee => (<tr key={attendee.id}>{config.fields.map(field => <td key={`${attendee.id}-${field}`} className="px-4 py-3 whitespace-nowrap text-sm text-zinc-700">{formatValue(attendee, field)}</td>)}</tr>))}</tbody>
                            </table>
                        </div>
                    </>
                ) : <p className="text-center text-zinc-500 animate-fadeIn">Nenhum registro encontrado para os filtros selecionados.</p>}
            </main>
        </div>
    );
};

// --- Componente: Painel Principal de Relatórios ---
const StatCard: React.FC<{ title: string; children: React.ReactNode; icon: React.ReactElement; className?: string, delay: number }> = ({ title, children, icon, className = '', delay }) => (
    <div className={`bg-white p-4 rounded-xl border border-zinc-200 shadow-sm opacity-0 animate-fadeInUp ${className}`} style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}>
        <div className="flex items-center gap-3 mb-3"><div className="text-green-500">{icon}</div><h2 className="text-md font-bold text-zinc-800">{title}</h2></div>
        <div className="space-y-3">{children}</div>
    </div>
);
const ProgressBar: React.FC<{ value: number; max: number; colorClass?: string }> = ({ value, max, colorClass = 'bg-green-500' }) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;
    return (<div className="w-full bg-zinc-200 rounded-full h-2"><div className={`${colorClass} h-2 rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }}></div></div>);
};

const ReportsDashboard: React.FC<{ attendees: Attendee[]; onGenerateReportClick: () => void; onLogout: () => void; }> = ({ attendees, onGenerateReportClick, onLogout }) => {
    const { totalAttendees, paidCount, pendingCount, totalRevenue, pendingRevenue, totalPossibleRevenue, buses } = useMemo(() => {
        const busAttendees = attendees.filter(a => a.packageType === PackageType.SITIO_BUS);
        const BUS_CAPACITY = 50;
        const busCount = Math.ceil(busAttendees.length / BUS_CAPACITY) || (busAttendees.length > 0 ? 1 : 0);
        return {
            totalAttendees: attendees.length,
            paidCount: attendees.filter(a => a.payment.status === PaymentStatus.PAGO).length,
            pendingCount: attendees.filter(a => a.payment.status === PaymentStatus.PENDENTE).length,
            totalRevenue: attendees.filter(a => a.payment.status === PaymentStatus.PAGO).reduce((sum, a) => sum + a.payment.amount, 0),
            pendingRevenue: attendees.filter(a => a.payment.status === PaymentStatus.PENDENTE).reduce((sum, a) => sum + a.payment.amount, 0),
            totalPossibleRevenue: attendees.reduce((sum, a) => sum + a.payment.amount, 0),
            buses: Array.from({ length: busCount }, (_, i) => {
                const filledSeats = Math.min(BUS_CAPACITY, Math.max(0, busAttendees.length - (i * BUS_CAPACITY)));
                return { busNumber: i + 1, filledSeats, remainingSeats: BUS_CAPACITY - filledSeats, capacity: BUS_CAPACITY };
            }),
        };
    }, [attendees]);

    const IconUsers = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.124-1.282-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.124-1.282.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
    const IconDollar = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01M12 12v-2m0 2v2m0-2.35V10M12 15v2m0-2v-2m0 0h.01M12 7.02c.164.017.324.041.48.072M7.5 9.51c.418-.472 1.012-.867 1.697-1.126M12 21a9 9 0 100-18 9 9 0 000 18z" /></svg>;
    const IconBus = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h8l2-2zM5 11h6" /></svg>;
    const IconClipboardList = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>;
    
    return (
        <div className="pb-4 animate-fadeIn">
            <header className="sticky top-0 md:static bg-white md:bg-transparent z-10 p-4 md:pt-6 border-b border-zinc-200 flex justify-between items-center">
                <h1 className="text-xl md:text-2xl font-bold text-zinc-800">Relatórios</h1>
                <button onClick={onLogout} className="p-2 text-zinc-500 rounded-full hover:bg-zinc-200 hover:text-zinc-800 transition-colors" aria-label="Sair">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                </button>
            </header>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard title="Inscrições" icon={IconUsers} delay={100}><div className="flex justify-between items-baseline"><span className="font-bold text-3xl text-zinc-800">{totalAttendees}</span><span className="text-sm font-semibold text-zinc-500">Total</span></div><ProgressBar value={paidCount} max={totalAttendees} /><div className="flex justify-between text-sm"><span className="font-semibold text-green-600">{paidCount} Pagos</span><span className="font-semibold text-yellow-600">{pendingCount} Pendentes</span></div></StatCard>
                <StatCard title="Financeiro" icon={IconDollar} delay={150}><div className="flex justify-between items-baseline"><span className="font-bold text-3xl text-zinc-800">R$ {totalRevenue.toFixed(2).replace('.',',')}</span><span className="text-sm font-semibold text-zinc-500">Arrecadado</span></div><ProgressBar value={totalRevenue} max={totalPossibleRevenue} /><div className="flex justify-between text-sm"><span className="font-semibold text-zinc-500">Pendente: R$ {pendingRevenue.toFixed(2).replace('.',',')}</span></div></StatCard>
                {buses.map((bus, index) => (<StatCard key={bus.busNumber} title={`Ônibus ${bus.busNumber}`} icon={IconBus} delay={200 + index * 50}><div className="flex justify-between items-baseline"><span className="font-bold text-3xl text-zinc-800">{bus.filledSeats}</span><span className="text-sm font-semibold text-zinc-500">/ {bus.capacity} vagas</span></div><ProgressBar value={bus.filledSeats} max={bus.capacity} colorClass="bg-blue-500" /><div className="flex justify-between text-sm"><span className="font-semibold text-blue-600">{bus.filledSeats} Preenchidas</span><span className="font-semibold text-zinc-500">{bus.remainingSeats} Restantes</span></div></StatCard>))}
                <StatCard title="Relatórios Personalizados" icon={IconClipboardList} delay={250} className="md:col-span-2"><p className="text-sm text-zinc-600">Crie relatórios com filtros e campos específicos. Exporte em PDF, imprima ou compartilhe.</p><button onClick={onGenerateReportClick} className="mt-2 w-full bg-blue-500 text-white font-bold py-2 px-4 rounded-full hover:bg-blue-600 transition-colors shadow-sm flex items-center justify-center gap-2">Gerar Relatório</button></StatCard>
            </div>
        </div>
    );
};

// --- Componente Principal ---
interface ReportsProps {
    attendees: Attendee[];
    onLogout: () => void;
}

const Reports: React.FC<ReportsProps> = ({ attendees, onLogout }) => {
    const [mode, setMode] = useState<'dashboard' | 'form' | 'preview'>('dashboard');
    const [reportConfig, setReportConfig] = useState<ReportConfig | null>(null);
    const [reportData, setReportData] = useState<Attendee[]>([]);

    const handleGenerate = (config: ReportConfig) => {
        const filteredData = attendees.filter(attendee => {
            const statusMatch = config.filters.status === 'all' || attendee.payment.status === config.filters.status;
            const packageMatch = config.filters.packageType === 'all' || attendee.packageType === config.filters.packageType;
            return statusMatch && packageMatch;
        });
        setReportConfig(config);
        setReportData(filteredData);
        setMode('preview');
    };

    if (mode === 'form') {
        return <InteractiveReportForm onGenerate={handleGenerate} onCancel={() => setMode('dashboard')} />;
    }

    if (mode === 'preview' && reportConfig) {
        return <InteractiveReportPreview data={reportData} config={reportConfig} onBack={() => setMode('form')} />;
    }

    return <ReportsDashboard attendees={attendees} onGenerateReportClick={() => setMode('form')} onLogout={onLogout} />;
};

export default Reports;