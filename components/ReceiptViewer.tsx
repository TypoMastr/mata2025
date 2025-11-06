import React from 'react';

interface ReceiptViewerProps {
    receiptUrl: string;
    onClose: () => void;
}

const ReceiptViewer: React.FC<ReceiptViewerProps> = ({ receiptUrl, onClose }) => {
    
    // Simple check for PDF, assuming it's a data URL.
    const isPdf = receiptUrl.startsWith('data:application/pdf');

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
            <div className="relative bg-white p-2 rounded-lg max-w-3xl w-full max-h-[90vh] animate-popIn" onClick={(e) => e.stopPropagation()}>
                <button 
                    onClick={onClose} 
                    className="absolute -top-4 -right-4 bg-white text-zinc-800 rounded-full h-10 w-10 flex items-center justify-center shadow-lg z-10"
                    aria-label="Fechar"
                >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                
                <div className="overflow-auto max-h-[calc(90vh-1rem)]">
                    {isPdf ? (
                        <iframe src={receiptUrl} title="Comprovante" className="w-full h-[85vh]" frameBorder="0" />
                    ) : (
                        <img src={receiptUrl} alt="Comprovante" className="max-w-full max-h-full mx-auto" />
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReceiptViewer;