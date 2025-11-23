
import React, { useState, useEffect, useMemo } from 'react';
import type { Attendee, Event } from '../types';
import AttendeeListItem from './AttendeeListItem';
import { PaymentStatus, PackageType } from '../types';
import { normalizeString, getWhatsAppUrl } from '../utils/formatters';

interface AttendeeListProps {
    attendees: Attendee[];
    onSelectAttendee: (id: string) => void;
    onAddAttendee: () => void;
    onLogout: () => void;
    searchQuery: string;
    onSearchQueryChange: (query: string) => void;
    statusFilter: 'all' | PaymentStatus | 'partial_exempt';
    onStatusFilterChange: (filter: 'all' | PaymentStatus | 'partial_exempt') => void;
    packageFilter: 'all' | PackageType;
    onPackageFilterChange: (filter: 'all' | PackageType) => void;
    scrollPosition: number;
    onScrollPositionReset: () => void;
    events: Event[];
    selectedEventId: string | null;
    onEventChange: (id: string | null) => void;
}

const FilterPill: React.FC<{ label: string; isActive: boolean; onClick: () => void; }> = ({ label, isActive, onClick }) => {
    const baseClasses = "px-3 py-1 text-sm font-semibold rounded-full transition-colors flex-shrink-0 select-none touch-manipulation cursor-pointer";
    const activeClasses = "bg-green-500 text-white shadow-sm active:bg-green-600";
    const inactiveClasses = "bg-zinc-200 text-zinc-700 hover:bg-zinc-300";
    return (
        <button onClick={onClick} className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}>
            {label}
        </button>
    );
};

