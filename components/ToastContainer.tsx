import React from 'react';
import { useToast } from '../contexts/ToastContext';

const Toast: React.FC<{ message: string; type: 'success' | 'error' | 'info'; }> = ({ message, type }) => {
    const baseClasses = "flex items-center w-full max-w-xs p-4 text-zinc-500 bg-white rounded-lg shadow-lg";
    let icon;

    switch (type) {
        case 'success':
            icon = (
                <div className="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 text-green-500 bg-green-100 rounded-lg">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                </div>
            );
            break;
        case 'error':
            icon = (
                <div className="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 text-red-500 bg-red-100 rounded-lg">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
                </div>
            );
            break;
        default: // info
            icon = (
                <div className="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 text-blue-500 bg-blue-100 rounded-lg">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path></svg>
                </div>
            );
    }
    
    return (
        <div className={`${baseClasses} animate-toast-in-out`} role="alert">
            {icon}
            <div className="ml-3 text-sm font-normal">{message}</div>
        </div>
    );
};


const ToastContainer: React.FC = () => {
    const { toasts } = useToast();

    return (
        <div className="fixed top-5 right-5 z-50 space-y-3">
            {toasts.map(toast => (
                <Toast key={toast.id} message={toast.message} type={toast.type} />
            ))}
        </div>
    );
};

export default ToastContainer;
