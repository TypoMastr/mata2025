import React, { useState } from 'react';
import type { Attendee } from '../types';
import AttendeeListItem from './AttendeeListItem';
import { PaymentStatus, PackageType } from '../types';

interface AttendeeListProps {
    attendees: Attendee[];
    onSelectAttendee: (id: string) => void;
    onAddAttendee: () => void;
    onLogout: () => void;
}

const FilterPill: React.FC<{ label: string; isActive: boolean; onClick: () => void; }> = ({ label, isActive, onClick }) => {
    const baseClasses = "px-3 py-1 text-sm font-semibold rounded-full transition-colors flex-shrink-0";
    const activeClasses = "bg-green-500 text-white shadow-sm";
    const inactiveClasses = "bg-zinc-200 text-zinc-700 hover:bg-zinc-300";
    return (
        <button onClick={onClick} className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}>
            {label}
        </button>
    );
};

const PackageIcon: React.FC<{ packageType: PackageType }> = ({ packageType }) => {
    return packageType === PackageType.SITIO_BUS
        ? <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5 text-zinc-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h8l2-2zM5 11h6" /></svg>
        : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5 text-zinc-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
}

const StatusBadge: React.FC<{ status: PaymentStatus }> = ({ status }) => {
    const isPaid = status === PaymentStatus.PAGO;
    const statusClasses = isPaid
        ? 'bg-green-100 text-green-800'
        : 'bg-red-100 text-red-800';
    return (
        <span className={`px-3 py-1 text-xs font-bold rounded-full ${statusClasses}`}>
            {status.toUpperCase()}
        </span>
    );
}

const AttendeeList: React.FC<AttendeeListProps> = ({ attendees, onSelectAttendee, onAddAttendee, onLogout }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | PaymentStatus>('all');
    const [packageFilter, setPackageFilter] = useState<'all' | PackageType>('all');

    const filteredAttendees = attendees
        .filter(attendee =>
            attendee.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .filter(attendee =>
            statusFilter === 'all' || attendee.payment.status === statusFilter
        )
        .filter(attendee =>
            packageFilter === 'all' || attendee.packageType === packageFilter
        );
    
    const sortedAttendees = [...filteredAttendees].sort((a, b) => new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime());


    return (
        <div className="animate-fadeIn">
            <header className="sticky top-0 md:static bg-white/90 md:bg-transparent backdrop-blur-sm z-10 p-4 border-b border-zinc-200 md:border-b-0 md:pt-6 space-y-4 animate-fadeInUp">
                 <div className="flex justify-between items-center">
                    <h1 className="text-xl md:text-2xl font-bold text-zinc-800">Inscrições ({filteredAttendees.length})</h1>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onAddAttendee}
                            className="bg-green-500 text-white font-bold py-2 px-4 rounded-full flex items-center gap-2 hover:bg-green-600 transition-colors shadow-sm flex-shrink-0"
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

                <div className="relative">
                    <input
                        type="search"
                        placeholder="Buscar por nome..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-zinc-100 border border-transparent rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-zinc-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
                    </div>
                </div>
                
                <div className="space-y-3 md:flex md:space-y-0 md:gap-6">
                    <div className="flex gap-2 items-center overflow-x-auto pb-1">
                        <span className="text-sm font-medium text-zinc-500 flex-shrink-0">Status:</span>
                        <FilterPill label="Todos" isActive={statusFilter === 'all'} onClick={() => setStatusFilter('all')} />
                        <FilterPill label={PaymentStatus.PAGO} isActive={statusFilter === PaymentStatus.PAGO} onClick={() => setStatusFilter(PaymentStatus.PAGO)} />
                        <FilterPill label={PaymentStatus.PENDENTE} isActive={statusFilter === PaymentStatus.PENDENTE} onClick={() => setStatusFilter(PaymentStatus.PENDENTE)} />
                    </div>
                     <div className="flex gap-2 items-center overflow-x-auto pb-1">
                        <span className="text-sm font-medium text-zinc-500 flex-shrink-0">Pacote:</span>
                        <FilterPill label="Todos" isActive={packageFilter === 'all'} onClick={() => setPackageFilter('all')} />
                        <FilterPill label={PackageType.SITIO_ONLY} isActive={packageFilter === PackageType.SITIO_ONLY} onClick={() => setPackageFilter(PackageType.SITIO_ONLY)} />
                        <FilterPill label={PackageType.SITIO_BUS} isActive={packageFilter === PackageType.SITIO_BUS} onClick={() => setPackageFilter(PackageType.SITIO_BUS)} />
                    </div>
                </div>

            </header>
            <div className="p-4">
                {filteredAttendees.length > 0 ? (
                    <>
                        {/* Mobile View */}
                        <div className="space-y-3 md:hidden">
                            {sortedAttendees.map((attendee, index) => (
                                <AttendeeListItem
                                    key={attendee.id}
                                    attendee={attendee}
                                    onSelect={() => onSelectAttendee(attendee.id)}
                                    index={index}
                                />
                            ))}
                        </div>
                        {/* Desktop View */}
                        <div className="hidden md:block bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
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
                                            <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-zinc-900">{attendee.name}</div></td>
                                            <td className="px-6 py-4 whitespace-nowrap"><div className="flex items-center text-sm text-zinc-500"><PackageIcon packageType={attendee.packageType} />{attendee.packageType}</div></td>
                                            <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={attendee.payment.status} /></td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">{attendee.phone}</td>
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
        </div>
    );
};

export default AttendeeList;