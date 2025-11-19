
import React from 'react';
import type { Attendee } from '../types';
import { PaymentStatus, PackageType } from '../types';

interface AttendeeListItemProps {
    attendee: Attendee;
    onSelect: (id: string) => void;
    index: number;
}

const AttendeeListItem: React.FC<AttendeeListItemProps> = ({ attendee, onSelect, index }) => {
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

    const packageIcon = attendee.packageType === PackageType.SITIO_BUS 
        ? <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-zinc-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h8l2-2zM5 11h6" /></svg>
        : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-zinc-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;

    return (
        <button 
            onClick={() => onSelect(attendee.id)} 
            className="w-full text-left p-4 bg-white rounded-xl border border-zinc-200 shadow-sm flex justify-between items-center opacity-0 animate-fadeInUp select-none touch-manipulation active:bg-zinc-200 transition-colors"
            style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}
        >
            {/* pointer-events-none ensures the click is always registered on the button, not the text */}
            <div className="min-w-0 pr-2 pointer-events-none">
                <p className="font-bold text-zinc-800 truncate">{attendee.person.name}</p>
                <p className="text-sm text-zinc-500 flex items-center mt-1">
                    {packageIcon}
                    <span className="truncate">{attendee.packageType}</span>
                </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 pointer-events-none">
                 <div className="flex flex-col items-end gap-1.5">
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${statusClasses}`}>
                        {attendee.payment.status.toUpperCase()}
                    </span>
                    {isPartiallyPaid && (
                        <span className="px-3 py-1 text-xs font-bold rounded-full bg-yellow-100 text-yellow-800">
                            PARCIAL
                        </span>
                    )}
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-zinc-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
            </div>
        </button>
    );
};

export default React.memo(AttendeeListItem);
