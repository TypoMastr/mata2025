
import React, { useState } from 'react';
import type { Attendee, PartialPaymentDetails } from '../types';
import { PaymentStatus, PackageType, DocumentType } from '../types';
import ReceiptViewer from './ReceiptViewer';
import { useToast } from '../contexts/ToastContext';
import { getWhatsAppUrl } from '../utils/formatters';

interface AttendeeDetailProps {
    attendee: Attendee;
    onBack: () => void;
    onEdit: () => void;
    onDelete: (attendee: Attendee) => void;
    onManagePayment: () => void;
    onUpdateAttendee: (attendee: Attendee) => Promise<void>;
    totalBuses: number;
    busAssignments: Record<number, number>;
}

const SpinnerIcon: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const DetailRow: React.FC<{ label: string; value?: string; children?: React.ReactNode }> = ({ label, value, children }) => (
    <div>
        <p className="text-sm text-zinc-500">{label}</p>
        {children || <p className="font-semibold text-zinc-800">{value}</p>}
    </div>
);

const CopyIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
);

const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'UTC',
    });
};

const PartialPaymentDetail: React.FC<{
    title: string;
    amount: number;
    details: PartialPaymentDetails | null | undefined;
    onViewReceipt: (url: string) => void;
}> = ({ title, amount, details, onViewReceipt }) => {
    const isPaid = details?.isPaid || false;
    const isExempt = details?.isExempt || false;

    return (
        <div className={`p-3 rounded-lg border ${isExempt ? 'bg-indigo-50 border-indigo-200' : isPaid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex justify-between items-center">
                <h3 className="font-bold text-zinc-800">{title}</h3>
                {isExempt ? (
                    <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-indigo-200 text-indigo-800">ISENTO</span>
                ) : (
                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${isPaid ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                        {isPaid ? 'PAGO' : 'PENDENTE'}
                    </span>
                )}
            </div>
            <div className="text-sm text-zinc-600 mt-2 space-y-2">
                {isExempt ? (
                    <div className="text-indigo-700 font-medium">Pagamento dispensado.</div>
                ) : (
                    <>
                        <div className="flex justify-between"><span className="font-medium">Valor:</span><span>R$ {amount.toFixed(2).replace('.', ',')}</span></div>
                        {isPaid && (
                            <>
                                <div className="flex justify-between"><span className="font-medium">Data:</span><span>{formatDate(details?.date)}</span></div>
                                <div className="flex justify-between"><span className="font-medium">Tipo:</span><span>{details?.type || 'N/A'}</span></div>
                                {details?.receiptUrl && (
                                     <button onClick={() => onViewReceipt(details.receiptUrl!)} className="text-sm font-semibold text-green-600 hover:underline pt-1">
                                        Ver Comprovante
                                    </button>
                                )}
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    )
};

interface ConfirmAttendanceToggleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    currentWontAttend: boolean;
    personName: string;
    isSaving: boolean;
}

const ConfirmAttendanceToggleModal: React.FC<ConfirmAttendanceToggleModalProps> = ({ isOpen, onClose, onConfirm, currentWontAttend, personName, isSaving }) => {
    if (!isOpen) return null;
    const changingToWontAttend = !currentWontAttend;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full animate-popIn">
                <h3 className="text-lg leading-6 font-bold text-zinc-900">Confirmar Alteração</h3>
                <div className="mt-3 text-sm text-zinc-600">
                    {changingToWontAttend ? (
                        <>
                            <p>Deseja marcar que <strong>{personName}</strong> <span className="text-red-600 font-bold">NÃO COMPARECERÁ</span> ao evento?</p>
                            <ul className="list-disc list-inside mt-2 space-y-1 bg-red-50 p-2 rounded border border-red-100">
                                <li>A vaga no ônibus será liberada.</li>
                                <li>Não será contabilizado na lista de presença.</li>
                                <li>O pagamento e histórico financeiro serão <strong>mantidos</strong>.</li>
                            </ul>
                        </>
                    ) : (
                        <p>Deseja confirmar novamente a presença de <strong>{personName}</strong>? A pessoa voltará a ocupar uma vaga no ônibus (se aplicável).</p>
                    )}
                </div>
                <div className="mt-5 sm:mt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                    <button type="button" onClick={onClose} disabled={isSaving} className="w-full justify-center rounded-full border border-zinc-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-zinc-700 hover:bg-zinc-50 sm:w-auto sm:text-sm">
                        Cancelar
                    </button>
                    <button type="button" onClick={onConfirm} disabled={isSaving} className="w-full justify-center rounded-full border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 sm:w-auto sm:text-sm disabled:bg-green-400 flex items-center justify-center gap-2">
                        {isSaving ? <SpinnerIcon /> : null}
                        {isSaving ? 'Salvando...' : 'Confirmar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const AttendeeDetail: React.FC<AttendeeDetailProps> = ({ attendee, onBack, onEdit, onDelete, onManagePayment, onUpdateAttendee, totalBuses, busAssignments }) => {
    const { addToast } = useToast();
    const [receiptToView, setReceiptToView] = useState<string | null>(null);
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    const [editedNotes, setEditedNotes] = useState(attendee.notes || '');
    const [isSaving, setIsSaving] = useState(false);
    const [isEditingBus, setIsEditingBus] = useState(false);
    const [selectedBus, setSelectedBus] = useState<string>(attendee.busNumber?.toString() || 'null');
    const [isSavingBus, setIsSavingBus] = useState(false);
    
    const [showAttendanceConfirmation, setShowAttendanceConfirmation] = useState(false);
    const [isUpdatingAttendance, setIsUpdatingAttendance] = useState(false);

    const handleCopyToClipboard = async (text: string, label: string) => {
        if (!navigator.clipboard) {
            addToast('A cópia não é suportada neste navegador.', 'error');
            return;
        }
        try {
            await navigator.clipboard.writeText(text);
            addToast(`${label} copiado!`, 'success');
        } catch (err) {
            console.error('Failed to copy text: ', err);
            addToast(`Falha ao copiar ${label.toLowerCase()}.`, 'error');
        }
    };

    const status = attendee.payment.status;

    let statusClasses = '';
    switch (status) {
        case PaymentStatus.PAGO:
            statusClasses = 'bg-green-100 text-green-800';
            break;
        case PaymentStatus.PENDENTE:
            statusClasses = 'bg-red-100 text-red-800';
            break;
        case PaymentStatus.ISENTO:
            statusClasses = 'bg-blue-100 text-blue-800';
            break;
        default:
            statusClasses = 'bg-zinc-100 text-zinc-800';
    }
    
    const getAnimationStyle = (delay: number) => ({
        animationDelay: `${delay}ms`,
        animationFillMode: 'forwards',
    });

    const isMultiPayment = attendee.packageType === PackageType.SITIO_BUS;
    const isPartiallyPaid = isMultiPayment &&
                            status === PaymentStatus.PENDENTE &&
                            (attendee.payment.sitePaymentDetails?.isPaid || attendee.payment.busPaymentDetails?.isPaid);
    
    const isPartialExempt = isMultiPayment && 
                            status !== PaymentStatus.ISENTO && 
                            (attendee.payment.sitePaymentDetails?.isExempt || attendee.payment.busPaymentDetails?.isExempt);

    const handleEditNotesClick = () => {
        setEditedNotes(attendee.notes || '');
        setIsEditingNotes(true);
    };

    const handleCancelEdit = () => {
        setIsEditingNotes(false);
    };

    const handleSaveNotes = async () => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            await onUpdateAttendee({
                ...attendee,
                notes: editedNotes.trim(),
            });
            setIsEditingNotes(false);
            addToast('Observações salvas com sucesso.', 'success');
        } catch (error) {
            console.error("Failed to save notes:", error);
            addToast('Falha ao salvar observações.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveBus = async () => {
        if (isSavingBus) return;
        const newBusNumber = selectedBus === 'null' ? null : Number(selectedBus);

        if (newBusNumber !== null) {
            const currentBusCount = busAssignments[newBusNumber] || 0;
            if (currentBusCount >= 50 && attendee.busNumber !== newBusNumber) {
                addToast(`O Ônibus ${newBusNumber} já está lotado.`, 'error');
                return;
            }
        }
        
        setIsSavingBus(true);
        try {
            await onUpdateAttendee({
                ...attendee,
                busNumber: newBusNumber,
            });
            setIsEditingBus(false);
            addToast('Ônibus atualizado com sucesso.', 'success');
        } catch (error) {
            console.error("Failed to save bus assignment:", error);
            addToast('Falha ao salvar ônibus.', 'error');
        } finally {
            setIsSavingBus(false);
        }
    };
    
    const initiateToggleAttendance = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        setShowAttendanceConfirmation(true);
    };

    const confirmToggleAttendance = async () => {
        if (isUpdatingAttendance) return;
        setIsUpdatingAttendance(true);
        try {
            const newValue = !attendee.wontAttend;
            await onUpdateAttendee({
                ...attendee,
                wontAttend: newValue,
            });
            addToast(newValue ? 'Marcado como "Não irá comparecer".' : 'Presença confirmada novamente.', 'success');
            setShowAttendanceConfirmation(false);
        } catch (error) {
            addToast('Erro ao atualizar status de presença.', 'error');
        } finally {
            setIsUpdatingAttendance(false);
        }
    };

    const showInvalidDocAsNotInformed = attendee.packageType === PackageType.SITIO_ONLY && attendee.person.documentType === DocumentType.OUTRO;


    return (
        <div className="animate-fadeIn">
            <header className="sticky top-0 bg-white md:bg-zinc-50 z-10 p-4 md:pt-6 border-b border-zinc-200 flex items-center gap-4">
                <button onClick={onBack} className="text-zinc-500 hover:text-zinc-800 p-1 rounded-full hover:bg-zinc-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h1 className="text-xl md:text-2xl font-bold text-zinc-800">Detalhes da Inscrição</h1>
            </header>
            
            <div className="p-4 pb-48">
                <div className="md:grid md:grid-cols-2 md:gap-6 space-y-6 md:space-y-0">
                    
                    <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm space-y-4 opacity-0 animate-fadeInUp" style={getAnimationStyle(100)}>
                        <DetailRow label="Nome">
                            <div className="flex items-center justify-between">
                                <p className="font-semibold text-zinc-800">{attendee.person.name}</p>
                                <button
                                    onClick={() => handleCopyToClipboard(attendee.person.name, 'Nome')}
                                    className="p-1.5 text-zinc-400 rounded-full hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
                                    aria-label="Copiar nome"
                                >
                                    <CopyIcon />
                                </button>
                            </div>
                        </DetailRow>
                        <DetailRow label="Documento">
                            <div className="flex items-center justify-between">
                                {showInvalidDocAsNotInformed ? (
                                    <p className="font-semibold text-zinc-500 italic">Não informado</p>
                                ) : (
                                    <p className="font-semibold text-zinc-800">{`${attendee.person.document} (${attendee.person.documentType})`}</p>
                                )}
                                <button
                                    onClick={() => {
                                        if (showInvalidDocAsNotInformed) {
                                            addToast('Documento não informado.', 'info');
                                        } else {
                                            handleCopyToClipboard(attendee.person.document, 'Documento');
                                        }
                                    }}
                                    className="p-1.5 text-zinc-400 rounded-full hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
                                    aria-label="Copiar documento"
                                >
                                    <CopyIcon />
                                </button>
                            </div>
                        </DetailRow>
                        <DetailRow label="Telefone">
                            <div className="flex flex-col items-start gap-2">
                                <div className="flex items-center justify-between w-full">
                                    <p className="font-semibold text-zinc-800">{attendee.person.phone}</p>
                                    <button
                                        onClick={() => handleCopyToClipboard(attendee.person.phone, 'Telefone')}
                                        className="p-1.5 text-zinc-400 rounded-full hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
                                        aria-label="Copiar telefone"
                                    >
                                        <CopyIcon />
                                    </button>
                                </div>
                                {attendee.person.phone && (
                                    <a
                                        href={getWhatsAppUrl(attendee.person.phone)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="px-3 py-1 text-xs font-semibold text-white bg-green-500 rounded-full hover:bg-green-600 transition-colors shadow-sm"
                                        aria-label={`Abrir conversa com ${attendee.person.name} no WhatsApp`}
                                    >
                                        <span>Abrir no WhatsApp</span>
                                    </a>
                                )}
                            </div>
                        </DetailRow>
                        <DetailRow label="Pacote" value={attendee.packageType} />
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm opacity-0 animate-fadeInUp" style={getAnimationStyle(200)}>
                        <h2 className="text-lg font-bold text-zinc-800 mb-3">Pagamento</h2>
                        <div className="space-y-4">
                            <DetailRow label="Status Geral">
                                <div className="flex items-center flex-wrap gap-2">
                                     <span className={`px-3 py-1 text-sm font-bold rounded-full ${statusClasses}`}>
                                        {attendee.payment.status}
                                    </span>
                                    {isPartiallyPaid && (
                                         <span className="px-3 py-1 text-sm font-bold rounded-full bg-yellow-100 text-yellow-800">
                                            PARCIAL
                                        </span>
                                    )}
                                    {isPartialExempt && (
                                        <span className="px-3 py-1 text-sm font-bold rounded-full bg-indigo-100 text-indigo-800">
                                            ISENTO PARCIAL
                                        </span>
                                    )}
                                </div>
                            </DetailRow>
                            <DetailRow label="Valor Total" value={`R$ ${attendee.payment.amount.toFixed(2).replace('.', ',')}`} />
                            
                            {!isMultiPayment && status === PaymentStatus.PAGO && (
                                <>
                                    <DetailRow label="Data do Pagamento" value={formatDate(attendee.payment.date)} />
                                    <DetailRow label="Tipo de Pagamento" value={attendee.payment.type || 'N/A'} />
                                    {attendee.payment.receiptUrl && (
                                         <button onClick={() => setReceiptToView(attendee.payment.receiptUrl)} className="text-sm font-semibold text-green-600 hover:underline">
                                            Ver Comprovante
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                    
                    {isMultiPayment && !attendee.wontAttend && (
                        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm space-y-3 opacity-0 animate-fadeInUp md:col-span-2" style={getAnimationStyle(225)}>
                            <div className="flex justify-between items-center">
                                <h2 className="text-lg font-bold text-zinc-800">Transporte</h2>
                                {!isEditingBus && (
                                    <button onClick={() => setIsEditingBus(true)} className="text-sm font-semibold text-green-600 hover:text-green-800 transition-colors px-3 py-1 rounded-lg hover:bg-green-50">
                                        Alterar
                                    </button>
                                )}
                            </div>
                            {isEditingBus ? (
                                <div className="animate-fadeIn space-y-3">
                                    <DetailRow label="Atribuir ao Ônibus">
                                        <select
                                            value={selectedBus}
                                            onChange={(e) => setSelectedBus(e.target.value)}
                                            className="block w-full px-3 py-2 bg-white border border-zinc-300 rounded-md shadow-sm sm:text-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                                        >
                                            <option value="null">Não atribuído</option>
                                            {Array.from({ length: totalBuses }, (_, i) => i + 1).map(busNum => {
                                                const count = busAssignments[busNum] || 0;
                                                const isFull = count >= 50;
                                                const isCurrentBus = attendee.busNumber === busNum;
                                                const isDisabled = isFull && !isCurrentBus;

                                                return (
                                                    <option key={busNum} value={busNum} disabled={isDisabled}>
                                                        Ônibus {busNum}{isDisabled ? ' - (Lotado)' : ''}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </DetailRow>
                                    <div className="flex gap-2 mt-2 justify-end">
                                        <button onClick={() => setIsEditingBus(false)} className="px-4 py-2 text-sm font-bold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-full transition-colors">
                                            Cancelar
                                        </button>
                                        <button onClick={handleSaveBus} disabled={isSavingBus} className="px-4 py-2 text-sm font-bold text-white bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center gap-2 disabled:bg-green-400 w-28 transition-colors">
                                            {isSavingBus ? <SpinnerIcon /> : 'Salvar'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <DetailRow label="Ônibus Designado" value={attendee.busNumber ? `Ônibus ${attendee.busNumber}` : 'Não atribuído'} />
                            )}
                        </div>
                    )}

                    {isMultiPayment && (
                        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm space-y-3 opacity-0 animate-fadeInUp md:col-span-2" style={getAnimationStyle(250)}>
                            <PartialPaymentDetail title="Pagamento Sítio" amount={70} details={attendee.payment.sitePaymentDetails} onViewReceipt={setReceiptToView} />
                            <PartialPaymentDetail title="Pagamento Ônibus" amount={50} details={attendee.payment.busPaymentDetails} onViewReceipt={setReceiptToView} />
                        </div>
                    )}

                    <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm space-y-3 opacity-0 animate-fadeInUp md:col-span-2" style={getAnimationStyle(300)}>
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-bold text-zinc-800">Observações</h2>
                            {!isEditingNotes && (
                                <button onClick={handleEditNotesClick} className="text-sm font-semibold text-green-600 hover:text-green-800 transition-colors px-3 py-1 rounded-lg hover:bg-green-50">
                                    {attendee.notes ? 'Editar' : 'Adicionar'}
                                </button>
                            )}
                        </div>
                        {isEditingNotes ? (
                            <div className="animate-fadeIn">
                                <textarea
                                    value={editedNotes}
                                    onChange={(e) => setEditedNotes(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 bg-white border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                                    rows={4}
                                    placeholder="Alergias, restrições alimentares, etc."
                                    autoFocus
                                />
                                <div className="flex gap-2 mt-2 justify-end">
                                    <button onClick={handleCancelEdit} className="px-4 py-2 text-sm font-bold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-full transition-colors">
                                        Cancelar
                                    </button>
                                    <button onClick={handleSaveNotes} disabled={isSaving} className="px-4 py-2 text-sm font-bold text-white bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center gap-2 disabled:bg-green-400 w-28 transition-colors">
                                        {isSaving ? <SpinnerIcon /> : 'Salvar'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            attendee.notes ? (
                                <p className="font-normal text-zinc-700 whitespace-pre-wrap pt-1">{attendee.notes}</p>
                            ) : (
                                <p className="text-sm text-zinc-500 italic pt-1">Nenhuma observação adicionada.</p>
                            )
                        )}
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm space-y-3 opacity-0 animate-fadeInUp md:col-span-2" style={getAnimationStyle(325)}>
                        <h2 className="text-lg font-bold text-zinc-800">Controle de Presença</h2>
                        
                        <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-100 bg-zinc-50">
                            <div className="flex flex-col mr-4">
                                <span className="font-semibold text-zinc-700 text-sm">Confirmar Ausência</span>
                                <span className="text-xs text-zinc-500">Marcar que não irá comparecer</span>
                            </div>
                            
                            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer" 
                                    checked={!!attendee.wontAttend} 
                                    onChange={initiateToggleAttendance} 
                                    disabled={isUpdatingAttendance} 
                                />
                                <div className="w-11 h-6 bg-zinc-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                            </label>
                        </div>

                        {attendee.wontAttend && (
                            <div className="bg-red-50 border border-red-100 text-red-800 p-3 rounded-lg text-sm flex gap-3 items-start animate-fadeIn">
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0 mt-0.5 text-red-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                                 <div>
                                    <p className="font-bold text-red-700">Ausência Confirmada</p>
                                    <p className="mt-1 text-xs leading-relaxed opacity-90">
                                        Esta pessoa <strong>liberou a vaga no ônibus</strong> e não será contada na lista de presença. O histórico financeiro foi mantido.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-3 opacity-0 animate-fadeInUp md:col-span-2" style={getAnimationStyle(350)}>
                        <button onClick={onManagePayment} className="w-full bg-blue-500 text-white font-bold py-3 px-4 rounded-full hover:bg-blue-600 transition-colors shadow-sm">
                            Gerenciar Pagamentos
                        </button>
                        
                        <div className="flex flex-col md:flex-row gap-3">
                            <button onClick={onEdit} className="w-full bg-zinc-200 text-zinc-800 font-bold py-3 px-4 rounded-full hover:bg-zinc-300 transition-colors">
                                Editar Inscrição
                            </button>
                             <button onClick={() => onDelete(attendee)} className="w-full bg-red-100 text-red-700 font-bold py-3 px-4 rounded-full hover:bg-red-200 transition-colors">
                                Excluir Inscrição
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            {receiptToView && (
                <ReceiptViewer receiptUrl={receiptToView} onClose={() => setReceiptToView(null)} />
            )}

            <ConfirmAttendanceToggleModal 
                isOpen={showAttendanceConfirmation}
                onClose={() => setShowAttendanceConfirmation(false)}
                onConfirm={confirmToggleAttendance}
                currentWontAttend={!!attendee.wontAttend}
                personName={attendee.person.name}
                isSaving={isUpdatingAttendance}
            />
        </div>
    );
};

export default AttendeeDetail;