const FilterBottomSheet: React.FC<{
    title: string;
    options: { label: string; value: string }[];
    selectedValue: string;
    onSelect: (value: string) => void;
    onClose: () => void;
}> = ({ title, options, selectedValue, onSelect, onClose }) => {
    const [isClosing, setIsClosing] = useState(false);

    const handleClose = () => {
        setIsClosing(true);
        // Wait for animation to finish before unmounting
        setTimeout(() => {
            onClose();
        }, 300);
    };

    const handleSelect = (value: string) => {
        onSelect(value);
        handleClose();
    };

    return (
        <div className={`fixed inset-0 z-[100] flex items-end justify-center`} onClick={handleClose}>
            {/* Backdrop with Fade In/Out */}
            <div className={`absolute inset-0 bg-black/50 ${isClosing ? 'animate-fadeOut' : 'animate-fadeIn'}`}></div>
            
            {/* Sheet Content */}
            {/* Margin bottom calculated to sit exactly above the BottomNav (4rem/64px) + Safe Area */}
            <div 
                className={`w-full bg-white rounded-t-2xl p-4 shadow-2xl max-w-md mx-auto relative z-10 mb-[calc(4rem_+_env(safe-area-inset-bottom))] md:mb-0 ${isClosing ? 'animate-slideDown' : 'animate-slideUp'}`} 
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg text-zinc-800">{title}</h3>
                    <button onClick={handleClose} className="p-1.5 bg-zinc-100 rounded-full text-zinc-500 hover:bg-zinc-200 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="space-y-2 pb-2">
                    {options.map((opt) => {
                        const isSelected = selectedValue === opt.value;
                        return (
                            <button
                                key={opt.value}
                                onClick={() => handleSelect(opt.value)}
                                className={`w-full text-left px-4 py-3 rounded-xl border-2 text-base transition-all flex justify-between items-center touch-manipulation active:scale-[0.99] ${
                                    isSelected
                                        ? 'bg-green-50 border-green-600 text-green-900 font-bold shadow-sm'
                                        : 'bg-white border-zinc-200 text-zinc-800 font-semibold hover:bg-zinc-50'
                                }`}
                            >
                                {opt.label}
                                {isSelected && (
                                    <div className="bg-green-600 rounded-full p-1">
                                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const PackageIcon: React.FC<{ packageType: PackageType }> = ({ packageType }) => {
    return packageType === PackageType.SITIO_BUS
        ? <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5 text-zinc-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h8l2-2zM5 11h6" /></svg>
        : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5 text-zinc-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
}

const StatusBadge: React.FC<{ attendee: Attendee }> = ({ attendee }) => {
    let statusClasses = '';
    const { status, sitePaymentDetails, busPaymentDetails } = attendee.payment;
    
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
    
    const isPartiallyPaid = attendee.packageType === PackageType.SITIO_BUS &&
                            status === PaymentStatus.PENDENTE &&
                            (sitePaymentDetails?.isPaid || busPaymentDetails?.isPaid);
    
    // Only show partial exempt if the user is NOT fully exempt
    const isPartialExempt = attendee.packageType === PackageType.SITIO_BUS &&
                            status !== PaymentStatus.ISENTO &&
                            (sitePaymentDetails?.isExempt || busPaymentDetails?.isExempt);

    return (
        <div className="flex items-center flex-wrap gap-2">
            <span className={`px-3 py-1 text-xs font-bold rounded-full ${statusClasses}`}>
                {status.toUpperCase()}
            </span>
            {isPartiallyPaid && (
                 <span className="px-3 py-1 text-xs font-bold rounded-full bg-yellow-100 text-yellow-800">
                    PARCIAL
                </span>
            )}
            {isPartialExempt && (
                 <span className="px-3 py-1 text-xs font-bold rounded-full bg-indigo-100 text-indigo-800">
                    ISENTO PARCIAL
                </span>
            )}
        </div>
    );
}

const AttendeeList: React.FC<AttendeeListProps> = ({ 
    attendees, 
    onSelectAttendee, 
    onAddAttendee, 
    onLogout,
    searchQuery,
    onSearchQueryChange,
    statusFilter,
    onStatusFilterChange,
    packageFilter,
    onPackageFilterChange,
    scrollPosition,
    onScrollPositionReset,
    events,
    selectedEventId,
    onEventChange,
}) => {
    
    const [activeModal, setActiveModal] = useState<'status' | 'package' | null>(null);

    useEffect(() => {
        if (scrollPosition > 0) {
            // Use a timeout to ensure the DOM has rendered before scrolling
            setTimeout(() => {
                const mainElement = document.querySelector('main');
                if (mainElement) {
                    mainElement.scrollTo({ top: scrollPosition, behavior: 'auto' });
                }
                onScrollPositionReset(); // Reset after scrolling to prevent re-scrolling
            }, 0);
        }
    }, [scrollPosition, onScrollPositionReset]);


    const sortedAttendees = useMemo(() => {
        const normalizedSearchQuery = normalizeString(searchQuery);
        const filtered = attendees
            .filter(attendee =>
                normalizeString(attendee.person.name).includes(normalizedSearchQuery)
            )
            .filter(attendee => {
                if (statusFilter === 'all') return true;
                if (statusFilter === 'partial_exempt') {
                    // Only match if partial exemption exists AND user is not fully exempt (status ISENTO)
                    const isExempt = attendee.payment.sitePaymentDetails?.isExempt || attendee.payment.busPaymentDetails?.isExempt;
                    return attendee.payment.status !== PaymentStatus.ISENTO && isExempt;
                }
                return attendee.payment.status === statusFilter;
            })
            .filter(attendee =>
                packageFilter === 'all' || attendee.packageType === packageFilter
            );
        
        return [...filtered].sort((a, b) => a.person.name.localeCompare(b.person.name));
    }, [attendees, searchQuery, statusFilter, packageFilter]);

    const statusOptions = [
        { label: 'Todos', value: 'all' },
        { label: PaymentStatus.PAGO, value: PaymentStatus.PAGO },
        { label: PaymentStatus.PENDENTE, value: PaymentStatus.PENDENTE },
        { label: PaymentStatus.ISENTO, value: PaymentStatus.ISENTO },
        { label: 'Isenção Parcial', value: 'partial_exempt' },
    ];

    const packageOptions = [
        { label: 'Todos', value: 'all' },
        { label: PackageType.SITIO_ONLY, value: PackageType.SITIO_ONLY },
        { label: PackageType.SITIO_BUS, value: PackageType.SITIO_BUS },
    ];

    return (
        <div className="animate-fadeIn">
            <header className="bg-white md:bg-transparent p-4 border-b border-zinc-200 md:border-b-0 md:pt-6 space-y-4">
                 <div className="flex justify-between items-center">
                    <h1 className="text-xl md:text-2xl font-bold text-zinc-800">Inscrições ({sortedAttendees.length})</h1>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onAddAttendee}
                            className="bg-green-500 text-white font-bold py-2 px-4 rounded-full flex items-center gap-2 transition-colors shadow-sm flex-shrink-0 select-none touch-manipulation active:bg-green-700 md:hover:bg-green-600"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                            <span className="hidden md:inline">Nova Inscrição</span>
                            <span className="md:hidden">Nova</span>
                        </button>
                         <button onClick={onLogout} className="p-2 text-zinc-500 rounded-full hover:bg-zinc-200 hover:text-zinc-800 transition-colors" aria-label="Sair">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    </div>
                </div>

                {events.length > 1 && (
                    <div className="pt-2">
                        <label htmlFor="event-selector" className="block text-sm font-medium text-zinc-700">Filtrar por Evento</label>
                        <select
                            id="event-selector"
                            value={selectedEventId || ''}
                            onChange={(e) => onEventChange(e.target.value)}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-zinc-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md shadow-sm"
                        >
                            {events.map(event => (
                                <option key={event.id} value={event.id}>{event.name}</option>
                            ))}
                        </select>
                    </div>
                )}
                
                <div className="relative">
                    <input
                        type="search"
                        placeholder="Buscar por nome..."
                        value={searchQuery}
                        onChange={(e) => onSearchQueryChange(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-zinc-100 border border-transparent rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        autoComplete="off"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-zinc-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
                    </div>
                </div>
                
                {/* Mobile Filter Buttons */}
                <div className="flex gap-3 md:hidden">
                     <button
                        onClick={() => setActiveModal('status')}
                        className={`flex-1 py-2.5 px-4 rounded-xl border font-medium text-sm flex justify-between items-center transition-colors touch-manipulation active:bg-zinc-50 ${
                            statusFilter !== 'all' 
                            ? 'bg-green-50 border-green-500 text-green-800 shadow-sm' 
                            : 'bg-white border-zinc-200 text-zinc-600 shadow-sm'
                        }`}
                    >
                        <span className="truncate pr-2">
                            {statusFilter === 'all' ? 'Filtrar Status' : (statusOptions.find(o => o.value === statusFilter)?.label || statusFilter)}
                        </span>
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 flex-shrink-0 ${statusFilter !== 'all' ? 'text-green-600' : 'text-zinc-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    <button
                        onClick={() => setActiveModal('package')}
                        className={`flex-1 py-2.5 px-4 rounded-xl border font-medium text-sm flex justify-between items-center transition-colors touch-manipulation active:bg-zinc-50 ${
                            packageFilter !== 'all'
                            ? 'bg-green-50 border-green-500 text-green-800 shadow-sm'
                            : 'bg-white border-zinc-200 text-zinc-600 shadow-sm'
                        }`}
                    >
                        <span className="truncate pr-2">
                            {packageFilter === 'all' ? 'Filtrar Pacote' : packageFilter}
                        </span>
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 flex-shrink-0 ${packageFilter !== 'all' ? 'text-green-600' : 'text-zinc-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                </div>

                {/* Desktop Filters */}
                <div className="hidden md:flex space-y-3 lg:flex lg:justify-between lg:items-center lg:space-y-0 lg:gap-6">
                    <div className="flex flex-wrap gap-2 items-center min-w-max">
                        <span className="text-sm font-medium text-zinc-500 flex-shrink-0">Status:</span>
                        <FilterPill label="Todos" isActive={statusFilter === 'all'} onClick={() => onStatusFilterChange('all')} />
                        <FilterPill label={PaymentStatus.PAGO} isActive={statusFilter === PaymentStatus.PAGO} onClick={() => onStatusFilterChange(PaymentStatus.PAGO)} />
                        <FilterPill label={PaymentStatus.PENDENTE} isActive={statusFilter === PaymentStatus.PENDENTE} onClick={() => onStatusFilterChange(PaymentStatus.PENDENTE)} />
                        <FilterPill label={PaymentStatus.ISENTO} isActive={statusFilter === PaymentStatus.ISENTO} onClick={() => onStatusFilterChange(PaymentStatus.ISENTO)} />
                        <FilterPill label="Isenção Parcial" isActive={statusFilter === 'partial_exempt'} onClick={() => onStatusFilterChange('partial_exempt')} />
                    </div>
                     <div className="flex flex-wrap gap-2 items-center min-w-max">
                        <span className="text-sm font-medium text-zinc-500 flex-shrink-0">Pacote:</span>
                        <FilterPill label="Todos" isActive={packageFilter === 'all'} onClick={() => onPackageFilterChange('all')} />
                        <FilterPill label={PackageType.SITIO_ONLY} isActive={packageFilter === PackageType.SITIO_ONLY} onClick={() => onPackageFilterChange(PackageType.SITIO_ONLY)} />
                        <FilterPill label={PackageType.SITIO_BUS} isActive={packageFilter === PackageType.SITIO_BUS} onClick={() => onPackageFilterChange(PackageType.SITIO_BUS)} />
                    </div>
                </div>

            </header>
            <div className="p-4">
                {sortedAttendees.length > 0 ? (
                    <>
                        {/* Mobile View */}
                        <div className="space-y-3 md:hidden">
                            {sortedAttendees.map((attendee, index) => (
                                <AttendeeListItem
                                    key={attendee.id}
                                    attendee={attendee}
                                    onSelect={onSelectAttendee}
                                    index={index}
                                />
                            ))}
                        </div>
                        {/* Desktop View */}
                        <div className="hidden md:block bg-white border border-zinc-200 rounded-xl shadow-sm overflow-x-auto">
                            <table className="min-w-full divide-y divide-zinc-200">
                                <thead className="bg-zinc-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Nome</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Pacote</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Telefone</th>
                                        <th scope="col" className="relative px-6 py-3"><span className="sr-only">Ver</span></th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-zinc-200">
                                    {sortedAttendees.map((attendee) => (
                                        <tr key={attendee.id} onClick={() => onSelectAttendee(attendee.id)} className="hover:bg-zinc-50 cursor-pointer transition-colors">
                                            <td className="px-6 py-4"><div className="text-sm font-medium text-zinc-900">{attendee.person.name}</div></td>
                                            <td className="px-6 py-4"><div className="flex items-center text-sm text-zinc-500"><PackageIcon packageType={attendee.packageType} />{attendee.packageType}</div></td>
                                            <td className="px-6 py-4"><StatusBadge attendee={attendee} /></td>
                                            <td className="px-6 py-4 text-sm text-zinc-500">{attendee.person.phone}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <span className="text-green-600 hover:text-green-900 flex items-center justify-end">
                                                   Ver
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 text-zinc-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : (
                    <div className="text-center py-20 text-zinc-500 animate-fadeIn">
                         <p className="font-semibold">Nenhuma inscrição encontrada.</p>
                         <p className="mt-2 text-sm">Tente ajustar os filtros ou o termo de busca.</p>
                    </div>
                )}
            </div>

            {activeModal === 'status' && (
                <FilterBottomSheet 
                    title="Filtrar por Status"
                    options={statusOptions}
                    selectedValue={statusFilter}
                    onSelect={(val) => onStatusFilterChange(val as any)}
                    onClose={() => setActiveModal(null)}
                />
            )}
            {activeModal === 'package' && (
                <FilterBottomSheet
                    title="Filtrar por Pacote"
                    options={packageOptions}
                    selectedValue={packageFilter}
                    onSelect={(val) => onPackageFilterChange(val as any)}
                    onClose={() => setActiveModal(null)}
                />
            )}
        </div>
    );
};

export default AttendeeList;
