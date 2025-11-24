
import React, { useState, useMemo } from 'react';
// FIX: Import Event type
import type { Attendee, ReportConfig, ReportField, Event } from '../types';
import { PackageType, PaymentStatus, DocumentType, PaymentType } from '../types';
import { formatDocument, getDocumentType } from '../utils/formatters';
import { levenshteinDistance } from '../utils/stringSimilarity';
import { useToast } from '../contexts/ToastContext';
import { generateReport } from '../services/geminiService';

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
                // FIX: Access name from the nested person object.
                description: `Você está movendo "${attendee.person.name}" para o Ônibus ${newBusNumber}. Isso o tornará um passageiro designado manualmente e o fixará neste ônibus. Deseja continuar?`,
            };
        }
        if (currentBusNumber !== null && newBusNumber !== null && currentBusNumber !== newBusNumber) {
            return {
                title: "Confirmar Mudança de Ônibus",
                // FIX: Access name from the nested person object.
                description: `Você tem certeza que deseja mover "${attendee.person.name}" do Ônibus ${currentBusNumber} para o Ônibus ${newBusNumber}?`,
            };
        }
        if (currentBusNumber !== null && newBusNumber === null) {
            return {
                title: "Remover Designação Manual",
                // FIX: Access name from the nested person object.
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
const InteractiveReportForm: React.FC<{ onGenerate: (config: ReportConfig) => void; onCancel: () => void; }> = ({ onGenerate, onCancel }) => {
    // FIX: Use correct ReportField values with dot notation for person fields.
    const allFields: { id: ReportField; label: string }[] = [
        { id: 'person.name', label: 'Nome' },
        { id: 'person.document', label: 'Documento' },
        { id: 'person.phone', label: 'Telefone' },
        { id: 'packageType', label: 'Pacote' },
        { id: 'payment.status', label: 'Status do Pagamento' },
        { id: 'payment.amount', label: 'Valor' },
    ];

    const [reportType, setReportType] = useState<'custom' | 'busList'>('custom');
    // FIX: Use correct ReportField values for initial state.
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
            // FIX: Use correct ReportField values for bus list.
            fields: reportType === 'busList' ? ['person.name', 'person.document', 'person.phone'] : selectedFields,
            filters: { status: statusFilter, packageType: packageFilter }
        });
    };
    
    const isCustomMode = reportType === 'custom';

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
                    <div className="grid grid-cols-2 gap-2 bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                        <label className="flex items-center space-x-2 p-2 rounded-md hover:bg-zinc-50 cursor-pointer">
                            <input type="radio" name="reportType" value="custom" checked={isCustomMode} onChange={() => setReportType('custom')} className="h-4 w-4 text-green-600 focus:ring-green-500 border-zinc-300"/>
                            <span className="text-sm text-zinc-700 font-medium">Lista Personalizada</span>
                        </label>
                        <label className="flex items-center space-x-2 p-2 rounded-md hover:bg-zinc-50 cursor-pointer">
                            <input type="radio" name="reportType" value="busList" checked={!isCustomMode} onChange={() => setReportType('busList')} className="h-4 w-4 text-green-600 focus:ring-green-500 border-zinc-300"/>
                            <span className="text-sm text-zinc-700 font-medium">Lista de Passageiros</span>
                        </label>
                    </div>
                </div>

                <div className={`transition-opacity duration-300 ${!isCustomMode ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
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
const InteractiveReportPreview: React.FC<{ data: Attendee[] | Attendee[][]; config: ReportConfig; onBack: () => void; }> = ({ data, config, onBack }) => {
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isOrientationModalOpen, setIsOrientationModalOpen] = useState(false);
    
    // FIX: Update field names to use dot notation.
    const fieldNames: Record<ReportField, string> = {
        'person.name': 'Nome', 'person.document': 'Documento', 'person.phone': 'Telefone', packageType: 'Pacote',
        'payment.status': 'Status', 'payment.amount': 'Valor (R$)',
    };

    const getNestedProperty = (obj: any, path: string) => path.split('.').reduce((o, i) => (o ? o[i] : undefined), obj);

    const formatCustomValue = (attendee: Attendee, field: ReportField): string => {
        if (field === 'person.document') {
            // If document type is 'Outro' (e.g., not a valid CPF/RG, or not provided),
            // just show the document value itself, which will be blank if it wasn't entered.
            // This prevents showing "(Outro)" for people without a registered document.
            if (attendee.person.documentType === DocumentType.OUTRO) {
                return attendee.person.document;
            }
            return `${attendee.person.document} (${attendee.person.documentType})`;
        }
        let value = getNestedProperty(attendee, field);
        if (field === 'payment.amount') return value.toFixed(2).replace('.', ',');
        return value || 'N/A';
    };
    
    const handlePrintAndExport = (orientation: 'portrait' | 'landscape') => {
        setIsOrientationModalOpen(false);
        let printableHtml = '';
        const pageStyle = `@page { size: A4 ${orientation}; margin: 1in; }`;

        if (config.type === 'busList') {
            const busData = data as Attendee[][];
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

        } else { // Custom report
            const customData = data as Attendee[];
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

        // For iOS PWA compatibility, open a new window to print.
        // This is more reliable than using a hidden iframe which can result in blank pages.
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(printableHtml);
            printWindow.document.close();
            // Use a timeout to allow content to render before triggering print
            setTimeout(() => {
                printWindow.focus(); // focus is needed for some browsers
                printWindow.print();
                // We don't close the window automatically, allowing users to save as PDF or interact with the print preview.
            }, 250);
        } else {
            // This will be triggered if a popup blocker is active.
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
                reportText += `*ÔNIBUS ${index + 1} (${bus.length} passageiros)*\n`;
                bus.forEach(p => {
                    // FIX: Access nested person data for sharing.
                    reportText += `- ${p.person.name} (${p.person.document})\n`;
                });
                reportText += '\n';
            });

        } else { // Custom report
            const customData = data as Attendee[];
            title = `Relatório Gira da Mata (${customData.length} registros)`;
            reportText = `${title}\n\n`;
            customData.forEach((attendee) => {
                // FIX: Use 'person.name' to format value.
                reportText += `*${formatCustomValue(attendee, 'person.name')}*\n`;
                config.fields.forEach(field => {
                    // FIX: Check for 'person.name' to avoid duplication.
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

    return (
        <div className="flex flex-col animate-fadeIn">
             <header className="sticky top-0 md:static bg-white z-10 p-4 md:pt-6 border-b border-zinc-200 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-zinc-500 hover:text-zinc-800 p-1 rounded-full hover:bg-zinc-100">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <h1 className="text-xl md:text-2xl font-bold text-zinc-800">
                        {config.type === 'busList' ? 'Lista de Passageiros' : `Relatório (${(data as any[]).flat().length})`}
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
                                            {/* FIX: Access nested person data. */}
                                            <p className="font-bold text-zinc-800 mr-2">{p.person.name}</p>
                                            <p className="text-sm font-semibold text-zinc-500 flex-shrink-0">#{pIndex + 1}</p>
                                        </div>
                                        <div className="mt-1 text-sm text-zinc-600 space-y-1">
                                            {/* FIX: Access nested person data. */}
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
                                                {/* FIX: Access nested person data. */}
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
    // FIX: Access document from the nested person object.
    const [documentValue, setDocumentValue] = useState(attendee.person.document);
    // FIX: Access document from the nested person object.
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
            // FIX: Update the nested person object.
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
            // FIX: Access name from the nested person object.
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
                    {/* FIX: Access name from the nested person object. */}
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
                    // FIX: Access name from the nested person object.
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
                                            {/* FIX: Access nested person data. */}
                                            <p className="font-semibold text-zinc-900">{attendee.person.name}</p>
                                            <p className="text-xs text-zinc-500 mt-1">{attendee.person.document} &bull; {attendee.person.phone}</p>
                                        </div>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-zinc-400" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                        </svg>
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

        // Prevent triggering if the value hasn't changed
        if (newBusNumber !== attendee.busNumber) {
            onRequestBusChange(attendee, newBusNumber);
        }
    };

    return (
        <div className="w-full text-left p-3 bg-zinc-50 rounded-lg flex flex-col md:flex-row justify-between md:items-center border border-zinc-200 gap-3">
            <div onClick={() => onSelectAttendee(attendee.id)} className="flex-grow cursor-pointer min-w-0">
                {/* FIX: Access nested person data. */}
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
                                {/* FIX: Access nested person data. */}
                                <p className="font-semibold text-zinc-900">{attendee.person.name}</p>
                                <p className="text-xs text-zinc-500 mt-1">{attendee.person.phone}</p>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                                <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${getStatusClasses(attendee.payment.status)}`}>
                                    {attendee.payment.status.toUpperCase()}
                                </span>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-zinc-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                </svg>
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
const StatCard: React.FC<{ title: string; children: React.ReactNode; icon: React.ReactElement; className?: string, delay: number, onClick?: () => void }> = ({ title, children, icon, className = '', delay, onClick }) => (
    <div onClick={onClick} className={`bg-white p-4 rounded-xl border border-zinc-200 shadow-sm opacity-0 animate-fadeInUp flex flex-col ${className} ${onClick ? 'cursor-pointer hover:border-zinc-300 hover:bg-zinc-50 transition-colors' : ''}`} style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}>
        <div className="flex items-center gap-3 mb-3"><div className="text-green-500">{icon}</div><h2 className="text-md font-bold text-zinc-800">{title}</h2></div>
        <div className="space-y-3 flex-grow">{children}</div>
    </div>
);
const ProgressBar: React.FC<{ value: number; max: number; colorClass?: string }> = ({ value, max, colorClass = 'bg-green-500' }) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;
    return (<div className="w-full bg-zinc-200 rounded-full h-2"><div className={`${colorClass} h-2 rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }}></div></div>);
};

const ReportsDashboard: React.FC<{ attendees: Attendee[]; onGenerateReportClick: () => void; onLogout: () => void; onFixDocsClick: () => void; onCheckDuplicatesClick: () => void; zeroDocCount: number; duplicateGroupCount: number; busStats: BusStat[]; onViewBus: (busNumber: number) => void; onViewFinancials: () => void; onViewSitioOnlyList: () => void; event: Event | null; }> = ({ attendees, onGenerateReportClick, onLogout, onFixDocsClick, onCheckDuplicatesClick, zeroDocCount, duplicateGroupCount, busStats, onViewBus, onViewFinancials, onViewSitioOnlyList, event }) => {
    const { totalAttendees, paidCount, pendingCount, isentoCount, totalRevenue, pendingRevenue, totalPossibleRevenue, sitioOnlyCount, paymentStats } = useMemo(() => {
        const paidAttendees = attendees.filter(a => a.payment.status === PaymentStatus.PAGO);
        const pendingAttendees = attendees.filter(a => a.payment.status === PaymentStatus.PENDENTE);
        const isentoAttendees = attendees.filter(a => a.payment.status === PaymentStatus.ISENTO);

        const paidCountValue = paidAttendees.length;
        const pendingCountValue = pendingAttendees.length;
        const isentoCountValue = isentoAttendees.length;

        const calculatedPaymentStats = (Object.values(PaymentType) as PaymentType[]).reduce((acc, type) => {
            acc[type] = { count: 0, total: 0 };
            return acc;
        }, {} as Record<PaymentType, { count: number; total: number }>);
        
        // Populate stats for payment methods (existing logic)
        const allPaidOrPartiallyPaid = attendees.filter(a => a.payment.status === PaymentStatus.PAGO || (a.payment.sitePaymentDetails?.isPaid || a.payment.busPaymentDetails?.isPaid));

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
        // We recalculate totally from scratch based on strict rules to match the detail view
        // and avoid double counting.
        
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
            totalAttendees: attendees.length,
            paidCount: paidCountValue,
            pendingCount: pendingCountValue,
            isentoCount: isentoCountValue,
            totalRevenue: calculatedTotalRevenue,
            totalPossibleRevenue: calculatedTotalPossibleRevenue,
            pendingRevenue: calculatedTotalPossibleRevenue - calculatedTotalRevenue,
            sitioOnlyCount: attendees.filter(a => a.packageType === PackageType.SITIO_ONLY).length,
            paymentStats: sortedPaymentStats
        };
    }, [attendees, event]);

    const IconUsers = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.124-1.282-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.124-1.282-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
    const IconDollar = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01M12 12v-2m0 2v2m0-2.35V10M12 15v2m0-2v-2m0 0h.01M12 7.02c.164.017.324.041.48.072M7.5 9.51c.418-.472 1.012-.867 1.697-1.126M12 21a9 9 0 100-18 9 9 0 000 18z" /></svg>;
    const IconBus = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h8l2-2zM5 11h6" /></svg>;
    const IconHome = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
    const IconClipboardList = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>;
    const IconWarning = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
    const IconCreditCard = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>;
    const IconDuplicate = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;
    
    return (
        <div className="pb-4 animate-fadeIn">
            <header className="sticky top-0 md:static bg-white z-10 p-4 md:pt-6 border-b border-zinc-200 flex justify-between items-center">
                <h1 className="text-xl md:text-2xl font-bold text-zinc-800">Relatórios</h1>
                <button onClick={onLogout} className="p-2 text-zinc-500 rounded-full hover:bg-zinc-200 hover:text-zinc-800 transition-colors" aria-label="Sair">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                </button>
            </header>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <StatCard title="Inscrições" icon={IconUsers} delay={100}>
                    <div className="flex justify-between items-baseline">
                        <span className="font-bold text-3xl text-zinc-800">{totalAttendees}</span>
                        <span className="text-sm font-semibold text-zinc-500">Total</span>
                    </div>
                    <ProgressBar value={paidCount} max={totalAttendees - isentoCount} />
                    <div className="flex justify-between text-sm flex-wrap gap-x-2">
                        <span className="font-semibold text-green-600">{paidCount} {paidCount === 1 ? 'Pago' : 'Pagos'}</span>
                        <span className="font-semibold text-red-600">{pendingCount} {pendingCount === 1 ? 'Pendente' : 'Pendentes'}</span>
                        {isentoCount > 0 && <span className="font-semibold text-blue-600">{isentoCount} {isentoCount === 1 ? 'Isento' : 'Isentos'}</span>}
                    </div>
                </StatCard>
                <StatCard title="Financeiro" icon={IconDollar} delay={150} onClick={onViewFinancials}>
                    <div className="flex justify-between items-baseline">
                        <span className="font-bold text-3xl text-zinc-800">R$ {totalRevenue.toFixed(2).replace('.',',')}</span>
                        <span className="text-sm font-semibold text-zinc-500">Arrecadado</span>
                    </div>
                    <ProgressBar value={totalRevenue} max={totalPossibleRevenue} />
                    <div className="flex justify-between text-sm">
                        <span className="font-semibold text-zinc-500">Pendente: R$ {pendingRevenue.toFixed(2).replace('.',',')}</span>
                    </div>
                    <div className="mt-auto pt-3 border-t border-zinc-100">
                        <span className="text-sm font-semibold text-green-600 flex items-center justify-center gap-1">
                            Ver Detalhes
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </span>
                    </div>
                </StatCard>
                
                {zeroDocCount > 0 && (
                    <StatCard onClick={onFixDocsClick} title="Documentos Pendentes" icon={IconWarning} delay={200} className="bg-yellow-50 border-yellow-300 h-full">
                        <div className="flex justify-between items-baseline">
                            <span className="font-bold text-3xl text-yellow-800">{zeroDocCount}</span>
                            <span className="text-sm font-semibold text-yellow-700">{zeroDocCount === 1 ? 'Inscrito' : 'Inscritos'}</span>
                        </div>
                        <p className="text-xs text-yellow-700">Com documento '000...'. Clique aqui para corrigir.</p>
                    </StatCard>
                )}

                {duplicateGroupCount > 0 && (
                     <StatCard onClick={onCheckDuplicatesClick} title="Nomes Duplicados" icon={IconDuplicate} delay={250} className="bg-blue-50 border-blue-300 h-full">
                        <div className="flex justify-between items-baseline">
                            <span className="font-bold text-3xl text-blue-800">{duplicateGroupCount}</span>
                            <span className="text-sm font-semibold text-blue-700">{duplicateGroupCount === 1 ? 'Grupo' : 'Grupos'}</span>
                        </div>
                        <p className="text-xs text-blue-700">Nomes idênticos ou parecidos foram encontrados. Clique para verificar.</p>
                    </StatCard>
                )}

                {busStats.map((bus, index) => (
                    <StatCard key={bus.busNumber} onClick={() => onViewBus(bus.busNumber)} title={`Ônibus ${bus.busNumber}`} icon={IconBus} delay={300 + index * 50}>
                        <div className="flex justify-between items-baseline"><span className="font-bold text-3xl text-zinc-800">{bus.filledSeats}</span><span className="text-sm font-semibold text-zinc-500">/ {bus.capacity} vagas</span></div>
                        <ProgressBar value={bus.filledSeats} max={bus.capacity} colorClass="bg-blue-500" />
                        <div className="flex justify-between text-sm"><span className="font-semibold text-blue-600">{bus.filledSeats} {bus.filledSeats === 1 ? 'Preenchida' : 'Preenchidas'}</span><span className="font-semibold text-zinc-500">{bus.remainingSeats} {bus.remainingSeats === 1 ? 'Restante' : 'Restantes'}</span></div>
                        <div className="mt-auto pt-3 border-t border-zinc-100">
                             <span className="text-sm font-semibold text-green-600 flex items-center justify-center gap-1">
                                Ver Lista
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </span>
                        </div>
                    </StatCard>
                ))}
                <StatCard title="Apenas Sítio" icon={IconHome} delay={325 + (busStats.length * 50)} onClick={onViewSitioOnlyList}>
                    <div className="flex justify-between items-baseline">
                        <span className="font-bold text-3xl text-zinc-800">{sitioOnlyCount}</span>
                        <span className="text-sm font-semibold text-zinc-500">{sitioOnlyCount === 1 ? 'Inscrito' : 'Inscritos'}</span>
                    </div>
                    <div className="text-xs text-zinc-400 text-center pt-4 flex-grow flex items-center justify-center">
                        Não há limite de vagas para este pacote.
                    </div>
                    <div className="mt-auto pt-3 border-t border-zinc-100">
                        <span className="text-sm font-semibold text-green-600 flex items-center justify-center gap-1">
                            Ver Lista
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </span>
                    </div>
                </StatCard>
                <StatCard title="Formas de Pagamento" icon={IconCreditCard} delay={350 + (busStats.length * 50)}>
                    {/* FIX: Explicitly type `s` as `{ count: number }` to fix a TypeScript inference issue where it was being treated as `unknown`. */}
                    {paidCount > 0 || Object.values(paymentStats).some((s: { count: number }) => s.count > 0) ? (
                        <div className="space-y-3">
                            {(Object.entries(paymentStats) as [string, { count: number; total: number }][]).map(([type, stats]) => (
                                stats.count > 0 &&
                                <div key={type} className="text-sm">
                                    <div className="flex justify-between font-semibold text-zinc-800 mb-1">
                                        <span>{type}</span>
                                        <span className="font-medium">R$ {stats.total.toFixed(2).replace('.', ',')}</span>
                                    </div>
                                    <ProgressBar value={stats.total} max={totalRevenue} colorClass="bg-emerald-400" />
                                    <div className="flex justify-between items-center text-xs text-zinc-500 mt-1">
                                        <span>{stats.count} {stats.count === 1 ? 'pagamento' : 'pagamentos'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full py-4">
                            <p className="text-sm text-zinc-500 text-center">Nenhum pagamento registrado.</p>
                        </div>
                    )}
                </StatCard>
                <StatCard title="Gerador de Relatórios" icon={IconClipboardList} delay={400 + (busStats.length * 50)} className="md:col-span-full lg:col-span-1">
                    <p className="text-sm text-zinc-600">Crie listas personalizadas ou gere a lista de passageiros para os ônibus. Exporte em PDF, imprima ou compartilhe.</p>
                    <button onClick={onGenerateReportClick} className="mt-2 w-full bg-blue-500 text-white font-bold py-2 px-4 rounded-full hover:bg-blue-600 transition-colors shadow-sm flex items-center justify-center gap-2">
                        Gerar Relatório
                    </button>
                </StatCard>
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
}

const Reports: React.FC<ReportsProps> = ({ attendees, onLogout, onUpdateAttendee, onSelectAttendee, event }) => {
    const { addToast } = useToast();
    const [mode, setMode] = useState<'dashboard' | 'form' | 'preview' | 'zeroDoc' | 'duplicateCheck' | 'busDetail' | 'financialDetail' | 'sitioOnlyList'>('dashboard');
    const [reportConfig, setReportConfig] = useState<ReportConfig | null>(null);
    const [reportData, setReportData] = useState<Attendee[] | Attendee[][]>([]);
    const [selectedBusNumber, setSelectedBusNumber] = useState<number | null>(null);
    const [confirmationRequest, setConfirmationRequest] = useState<ConfirmationRequest | null>(null);
    const [isSavingChange, setIsSavingChange] = useState(false);

    const zeroDocAttendees = useMemo(() => {
        return attendees.filter(a =>
            a.packageType === PackageType.SITIO_BUS &&
            // FIX: Access document from the nested person object.
            /^0+$/.test(a.person.document.replace(/[^\d]/g, ''))
        );
    }, [attendees]);
    
    const sitioOnlyAttendees = useMemo(() => 
        // FIX: Access name from the nested person object for sorting.
        attendees.filter(a => a.packageType === PackageType.SITIO_ONLY).sort((a,b) => a.person.name.localeCompare(b.person.name)), 
    [attendees]);

    const potentialDuplicates = useMemo(() => {
        if (attendees.length < 2) return [];

        const normalize = (str: string) => str.toLowerCase().trim().replace(/\s+/g, ' ');

        const groups: Attendee[][] = [];
        const processedIds = new Set<string>();

        for (let i = 0; i < attendees.length; i++) {
            if (processedIds.has(attendees[i].id)) continue;

            const currentGroup: Attendee[] = [attendees[i]];
            // FIX: Access name from the nested person object.
            const name1 = normalize(attendees[i].person.name);

            for (let j = i + 1; j < attendees.length; j++) {
                if (processedIds.has(attendees[j].id)) continue;
                
                // FIX: Access name from the nested person object.
                const name2 = normalize(attendees[j].person.name);
                
                // Group if names are identical or very similar (distance <= 2 for typos)
                if (name1 === name2 || levenshteinDistance(name1, name2) <= 2) {
                    currentGroup.push(attendees[j]);
                }
            }

            if (currentGroup.length > 1) {
                groups.push(currentGroup);
                currentGroup.forEach(a => processedIds.add(a.id));
            }
        }
        return groups;
    }, [attendees]);
    
    const financialDetails = useMemo(() => {
        // --- STRICT RECALCULATION LOGIC ---
        // Initializes all counters to zero
        let paidSitio = 0;
        let totalSitio = 0;
        
        let paidBus = 0;
        let totalBus = 0;
        
        // Counters for people
        let countPaidSitio = 0;
        let countTotalSitio = 0;
        
        let countPaidBus = 0;
        let countTotalBus = 0;

        const sitePrice = event?.site_price ?? 70;
        const busPrice = event?.bus_price ?? 50;

        attendees.forEach(a => {
            // 1. Skip strictly EXEMPT (ISENTO) users entirely
            if (a.payment.status === PaymentStatus.ISENTO) {
                return; 
            }

            // Critical Fix: If status is PAGO, assume paid regardless of partial details state
            const isGeneralPaid = a.payment.status === PaymentStatus.PAGO;

            if (a.packageType === PackageType.SITIO_ONLY) {
                // Not exempt, so counts towards Total Possible
                totalSitio += sitePrice;
                countTotalSitio++;

                if (isGeneralPaid) {
                    paidSitio += sitePrice;
                    countPaidSitio++;
                }
            } else if (a.packageType === PackageType.SITIO_BUS) {
                // --- SÍTIO PART ---
                const siteExempt = !!a.payment.sitePaymentDetails?.isExempt;
                if (!siteExempt) {
                    // Not exempt from Site, add to Total
                    totalSitio += sitePrice;
                    countTotalSitio++;
                    
                    if (a.payment.sitePaymentDetails?.isPaid || isGeneralPaid) {
                        paidSitio += sitePrice;
                        countPaidSitio++;
                    }
                }
                
                // --- BUS PART ---
                const busExempt = !!a.payment.busPaymentDetails?.isExempt;
                if (!busExempt) {
                    // Not exempt from Bus, add to Total
                    totalBus += busPrice;
                    countTotalBus++;
                    
                    if (a.payment.busPaymentDetails?.isPaid || isGeneralPaid) {
                        paidBus += busPrice;
                        countPaidBus++;
                    }
                }
            }
        });

        return {
            paidSitio,
            totalSitio,
            pendingSitio: totalSitio - paidSitio,
            paidBus,
            totalBus,
            pendingBus: totalBus - paidBus,
            countPaidSitio,
            countTotalSitio,
            countPendingSitio: countTotalSitio - countPaidSitio,
            countPaidBus,
            countTotalBus,
            countPendingBus: countTotalBus - countPaidBus
        };
    }, [attendees, event]);

    const busAttendees = useMemo(() => attendees.filter(a => a.packageType === PackageType.SITIO_BUS), [attendees]);
    const totalBuses = useMemo(() => {
        const BUS_CAPACITY = 50;
        return Math.ceil(busAttendees.length / BUS_CAPACITY) || (busAttendees.length > 0 ? 1 : 0);
    }, [busAttendees]);

    const busAssignments = useMemo(() => {
        return busAttendees.reduce((acc, attendee) => {
            if (attendee.busNumber) {
                acc[attendee.busNumber] = (acc[attendee.busNumber] || 0) + 1;
            }
            return acc;
        }, {} as Record<number, number>);
    }, [busAttendees]);
    
    const busPassengerLists = useMemo((): BusDetails[] => {
        const busAttendees = attendees.filter(a => a.packageType === PackageType.SITIO_BUS);
        const BUS_CAPACITY = 50;
        const totalBusesCalculated = Math.ceil(busAttendees.length / BUS_CAPACITY) || (busAttendees.length > 0 ? 1 : 0);
        
        const buses: BusPassenger[][] = Array.from({ length: totalBusesCalculated }, () => []);

        const manuallyAssigned = busAttendees.filter(a => a.busNumber != null);
        const toAutoAssign = busAttendees.filter(a => a.busNumber == null);
        
        manuallyAssigned.forEach(person => {
            const busIndex = person.busNumber! - 1;
            if (busIndex >= 0 && busIndex < totalBusesCalculated && buses[busIndex].length < BUS_CAPACITY) {
                buses[busIndex].push({ ...person, assignmentType: 'manual' });
            } else {
                toAutoAssign.push(person); // Fallback if manual assignment is invalid
            }
        });
        
        // --- Auto-assignment logic (same as before) ---
        const getLastName = (name: string) => {
            const parts = name.trim().split(' ');
            const suffixes = ['jr', 'junior', 'filho', 'filha', 'neto', 'neta'];
            if (parts.length > 1 && suffixes.includes(parts[parts.length - 1].toLowerCase())) {
                return parts[parts.length - 2].toLowerCase();
            }
            return parts.pop()?.toLowerCase() || '';
        };
        const extractRelationKey = (name: string): string | null => {
            const match = name.match(/\((?:mãe|pai|padrinho|madrinha|filho|filha|irmão|irmã)\s+de\s+([^)]+)\)/i);
            return match ? match[1].trim().toLowerCase() : null;
        };
        let groups: Attendee[][] = [];
        let processedIds = new Set<string>();
        let individuals: Attendee[] = [];
        toAutoAssign.forEach(person => {
            if (processedIds.has(person.id)) return;
            // FIX: Access name from the nested person object.
            const relationKey = extractRelationKey(person.person.name);
            // FIX: Access name from the nested person object.
            const relatedPerson = relationKey ? toAutoAssign.find(p => p.person.name.toLowerCase().includes(relationKey)) : null;
            if (relatedPerson && !processedIds.has(relatedPerson.id)) {
                const group = [person, relatedPerson];
                processedIds.add(person.id);
                processedIds.add(relatedPerson.id);
                toAutoAssign.forEach(other => {
                    // FIX: Access name from the nested person object.
                    if (!processedIds.has(other.id) && extractRelationKey(other.person.name) === relationKey) {
                        group.push(other);
                        processedIds.add(other.id);
                    }
                });
                groups.push(group);
            }
        });
        const remainingToGroup = toAutoAssign.filter(p => !processedIds.has(p.id));
        const groupsByLastName = remainingToGroup.reduce((acc, person) => {
            // FIX: Access name from the nested person object.
            const lastName = getLastName(person.person.name);
            if (lastName) {
                acc[lastName] = acc[lastName] || [];
                acc[lastName].push(person);
            } else {
                individuals.push(person);
            }
            return acc;
        }, {} as Record<string, Attendee[]>);
        const lastNames = Object.keys(groupsByLastName);
        const processedLastNames = new Set<string>();
        for (const lastName1 of lastNames) {
            if (processedLastNames.has(lastName1)) continue;
            let currentGroup = [...groupsByLastName[lastName1]];
            processedLastNames.add(lastName1);
            for (const lastName2 of lastNames) {
                if (processedLastNames.has(lastName2)) continue;
                if (levenshteinDistance(lastName1, lastName2) <= 2) {
                    currentGroup.push(...groupsByLastName[lastName2]);
                    processedLastNames.add(lastName2);
                }
            }
            groups.push(currentGroup);
        }
        const families = groups.filter(group => group.length > 1);
        individuals.push(...groups.filter(group => group.length === 1).flat());
        families.sort((a, b) => b.length - a.length);
        families.forEach(family => {
            let placed = false;
            for (const bus of buses) {
                if (bus.length + family.length <= BUS_CAPACITY) {
                    bus.push(...family.map(p => ({ ...p, assignmentType: 'auto' as const })));
                    placed = true;
                    break;
                }
            }
            if (!placed) individuals.push(...family);
        });
        individuals.forEach(person => {
            for (const bus of buses) {
                if (bus.length < BUS_CAPACITY) {
                    bus.push({ ...person, assignmentType: 'auto' });
                    break;
                }
            }
        });
        // FIX: Access name from the nested person object for sorting.
        buses.forEach(bus => bus.sort((a, b) => a.person.name.localeCompare(b.person.name)));
        
        return buses.map((passengers, index) => ({
            busNumber: index + 1,
            passengers,
            capacity: BUS_CAPACITY,
        }));
    }, [attendees]);

    const busStatsForDashboard = useMemo((): BusStat[] => {
        return busPassengerLists.map(bus => ({
            busNumber: bus.busNumber,
            filledSeats: bus.passengers.length,
            capacity: bus.capacity,
            remainingSeats: bus.capacity - bus.passengers.length,
        }));
    }, [busPassengerLists]);

    const handleRequestBusChange = (attendee: Attendee, newBusNumber: number | null, assignmentType: 'manual' | 'auto') => {
        if (newBusNumber !== null) {
            const currentBusCount = busAssignments[newBusNumber] || 0;
            if (currentBusCount >= 50 && attendee.busNumber !== newBusNumber) {
                addToast(`O Ônibus ${newBusNumber} já está lotado.`, 'error');
                return;
            }
        }
        setConfirmationRequest({ attendee, newBusNumber, assignmentType });
    };

    const handleConfirmBusChange = async () => {
        if (!confirmationRequest) return;
        setIsSavingChange(true);
        const { attendee, newBusNumber } = confirmationRequest;
        try {
            await onUpdateAttendee({ ...attendee, busNumber: newBusNumber });
            // FIX: Access name from the nested person object.
            addToast(`"${attendee.person.name}" movido com sucesso.`, 'success');
        } catch (error) {
            // FIX: Access name from the nested person object.
            addToast(`Falha ao mover "${attendee.person.name}".`, 'error');
        } finally {
            setIsSavingChange(false);
            setConfirmationRequest(null);
        }
    };

    const handleCancelBusChange = () => {
        setConfirmationRequest(null);
    };

    const handleGenerate = (config: ReportConfig) => {
        if (config.type === 'busList') {
            const busesDataForReport = busPassengerLists.map(bus => bus.passengers);
            setReportConfig(config);
            setReportData(busesDataForReport);
            setMode('preview');
        } else {
            const filteredData = attendees.filter(attendee => {
                const statusMatch = config.filters.status === 'all' || attendee.payment.status === config.filters.status;
                const packageMatch = config.filters.packageType === 'all' || attendee.packageType === config.filters.packageType;
                return statusMatch && packageMatch;
            });

            // FIX: Access name from the nested person object for sorting.
            const sortedData = [...filteredData].sort((a, b) => a.person.name.localeCompare(b.person.name));

            setReportConfig(config);
            setReportData(sortedData);
            setMode('preview');
        }
    };

    const handleViewBus = (busNumber: number) => {
        setSelectedBusNumber(busNumber);
        setMode('busDetail');
    };
    
    const renderCurrentView = () => {
        switch (mode) {
            case 'financialDetail':
                return <FinancialDetailView financialData={financialDetails} onBack={() => setMode('dashboard')} />;
            case 'sitioOnlyList':
                return <SitioOnlyListView attendees={sitioOnlyAttendees} onBack={() => setMode('dashboard')} onSelectAttendee={onSelectAttendee} />;
            case 'form':
                return <InteractiveReportForm onGenerate={handleGenerate} onCancel={() => setMode('dashboard')} />;
            case 'preview':
                if (!reportConfig) {
                    setMode('form');
                    return null;
                }
                return <InteractiveReportPreview data={reportData} config={reportConfig} onBack={() => setMode('form')} />;
            case 'zeroDoc':
                return <ZeroDocList attendees={zeroDocAttendees} onBack={() => setMode('dashboard')} onUpdateAttendee={onUpdateAttendee} />;
            case 'duplicateCheck':
                return <DuplicateCheckerView groups={potentialDuplicates} onBack={() => setMode('dashboard')} onSelectAttendee={onSelectAttendee} />;
            case 'busDetail':
                const busDetails = busPassengerLists.find(b => b.busNumber === selectedBusNumber);
                if (!busDetails) {
                    setMode('dashboard');
                    return null;
                }
                return <BusPassengerList
                    busDetails={busDetails}
                    onBack={() => setMode('dashboard')}
                    onSelectAttendee={onSelectAttendee}
                    onRequestBusChange={handleRequestBusChange}
                    totalBuses={totalBuses}
                    busAssignments={busAssignments}
                />;
            case 'dashboard':
            default:
                return <ReportsDashboard
                    attendees={attendees}
                    onGenerateReportClick={() => setMode('form')}
                    onLogout={onLogout}
                    onFixDocsClick={() => setMode('zeroDoc')}
                    onCheckDuplicatesClick={() => setMode('duplicateCheck')}
                    zeroDocCount={zeroDocAttendees.length}
                    duplicateGroupCount={potentialDuplicates.length}
                    busStats={busStatsForDashboard}
                    onViewBus={handleViewBus}
                    onViewFinancials={() => setMode('financialDetail')}
                    onViewSitioOnlyList={() => setMode('sitioOnlyList')}
                    event={event}
                />;
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
        </>
    );
};

export default Reports;
