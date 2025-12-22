
import React, { useState, useMemo, useEffect } from 'react';
import type { Attendee, ReportConfig, ReportField, Event, FinancialRecord } from '../types';
import { PackageType, PaymentStatus, DocumentType, PaymentType, FinancialRecordType } from '../types';
import { formatDocument, getDocumentType } from '../utils/formatters';
import { levenshteinDistance } from '../utils/stringSimilarity';
import { useToast } from '../contexts/ToastContext';
import { generateReport } from '../services/geminiService';
import * as api from '../services/api';

// --- Componente: Modal de Confirmação de Mudança de Ônibus ---
const SpinnerIconModal: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);
interface ConfirmationRequest {
    attendee: Attendee;
    newBusNumber: number | null;
    assignmentType: 'manual' | 'auto';
}
interface BusChangeConfirmationModalProps {
    request: ConfirmationRequest;
    onConfirm: () => void;
    onCancel: () => void;
    isSaving: boolean;
}

const BusChangeConfirmationModal: React.FC<BusChangeConfirmationModalProps> = ({ request, onConfirm, onCancel, isSaving }) => {
    const { attendee, newBusNumber, assignmentType } = request;
    const currentBusNumber = attendee.busNumber;

    const getModalContent = () => {
        if (assignmentType === 'auto' && newBusNumber !== null) {
            return {
                title: "Confirmar Designação Manual",
                description: `Você está movendo "${attendee.person.name}" para o Ônibus ${newBusNumber}. Isso o tornará um passageiro designado manualmente e o fixará neste ônibus. Deseja continuar?`,
            };
        }
        if (currentBusNumber !== null && newBusNumber !== null && currentBusNumber !== newBusNumber) {
            return {
                title: "Confirmar Mudança de Ônibus",
                description: `Você tem certeza que deseja mover "${attendee.person.name}" do Ônibus ${currentBusNumber} para o Ônibus ${newBusNumber}?`,
            };
        }
        if (currentBusNumber !== null && newBusNumber === null) {
            return {
                title: "Remover Designação Manual",
                description: `Você está removendo a designação manual de "${attendee.person.name}". Ele voltará a ser alocado automaticamente em um ônibus com vagas. Deseja continuar?`,
            };
        }
        return { title: "Confirmar Alteração", description: "Por favor, confirme a sua ação." };
    };

    const { title, description } = getModalContent();

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full animate-popIn">
                <h3 className="text-lg leading-6 font-bold text-zinc-900">{title}</h3>
                <div className="mt-2">
                    <p className="text-sm text-zinc-600">{description}</p>
                </div>
                <div className="mt-5 sm:mt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                    <button type="button" onClick={onCancel} disabled={isSaving} className="w-full justify-center rounded-full border border-zinc-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-zinc-700 hover:bg-zinc-50 sm:w-auto sm:text-sm">
                        Cancelar
                    </button>
                    <button type="button" onClick={onConfirm} disabled={isSaving} className="w-full justify-center rounded-full border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 sm:w-auto sm:text-sm disabled:bg-green-400 flex items-center gap-2 min-w-[110px]">
                        {isSaving ? <SpinnerIconModal /> : null}
                        {isSaving ? 'Salvando...' : 'Confirmar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Modal de Confirmação de Exclusão Financeira ---
const ConfirmFinancialDeleteModal: React.FC<{
    record: FinancialRecord;
    onConfirm: () => void;
    onCancel: () => void;
    isDeleting: boolean;
}> = ({ record, onConfirm, onCancel, isDeleting }) => {
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full animate-popIn">
                <div className="flex flex-col items-center text-center">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                        <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </div>
                    <h3 className="text-lg leading-6 font-bold text-zinc-900">Excluir Movimentação</h3>
                    <p className="mt-2 text-sm text-zinc-600">
                        Tem certeza que deseja excluir a {record.type === FinancialRecordType.INCOME ? 'receita' : 'despesa'} 
                        <strong> "{record.description}"</strong> de R$ {record.amount.toFixed(2).replace('.', ',')}?
                    </p>
                </div>
                <div className="mt-5 sm:mt-6 flex flex-col-reverse sm:flex-row sm:justify-center gap-3">
                    <button onClick={onCancel} disabled={isDeleting} className="w-full justify-center rounded-full border border-zinc-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-zinc-700 hover:bg-zinc-50 sm:w-auto sm:text-sm">
                        Cancelar
                    </button>
                    <button onClick={onConfirm} disabled={isDeleting} className="w-full justify-center rounded-full border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 sm:w-auto sm:text-sm disabled:bg-red-400 flex items-center justify-center gap-2">
                        {isDeleting ? <SpinnerIconModal /> : null}
                        {isDeleting ? 'Excluindo...' : 'Excluir'}
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- Componente: Modal de Opções de Compartilhamento ---
const ShareOptionsModal: React.FC<{
    onClose: () => void;
    onShareAsText: () => void;
    onShareAsPdf: () => void;
}> = ({ onClose, onShareAsText, onShareAsPdf }) => {
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full animate-popIn" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg leading-6 font-bold text-zinc-900 mb-4 text-center">Como deseja compartilhar?</h3>
                <div className="space-y-3">
                    <button onClick={onShareAsText} className="w-full bg-green-500 text-white font-bold py-3 px-4 rounded-full hover:bg-green-600 transition-colors shadow-sm flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zM12.04 20.1c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31c-.82-1.31-1.26-2.83-1.26-4.41 0-4.54 3.7-8.24 8.24-8.24 4.54 0 8.24 3.7 8.24 8.24s-3.7 8.24-8.24 8.24zm4.24-6.23c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-1.12-.92-1.38-1.53-1.48-1.83-.12-.24-.02-.38.1-.5.1-.12.24-.3.36-.45.12-.15.16-.25.24-.41.08-.16.04-.3-.02-.42-.06-.12-.54-1.29-.74-1.77-.2-.48-.4-.41-.54-.42-.14 0-.3 0-.46 0-.16 0-.42.06-.64.3-.22.24-.86.84-.86 2.05 0 1.21.88 2.37 1 2.53.12.16 1.75 2.67 4.24 3.73.59.26 1.05.41 1.41.52.6.18 1.15.16 1.58.1.48-.06 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28z" /></svg>
                        <span>Texto via WhatsApp</span>
                    </button>
                    <button onClick={onShareAsPdf} className="w-full bg-blue-500 text-white font-bold py-3 px-4 rounded-full hover:bg-blue-600 transition-colors shadow-sm flex items-center justify-center gap-2">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v-2a1 1 0 011-1h8a1 1 0 011 1v2h1a2 2 0 002-2v-3a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" /></svg>
                        <span>Compartilhar como PDF</span>
                    </button>
                </div>
                 <button onClick={onClose} className="w-full text-zinc-700 font-bold py-3 px-4 rounded-full hover:bg-zinc-100 transition-colors mt-4">
                    Cancelar
                </button>
            </div>
        </div>
    );
};


// --- Componente: Formulário de Geração de Relatório ---
interface InteractiveReportFormProps { 
    onGenerate: (config: ReportConfig) => void; 
    onCancel: () => void; 
    initialReportType?: 'custom' | 'busList' | 'financialSummary';
}
const InteractiveReportForm: React.FC<InteractiveReportFormProps> = ({ onGenerate, onCancel, initialReportType = 'custom' }) => {
    const allFields: { id: ReportField; label: string }[] = [
        { id: 'person.name', label: 'Nome' },
        { id: 'person.document', label: 'Documento' },
        { id: 'person.phone', label: 'Telefone' },
        { id: 'packageType', label: 'Pacote' },
        { id: 'payment.status', label: 'Status do Pagamento' },
        { id: 'payment.amount', label: 'Valor' },
    ];

    const [reportType, setReportType] = useState<'custom' | 'busList' | 'financialSummary'>(initialReportType);
    const [selectedFields, setSelectedFields] = useState<ReportField[]>(['person.name', 'person.phone', 'packageType', 'payment.status']);
    const [statusFilter, setStatusFilter] = useState<'all' | PaymentStatus>('all');
    const [packageFilter, setPackageFilter] = useState<'all' | PackageType>('all');

    const handleFieldChange = (field: ReportField) => {
        setSelectedFields(prev =>
            prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]
        );
    };

    const handleGenerateClick = () => {
        if (reportType === 'custom' && selectedFields.length === 0) {
            return; // Prevent generating empty report
        }
        onGenerate({
            type: reportType,
            fields: reportType === 'busList' ? ['person.name', 'person.document', 'person.phone'] : selectedFields,
            filters: { status: statusFilter, packageType: packageFilter }
        });
    };
    
    const isCustomMode = reportType === 'custom';
    const isFinancialMode = reportType === 'financialSummary';

    return (
        <div className="animate-fadeIn">
            <header className="sticky top-0 md:static bg-white z-10 p-4 md:pt-6 border-b border-zinc-200 flex items-center gap-4">
                 <button onClick={onCancel} className="text-zinc-500 hover:text-zinc-800 p-1 rounded-full hover:bg-zinc-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h1 className="text-xl md:text-2xl font-bold text-zinc-800">Gerar Relatório</h1>
            </header>
            <main className="p-4 space-y-6">
                 <div className="opacity-0 animate-fadeInUp" style={{ animationFillMode: 'forwards', animationDelay: '100ms' }}>
                    <h3 className="text-md font-semibold text-zinc-700 mb-2">1. Escolha o tipo de relatório</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                        <label className="flex items-center space-x-2 p-2 rounded-md hover:bg-zinc-50 cursor-pointer">
                            <input type="radio" name="reportType" value="custom" checked={isCustomMode} onChange={() => setReportType('custom')} className="h-4 w-4 text-green-600 focus:ring-green-500 border-zinc-300"/>
                            <span className="text-sm text-zinc-700 font-medium">Lista Personalizada</span>
                        </label>
                        <label className="flex items-center space-x-2 p-2 rounded-md hover:bg-zinc-50 cursor-pointer">
                            <input type="radio" name="reportType" value="busList" checked={reportType === 'busList'} onChange={() => setReportType('busList')} className="h-4 w-4 text-green-600 focus:ring-green-500 border-zinc-300"/>
                            <span className="text-sm text-zinc-700 font-medium">Lista de Passageiros</span>
                        </label>
                        <label className="flex items-center space-x-2 p-2 rounded-md hover:bg-zinc-50 cursor-pointer">
                            <input type="radio" name="reportType" value="financialSummary" checked={isFinancialMode} onChange={() => setReportType('financialSummary')} className="h-4 w-4 text-green-600 focus:ring-green-500 border-zinc-300"/>
                            <span className="text-sm text-zinc-700 font-medium">Financeiro Completo</span>
                        </label>
                    </div>
                </div>

                <div className={`transition-opacity duration-300 ${isFinancialMode ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                    <div className="md:grid md:grid-cols-2 md:gap-6 space-y-6 md:space-y-0">
                        <div className="opacity-0 animate-fadeInUp" style={{ animationFillMode: 'forwards', animationDelay: '200ms' }}>
                            <h3 className="text-md font-semibold text-zinc-700 mb-2">2. Selecione os campos</h3>
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

                        <div className="opacity-0 animate-fadeInUp" style={{ animationFillMode: 'forwards', animationDelay: '300ms' }}>
                            <h3 className="text-md font-semibold text-zinc-700 mb-2">3. Aplique filtros (opcional)</h3>
                            <div className="space-y-3 bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                                <div>
                                    <label htmlFor="statusFilter" className="block text-sm font-medium text-zinc-700">Status do Pagamento</label>
                                    <select id="statusFilter" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="mt-1 block w-full px-3 py-2 bg-white border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm" autoComplete="off">
                                        <option value="all">Todos</option>
                                        <option value={PaymentStatus.PAGO}>Pago</option>
                                        <option value={PaymentStatus.PENDENTE}>Pendente</option>
                                        <option value={PaymentStatus.ISENTO}>Isento</option>
                                    </select>
                                </div>
                                <div>
                                <label htmlFor="packageFilter" className="block text-sm font-medium text-zinc-700">Tipo de Pacote</label>
                                    <select id="packageFilter" value={packageFilter} onChange={e => setPackageFilter(e.target.value as any)} className="mt-1 block w-full px-3 py-2 bg-white border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm" autoComplete="off">
                                        <option value="all">Todos</option>
                                        <option value={PackageType.SITIO_ONLY}>Apenas Sítio</option>
                                        <option value={PackageType.SITIO_BUS}>Sítio + Ônibus</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                 <div className="flex flex-col md:flex-row gap-3 pt-2 opacity-0 animate-fadeInUp" style={{ animationFillMode: 'forwards', animationDelay: '400ms' }}>
                    <button onClick={onCancel} className="w-full bg-zinc-200 text-zinc-800 font-bold py-3 px-4 rounded-full hover:bg-zinc-300 transition-colors">Cancelar</button>
                    <button onClick={handleGenerateClick} disabled={isCustomMode && selectedFields.length === 0} className="w-full bg-green-500 text-white font-bold py-3 px-4 rounded-full hover:bg-green-600 transition-colors shadow-sm disabled:bg-zinc-400 disabled:cursor-not-allowed">Gerar Relatório</button>
                </div>
            </main>
        </div>
    );
};

// --- Componente: Visualização do Relatório ---
interface InteractiveReportPreviewProps { 
    data: Attendee[] | Attendee[][]; 
    config: ReportConfig; 
    onBack: () => void; 
    event: Event | null; // Added
    confirmedRevenue: number; // Added
    extraIncome: number; // Added
    extraExpenses: number; // Added
    netProfit: number; // Added
    attendees: Attendee[]; // Added
    // Add extraRecords to the interface
    extraRecords: FinancialRecord[];
}

const InteractiveReportPreview: React.FC<InteractiveReportPreviewProps> = ({ data, config, onBack, event, confirmedRevenue, extraIncome, extraExpenses, netProfit, attendees, extraRecords }) => {
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isOrientationModalOpen, setIsOrientationModalOpen] = useState(false);
    
    const fieldNames: Record<ReportField, string> = {
        'person.name': 'Nome', 'person.document': 'Documento', 'person.phone': 'Telefone', packageType: 'Pacote',
        'payment.status': 'Status', 'payment.amount': 'Valor (R$)',
    };

    const getNestedProperty = (obj: any, path: string) => path.split('.').reduce((o, i) => (o ? o[i] : undefined), obj);

    const formatCustomValue = (attendee: Attendee, field: ReportField): string => {
        if (field === 'person.document') {
            if (attendee.person.documentType === DocumentType.OUTRO) {
                return attendee.person.document;
            }
            return `${attendee.person.document} (${attendee.person.documentType})`;
        }
        let value = getNestedProperty(attendee, field);
        if (field === 'payment.amount') return value.toFixed(2).replace('.', ',');
        return value || 'N/A';
    };

    const financialBreakdown = useMemo(() => {
        const sitePrice = event?.site_price ?? 70;
        const busPrice = event?.bus_price ?? 50;

        let totalSiteRevenue = 0;
        let totalBusRevenue = 0;

        attendees.forEach(a => {
            // Only count paid for confirmed revenue
            if (a.payment.status === PaymentStatus.PAGO || a.payment.sitePaymentDetails?.isPaid) {
                if (a.packageType === PackageType.SITIO_ONLY && !a.payment.sitePaymentDetails?.isExempt) {
                    totalSiteRevenue += sitePrice;
                } else if (a.packageType === PackageType.SITIO_BUS) {
                    if (a.payment.sitePaymentDetails?.isPaid && !a.payment.sitePaymentDetails?.isExempt) {
                        totalSiteRevenue += sitePrice;
                    }
                    if (a.payment.busPaymentDetails?.isPaid && !a.payment.busPaymentDetails?.isExempt) {
                        totalBusRevenue += busPrice;
                    }
                }
            }
        });
        return { totalSiteRevenue, totalBusRevenue };
    }, [attendees, event]);

    const renderFinancialReportContent = () => {
        if (!event) return <p className="text-center text-zinc-500">Nenhum evento selecionado para o relatório financeiro.</p>;
        
        const { totalSiteRevenue, totalBusRevenue } = financialBreakdown;
        const totalConfirmedEventRevenue = totalSiteRevenue + totalBusRevenue;
        
        return (
            <div className="space-y-6">
                <h2 className="text-3xl font-bold text-zinc-800 text-center">Balanço Financeiro - {event.name}</h2>
                <p className="text-sm text-zinc-500 text-center">Relatório gerado em: {new Date().toLocaleString('pt-BR')}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-emerald-50 p-5 rounded-2xl shadow-sm border border-emerald-200">
                        <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Lucro Líquido</p>
                        <p className={`text-4xl font-black mt-2 ${netProfit >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
                            R$ {netProfit.toFixed(2).replace('.', ',')}
                        </p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-zinc-200">
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Resumo Global</p>
                        <div className="mt-2 space-y-2 text-sm">
                            <div className="flex justify-between items-center">
                                <span className="text-zinc-600 font-medium">Receita de Inscrições</span>
                                <span className="font-bold text-emerald-600">+ R$ {totalConfirmedEventRevenue.toFixed(2).replace('.', ',')}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-zinc-600 font-medium">Receitas Extras</span>
                                <span className="font-bold text-emerald-600">+ R$ {extraIncome.toFixed(2).replace('.', ',')}</span>
                            </div>
                            <div className="flex justify-between items-center border-t border-zinc-100 pt-2">
                                <span className="text-zinc-600 font-medium">Despesas Extras</span>
                                <span className="font-bold text-rose-600">- R$ {extraExpenses.toFixed(2).replace('.', ',')}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-zinc-200">
                    <h3 className="text-xl font-bold text-zinc-800 mb-4">Detalhamento de Receitas de Inscrição</h3>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-md border-b border-zinc-100 pb-2">
                            <span className="font-semibold text-zinc-700">Receita Sítio (Confirmada)</span>
                            <span className="font-bold text-emerald-600">R$ {totalSiteRevenue.toFixed(2).replace('.', ',')}</span>
                        </div>
                        <div className="flex justify-between items-center text-md border-b border-zinc-100 pb-2">
                            <span className="font-semibold text-zinc-700">Receita Ônibus (Confirmada)</span>
                            <span className="font-bold text-emerald-600">R$ {totalBusRevenue.toFixed(2).replace('.', ',')}</span>
                        </div>
                        <div className="flex justify-between items-center text-lg pt-2 border-t border-zinc-200 font-bold">
                            <span>Total de Inscrições</span>
                            <span className="text-emerald-700">R$ {totalConfirmedEventRevenue.toFixed(2).replace('.', ',')}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-zinc-200">
                    <h3 className="text-xl font-bold text-zinc-800 mb-4">Movimentações Financeiras Extras</h3>
                    {extraRecords.length === 0 ? (
                        <p className="text-center text-zinc-500 italic">Nenhuma movimentação extra registrada.</p>
                    ) : (
                        <div className="space-y-2">
                            {extraRecords.map((record) => (
                                <div key={record.id} className="flex justify-between items-center p-2 rounded-lg bg-zinc-50 border border-zinc-100">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-1.5 rounded-full ${record.type === FinancialRecordType.INCOME ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                            {record.type === FinancialRecordType.INCOME 
                                                ? <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                                                : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                            }
                                        </div>
                                        <div>
                                            <p className="font-semibold text-zinc-800 text-sm">{record.description}</p>
                                            <p className="text-xs text-zinc-500">{new Date(record.date).toLocaleDateString('pt-BR')}</p>
                                        </div>
                                    </div>
                                    <span className={`font-bold text-sm ${record.type === FinancialRecordType.INCOME ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {record.type === FinancialRecordType.INCOME ? '+' : '-'} R$ {record.amount.toFixed(2).replace('.', ',')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };
    
    const getFinancialReportHtml = (orientation: 'portrait' | 'landscape') => {
        if (!event) return '';
        const { totalSiteRevenue, totalBusRevenue } = financialBreakdown;
        const totalConfirmedEventRevenue = totalSiteRevenue + totalBusRevenue;
        const pageStyle = `@page { size: A4 ${orientation}; margin: 1in; }`;

        return `
            <!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Relatório Financeiro</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 1.5rem; color: #333; }
                h1 { color: #10B981; border-bottom: 2px solid #10B981; padding-bottom: 0.5rem; text-align: center; }
                h2 { font-size: 1.5rem; margin-top: 1.5rem; margin-bottom: 0.5rem; color: #333; text-align: center; }
                h3 { font-size: 1.2rem; margin-top: 1rem; margin-bottom: 0.5rem; color: #333; }
                p { font-size: 0.9rem; margin-bottom: 0.5rem; }
                .summary-box { background-color: #f0fdf4; border: 1px solid #dcfce7; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; }
                .income { color: #059669; font-weight: bold; }
                .expense { color: #ef4444; font-weight: bold; }
                .net-profit { font-size: 1.8rem; font-weight: bold; text-align: center; margin-bottom: 1rem; }
                .net-profit.positive { color: #10B981; }
                .net-profit.negative { color: #ef4444; }
                .detail-section { background-color: #ffffff; border: 1px solid #e5e7eb; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; }
                .detail-row { display: flex; justify-content: space-between; padding: 0.25rem 0; border-bottom: 1px dashed #f3f4f6; }
                .detail-row:last-child { border-bottom: none; }
                .extra-item { display: flex; justify-content: space-between; font-size: 0.85rem; padding: 0.4rem 0; border-bottom: 1px solid #f3f4f6; }
                .extra-item-desc { flex: 1; margin-right: 1rem; }
                ${pageStyle}
            </style></head><body>
                <h1>Relatório Financeiro Completo</h1>
                <p style="text-align: center;"><strong>Evento:</strong> ${event.name}</p>
                <p style="text-align: center;"><strong>Data de Geração:</strong> ${new Date().toLocaleString('pt-BR')}</p>

                <div class="summary-box" style="background-color: ${netProfit >= 0 ? '#f0fdf4' : '#fff0f0'}; border-color: ${netProfit >= 0 ? '#dcfce7' : '#ffdddd'};">
                    <h2>Balanço Geral</h2>
                    <p class="net-profit ${netProfit >= 0 ? 'positive' : 'negative'}">
                        R$ ${netProfit.toFixed(2).replace('.', ',')}
                    </p>
                    <div style="display: flex; justify-content: space-around; margin-top: 1rem;">
                        <p>Total Receitas: <span class="income">R$ ${(totalConfirmedEventRevenue + extraIncome).toFixed(2).replace('.', ',')}</span></p>
                        <p>Total Despesas: <span class="expense">R$ ${extraExpenses.toFixed(2).replace('.', ',')}</span></p>
                    </div>
                </div>

                <div class="detail-section">
                    <h3>Receitas de Inscrições Confirmadas</h3>
                    <div class="detail-row"><span>Receita Sítio</span><span class="income">R$ ${totalSiteRevenue.toFixed(2).replace('.', ',')}</span></div>
                    <div class="detail-row"><span>Receita Ônibus</span><span class="income">R$ ${totalBusRevenue.toFixed(2).replace('.', ',')}</span></div>
                    <div class="detail-row" style="font-weight: bold; border-top: 1px solid #e5e7eb; margin-top: 0.5rem; padding-top: 0.5rem;">
                        <span>TOTAL INSCRIÇÕES</span><span class="income">R$ ${totalConfirmedEventRevenue.toFixed(2).replace('.', ',')}</span>
                    </div>
                </div>

                <div class="detail-section">
                    <h3>Movimentações Financeiras Extras</h3>
                    ${extraRecords.length === 0 ? '<p style="text-align: center; color: #6b7280;">Nenhuma movimentação extra registrada.</p>' :
                        extraRecords.map(record => `
                            <div class="extra-item">
                                <span class="extra-item-desc">${new Date(record.date).toLocaleDateString('pt-BR')} - ${record.description}</span>
                                <span class="${record.type === FinancialRecordType.INCOME ? 'income' : 'expense'}">
                                    ${record.type === FinancialRecordType.INCOME ? '+' : '-'} R$ ${record.amount.toFixed(2).replace('.', ',')}
                                </span>
                            </div>
                        `).join('')
                    }
                    <div class="detail-row" style="font-weight: bold; border-top: 1px solid #e5e7eb; margin-top: 0.5rem; padding-top: 0.5rem;">
                        <span>Total Receitas Extras</span><span class="income">R$ ${extraIncome.toFixed(2).replace('.', ',')}</span>
                    </div>
                    <div class="detail-row" style="font-weight: bold;">
                        <span>Total Despesas Extras</span><span class="expense">R$ ${extraExpenses.toFixed(2).replace('.', ',')}</span>
                    </div>
                </div>
            </body></html>`;
    };
    
    const getFinancialReportText = () => {
        if (!event) return "Nenhum evento selecionado para o relatório financeiro.";
        
        const { totalSiteRevenue, totalBusRevenue } = financialBreakdown;
        const totalConfirmedEventRevenue = totalSiteRevenue + totalBusRevenue;

        let reportText = `📊 Balanço Financeiro - ${event.name}\n`;
        reportText += `_Gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}_\n\n`;

        reportText += `*Balanço Geral: R$ ${netProfit.toFixed(2).replace('.', ',')}*\n\n`;
        reportText += `_Resumo Global:_\n`;
        reportText += `➡️ Receita Inscrições: + R$ ${totalConfirmedEventRevenue.toFixed(2).replace('.', ',')}\n`;
        reportText += `➡️ Receitas Extras:    + R$ ${extraIncome.toFixed(2).replace('.', ',')}\n`;
        reportText += `➡️ Despesas Extras:    - R$ ${extraExpenses.toFixed(2).replace('.', ',')}\n`;
        reportText += `-------------------------------\n`;
        reportText += `*TOTAL FINAL: R$ ${netProfit.toFixed(2).replace('.', ',')}*\n\n`;

        reportText += `_Detalhes Receitas de Inscrição:_\n`;
        reportText += `- Sítio: R$ ${totalSiteRevenue.toFixed(2).replace('.', ',')}\n`;
        reportText += `- Ônibus: R$ ${totalBusRevenue.toFixed(2).replace('.', ',')}\n`;
        reportText += `Total Inscrições: R$ ${totalConfirmedEventRevenue.toFixed(2).replace('.', ',')}\n\n`;

        if (extraRecords.length > 0) {
            reportText += `_Movimentações Extras:_\n`;
            extraRecords.forEach(record => {
                const sign = record.type === FinancialRecordType.INCOME ? '+' : '-';
                reportText += `${sign} R$ ${record.amount.toFixed(2).replace('.', ',')} - ${new Date(record.date).toLocaleDateString('pt-BR')} - ${record.description}\n`;
            });
            reportText += `Total Receitas Extras: + R$ ${extraIncome.toFixed(2).replace('.', ',')}\n`;
            reportText += `Total Despesas Extras: - R$ ${extraExpenses.toFixed(2).replace('.', ',')}\n\n`;
        } else {
            reportText += `_Nenhuma movimentação extra registrada._\n\n`;
        }

        reportText += `_Axé!_ ✨`;
        return reportText;
    };
    
    const handlePrintAndExport = (orientation: 'portrait' | 'landscape') => {
        setIsOrientationModalOpen(false);
        let printableHtml = '';
        

        if (config.type === 'busList') {
            const busData = data as Attendee[][];
            const pageStyle = `@page { size: A4 ${orientation}; margin: 1in; }`;
            const busSectionsHtml = busData.map((bus, index) => `
                <div class="bus-section${index === 0 ? ' bus-section--first' : ''}">
                    <h2>Ônibus ${index + 1} (${bus.length} passageiros)</h2>
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 30px; text-align: center;">#</th>
                                <th style="width: 70px; text-align: center;">Check-in</th>
                                <th>Nome</th>
                                <th>Documento</th>
                                <th>Telefone</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${bus.map((p, passengerIndex) => `
                                <tr>
                                    <td style="text-align: center;">${passengerIndex + 1}</td>
                                    <td style="font-family: 'DejaVu Sans', sans-serif; font-size: 1.5rem; text-align: center; vertical-align: middle; padding: 4px;">&#9744;</td>
                                    <td>${p.person.name}</td>
                                    <td>${p.person.document}<br><span style="font-size:0.9em; color:#555;">(${p.person.documentType})</span></td>
                                    <td>${p.person.phone}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `).join('');

            printableHtml = `
                <!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Lista de Passageiros</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 1.5rem; color: #333; }
                    h1 { color: #10B981; border-bottom: 2px solid #10B981; padding-bottom: 0.5rem; }
                    h2 { font-size: 1.2rem; margin-top: 1.5rem; margin-bottom: 0.5rem; }
                    p { font-size: 0.9rem; margin-bottom: 1.5rem; }
                    table { width: 100%; border-collapse: separate; border-spacing: 0; margin-top: 1rem; font-size: 0.8rem; }
                    th, td { padding: 8px; text-align: left; vertical-align: top; border-bottom: 1px solid #ddd; }
                    th { background-color: #f7f7f7; font-weight: 600; border-top: 1px solid #ddd; }
                    th:first-child, td:first-child { border-left: 1px solid #ddd; }
                    th:last-child, td:last-child { border-right: 1px solid #ddd; }
                    tr:nth-child(even) { background-color: #fcfcfc; }
                    thead { display: table-header-group; }
                    tbody tr { page-break-inside: avoid; }
                    .bus-section { page-break-inside: avoid; }
                    .bus-section--first { page-break-inside: auto; }
                    .bus-section + .bus-section { page-break-before: always; }
                    ${pageStyle}
                    @media print { body { margin: 0; } .bus-section + .bus-section { margin-top: 0; } }
                </style></head><body>
                    <h1>Lista de Passageiros</h1>
                    <p><strong>Data de Geração:</strong> ${new Date().toLocaleString('pt-BR')}</p>
                    ${busSectionsHtml}
                </body></html>`;

        } else if (config.type === 'financialSummary') {
            printableHtml = getFinancialReportHtml(orientation);
        }
        else { // Custom report
            const customData = data as Attendee[];
            const pageStyle = `@page { size: A4 ${orientation}; margin: 1in; }`;
            const tableHeaders = config.fields.map(field => `<th>${fieldNames[field]}</th>`).join('');
            const tableRows = customData.map(attendee => `<tr>${config.fields.map(field => `<td>${formatCustomValue(attendee, field)}</td>`).join('')}</tr>`).join('');
            const appliedFilters = `Status: ${config.filters.status}, Pacote: ${config.filters.packageType}`;
            printableHtml = `
                <!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Relatório Gira da Mata</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 1.5rem; color: #333; }
                    h1 { color: #10B981; border-bottom: 2px solid #10B981; padding-bottom: 0.5rem; } p { font-size: 0.9rem; }
                    table { width: 100%; border-collapse: separate; border-spacing: 0; margin-top: 1rem; font-size: 0.8rem; }
                    th, td { padding: 8px; text-align: left; vertical-align: top; border-bottom: 1px solid #ddd; }
                    th { background-color: #f7f7f7; font-weight: 600; border-top: 1px solid #ddd; }
                    th:first-child, td:first-child { border-left: 1px solid #ddd; }
                    th:last-child, td:last-child { border-right: 1px solid #ddd; }
                    tr:nth-child(even) { background-color: #fcfcfc; }
                    thead { display: table-header-group; }
                    tbody tr { page-break-inside: avoid; }
                    ${pageStyle}
                </style></head><body>
                    <h1>Relatório - Gira da Mata</h1>
                    <p><strong>Data de Geração:</strong> ${new Date().toLocaleString('pt-BR')}</p>
                    <p><strong>Filtros Aplicados:</strong> ${appliedFilters}</p>
                    <p><strong>Total de Registros:</strong> ${customData.length}</p>
                    <table><thead><tr>${tableHeaders}</tr></thead><tbody>${tableRows}</tbody></table>
                </body></html>`;
        }

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(printableHtml);
            printWindow.document.close();
            setTimeout(() => {
                printWindow.focus();
                printWindow.print();
            }, 250);
        } else {
            alert('A janela de impressão foi bloqueada. Por favor, habilite pop-ups para este site e tente novamente.');
        }
    };
    
    const handleShareAsText = async () => {
        setIsShareModalOpen(false);
        let reportText = '';
        let title = '';

        if (config.type === 'busList') {
            const buses = data as Attendee[][];
            title = `Lista de Passageiros - Gira da Mata 2025`;
            reportText = `${title}\n\n`;
            buses.forEach((bus, index) => {
                reportText += `*Ônibus ${index + 1} (${bus.length} passageiros)*\n`;
                bus.forEach(p => {
                    reportText += `- ${p.person.name} (${p.person.document})\n`;
                });
                reportText += '\n';
            });

        } else if (config.type === 'financialSummary') {
            title = `Balanço Financeiro - ${event?.name || 'Evento'}`;
            reportText = getFinancialReportText();
        }
        else { // Custom report
            const customData = data as Attendee[];
            title = `Relatório Gira da Mata (${customData.length} registros)`;
            reportText = `${title}\n\n`;
            customData.forEach((attendee) => {
                reportText += `*${formatCustomValue(attendee, 'person.name')}*\n`;
                config.fields.forEach(field => {
                    if (field !== 'person.name') {
                        reportText += ` - ${fieldNames[field]}: ${formatCustomValue(attendee, field)}\n`;
                    }
                });
                reportText += '\n';
            });
        }

        if (navigator.share) {
            try {
                await navigator.share({ title, text: reportText });
            } catch (error) {
                console.error('Error sharing text:', error);
            }
        } else {
            const encodedText = encodeURIComponent(reportText);
            const whatsappUrl = `https://wa.me/?text=${encodedText}`;
            window.open(whatsappUrl, '_blank');
        }
    };

    const handleShareAsPdf = () => {
        setIsShareModalOpen(false);
        setIsOrientationModalOpen(true);
    };

    const reportTitle = useMemo(() => {
        if (config.type === 'busList') return 'Lista de Passageiros';
        if (config.type === 'financialSummary') return `Relatório Financeiro (${event?.name || 'Evento'})`;
        return `Relatório (${(data as any[]).flat().length})`;
    }, [config.type, data, event]);

    return (
        <div className="flex flex-col animate-fadeIn">
             <header className="sticky top-0 md:static bg-white z-10 p-4 md:pt-6 border-b border-zinc-200 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-zinc-500 hover:text-zinc-800 p-1 rounded-full hover:bg-zinc-100">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <h1 className="text-xl md:text-2xl font-bold text-zinc-800">
                        {reportTitle}
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setIsShareModalOpen(true)} className="p-2 rounded-full text-zinc-700 bg-zinc-200 hover:bg-zinc-300 transition-colors" aria-label="Compartilhar">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg>
                    </button>
                    <button onClick={() => setIsOrientationModalOpen(true)} className="p-2 rounded-full text-white bg-blue-500 hover:bg-blue-600 transition-colors shadow-sm" aria-label="Imprimir / PDF">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v-2a1 1 0 011-1h8a1 1 0 011 1v2h1a2 2 0 002-2v-3a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" /></svg>
                    </button>
                </div>
            </header>
            <main className="flex-grow p-4 space-y-4">
                {config.type === 'busList' ? (
                    (data as Attendee[][]).map((bus, index) => (
                        <div key={index} className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm opacity-0 animate-fadeInUp" style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}>
                            <h2 className="font-bold text-lg text-zinc-800 mb-3">Ônibus {index + 1} ({bus.length} passageiros)</h2>
                            
                            {/* Mobile View - Cards */}
                            <div className="md:hidden space-y-2">
                                {bus.map((p, pIndex) => (
                                    <div key={p.id} className="bg-zinc-50 p-3 rounded-lg border border-zinc-200">
                                        <div className="flex justify-between items-start">
                                            <p className="font-bold text-zinc-800 mr-2">{p.person.name}</p>
                                            <p className="text-sm font-semibold text-zinc-500 flex-shrink-0">#{pIndex + 1}</p>
                                        </div>
                                        <div className="mt-1 text-sm text-zinc-600 space-y-1">
                                            <p>{`${p.person.document} (${p.person.documentType})`}</p>
                                            <p>{p.person.phone}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Desktop View - Table */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-zinc-200">
                                            <th className="py-2 pr-2 text-left font-semibold text-zinc-500 w-8">#</th>
                                            <th className="py-2 px-2 text-left font-semibold text-zinc-500">Nome</th>
                                            <th className="py-2 px-2 text-left font-semibold text-zinc-500">Documento</th>
                                            <th className="py-2 px-2 text-left font-semibold text-zinc-500">Telefone</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {bus.map((p, pIndex) => (
                                            <tr key={p.id} className="border-b border-zinc-100 last:border-b-0">
                                                <td className="py-2 pr-2 text-zinc-600">{pIndex + 1}</td>
                                                <td className="py-2 px-2 text-zinc-800 font-medium">{p.person.name}</td>
                                                <td className="py-2 px-2 text-zinc-600">{`${p.person.document} (${p.person.documentType})`}</td>
                                                <td className="py-2 px-2 text-zinc-600">{p.person.phone}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))
                ) : config.type === 'financialSummary' ? (
                    renderFinancialReportContent()
                ) : (
                    <>
                        {(data as Attendee[]).length > 0 ? (
                            <>
                                <div className="md:hidden space-y-3">
                                    {(data as Attendee[]).map((attendee, index) => (
                                        <div key={attendee.id} className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm opacity-0 animate-fadeInUp" style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}>
                                            {config.fields.map(field => (
                                                <div key={field} className="flex justify-between items-start py-1 border-b border-zinc-100 last:border-b-0">
                                                    <span className="text-sm font-semibold text-zinc-500">{fieldNames[field]}</span>
                                                    <span className="text-sm text-zinc-800 text-right">{formatCustomValue(attendee, field)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                                <div className="hidden md:block bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
                                    <table className="min-w-full divide-y divide-zinc-200">
                                        <thead className="bg-zinc-50"><tr >{config.fields.map(field => <th key={field} className="px-4 py-3 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">{fieldNames[field]}</th>)}</tr></thead>
                                        <tbody className="bg-white divide-y divide-zinc-200">{(data as Attendee[]).map(attendee => (<tr key={attendee.id}>{config.fields.map(field => <td key={`${attendee.id}-${field}`} className="px-4 py-3 whitespace-nowrap text-sm text-zinc-700">{formatCustomValue(attendee, field)}</td>)}</tr>))}</tbody>
                                    </table>
                                </div>
                            </>
                        ) : <p className="text-center text-zinc-500 animate-fadeIn">Nenhum registro encontrado para os filtros selecionados.</p>}
                    </>
                )}
            </main>
            {isShareModalOpen && (
                <ShareOptionsModal
                    onClose={() => setIsShareModalOpen(false)}
                    onShareAsText={handleShareAsText}
                    onShareAsPdf={handleShareAsPdf}
                />
            )}
            {isOrientationModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fadeIn" onClick={() => setIsOrientationModalOpen(false)}>
                    <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full animate-popIn" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg leading-6 font-bold text-zinc-900 mb-4 text-center">Escolha a Orientação</h3>
                        <div className="space-y-3">
                            <button onClick={() => handlePrintAndExport('portrait')} className="w-full bg-zinc-100 text-zinc-800 font-bold py-3 px-4 rounded-full hover:bg-zinc-200 transition-colors shadow-sm flex items-center justify-center gap-2">
                                Retrato (Vertical)
                            </button>
                            <button onClick={() => handlePrintAndExport('landscape')} className="w-full bg-zinc-100 text-zinc-800 font-bold py-3 px-4 rounded-full hover:bg-zinc-200 transition-colors shadow-sm flex items-center justify-center gap-2">
                                Paisagem (Horizontal)
                            </button>
                        </div>
                        <button onClick={() => setIsOrientationModalOpen(false)} className="w-full text-zinc-700 font-bold py-3 px-4 rounded-full hover:bg-zinc-100 transition-colors mt-4">
                            Cancelar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Componentes para correção de documentos ---
const SpinnerIcon: React.FC<{ white?: boolean }> = ({ white = true }) => (
    <svg className={`animate-spin h-4 w-4 ${white ? 'text-white' : 'text-zinc-700'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

interface ConfirmDocUpdateModalProps {
    attendeeName: string;
    newDocument: string;
    docType: DocumentType;
    onConfirm: () => void;
    onCancel: () => void;
    isSaving: boolean;
}

const ConfirmDocUpdateModal: React.FC<ConfirmDocUpdateModalProps> = ({ attendeeName, newDocument, docType, onConfirm, onCancel, isSaving }) => (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fadeIn">
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full animate-popIn">
            <h3 className="text-lg leading-6 font-bold text-zinc-900">Confirmar Alteração?</h3>
            <div className="mt-4 space-y-2 text-sm">
                <p><span className="font-semibold text-zinc-500">Nome:</span> <span className="text-zinc-800">{attendeeName}</span></p>
                <p><span className="font-semibold text-zinc-500">Novo Documento:</span> <span className="font-mono text-zinc-800">{newDocument} ({docType})</span></p>
            </div>
            <p className="mt-3 text-xs text-zinc-500">Essa ação atualizará o documento do inscrito. Verifique se as informações estão corretas.</p>
            <div className="mt-5 sm:mt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                <button type="button" onClick={onCancel} disabled={isSaving} className="w-full justify-center rounded-full border border-zinc-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-zinc-700 hover:bg-zinc-50 sm:w-auto sm:text-sm">
                    Cancelar
                </button>
                <button type="button" onClick={onConfirm} disabled={isSaving} className="w-full justify-center rounded-full border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 sm:w-auto sm:text-sm disabled:bg-green-400 flex items-center gap-2">
                    {isSaving ? <SpinnerIcon /> : null}
                    {isSaving ? 'Salvando...' : 'Confirmar'}
                </button>
            </div>
        </div>
    </div>
);


interface ZeroDocListItemProps {
    attendee: Attendee;
    onUpdate: (attendee: Attendee) => Promise<void>;
}

const ZeroDocListItem: React.FC<ZeroDocListItemProps> = ({ attendee, onUpdate }) => {
    const { addToast } = useToast();
    const [documentValue, setDocumentValue] = useState(attendee.person.document);
    const [docType, setDocType] = useState<DocumentType>(() => getDocumentType(attendee.person.document).type);
    const [error, setError] = useState('');
    const [status, setStatus] = useState<'idle' | 'saving' | 'success'>('idle');
    const [isConfirming, setIsConfirming] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formattedValue = formatDocument(e.target.value);
        setDocumentValue(formattedValue);
        const { type } = getDocumentType(formattedValue);
        setDocType(type);
        setError('');
    };

    const handleInitiateSave = () => {
        setError('');
        const docInfo = getDocumentType(documentValue);
        if (!docInfo.valid || /^0+$/.test(documentValue.replace(/[^\d]/g, ''))) {
            setError('Documento inválido ou ainda pendente.');
            return;
        }
        setIsConfirming(true);
    };

    const handleConfirmSave = async () => {
        setStatus('saving');
        try {
            const updatedAttendee: Attendee = {
                ...attendee,
                person: {
                    ...attendee.person,
                    document: documentValue,
                    documentType: docType,
                }
            };
            await onUpdate(updatedAttendee);
            setStatus('success');
            addToast(`Documento de ${attendee.person.name} salvo.`, 'success');
        } catch (err) {
            console.error(err);
            addToast('Falha ao salvar. Tente novamente.', 'error');
            setStatus('idle');
        } finally {
            setIsConfirming(false);
        }
    };
    
    const isIdle = status === 'idle';

    return (
        <>
            <div className={`bg-white p-3 rounded-xl border border-zinc-200 shadow-sm transition-opacity duration-500 ${status === 'success' ? 'opacity-40' : 'opacity-100'}`}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="font-bold text-zinc-800 flex-1 min-w-0">{attendee.person.name}</p>
                    <div className="flex items-center gap-2">
                        <div className="relative w-40">
                            <input
                                type="tel"
                                value={documentValue}
                                onChange={handleInputChange}
                                placeholder="Novo documento"
                                disabled={!isIdle}
                                className={`w-full pl-2 pr-10 py-1 bg-white border ${error ? 'border-red-500' : 'border-zinc-300'} rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500`}
                                autoComplete="off"
                            />
                            {docType !== DocumentType.OUTRO && documentValue.length > 0 && (
                                <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                                    <span className="text-zinc-500 text-xs font-semibold bg-zinc-100 px-1.5 py-0.5 rounded-md animate-fadeIn">
                                        {docType}
                                    </span>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={handleInitiateSave}
                            disabled={!isIdle}
                            className="bg-green-500 text-white font-semibold text-sm py-1 px-3 rounded-full hover:bg-green-600 transition-colors disabled:bg-green-300 disabled:cursor-not-allowed flex items-center justify-center w-20"
                        >
                            {status === 'success' ? 'Salvo!' : 'Salvar'}
                        </button>
                    </div>
                </div>
                {error && <p className="mt-1 text-xs text-red-600 animate-fadeIn pl-2">{error}</p>}
            </div>
            {isConfirming && (
                <ConfirmDocUpdateModal
                    attendeeName={attendee.person.name}
                    newDocument={documentValue}
                    docType={docType}
                    onConfirm={handleConfirmSave}
                    onCancel={() => setIsConfirming(false)}
                    isSaving={status === 'saving'}
                />
            )}
        </>
    );
};


interface ZeroDocListProps {
    attendees: Attendee[];
    onBack: () => void;
    onUpdateAttendee: (attendee: Attendee) => Promise<void>;
}

const ZeroDocList: React.FC<ZeroDocListProps> = ({ attendees, onBack, onUpdateAttendee }) => {
    return (
        <div className="animate-fadeIn">
            <header className="sticky top-0 md:static bg-white z-10 p-4 md:pt-6 border-b border-zinc-200 flex items-center gap-4">
                <button onClick={onBack} className="text-zinc-500 hover:text-zinc-800 p-1 rounded-full hover:bg-zinc-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h1 className="text-xl md:text-2xl font-bold text-zinc-800">Corrigir Documentos ({attendees.length})</h1>
            </header>
            <main className="p-4 space-y-3">
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-lg text-sm">
                    <p>A lista abaixo mostra os inscritos que registraram um documento com "000...". Por favor, atualize com o documento correto de cada um.</p>
                </div>
                {attendees.length > 0 ? (
                    attendees.map((attendee, index) => (
                        <div key={attendee.id} className="opacity-0 animate-fadeInUp" style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}>
                            <ZeroDocListItem attendee={attendee} onUpdate={onUpdateAttendee} />
                        </div>
                    ))
                ) : (
                    <div className="text-center text-zinc-500 py-12">
                        <p className="font-semibold">Nenhuma pendência encontrada!</p>
                        <p className="mt-1 text-sm">Todos os documentos foram corrigidos. 🎉</p>
                    </div>
                )}
            </main>
        </div>
    );
};

// --- Componente: Verificador de Duplicatas ---
interface DuplicateCheckerViewProps {
    groups: Attendee[][];
    onBack: () => void;
    onSelectAttendee: (id: string) => void;
}

const DuplicateCheckerView: React.FC<DuplicateCheckerViewProps> = ({ groups, onBack, onSelectAttendee }) => {
    return (
        <div className="animate-fadeIn">
            <header className="sticky top-0 md:static bg-white z-10 p-4 md:pt-6 border-b border-zinc-200 flex items-center gap-4">
                <button onClick={onBack} className="text-zinc-500 hover:text-zinc-800 p-1 rounded-full hover:bg-zinc-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h1 className="text-xl md:text-2xl font-bold text-zinc-800">Verificar Duplicatas ({groups.length})</h1>
            </header>
            <main className="p-4 space-y-4">
                 <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-lg text-sm">
                    <p>Foram encontrados {groups.length} grupos com nomes idênticos ou muito parecidos. Verifique se são inscrições duplicadas.</p>
                </div>

                {groups.length > 0 ? (
                    groups.map((group, index) => (
                         <div key={index} className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm opacity-0 animate-fadeInUp" style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}>
                            <h2 className="font-bold text-zinc-800 mb-2">Potencial Duplicidade #{index + 1}</h2>
                            <div className="space-y-2">
                                {group.map(attendee => (
                                    <button key={attendee.id} onClick={() => onSelectAttendee(attendee.id)} className="w-full text-left p-3 bg-zinc-50 rounded-lg hover:bg-zinc-100 transition-colors flex justify-between items-center border border-zinc-200">
                                        <div>
                                            <p className="font-semibold text-zinc-900">{attendee.person.name}</p>
                                            <p className="text-xs text-zinc-500 mt-1">{attendee.person.document} &bull; {attendee.person.phone}</p>
                                        </div>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-zinc-400" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center text-zinc-500 py-12">
                        <p className="font-semibold">Nenhuma duplicidade encontrada!</p>
                        <p className="mt-1 text-sm">Não foram encontrados nomes similares ou repetidos. ✨</p>
                    </div>
                )}
            </main>
        </div>
    );
};

// --- Componente: Detalhes Financeiros ---
interface FinancialData {
    paidSitio: number;
    totalSitio: number;
    pendingSitio: number;
    paidBus: number;
    totalBus: number;
    pendingBus: number;
    // Counts
    countPaidSitio: number;
    countTotalSitio: number;
    countPendingSitio: number;
    countPaidBus: number;
    countTotalBus: number;
    countPendingBus: number;
}
const FinancialDetailCard: React.FC<{ title: string; paid: number; total: number; countPaid: number; countTotal: number; }> = ({ title, paid, total, countPaid, countTotal }) => (
    <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm space-y-3">
        <h3 className="font-bold text-lg text-zinc-800">{title}</h3>
        <div>
            <div className="flex justify-between items-baseline">
                <span className="font-bold text-3xl text-zinc-800">R$ {paid.toFixed(2).replace('.', ',')}</span>
                <span className="text-sm font-semibold text-zinc-500">de R$ {total.toFixed(2).replace('.', ',')}</span>
            </div>
             <p className="text-xs text-zinc-400 mt-1 mb-2 font-medium">
                {countPaid} de {countTotal} pagantes
            </p>
            <ProgressBar value={paid} max={total} />
        </div>
    </div>
);
const FinancialDetailView: React.FC<{ financialData: FinancialData; onBack: () => void; }> = ({ financialData, onBack }) => {
    return (
        <div className="animate-fadeIn">
            <header className="sticky top-0 md:static bg-white z-10 p-4 md:pt-6 border-b border-zinc-200 flex items-center gap-4">
                <button onClick={onBack} className="text-zinc-500 hover:text-zinc-800 p-1 rounded-full hover:bg-zinc-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h1 className="text-xl md:text-2xl font-bold text-zinc-800">Detalhes Financeiros</h1>
            </header>
            <main className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="opacity-0 animate-fadeInUp" style={{ animationFillMode: 'forwards', animationDelay: '100ms' }}>
                    <FinancialDetailCard 
                        title="Arrecadado (Sítio)" 
                        paid={financialData.paidSitio} 
                        total={financialData.totalSitio}
                        countPaid={financialData.countPaidSitio}
                        countTotal={financialData.countTotalSitio}
                    />
                </div>
                 <div className="opacity-0 animate-fadeInUp" style={{ animationFillMode: 'forwards', animationDelay: '200ms' }}>
                    <FinancialDetailCard 
                        title="Arrecadado (Ônibus)" 
                        paid={financialData.paidBus} 
                        total={financialData.totalBus}
                        countPaid={financialData.countPaidBus}
                        countTotal={financialData.countTotalBus}
                    />
                </div>
                <div className="bg-red-50 p-4 rounded-xl border border-red-200 shadow-sm space-y-3 opacity-0 animate-fadeInUp" style={{ animationFillMode: 'forwards', animationDelay: '300ms' }}>
                     <h3 className="font-bold text-lg text-red-800">Pendente (Sítio)</h3>
                     <span className="font-bold text-3xl text-red-800">R$ {financialData.pendingSitio.toFixed(2).replace('.', ',')}</span>
                     <p className="text-xs text-red-600 font-medium mt-1">{financialData.countPendingSitio} pendentes</p>
                </div>
                <div className="bg-red-50 p-4 rounded-xl border border-red-200 shadow-sm space-y-3 opacity-0 animate-fadeInUp" style={{ animationFillMode: 'forwards', animationDelay: '400ms' }}>
                     <h3 className="font-bold text-lg text-red-800">Pendente (Ônibus)</h3>
                     <span className="font-bold text-3xl text-red-800">R$ {financialData.pendingBus.toFixed(2).replace('.', ',')}</span>
                     <p className="text-xs text-red-600 font-medium mt-1">{financialData.countPendingBus} pendentes</p>
                </div>
            </main>
        </div>
    );
};

// --- Financial Management View ---
const FinancialManagementView: React.FC<{ 
    event: Event | null; 
    confirmedRevenue: number; 
    extraRecords: FinancialRecord[]; 
    onAddRecord: (record: Omit<FinancialRecord, 'id' | 'created_at'>) => Promise<void>; 
    onDeleteRecord: (record: FinancialRecord) => void; 
    onBack: () => void; 
}> = ({ event, confirmedRevenue, extraRecords, onAddRecord, onDeleteRecord, onBack }) => {
    const [type, setType] = useState<FinancialRecordType>(FinancialRecordType.INCOME);
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [isSaving, setIsSaving] = useState(false);
    const { addToast } = useToast();

    const extraIncome = extraRecords.filter(r => r.type === FinancialRecordType.INCOME).reduce((sum, r) => sum + r.amount, 0);
    const extraExpenses = extraRecords.filter(r => r.type === FinancialRecordType.EXPENSE).reduce((sum, r) => sum + r.amount, 0);
    const netProfit = confirmedRevenue + extraIncome - extraExpenses;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!event) return;
        setIsSaving(true);
        try {
            await onAddRecord({
                eventId: event.id,
                type,
                description,
                amount: parseFloat(amount),
                date: new Date(date + 'T00:00:00Z').toISOString(), // Ensure UTC for consistent storage
            });
            setDescription('');
            setAmount('');
            addToast('Registro adicionado com sucesso!', 'success');
        } catch (error) {
            addToast('Falha ao adicionar registro.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="animate-fadeIn min-h-full bg-zinc-50 pb-20 md:pb-6">
            <header className="sticky top-0 bg-white z-10 p-4 border-b border-zinc-200 flex items-center gap-4">
                <button onClick={onBack} className="text-zinc-500 hover:text-zinc-800 p-1 rounded-full hover:bg-zinc-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h1 className="text-xl font-bold text-zinc-900">Gestão Financeira</h1>
            </header>

            <main className="p-4 max-w-4xl mx-auto space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-zinc-200">
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Balanço Total</p>
                        <p className={`text-4xl font-black mt-2 ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            R$ {netProfit.toFixed(2).replace('.', ',')}
                        </p>
                        <p className="text-xs text-zinc-400 mt-1 font-medium">Receitas - Despesas</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-zinc-200 flex flex-col justify-center space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-zinc-600 font-medium">Inscrições (Confirmadas)</span>
                            <span className="font-bold text-emerald-600">+ R$ {confirmedRevenue.toFixed(2).replace('.', ',')}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-zinc-600 font-medium">Receitas Extras</span>
                            <span className="font-bold text-emerald-600">+ R$ {extraIncome.toFixed(2).replace('.', ',')}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm pt-2 border-t border-zinc-100">
                            <span className="text-zinc-600 font-medium">Despesas Extras</span>
                            <span className="font-bold text-rose-600">- R$ {extraExpenses.toFixed(2).replace('.', ',')}</span>
                        </div>
                    </div>
                </div>

                {/* New Transaction Form */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-zinc-200">
                    <h2 className="text-lg font-bold text-zinc-800 mb-4">Nova Movimentação</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="flex gap-2 p-1 bg-zinc-100 rounded-lg w-fit">
                            <button
                                type="button"
                                onClick={() => setType(FinancialRecordType.INCOME)}
                                className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${type === FinancialRecordType.INCOME ? 'bg-white text-emerald-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                            >
                                Receita
                            </button>
                            <button
                                type="button"
                                onClick={() => setType(FinancialRecordType.EXPENSE)}
                                className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${type === FinancialRecordType.EXPENSE ? 'bg-white text-rose-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                            >
                                Despesa
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <input
                                type="text"
                                placeholder="Descrição (ex: Venda de Camisas)"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-400 text-sm"
                                required
                            />
                            <div className="relative">
                                <span className="absolute left-4 top-3 text-zinc-500 text-sm">R$</span>
                                <input
                                    type="number"
                                    placeholder="0,00"
                                    step="0.01"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-400 text-sm"
                                    required
                                />
                            </div>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-400 text-sm"
                                required
                            />
                        </div>
                        
                        <button
                            type="submit"
                            disabled={isSaving}
                            className={`w-full py-3 rounded-xl text-white font-bold transition-colors shadow-sm ${type === FinancialRecordType.INCOME ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'}`}
                        >
                            {isSaving ? 'Salvando...' : 'Adicionar Movimentação'}
                        </button>
                    </form>
                </div>

                {/* History List */}
                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-zinc-800 px-1">Histórico de Extras</h2>
                    {extraRecords.length === 0 ? (
                        <div className="text-center py-10 text-zinc-400">Nenhuma movimentação extra registrada.</div>
                    ) : (
                        <div className="space-y-2">
                            {extraRecords.map((record) => (
                                <div key={record.id} className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-full ${record.type === FinancialRecordType.INCOME ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                            {record.type === FinancialRecordType.INCOME 
                                                ? <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                                                : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                            }
                                        </div>
                                        <div>
                                            <p className="font-bold text-zinc-800 text-sm">{record.description}</p>
                                            <p className="text-xs text-zinc-500">{new Date(record.date).toLocaleDateString('pt-BR')}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className={`font-bold ${record.type === FinancialRecordType.INCOME ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {record.type === FinancialRecordType.INCOME ? '+' : '-'} R$ {record.amount.toFixed(2).replace('.', ',')}
                                        </span>
                                        <button onClick={() => onDeleteRecord(record)} className="text-zinc-400 hover:text-rose-500 transition-colors p-1" title="Excluir">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};


// --- Componente: Lista de Passageiros do Ônibus ---
interface BusPassenger extends Attendee {
  assignmentType: 'manual' | 'auto';
}
interface BusDetails {
  busNumber: number;
  passengers: BusPassenger[];
  capacity: number;
}

interface EditablePassengerRowProps {
    attendee: Attendee;
    onSelectAttendee: (id: string) => void;
    onRequestBusChange: (attendee: Attendee, newBusNumber: number | null) => void;
    totalBuses: number;
    busAssignments: Record<number, number>;
}

const EditablePassengerRow: React.FC<EditablePassengerRowProps> = ({ attendee, onSelectAttendee, onRequestBusChange, totalBuses, busAssignments }) => {

    const handleBusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newBusValue = e.target.value;
        const newBusNumber = newBusValue === 'null' ? null : Number(newBusValue);

        if (newBusNumber !== attendee.busNumber) {
            onRequestBusChange(attendee, newBusNumber);
        }
    };

    return (
        <div className="w-full text-left p-3 bg-zinc-50 rounded-lg flex flex-col md:flex-row justify-between md:items-center border border-zinc-200 gap-3">
            <div onClick={() => onSelectAttendee(attendee.id)} className="flex-grow cursor-pointer min-w-0">
                <p className="font-semibold text-zinc-900">{attendee.person.name}</p>
                <p className="text-xs text-zinc-500 mt-1">{attendee.person.document} &bull; {attendee.person.phone}</p>
            </div>
            <div className="flex-shrink-0 flex items-center justify-center pt-2 md:pt-0 w-full md:w-auto">
                <select
                    value={attendee.busNumber?.toString() || 'null'}
                    onChange={handleBusChange}
                    onClick={(e) => e.stopPropagation()}
                    className="block w-full md:w-40 text-sm bg-white border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 px-2 py-1.5"
                >
                    <option value="null">Nenhum</option>
                    {Array.from({ length: totalBuses }, (_, i) => i + 1).map(busNum => {
                        const count = busAssignments[busNum] || 0;
                        const isFull = count >= 50;
                        const isCurrentBus = attendee.busNumber === busNum;
                        const isDisabled = isFull && !isCurrentBus;

                        return (
                            <option key={busNum} value={busNum} disabled={isDisabled}>
                                Ônibus {busNum}{isDisabled ? ' (Lotado)' : ''}
                            </option>
                        );
                    })}
                </select>
            </div>
        </div>
    );
};


const BusPassengerList: React.FC<{
    busDetails: BusDetails;
    onBack: () => void;
    onSelectAttendee: (id: string) => void;
    onRequestBusChange: (attendee: Attendee, newBusNumber: number | null, assignmentType: 'manual' | 'auto') => void;
    totalBuses: number;
    busAssignments: Record<number, number>;
}> = ({ busDetails, onBack, onSelectAttendee, onRequestBusChange, totalBuses, busAssignments }) => {
    
    const manuallyAssigned = useMemo(() => busDetails.passengers.filter(p => p.assignmentType === 'manual'), [busDetails]);
    const autoAssigned = useMemo(() => busDetails.passengers.filter(p => p.assignmentType === 'auto'), [busDetails]);

    const renderPassengerList = (passengers: BusPassenger[], assignmentType: 'manual' | 'auto') => (
        <div className="space-y-2">
            {passengers.map(p => 
                <EditablePassengerRow 
                    key={p.id} 
                    attendee={p} 
                    onSelectAttendee={onSelectAttendee}
                    onRequestBusChange={(attendee, newBusNumber) => onRequestBusChange(attendee, newBusNumber, assignmentType)}
                    totalBuses={totalBuses}
                    busAssignments={busAssignments}
                />
            )}
        </div>
    );

    return (
        <div className="animate-fadeIn">
            <header className="sticky top-0 md:static bg-white z-10 p-4 md:pt-6 border-b border-zinc-200 flex items-center gap-4">
                <button onClick={onBack} className="text-zinc-500 hover:text-zinc-800 p-1 rounded-full hover:bg-zinc-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h1 className="text-xl md:text-2xl font-bold text-zinc-800">Ônibus {busDetails.busNumber} ({busDetails.passengers.length}/{busDetails.capacity})</h1>
            </header>
            <main className="p-4 space-y-6 xl:space-y-0 xl:grid xl:grid-cols-2 xl:gap-4">
                <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm opacity-0 animate-fadeInUp" style={{ animationFillMode: 'forwards', animationDelay: '100ms' }}>
                    <h2 className="font-bold text-lg text-zinc-800 mb-3">Designados Manualmente ({manuallyAssigned.length})</h2>
                    {manuallyAssigned.length > 0 ? (
                        renderPassengerList(manuallyAssigned, 'manual')
                    ) : (
                        <p className="text-sm text-zinc-500 italic">Nenhum passageiro foi designado manualmente para este ônibus.</p>
                    )}
                </div>
                <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm opacity-0 animate-fadeInUp" style={{ animationFillMode: 'forwards', animationDelay: '200ms' }}>
                    <h2 className="font-bold text-lg text-zinc-800 mb-3">Designados Automaticamente ({autoAssigned.length})</h2>
                    {autoAssigned.length > 0 ? (
                        renderPassengerList(autoAssigned, 'auto')
                    ) : (
                         <p className="text-sm text-zinc-500 italic">Nenhum passageiro foi designado automaticamente.</p>
                    )}
                </div>
            </main>
        </div>
    );
};

// --- Componente: Lista de Inscritos Apenas Sítio ---
const SitioOnlyListView: React.FC<{
    attendees: Attendee[];
    onBack: () => void;
    onSelectAttendee: (id: string) => void;
}> = ({ attendees, onBack, onSelectAttendee }) => {
    
    const getStatusClasses = (status: PaymentStatus) => {
        switch (status) {
            case PaymentStatus.PAGO: return 'bg-green-100 text-green-800';
            case PaymentStatus.PENDENTE: return 'bg-red-100 text-red-800';
            case PaymentStatus.ISENTO: return 'bg-blue-100 text-blue-800';
            default: return 'bg-zinc-100 text-zinc-800';
        }
    };

    return (
        <div className="animate-fadeIn">
            <header className="sticky top-0 md:static bg-white z-10 p-4 md:pt-6 border-b border-zinc-200 flex items-center gap-4">
                <button onClick={onBack} className="text-zinc-500 hover:text-zinc-800 p-1 rounded-full hover:bg-zinc-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h1 className="text-xl md:text-2xl font-bold text-zinc-800">Pacote Apenas Sítio ({attendees.length})</h1>
            </header>
            <main className="p-4 space-y-2">
                {attendees.length > 0 ? (
                    attendees.map((attendee, index) => (
                        <button 
                            key={attendee.id} 
                            onClick={() => onSelectAttendee(attendee.id)}
                            className="w-full text-left p-3 bg-white rounded-lg flex justify-between items-center border border-zinc-200 hover:bg-zinc-50 transition-colors shadow-sm opacity-0 animate-fadeInUp"
                            style={{ animationDelay: `${index * 30}ms`, animationFillMode: 'forwards' }}
                        >
                            <div className="min-w-0">
                                <p className="font-semibold text-zinc-900">{attendee.person.name}</p>
                                <p className="text-xs text-zinc-500 mt-1">{attendee.person.phone}</p>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                                <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${getStatusClasses(attendee.payment.status)}`}>
                                    {attendee.payment.status.toUpperCase()}
                                </span>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-zinc-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                            </div>
                        </button>
                    ))
                ) : (
                    <p className="text-center text-zinc-500 py-8">Nenhum inscrito com este pacote.</p>
                )}
            </main>
        </div>
    );
};


// --- Componente: Painel Principal de Relatórios ---
interface BusStat {
    busNumber: number;
    filledSeats: number;
    remainingSeats: number;
    capacity: number;
}

const StatCard: React.FC<{ 
    title: string; 
    children: React.ReactNode; 
    icon: React.ReactElement; 
    className?: string; 
    delay: number; 
    onClick?: () => void;
    variant?: 'white' | 'warning' | 'info';
}> = ({ title, children, icon, className = '', delay, onClick, variant = 'white' }) => {
    let baseStyles = "p-3.5 rounded-2xl border shadow-sm flex flex-col transition-all relative overflow-hidden group";
    let colorStyles = "";

    switch(variant) {
        case 'warning':
            colorStyles = "bg-amber-50 border-amber-200 hover:border-amber-400";
            break;
        case 'info':
            colorStyles = "bg-blue-50 border-blue-200 hover:border-blue-400";
            break;
        case 'white':
        default:
            colorStyles = "bg-white border-zinc-200 hover:border-zinc-400 hover:shadow-md";
            break;
    }

    return (
        <div 
            onClick={onClick} 
            className={`${baseStyles} ${colorStyles} opacity-0 animate-fadeInUp ${className} ${onClick ? 'cursor-pointer active:scale-98' : ''}`} 
            style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
        >
            <div className="flex items-center gap-2 mb-2 z-10 relative">
                <div className={`p-1.5 rounded-lg ${variant === 'white' ? 'bg-zinc-100 text-zinc-700' : 'bg-white/60 text-current'}`}>
                    {icon}
                </div>
                <h2 className="text-sm font-bold text-zinc-900 tracking-tight leading-none">{title}</h2>
            </div>
            <div className="flex-grow z-10 relative">{children}</div>
        </div>
    );
};

const ProgressBar: React.FC<{ value: number; max: number; colorClass?: string }> = ({ value, max, colorClass = 'bg-emerald-500' }) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;
    return (<div className="w-full bg-zinc-200 rounded-full h-1.5 overflow-hidden mt-1"><div className={`${colorClass} h-full rounded-full transition-all duration-700 ease-out`} style={{ width: `${percentage}%` }}></div></div>);
};

const ReportsDashboard: React.FC<{ 
    attendees: Attendee[]; 
    onGenerateReportClick: () => void; 
    onLogout: () => void; 
    onFixDocsClick: () => void; 
    onCheckDuplicatesClick: () => void; 
    zeroDocCount: number; 
    duplicateGroupCount: number; 
    busStats: BusStat[]; 
    onViewBus: (busNumber: number) => void; 
    onViewFinancials: () => void; 
    onViewSitioOnlyList: () => void; 
    onManageFinancials: () => void;
    onGenerateFinancialReportClick: () => void; // Added prop
    event: Event | null; 
    netProfit: number;
    extraIncome: number;
    extraExpenses: number;
    confirmedRevenue: number;
}> = ({ attendees, onGenerateReportClick, onLogout, onFixDocsClick, onCheckDuplicatesClick, zeroDocCount, duplicateGroupCount, busStats, onViewBus, onViewFinancials, onViewSitioOnlyList, onManageFinancials, onGenerateFinancialReportClick, event, netProfit, extraIncome, extraExpenses, confirmedRevenue }) => {
    const { totalAttendees, paidCount, pendingCount, isentoCount, totalRevenue, pendingRevenue, totalPossibleRevenue, sitioOnlyCount, paymentStats } = useMemo(() => {
        // We want to count active attendees for logistics, but ALL payments for financials.
        
        // Logistics Counts (Exclude wontAttend)
        const activeAttendees = attendees.filter(a => !a.wontAttend);
        
        const paidAttendees = activeAttendees.filter(a => a.payment.status === PaymentStatus.PAGO);
        const pendingAttendees = activeAttendees.filter(a => a.payment.status === PaymentStatus.PENDENTE);
        const isentoAttendees = activeAttendees.filter(a => a.payment.status === PaymentStatus.ISENTO);

        const paidCountValue = paidAttendees.length;
        const pendingCountValue = pendingAttendees.length;
        const isentoCountValue = isentoAttendees.length;
        
        // Financial Calculations (INCLUDE wontAttend because they paid)
        const allPaidOrPartiallyPaid = attendees.filter(a => a.payment.status === PaymentStatus.PAGO || (a.payment.sitePaymentDetails?.isPaid || a.payment.busPaymentDetails?.isPaid));

        const calculatedPaymentStats = (Object.values(PaymentType) as PaymentType[]).reduce((acc, type) => {
            acc[type] = { count: 0, total: 0 };
            return acc;
        }, {} as Record<PaymentType, { count: number; total: number }>);
        
        allPaidOrPartiallyPaid.forEach(attendee => {
            if (attendee.packageType === PackageType.SITIO_BUS) {
                if (attendee.payment.sitePaymentDetails?.isPaid && attendee.payment.sitePaymentDetails.type) {
                    const type = attendee.payment.sitePaymentDetails.type;
                    calculatedPaymentStats[type].count += 1;
                    calculatedPaymentStats[type].total += event?.site_price ?? 70;
                }
                 if (attendee.payment.busPaymentDetails?.isPaid && attendee.payment.busPaymentDetails.type) {
                    const type = attendee.payment.busPaymentDetails.type;
                    calculatedPaymentStats[type].count += 1;
                    calculatedPaymentStats[type].total += event?.bus_price ?? 50;
                }
            } else { // Single payment package
                if (attendee.payment.status === PaymentStatus.PAGO && attendee.payment.type) {
                    const type = attendee.payment.type;
                    calculatedPaymentStats[type].count += 1;
                    calculatedPaymentStats[type].total += attendee.payment.amount; // Use actual amount here for single
                }
            }
        });
        
        const sortedPaymentStats = (Object.entries(calculatedPaymentStats) as [string, { count: number; total: number }][])
            .sort(([, a], [, b]) => {
                if (b.count !== a.count) {
                    return b.count - a.count;
                }
                return b.total - a.total;
            })
            .reduce((r, [k, v]) => {
                r[k as PaymentType] = v
                return r;
            }, {} as Record<PaymentType, { count: number; total: number }>);

        // --- STRICT FINANCIAL CALCULATION ---
        // Iterate ALL attendees to get correct money values, regardless of attendance
        const sitePrice = event?.site_price ?? 70;
        const busPrice = event?.bus_price ?? 50;

        let calculatedTotalRevenue = 0;
        let calculatedTotalPossibleRevenue = 0;

        attendees.forEach(a => {
            // 1. Ignore fully exempt people. They contribute 0 to potential and 0 to revenue.
            if (a.payment.status === PaymentStatus.ISENTO) return;
            
            // Critical Fix: If status is PAGO, assume paid regardless of partial details state
            // unless specific exemption overrides exist (which shouldn't happen if status is PAGO generally).
            const isGeneralPaid = a.payment.status === PaymentStatus.PAGO;

            if (a.packageType === PackageType.SITIO_ONLY) {
                // Not exempt, so adds to potential
                calculatedTotalPossibleRevenue += sitePrice;
                // If Paid, adds to revenue
                if (isGeneralPaid) {
                    calculatedTotalRevenue += sitePrice;
                }
            } else if (a.packageType === PackageType.SITIO_BUS) {
                // Check Site Part
                if (!a.payment.sitePaymentDetails?.isExempt) {
                    // If NOT exempt, it ADDS to potential revenue.
                    calculatedTotalPossibleRevenue += sitePrice;
                    
                    // If Paid (or general paid), it adds to Actual Revenue.
                    if (a.payment.sitePaymentDetails?.isPaid || isGeneralPaid) {
                        calculatedTotalRevenue += sitePrice;
                    }
                }
                
                // Check Bus Part
                if (!a.payment.busPaymentDetails?.isExempt) {
                    // If NOT exempt, it ADDS to potential revenue.
                    calculatedTotalPossibleRevenue += busPrice;

                    // If Paid (or general paid), it adds to Actual Revenue.
                    if (a.payment.busPaymentDetails?.isPaid || isGeneralPaid) {
                        calculatedTotalRevenue += busPrice;
                    }
                }
            }
        });

        return {
            totalAttendees: activeAttendees.length,
            paidCount: paidCountValue,
            pendingCount: pendingCountValue,
            isentoCount: isentoCountValue,
            totalRevenue: calculatedTotalRevenue,
            totalPossibleRevenue: calculatedTotalPossibleRevenue,
            pendingRevenue: calculatedTotalPossibleRevenue - calculatedTotalRevenue,
            sitioOnlyCount: activeAttendees.filter(a => a.packageType === PackageType.SITIO_ONLY).length,
            paymentStats: sortedPaymentStats
        };
    }, [attendees, event]);

    const IconUsers = <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.124-1.282-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.124-1.282-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
    const IconDollar = <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01M12 12v-2m0 2v2m0-2.35V10M12 15v2m0-2v-2m0 0h.01M12 7.02c.164.017.324.041.48.072M7.5 9.51c.418-.472 1.012-.867 1.697-1.126M12 21a9 9 0 100-18 9 9 0 000 18z" /></svg>;
    const IconBus = <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h8l2-2zM5 11h6" /></svg>;
    const IconHome = <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
    const IconClipboardList = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>;
    const IconWarning = <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
    const IconDuplicate = <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;
    const IconWallet = <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" /></svg>;
    const IconFinance = <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;

    return (
        <div className="pb-32 md:pb-10 animate-fadeIn bg-zinc-50/50 min-h-full">
            <header className="sticky top-0 md:static bg-white/90 backdrop-blur-md z-30 px-4 py-3 md:pt-6 border-b border-zinc-200 flex justify-between items-center">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-zinc-900 tracking-tight">Painel de Controle</h1>
                    <p className="text-xs text-zinc-500 font-medium">Relatórios e Estatísticas</p>
                </div>
                <button onClick={onLogout} className="p-2 bg-zinc-100 rounded-full text-zinc-500 hover:text-zinc-900 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                </button>
            </header>

            <div className="p-3 space-y-4 max-w-7xl mx-auto">
                
                {/* Alerts Section */}
                {(zeroDocCount > 0 || duplicateGroupCount > 0) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {zeroDocCount > 0 && (
                            <StatCard 
                                onClick={onFixDocsClick} 
                                title="Ação Necessária" 
                                icon={IconWarning} 
                                delay={50} 
                                variant="warning"
                            >
                                <div className="flex justify-between items-end">
                                    <div>
                                        <span className="font-black text-2xl text-amber-900 tracking-tight">{zeroDocCount}</span>
                                        <p className="text-xs font-bold text-amber-700 uppercase tracking-wide leading-tight">
                                            {zeroDocCount === 1 ? 'Doc Pendente' : 'Docs Pendentes'}
                                        </p>
                                    </div>
                                    <div className="bg-amber-100 p-1.5 rounded-full text-amber-700">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                                    </div>
                                </div>
                            </StatCard>
                        )}
                        {duplicateGroupCount > 0 && (
                            <StatCard 
                                onClick={onCheckDuplicatesClick} 
                                title="Verificar Duplicatas" 
                                icon={IconDuplicate} 
                                delay={100} 
                                variant="info"
                            >
                                <div className="flex justify-between items-end">
                                    <div>
                                        <span className="font-black text-2xl text-blue-900 tracking-tight">{duplicateGroupCount}</span>
                                        <p className="text-xs font-bold text-blue-700 uppercase tracking-wide leading-tight">
                                            {duplicateGroupCount === 1 ? 'Grupo Suspeito' : 'Grupos Suspeitos'}
                                        </p>
                                    </div>
                                    <div className="bg-blue-100 p-1.5 rounded-full text-blue-700">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                                    </div>
                                </div>
                            </StatCard>
                        )}
                    </div>
                )}

                {/* Primary Stats - Tighter Gap */}
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider pl-1 opacity-0 animate-fadeInUp" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>Visão Geral</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <StatCard title="Lucro Líquido" icon={IconWallet} delay={125} onClick={onManageFinancials} className="h-full bg-gradient-to-br from-white to-zinc-50">
                        <div className="flex justify-between items-baseline mb-2">
                            <span className={`font-black text-3xl tracking-tighter ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                R$ {netProfit.toFixed(0)}
                            </span>
                            <span className="text-xs font-bold text-zinc-500 uppercase">Balanço Total</span>
                        </div>
                        <div className="flex gap-2 text-[10px] font-medium text-zinc-500 mt-2 border-t border-zinc-100 pt-2">
                            <div className="flex flex-col">
                                <span className="text-emerald-600 font-bold">+ {extraIncome.toFixed(0)}</span>
                                <span>Extras</span>
                            </div>
                            <div className="w-px bg-zinc-200 h-6"></div>
                            <div className="flex flex-col">
                                <span className="text-rose-600 font-bold">- {extraExpenses.toFixed(0)}</span>
                                <span>Despesas</span>
                            </div>
                        </div>
                        <div className="mt-2 flex justify-end">
                            <span className="text-[10px] font-bold text-blue-600 flex items-center gap-1 hover:underline">
                                Gerenciar financeiro &rarr;
                            </span>
                        </div>
                    </StatCard>

                    <StatCard title="Total de Inscritos" icon={IconUsers} delay={150} className="h-full">
                        <div className="flex justify-between items-baseline mb-2">
                            <span className="font-black text-3xl text-zinc-900 tracking-tighter">{totalAttendees}</span>
                            <span className="text-xs font-bold text-zinc-500 uppercase">Confirmados</span>
                        </div>
                        <div className="mb-3">
                            <ProgressBar value={paidCount} max={totalAttendees - isentoCount} colorClass="bg-emerald-500" />
                        </div>
                        <div className="grid grid-cols-3 gap-1 text-center bg-zinc-50 rounded-lg p-2 border border-zinc-100">
                            <div>
                                <p className="text-sm font-black text-emerald-700 leading-none">{paidCount}</p>
                                <p className="text-[9px] font-bold text-zinc-400 uppercase mt-0.5">Pagos</p>
                            </div>
                            <div className="border-l border-zinc-200">
                                <p className="text-sm font-black text-rose-600 leading-none">{pendingCount}</p>
                                <p className="text-[9px] font-bold text-zinc-400 uppercase mt-0.5">Pendentes</p>
                            </div>
                            <div className="border-l border-zinc-200">
                                <p className="text-sm font-black text-blue-600 leading-none">{isentoCount}</p>
                                <p className="text-[9px] font-bold text-zinc-400 uppercase mt-0.5">Isentos</p>
                            </div>
                        </div>
                    </StatCard>

                    <StatCard title="Inscrições (Arrecadado)" icon={IconDollar} delay={200} onClick={onViewFinancials} className="h-full md:col-span-2">
                        <div className="flex justify-between items-baseline mb-2">
                            <span className="font-black text-3xl text-zinc-900 tracking-tighter">R$ {confirmedRevenue.toFixed(0)}</span>
                            <span className="text-xs font-bold text-zinc-500 uppercase">Receita Inscrições</span>
                        </div>
                        <div className="mb-3">
                            <ProgressBar value={totalRevenue} max={totalPossibleRevenue} colorClass="bg-emerald-500" />
                        </div>
                        <div className="flex justify-between items-center bg-zinc-50 rounded-lg p-2 border border-zinc-100">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase">Pendente</span>
                            <span className="font-bold text-sm text-rose-700">R$ {pendingRevenue.toFixed(2).replace('.', ',')}</span>
                        </div>
                        <div className="mt-2 flex justify-end">
                            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 hover:underline">
                                Ver detalhes de inscrições &rarr;
                            </span>
                        </div>
                    </StatCard>
                </div>

                {/* Logistics - Updated to use 2 columns on mobile */}
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider pl-1 pt-2 opacity-0 animate-fadeInUp" style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}>Logística</h3>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {busStats.map((bus, index) => (
                        <StatCard key={bus.busNumber} onClick={() => onViewBus(bus.busNumber)} title={`Ônibus ${bus.busNumber}`} icon={IconBus} delay={350 + index * 50}>
                            <div className="flex flex-col justify-between h-full">
                                <div>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <span className="text-xl font-bold text-zinc-800">{bus.filledSeats}</span>
                                        <span className="text-xs text-zinc-400 font-medium">/ {bus.capacity}</span>
                                    </div>
                                    <ProgressBar value={bus.filledSeats} max={bus.capacity} colorClass="bg-blue-500" />
                                </div>
                                
                                <div className="mt-3 pt-2 border-t border-zinc-100 flex justify-between items-center">
                                    <span className={`text-[10px] font-bold uppercase ${bus.remainingSeats === 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                        {bus.remainingSeats === 0 ? 'Lotado' : `${bus.remainingSeats} vagas`}
                                    </span>
                                </div>
                                <div className="mt-2 flex justify-end">
                                    <span className="text-[10px] font-bold text-blue-600 flex items-center gap-1 hover:underline">
                                        Ver Lista &rarr;
                                    </span>
                                </div>
                            </div>
                        </StatCard>
                    ))}
                    
                    {/* Site Only Card - Spans full width on mobile (col-span-2) */}
                    <StatCard className="col-span-2 lg:col-span-1" title="Apenas Sítio" icon={IconHome} delay={350 + (busStats.length * 50)} onClick={onViewSitioOnlyList}>
                        <div className="flex flex-col justify-between h-full">
                            <div className="flex justify-between items-baseline mb-1">
                                <span className="text-xl font-bold text-zinc-800">{sitioOnlyCount}</span>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 uppercase">
                                    Livre
                                </span>
                            </div>
                            <p className="text-[10px] text-zinc-400 font-medium mb-1">Transporte Próprio</p>
                            
                            <div className="mt-auto pt-2 border-t border-zinc-100 flex justify-end">
                                <span className="text-[10px] font-bold text-zinc-400 uppercase">Ver Lista &rarr;</span>
                            </div>
                        </div>
                    </StatCard>
                </div>

                {/* Report Generator Actions - Full width at bottom */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2 pt-2 opacity-0 animate-fadeInUp" style={{ animationDelay: `${400 + (busStats.length * 50)}ms`, animationFillMode: 'forwards' }}>
                    <button 
                        onClick={onGenerateReportClick} 
                        className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3.5 px-6 rounded-2xl shadow-md transform transition-all active:scale-[0.98] flex items-center justify-between group border border-zinc-700"
                    >
                        <div className="flex items-center gap-3">
                            <div className="bg-zinc-800 p-2 rounded-lg text-emerald-400">
                                {IconClipboardList}
                            </div>
                            <div className="text-left">
                                <span className="block text-sm font-bold text-white">Gerar Relatórios</span>
                                <span className="block text-[10px] font-medium text-zinc-400">Exportar listas e dados</span>
                            </div>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-zinc-500 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                    <button 
                        onClick={onGenerateFinancialReportClick} 
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-2xl shadow-md transform transition-all active:scale-[0.98] flex items-center justify-between group border border-blue-500"
                    >
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-700 p-2 rounded-lg text-blue-200">
                                {IconFinance}
                            </div>
                            <div className="text-left">
                                <span className="block text-sm font-bold text-white">Relatório Financeiro</span>
                                <span className="block text-[10px] font-medium text-blue-200">Balanço completo e extrato</span>
                            </div>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-300 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Componente Principal ---
interface ReportsProps {
    attendees: Attendee[];
    onLogout: () => void;
    onUpdateAttendee: (attendee: Attendee) => Promise<void>;
    onSelectAttendee: (id: string) => void;
    event: Event | null;
    onAction?: () => void; // Optional callback for parent
}

const Reports: React.FC<ReportsProps> = ({ attendees, onLogout, onUpdateAttendee, onSelectAttendee, event, onAction }) => {
    const { addToast } = useToast();
    // Fix: Add 'financialForm' to the possible states for `mode`
    const [mode, setMode] = useState<'dashboard' | 'form' | 'preview' | 'zeroDoc' | 'duplicateCheck' | 'busDetail' | 'financialDetail' | 'sitioOnlyList' | 'financialManagement' | 'financialForm'>('dashboard');
    const [reportConfig, setReportConfig] = useState<ReportConfig | null>(null);
    const [reportData, setReportData] = useState<Attendee[] | Attendee[][]>([]);
    const [selectedBusNumber, setSelectedBusNumber] = useState<number | null>(null);
    const [confirmationRequest, setConfirmationRequest] = useState<ConfirmationRequest | null>(null);
    const [isSavingChange, setIsSavingChange] = useState(false);
    
    // Financial State
    const [extraFinancialRecords, setExtraFinancialRecords] = useState<FinancialRecord[]>([]);
    const [recordToDelete, setRecordToDelete] = useState<FinancialRecord | null>(null);
    const [isDeletingRecord, setIsDeletingRecord] = useState(false);

    useEffect(() => {
        if (event) {
            const fetchExtras = async () => {
                try {
                    const records = await api.fetchFinancialRecords(event.id);
                    setExtraFinancialRecords(records);
                } catch (error) {
                    console.error("Failed to load financial records", error);
                }
            };
            fetchExtras();
        } else {
            setExtraFinancialRecords([]);
        }
    }, [event, mode]); // Re-fetch when entering dashboard/management to ensure freshness

    const zeroDocAttendees = useMemo(() => {
        return attendees.filter(a =>
            a.packageType === PackageType.SITIO_BUS &&
            !a.wontAttend && // Exclude those not attending
            /^0+$/.test(a.person.document.replace(/[^\d]/g, ''))
        );
    }, [attendees]);
    
    const sitioOnlyAttendees = useMemo(() => 
        attendees
            .filter(a => a.packageType === PackageType.SITIO_ONLY)
            .sort((a, b) => a.person.name.localeCompare(b.person.name)), 
    [attendees]);

    const potentialDuplicates = useMemo(() => {
        const nameMap: { [key: string]: Attendee[] } = {};
        attendees.forEach(attendee => {
            const normalizedName = attendee.person.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            if (!nameMap[normalizedName]) {
                nameMap[normalizedName] = [];
            }
            nameMap[normalizedName].push(attendee);
        });

        // Filter out groups with only one person or where names are too dissimilar
        const duplicateGroups: Attendee[][] = Object.values(nameMap).filter(group => group.length > 1);

        // Further refine by checking Levenshtein distance for close matches, not necessarily identical
        const refinedGroups: Attendee[][] = [];
        duplicateGroups.forEach(group => {
            const sortedGroup = [...group].sort((a, b) => a.person.name.localeCompare(b.person.name));
            refinedGroups.push(sortedGroup);
        });

        return refinedGroups;
    }, [attendees]);

    const financialDetails = useMemo(() => {
        const sitePrice = event?.site_price ?? 70;
        const busPrice = event?.bus_price ?? 50;

        let paidSitio = 0, totalSitio = 0, pendingSitio = 0;
        let paidBus = 0, totalBus = 0, pendingBus = 0;
        let countPaidSitio = 0, countTotalSitio = 0, countPendingSitio = 0;
        let countPaidBus = 0, countTotalBus = 0, countPendingBus = 0;
        
        attendees.forEach(a => {
            // Site Part
            if (a.packageType === PackageType.SITIO_ONLY || a.packageType === PackageType.SITIO_BUS) {
                if (!a.payment.sitePaymentDetails?.isExempt) {
                    totalSitio += sitePrice;
                    countTotalSitio++;
                    if (a.payment.sitePaymentDetails?.isPaid || a.payment.status === PaymentStatus.PAGO) { // Also count if main status is PAGO
                        paidSitio += sitePrice;
                        countPaidSitio++;
                    } else {
                        pendingSitio += sitePrice;
                        countPendingSitio++;
                    }
                }
            }
            // Bus Part
            if (a.packageType === PackageType.SITIO_BUS) {
                if (!a.payment.busPaymentDetails?.isExempt) {
                    totalBus += busPrice;
                    countTotalBus++;
                    if (a.payment.busPaymentDetails?.isPaid || a.payment.status === PaymentStatus.PAGO) { // Also count if main status is PAGO
                        paidBus += busPrice;
                        countPaidBus++;
                    } else {
                        pendingBus += busPrice;
                        countPendingBus++;
                    }
                }
            }
        });

        return {
            paidSitio, totalSitio, pendingSitio,
            paidBus, totalBus, pendingBus,
            countPaidSitio, countTotalSitio, countPendingSitio,
            countPaidBus, countTotalBus, countPendingBus,
        };
    }, [attendees, event]);

    const busPassengerLists = useMemo(() => {
        const busMap: Record<number, Attendee[]> = {};
        attendees.forEach(attendee => {
            if (attendee.busNumber && !attendee.wontAttend) { // Only count for bus if they are attending
                if (!busMap[attendee.busNumber]) {
                    busMap[attendee.busNumber] = [];
                }
                busMap[attendee.busNumber].push(attendee);
            }
        });
        // Sort passengers by name
        Object.values(busMap).forEach(passengers => passengers.sort((a, b) => a.person.name.localeCompare(b.person.name)));
        return busMap;
    }, [attendees]);

    const busStatsForDashboard = useMemo(() => {
        const BUS_CAPACITY = 50;
        const stats: BusStat[] = [];
        const uniqueBusNumbers = new Set(attendees.map(a => a.busNumber).filter(n => n !== null && n !== undefined)) as Set<number>;
        
        const allBusNumbers = Array.from(uniqueBusNumbers).sort((a, b) => a - b);
        if (allBusNumbers.length === 0 && attendees.some(a => a.packageType === PackageType.SITIO_BUS && !a.wontAttend)) {
            // If there are bus attendees but no one assigned, show at least one bus
            allBusNumbers.push(1);
        } else if (allBusNumbers.length === 0 && attendees.filter(a => a.packageType === PackageType.SITIO_BUS && !a.wontAttend).length === 0) {
            // No bus attendees at all, don't show any bus stats
            return [];
        }

        allBusNumbers.forEach(busNum => {
            const passengers = busPassengerLists[busNum] || [];
            stats.push({
                busNumber: busNum,
                filledSeats: passengers.length,
                remainingSeats: Math.max(0, BUS_CAPACITY - passengers.length),
                capacity: BUS_CAPACITY,
            });
        });

        // Ensure at least one bus is shown if there are bus package attendees, even if busNumber is null
        if (allBusNumbers.length === 0 && attendees.some(a => a.packageType === PackageType.SITIO_BUS && !a.wontAttend)) {
            stats.push({ busNumber: 1, filledSeats: 0, remainingSeats: BUS_CAPACITY, capacity: BUS_CAPACITY });
        }


        // If the calculated total number of buses (based on filled seats + empty seats in partial buses)
        // is less than the current highest assigned bus number, add placeholder buses.
        let highestAssignedBus = 0;
        attendees.forEach(a => {
            if (a.busNumber && a.busNumber > highestAssignedBus) highestAssignedBus = a.busNumber;
        });
        
        let currentMaxBusCount = stats.length > 0 ? Math.max(...stats.map(s => s.busNumber)) : 0;
        currentMaxBusCount = Math.max(currentMaxBusCount, highestAssignedBus);

        for (let i = 1; i <= currentMaxBusCount; i++) {
            if (!stats.some(s => s.busNumber === i)) {
                stats.push({
                    busNumber: i,
                    filledSeats: 0,
                    remainingSeats: BUS_CAPACITY,
                    capacity: BUS_CAPACITY,
                });
            }
        }

        return stats.sort((a, b) => a.busNumber - b.busNumber);
    }, [attendees, busPassengerLists]);
    
    const totalConfirmedRevenue = useMemo(() => {
        return attendees.reduce((sum, attendee) => {
            if (attendee.payment.status === PaymentStatus.PAGO) {
                return sum + attendee.payment.amount;
            }
            if (attendee.packageType === PackageType.SITIO_BUS && attendee.payment.status === PaymentStatus.PENDENTE) {
                let partial = 0;
                const sitePrice = event?.site_price ?? 70;
                const busPrice = event?.bus_price ?? 50;
                
                if (attendee.payment.sitePaymentDetails?.isPaid) partial += sitePrice;
                if (attendee.payment.busPaymentDetails?.isPaid) partial += busPrice;
                return sum + partial;
            }
            return sum;
        }, 0);
    }, [attendees, event]);

    const extraIncome = useMemo(() => extraFinancialRecords.filter(r => r.type === FinancialRecordType.INCOME).reduce((sum, r) => sum + r.amount, 0), [extraFinancialRecords]);
    const extraExpenses = useMemo(() => extraFinancialRecords.filter(r => r.type === FinancialRecordType.EXPENSE).reduce((sum, r) => sum + r.amount, 0), [extraFinancialRecords]);
    const netProfit = useMemo(() => totalConfirmedRevenue + extraIncome - extraExpenses, [totalConfirmedRevenue, extraIncome, extraExpenses]);


    const handleGenerateReport = async (config: ReportConfig) => {
        setReportConfig(config);
        if (config.type === 'busList') {
            const sortedBuses = Object.values(busPassengerLists).sort((a, b) => (a[0]?.busNumber || 0) - (b[0]?.busNumber || 0));
            setReportData(sortedBuses);
        } else if (config.type === 'financialSummary') {
             // For financial summary, data is not a list of attendees, but consolidated numbers.
             // We pass the attendees list and other financial summaries directly as props to preview
             setReportData([]); 
        }
        else {
            const filteredAttendees = attendees
                .filter(a => config.filters.status === 'all' || a.payment.status === config.filters.status)
                .filter(a => config.filters.packageType === 'all' || a.packageType === config.filters.packageType)
                .sort((a, b) => a.person.name.localeCompare(b.person.name));
            setReportData(filteredAttendees);
        }
        setMode('preview');
    };

    const handleConfirmBusChange = async () => {
        if (!confirmationRequest) return;
        setIsSavingChange(true);
        try {
            await onUpdateAttendee({
                ...confirmationRequest.attendee,
                busNumber: confirmationRequest.newBusNumber
            });
            addToast('Alteração de ônibus realizada com sucesso.', 'success');
            setConfirmationRequest(null);
        } catch (error) {
            console.error(error);
            addToast('Erro ao alterar ônibus.', 'error');
        } finally {
            setIsSavingChange(false);
        }
    };

    const handleCancelBusChange = () => {
        setConfirmationRequest(null);
    };

    const handleAddRecord = async (record: Omit<FinancialRecord, 'id' | 'created_at'>) => {
        try {
            await api.createFinancialRecord(record);
            if (event) {
                const records = await api.fetchFinancialRecords(event.id);
                setExtraFinancialRecords(records);
            }
            if (onAction) onAction(); // Notify parent to refresh history
        } catch (error) {
            console.error("Failed to add financial record", error);
            throw error;
        }
    };

    const handleDeleteRecordClick = (record: FinancialRecord) => {
        setRecordToDelete(record);
    };

    const handleConfirmDeleteRecord = async () => {
        if (!recordToDelete) return;
        setIsDeletingRecord(true);
        try {
            await api.deleteFinancialRecord(recordToDelete.id);
            addToast('Registro excluído com sucesso.', 'success');
            if (event) {
                const records = await api.fetchFinancialRecords(event.id);
                setExtraFinancialRecords(records);
            }
            if (onAction) onAction(); // Notify parent to refresh history
        } catch (error) {
            console.error("Failed to delete financial record", error);
            addToast('Falha ao excluir registro.', 'error');
        } finally {
            setIsDeletingRecord(false);
            setRecordToDelete(null);
        }
    };

    const renderCurrentView = () => {
        switch (mode) {
            case 'dashboard':
                return (
                    <ReportsDashboard 
                        attendees={attendees}
                        onGenerateReportClick={() => setMode('form')}
                        onLogout={onLogout}
                        onFixDocsClick={() => setMode('zeroDoc')}
                        onCheckDuplicatesClick={() => setMode('duplicateCheck')}
                        zeroDocCount={zeroDocAttendees.length}
                        duplicateGroupCount={potentialDuplicates.length}
                        busStats={busStatsForDashboard}
                        onViewBus={(busNum) => { setSelectedBusNumber(busNum); setMode('busDetail'); }}
                        onViewFinancials={() => setMode('financialDetail')}
                        onViewSitioOnlyList={() => setMode('sitioOnlyList')}
                        onManageFinancials={() => setMode('financialManagement')}
                        onGenerateFinancialReportClick={() => setMode('financialForm')} // New prop usage
                        event={event}
                        netProfit={netProfit}
                        extraIncome={extraIncome}
                        extraExpenses={extraExpenses}
                        confirmedRevenue={totalConfirmedRevenue}
                    />
                );
            case 'form':
                return <InteractiveReportForm onGenerate={handleGenerateReport} onCancel={() => setMode('dashboard')} />;
            case 'financialForm': // New case for financial report form
                return <InteractiveReportForm onGenerate={handleGenerateReport} onCancel={() => setMode('dashboard')} initialReportType="financialSummary" />;
            case 'preview':
                return reportConfig && <InteractiveReportPreview 
                                        data={reportData} 
                                        config={reportConfig} 
                                        onBack={() => setMode('form')} 
                                        event={event} // Pass event
                                        confirmedRevenue={totalConfirmedRevenue} // Pass confirmed revenue
                                        extraIncome={extraIncome} // Pass extra income
                                        extraExpenses={extraExpenses} // Pass extra expenses
                                        netProfit={netProfit} // Pass net profit
                                        attendees={attendees} // Pass all attendees for detailed financial breakdown
                                        extraRecords={extraFinancialRecords} // Pass extra records
                                      />;
            case 'zeroDoc':
                return <ZeroDocList attendees={zeroDocAttendees} onBack={() => setMode('dashboard')} onUpdateAttendee={onUpdateAttendee} />;
            case 'duplicateCheck':
                return <DuplicateCheckerView groups={potentialDuplicates} onBack={() => setMode('dashboard')} onSelectAttendee={onSelectAttendee} />;
            case 'busDetail':
                const busPassengers = selectedBusNumber ? busPassengerLists[selectedBusNumber] || [] : [];
                const busDetails = { busNumber: selectedBusNumber!, passengers: busPassengers.map(p => ({ ...p, assignmentType: 'auto' as 'auto' })), capacity: 50 }; // Default to auto
                return selectedBusNumber !== null ? (
                    <BusPassengerList 
                        busDetails={busDetails} 
                        onBack={() => setMode('dashboard')} 
                        onSelectAttendee={onSelectAttendee} 
                        onRequestBusChange={(attendee, newBusNumber, assignmentType) => setConfirmationRequest({ attendee, newBusNumber, assignmentType })}
                        totalBuses={busStatsForDashboard.length > 0 ? Math.max(...busStatsForDashboard.map(b => b.busNumber)) : 0}
                        busAssignments={busStatsForDashboard.reduce((acc, b) => ({ ...acc, [b.busNumber]: b.filledSeats }), {})}
                    />
                ) : null;
            case 'financialDetail':
                return <FinancialDetailView financialData={financialDetails} onBack={() => setMode('dashboard')} />;
            case 'sitioOnlyList':
                return <SitioOnlyListView attendees={sitioOnlyAttendees} onBack={() => setMode('dashboard')} onSelectAttendee={onSelectAttendee} />;
            case 'financialManagement':
                return <FinancialManagementView 
                            event={event} 
                            confirmedRevenue={totalConfirmedRevenue} 
                            extraRecords={extraFinancialRecords}
                            onAddRecord={handleAddRecord}
                            onDeleteRecord={handleDeleteRecordClick}
                            onBack={() => setMode('dashboard')}
                        />;
            default:
                return null;
        }
    };
    
    return (
        <>
            {renderCurrentView()}
            {confirmationRequest && (
                <BusChangeConfirmationModal
                    request={confirmationRequest}
                    onConfirm={handleConfirmBusChange}
                    onCancel={handleCancelBusChange}
                    isSaving={isSavingChange}
                />
            )}
            {recordToDelete && (
                <ConfirmFinancialDeleteModal
                    record={recordToDelete}
                    onConfirm={handleConfirmDeleteRecord}
                    onCancel={() => setRecordToDelete(null)}
                    isDeleting={isDeletingRecord}
                />
            )}
        </>
    );
};

export default Reports;
