import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAttendees } from './hooks/useAttendees';
import type { View, Attendee, AttendeeFormData } from './types';
import { PaymentStatus, PackageType } from './types';
import AttendeeList from './components/AttendeeList';
import AttendeeDetail from './components/AttendeeDetail';
import AddAttendeeForm from './components/AddAttendeeForm';
import RegisterPaymentForm from './components/RegisterPaymentForm';
import BottomNav from './components/BottomNav';
import Reports from './components/Reports';
import ConfirmDelete from './components/ConfirmDelete';
import ConfirmDeletePayment from './components/ConfirmDeletePayment';
import InfoPage from './components/Info';
import Login from './components/Login';
import SideNav from './components/SideNav';
import { ToastProvider, useToast } from './contexts/ToastContext';
import ToastContainer from './components/ToastContainer';

const AppContent: React.FC = () => {
    const { attendees, isLoading, addAttendee, updateAttendee, deleteAttendee } = useAttendees();
    const { addToast } = useToast();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [view, setView] = useState<View>('list');
    const [previousView, setPreviousView] = useState<View>('list');
    const [selectedAttendeeId, setSelectedAttendeeId] = useState<string | null>(null);
    const [attendeeToDelete, setAttendeeToDelete] = useState<Attendee | null>(null);
    const [attendeePaymentToDelete, setAttendeePaymentToDelete] = useState<Attendee | null>(null);

    // State for list persistence
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | PaymentStatus>('all');
    const [packageFilter, setPackageFilter] = useState<'all' | PackageType>('all');
    const [scrollPosition, setScrollPosition] = useState(0);

    useEffect(() => {
        const loggedIn = sessionStorage.getItem('isAuthenticated') === 'true';
        if (loggedIn) {
            setIsAuthenticated(true);
        }
    }, []);

    const handleLoginSuccess = useCallback(() => {
        sessionStorage.setItem('isAuthenticated', 'true');
        setIsAuthenticated(true);
    }, []);

    const handleLogout = useCallback(() => {
        sessionStorage.removeItem('isAuthenticated');
        setIsAuthenticated(false);
        setView('list'); 
    }, []);


    const selectedAttendee = useMemo(() => {
        return attendees.find(a => a.id === selectedAttendeeId) || null;
    }, [attendees, selectedAttendeeId]);

    const handleSelectAttendee = useCallback((id: string) => {
        if (view !== 'detail') {
            setPreviousView(view);
        }
        setScrollPosition(window.scrollY); // Store scroll position before navigating
        setSelectedAttendeeId(id);
        setView('detail');
    }, [view]);

    const handleAddAttendeeClick = useCallback(() => {
        setPreviousView('list');
        setSelectedAttendeeId(null);
        setView('form');
    }, []);

    const handleCancel = useCallback(() => {
        setSelectedAttendeeId(null);
        setView(previousView);
    }, [previousView]);
    
    const handleEdit = useCallback(() => {
        setView('editForm');
    }, []);

    const handleShowPaymentForm = useCallback(() => {
        setView('payment');
    }, []);
    
    const handleEditPayment = useCallback(() => {
        setView('editPayment');
    }, []);

    const handleDeleteRequest = useCallback((attendee: Attendee) => {
        setAttendeeToDelete(attendee);
    }, []);

    const handleConfirmDelete = useCallback(async () => {
        if (attendeeToDelete) {
            try {
                await deleteAttendee(attendeeToDelete.id);
                addToast(`Inscrição de ${attendeeToDelete.name} excluída.`, 'success');
                setAttendeeToDelete(null);
                setView('list');
            } catch (error) {
                addToast('Falha ao excluir inscrição.', 'error');
                console.error(error);
            }
        }
    }, [attendeeToDelete, deleteAttendee, addToast]);
    
    const handleCancelDelete = useCallback(() => {
        setAttendeeToDelete(null);
    }, []);

    const handleDeletePaymentRequest = useCallback((attendee: Attendee) => {
        setAttendeePaymentToDelete(attendee);
    }, []);

    const handleConfirmDeletePayment = useCallback(async () => {
        if (attendeePaymentToDelete) {
            const attendeeToUpdate: Attendee = {
                ...attendeePaymentToDelete,
                payment: {
                    ...attendeePaymentToDelete.payment,
                    status: PaymentStatus.PENDENTE,
                    date: undefined,
                    type: undefined,
                    receiptUrl: null,
                }
            };
             try {
                await updateAttendee(attendeeToUpdate);
                addToast('Pagamento removido com sucesso.', 'success');
                setAttendeePaymentToDelete(null);
                setView('detail');
            } catch (error) {
                addToast('Falha ao remover pagamento.', 'error');
                console.error(error);
            }
        }
    }, [attendeePaymentToDelete, updateAttendee, addToast]);
    
    const handleCancelDeletePayment = useCallback(() => {
        setAttendeePaymentToDelete(null);
    }, []);


    const handleSaveAttendee = useCallback(async (formData: Omit<AttendeeFormData, 'paymentAmount'> & { paymentAmount: number }) => {
        await addAttendee(formData);
    }, [addAttendee]);

    const handleUpdateAttendee = useCallback(async (updatedAttendee: Attendee) => {
        await updateAttendee(updatedAttendee);
    }, [updateAttendee]);

    const handleRegisterPayment = useCallback(async (updatedAttendee: Attendee) => {
        try {
            await updateAttendee(updatedAttendee);
            setView('detail');
            addToast('Pagamento salvo com sucesso.', 'success');
        } catch (error) {
             addToast('Falha ao salvar pagamento.', 'error');
             console.error(error);
             // Re-throw to allow form to handle its submitting state
             throw error;
        }
    }, [updateAttendee, addToast]);

    const renderContent = () => {
        if (isLoading) {
            return <div className="flex justify-center items-center h-screen"><p>Carregando...</p></div>;
        }

        switch (view) {
            case 'detail':
                return selectedAttendee && <AttendeeDetail attendee={selectedAttendee} onBack={handleCancel} onEdit={handleEdit} onDelete={handleDeleteRequest} onManagePayment={handleShowPaymentForm} onUpdateAttendee={handleUpdateAttendee} />;
            case 'form':
                return <AddAttendeeForm onAddAttendee={handleSaveAttendee} onCancel={handleCancel} attendees={attendees} />;
            case 'editForm':
                 return selectedAttendee && <AddAttendeeForm onUpdateAttendee={handleUpdateAttendee} onCancel={() => setView('detail')} attendeeToEdit={selectedAttendee} attendees={attendees} />;
            case 'payment':
            case 'editPayment':
                return selectedAttendee && <RegisterPaymentForm attendee={selectedAttendee} onRegisterPayment={handleRegisterPayment} onCancel={() => setView('detail')} onDeletePayment={handleDeletePaymentRequest} />;
             case 'reports':
                return <Reports attendees={attendees} onLogout={handleLogout} onUpdateAttendee={updateAttendee} onSelectAttendee={handleSelectAttendee} />;
             case 'info':
                return <InfoPage onLogout={handleLogout} />;
            case 'list':
            default:
                return (
                    <AttendeeList 
                        attendees={attendees} 
                        onSelectAttendee={handleSelectAttendee} 
                        onAddAttendee={handleAddAttendeeClick} 
                        onLogout={handleLogout}
                        searchQuery={searchQuery}
                        onSearchQueryChange={setSearchQuery}
                        statusFilter={statusFilter}
                        onStatusFilterChange={setStatusFilter}
                        packageFilter={packageFilter}
                        onPackageFilterChange={setPackageFilter}
                        scrollPosition={scrollPosition}
                        onScrollPositionReset={() => setScrollPosition(0)}
                    />
                );
        }
    };

    if (!isAuthenticated) {
        return <Login onLoginSuccess={handleLoginSuccess} />;
    }

    return (
        <div className="bg-zinc-50 font-sans md:max-w-7xl md:mx-auto md:my-8 md:rounded-2xl md:shadow-2xl md:flex flex-grow w-full">
             <SideNav currentView={view} setView={setView} />
            <div className="flex-grow min-h-screen-mobile relative flex flex-col overflow-hidden md:min-h-0">
                <main key={view} className="flex-grow overflow-y-auto pb-20 md:pb-0">
                    {renderContent()}
                </main>
                {attendeeToDelete && <ConfirmDelete attendee={attendeeToDelete} onConfirm={handleConfirmDelete} onCancel={handleCancelDelete} />}
                {attendeePaymentToDelete && <ConfirmDeletePayment attendee={attendeePaymentToDelete} onConfirm={handleConfirmDeletePayment} onCancel={handleCancelDeletePayment} />}
                <BottomNav currentView={view} setView={setView} />
            </div>
        </div>
    );
};

const App: React.FC = () => (
    <ToastProvider>
        <AppContent />
        <ToastContainer />
    </ToastProvider>
);


export default App;