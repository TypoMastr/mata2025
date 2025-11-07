import React, { useState, useMemo } from 'react';
import type { Attendee, ReportConfig, ReportField } from '../types';
import { PackageType, PaymentStatus, DocumentType, PaymentType } from '../types';
import { formatDocument, getDocumentType } from '../utils/formatters';

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
            <header className="sticky top-0 md:static bg-white z-10 p-4 md:pt-6 border-b border-zinc-200 flex items-center gap-4">
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
                                 <select id="statusFilter" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="mt-1 block w-full px-3 py-2 bg-white border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm" autoComplete="off">
                                     <option value="all">Todos</option>
                                     <option value={PaymentStatus.PAGO}>Pago</option>
                                     <option value={PaymentStatus.PENDENTE}>Pendente</option>
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
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    
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
            <!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Relatório Gira da Mata</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 1.5rem; color: #333; }
                h1 { color: #10B981; border-bottom: 2px solid #10B981; padding-bottom: 0.5rem; }
                p { font-size: 0.9rem; }
                table { width: 100%; border-collapse: collapse; margin-top: 1rem; font-size: 0.8rem; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f7f7f7; font-weight: 600; }
                tr:nth-child(even) { background-color: #fcfcfc; }
                .no-print {
                    position: fixed; top: 1rem; right: 1rem;
                    background-color: #333; color: white;
                    padding: 0.5rem 1rem; border-radius: 9999px;
                    border: none; font-weight: bold; cursor: pointer;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    z-index: 100;
                }
                @page { size: A4; margin: 1in; }
                @media print {
                    .no-print { display: none; }
                }
            </style></head><body>
                <button class="no-print" onclick="window.close()">Fechar</button>
                <h1>Relatório - Gira da Mata</h1>
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
    
    const handleShareAsText = async () => {
        setIsShareModalOpen(false);
        const title = `Relatório Gira da Mata (${data.length} registros)`;
        let reportText = `${title}\n\n`;
        data.forEach((attendee) => {
            reportText += `*${formatValue(attendee, 'name')}*\n`;
            config.fields.forEach(field => {
                if (field !== 'name') {
                    reportText += ` - ${fieldNames[field]}: ${formatValue(attendee, field)}\n`;
                }
            });
            reportText += '\n';
        });

        if (navigator.share) {
            try {
                await navigator.share({
                    title: title,
                    text: reportText,
                });
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
        handlePrintAndExport();
        setIsShareModalOpen(false);
    };

    return (
        <div className="flex flex-col animate-fadeIn">
             <header className="sticky top-0 md:static bg-white z-10 p-4 md:pt-6 border-b border-zinc-200 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-zinc-500 hover:text-zinc-800 p-1 rounded-full hover:bg-zinc-100">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <h1 className="text-xl md:text-2xl font-bold text-zinc-800">Relatório ({data.length})</h1>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setIsShareModalOpen(true)} className="p-2 rounded-full text-zinc-700 bg-zinc-200 hover:bg-zinc-300 transition-colors" aria-label="Compartilhar">
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
            {isShareModalOpen && (
                <ShareOptionsModal
                    onClose={() => setIsShareModalOpen(false)}
                    onShareAsText={handleShareAsText}
                    onShareAsPdf={handleShareAsPdf}
                />
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
    const [documentValue, setDocumentValue] = useState(attendee.document);
    const [docType, setDocType] = useState<DocumentType>(() => getDocumentType(attendee.document).type);
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
                document: documentValue,
                documentType: docType,
            };
            await onUpdate(updatedAttendee);
            setStatus('success');
        } catch (err) {
            console.error(err);
            setError('Falha ao salvar. Tente novamente.');
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
                    <p className="font-bold text-zinc-800 flex-1 min-w-0">{attendee.name}</p>
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
                    attendeeName={attendee.name}
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

const ReportsDashboard: React.FC<{ attendees: Attendee[]; onGenerateReportClick: () => void; onLogout: () => void; onFixDocsClick: () => void; }> = ({ attendees, onGenerateReportClick, onLogout, onFixDocsClick }) => {
    const { totalAttendees, paidCount, pendingCount, totalRevenue, pendingRevenue, totalPossibleRevenue, buses, sitioOnlyCount, zeroDocAttendees, paymentStats } = useMemo(() => {
        const busAttendees = attendees.filter(a => a.packageType === PackageType.SITIO_BUS);
        const BUS_CAPACITY = 50;
        const busCount = Math.ceil(busAttendees.length / BUS_CAPACITY) || (busAttendees.length > 0 ? 1 : 0);

        const paidAttendees = attendees.filter(a => a.payment.status === PaymentStatus.PAGO);
        const paidCountValue = paidAttendees.length;

        const calculatedPaymentStats = paidAttendees
            .filter(a => a.payment.type) // Ensure payment type exists
            .reduce((acc, attendee) => {
                const type = attendee.payment.type!;
                if (!acc[type]) {
                    acc[type] = { count: 0, total: 0 };
                }
                acc[type].count += 1;
                acc[type].total += attendee.payment.amount;
                return acc;
            }, {} as Record<PaymentType, { count: number; total: number }>);
        
        // FIX: Cast `a` and `b` to fix TypeScript error where `count` property is not found on type `unknown`.
        const sortedPaymentStats = Object.entries(calculatedPaymentStats)
            .sort(([, a], [, b]) => (b as { count: number }).count - (a as { count: number }).count)
            .reduce((r, [k, v]) => ({ ...r, [k as PaymentType]: v }), {} as Record<PaymentType, { count: number; total: number }>);

        return {
            totalAttendees: attendees.length,
            paidCount: paidCountValue,
            pendingCount: attendees.filter(a => a.payment.status === PaymentStatus.PENDENTE).length,
            totalRevenue: paidAttendees.reduce((sum, a) => sum + a.payment.amount, 0),
            pendingRevenue: attendees.filter(a => a.payment.status === PaymentStatus.PENDENTE).reduce((sum, a) => sum + a.payment.amount, 0),
            totalPossibleRevenue: attendees.reduce((sum, a) => sum + a.payment.amount, 0),
            buses: Array.from({ length: busCount }, (_, i) => {
                const filledSeats = Math.min(BUS_CAPACITY, Math.max(0, busAttendees.length - (i * BUS_CAPACITY)));
                return { busNumber: i + 1, filledSeats, remainingSeats: BUS_CAPACITY - filledSeats, capacity: BUS_CAPACITY };
            }),
            sitioOnlyCount: attendees.filter(a => a.packageType === PackageType.SITIO_ONLY).length,
            zeroDocAttendees: attendees.filter(a => /^0+$/.test(a.document.replace(/[^\d]/g, ''))),
            paymentStats: sortedPaymentStats
        };
    }, [attendees]);

    const IconUsers = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.124-1.282-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.124-1.282.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
    const IconDollar = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01M12 12v-2m0 2v2m0-2.35V10M12 15v2m0-2v-2m0 0h.01M12 7.02c.164.017.324.041.48.072M7.5 9.51c.418-.472 1.012-.867 1.697-1.126M12 21a9 9 0 100-18 9 9 0 000 18z" /></svg>;
    const IconBus = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h8l2-2zM5 11h6" /></svg>;
    const IconHome = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
    const IconClipboardList = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>;
    const IconWarning = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
    const IconCreditCard = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>;
    
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
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard title="Inscrições" icon={IconUsers} delay={100}>
                    <div className="flex justify-between items-baseline">
                        <span className="font-bold text-3xl text-zinc-800">{totalAttendees}</span>
                        <span className="text-sm font-semibold text-zinc-500">Total</span>
                    </div>
                    <ProgressBar value={paidCount} max={totalAttendees} />
                    <div className="flex justify-between text-sm">
                        <span className="font-semibold text-green-600">{paidCount} {paidCount === 1 ? 'Pago' : 'Pagos'}</span>
                        <span className="font-semibold text-red-600">{pendingCount} {pendingCount === 1 ? 'Pendente' : 'Pendentes'}</span>
                    </div>
                </StatCard>
                <StatCard title="Financeiro" icon={IconDollar} delay={150}><div className="flex justify-between items-baseline"><span className="font-bold text-3xl text-zinc-800">R$ {totalRevenue.toFixed(2).replace('.',',')}</span><span className="text-sm font-semibold text-zinc-500">Arrecadado</span></div><ProgressBar value={totalRevenue} max={totalPossibleRevenue} /><div className="flex justify-between text-sm"><span className="font-semibold text-zinc-500">Pendente: R$ {pendingRevenue.toFixed(2).replace('.',',')}</span></div></StatCard>
                
                {zeroDocAttendees.length > 0 && (
                    <div onClick={onFixDocsClick} className="cursor-pointer md:col-span-2 lg:col-span-1">
                        <StatCard title="Documentos Pendentes" icon={IconWarning} delay={200} className="bg-yellow-50 border-yellow-300 h-full">
                           <div className="flex justify-between items-baseline">
                                <span className="font-bold text-3xl text-yellow-800">{zeroDocAttendees.length}</span>
                                <span className="text-sm font-semibold text-yellow-700">{zeroDocAttendees.length === 1 ? 'Inscrito' : 'Inscritos'}</span>
                            </div>
                            <p className="text-xs text-yellow-700">Com documento '000...'. Clique aqui para corrigir.</p>
                        </StatCard>
                    </div>
                )}
                {buses.map((bus, index) => (<StatCard key={bus.busNumber} title={`Ônibus ${bus.busNumber}`} icon={IconBus} delay={225 + index * 50}><div className="flex justify-between items-baseline"><span className="font-bold text-3xl text-zinc-800">{bus.filledSeats}</span><span className="text-sm font-semibold text-zinc-500">/ {bus.capacity} vagas</span></div><ProgressBar value={bus.filledSeats} max={bus.capacity} colorClass="bg-blue-500" /><div className="flex justify-between text-sm"><span className="font-semibold text-blue-600">{bus.filledSeats} {bus.filledSeats === 1 ? 'Preenchida' : 'Preenchidas'}</span><span className="font-semibold text-zinc-500">{bus.remainingSeats} {bus.remainingSeats === 1 ? 'Restante' : 'Restantes'}</span></div></StatCard>))}
                <StatCard title="Apenas Sítio" icon={IconHome} delay={225 + (buses.length * 50)}>
                    <div className="flex justify-between items-baseline">
                        <span className="font-bold text-3xl text-zinc-800">{sitioOnlyCount}</span>
                        <span className="text-sm font-semibold text-zinc-500">{sitioOnlyCount === 1 ? 'Inscrito' : 'Inscritos'}</span>
                    </div>
                    <div className="text-xs text-zinc-400 text-center pt-4">
                        Não há limite de vagas para este pacote.
                    </div>
                </StatCard>
                <StatCard title="Formas de Pagamento" icon={IconCreditCard} delay={250 + (buses.length * 50)}>
                    {Object.keys(paymentStats).length > 0 ? (
                        <div className="space-y-3">
                            {/* FIX: Cast the result of Object.entries to fix TypeScript errors where properties on `stats` are not found on type `unknown`. */}
                            {(Object.entries(paymentStats) as [string, { count: number; total: number }][]).map(([type, stats]) => (
                                <div key={type} className="text-sm">
                                    <div className="flex justify-between font-semibold text-zinc-800 mb-1">
                                        <span>{type}</span>
                                        <span>{paidCount > 0 ? `${((stats.count / paidCount) * 100).toFixed(0)}%` : '0%'}</span>
                                    </div>
                                    <ProgressBar value={stats.count} max={paidCount} colorClass="bg-emerald-400" />
                                    <div className="flex justify-between items-center text-xs text-zinc-500 mt-1">
                                        <span>{stats.count} {stats.count === 1 ? 'pagamento' : 'pagamentos'}</span>
                                        <span className="font-medium">R$ {stats.total.toFixed(2).replace('.', ',')}</span>
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
                <StatCard title="Relatórios Personalizados" icon={IconClipboardList} delay={300 + (buses.length * 50)} className="md:col-span-2 lg:col-span-3"><p className="text-sm text-zinc-600">Crie relatórios com filtros e campos específicos. Exporte em PDF, imprima ou compartilhe.</p><button onClick={onGenerateReportClick} className="mt-2 w-full bg-blue-500 text-white font-bold py-2 px-4 rounded-full hover:bg-blue-600 transition-colors shadow-sm flex items-center justify-center gap-2">Gerar Relatório</button></StatCard>
            </div>
        </div>
    );
};

// --- Componente Principal ---
interface ReportsProps {
    attendees: Attendee[];
    onLogout: () => void;
    onUpdateAttendee: (attendee: Attendee) => Promise<void>;
}

const Reports: React.FC<ReportsProps> = ({ attendees, onLogout, onUpdateAttendee }) => {
    const [mode, setMode] = useState<'dashboard' | 'form' | 'preview' | 'zeroDoc'>('dashboard');
    const [reportConfig, setReportConfig] = useState<ReportConfig | null>(null);
    const [reportData, setReportData] = useState<Attendee[]>([]);

    const zeroDocAttendees = useMemo(() => {
        return attendees.filter(a => /^0+$/.test(a.document.replace(/[^\d]/g, '')));
    }, [attendees]);

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

    if (mode === 'zeroDoc') {
        return <ZeroDocList attendees={zeroDocAttendees} onBack={() => setMode('dashboard')} onUpdateAttendee={onUpdateAttendee} />;
    }

    return <ReportsDashboard attendees={attendees} onGenerateReportClick={() => setMode('form')} onLogout={onLogout} onFixDocsClick={() => setMode('zeroDoc')} />;
};

export default Reports;