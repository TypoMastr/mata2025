
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useRegistrations } from './hooks/useAttendees';
import { useEvents } from './hooks/useEvents';
import type { View, Registration, RegistrationFormData, Event } from './types';
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
import ManagementPage from './components/management/ManagementPage';
import { ToastProvider, useToast } from './contexts/ToastContext';
import ToastContainer from './components/ToastContainer';

const AppContent: React.FC = () => {
    const { events, isLoading: isLoadingEvents, addEvent, updateEvent } = useEvents();
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

    const { 
        registrations, 
        isLoading: isLoadingRegistrations, 
        addRegistration, 
        updateRegistration, 
        deleteRegistration 
    } = useRegistrations(selectedEventId);
    
    const { addToast } = useToast();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [view, setView] = useState<View>('list');
    const [previousView, setPreviousView] = useState<View>('list');
    const [selectedRegistrationId, setSelectedRegistrationId] = useState<string | null>(null);
    const [registrationToDelete, setRegistrationToDelete] = useState<Registration | null>(null);
    const [registrationPaymentToDelete, setRegistrationPaymentToDelete] = useState<Registration | null>(null);

    // State for list persistence
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | PaymentStatus>('all');
    const [packageFilter, setPackageFilter] = useState<'all' | PackageType>('all');
    const [scrollPosition, setScrollPosition] = useState(0);

    useEffect(() => {
        if (!selectedEventId && events.length > 0) {
            setSelectedEventId(events[0].id);
        }
    }, [events, selectedEventId]);

    const busAttendeesCount = useMemo(() => registrations.filter(a => a.packageType === PackageType.SITIO_BUS).length, [registrations]);
    const totalBuses = useMemo(() => {
        const BUS_CAPACITY = 50;
        return Math.ceil(busAttendeesCount / BUS_CAPACITY) || (busAttendeesCount > 0 ? 1 : 0);
    }, [busAttendeesCount]);

    const busAssignments = useMemo(() => {
        return registrations.reduce((acc, registration) => {
            if (registration.busNumber) {
                acc[registration.busNumber] = (acc[registration.busNumber] || 0) + 1;
            }
            return acc;
        }, {} as Record<number, number>);
    }, [registrations]);

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


    const selectedRegistration = useMemo(() => {
        return registrations.find(a => a.id === selectedRegistrationId) || null;
    }, [registrations, selectedRegistrationId]);
    
    const selectedEvent = useMemo(() => {
        return events.find(e => e.id === selectedEventId) || null;
    }, [events, selectedEventId]);

    const handleSelectRegistration = useCallback((id: string) => {
        if (view !== 'detail') {
            setPreviousView(view);
        }
        setScrollPosition(window.scrollY); // Store scroll position before navigating
        setSelectedRegistrationId(id);
        setView('detail');
    }, [view]);

    const handleAddAttendeeClick = useCallback(() => {
        setPreviousView('list');
        setSelectedRegistrationId(null);
        setView('form');
    }, []);

    const handleCancel = useCallback(() => {
        setSelectedRegistrationId(null);
        setView(previousView);
    }, [previousView]);
    
    const handleEdit = useCallback(() => {
        setView('editForm');
    }, []);

    const handleShowPaymentForm = useCallback(() => {
        setView('payment');
    }, []);

    const handleDeleteRequest = useCallback((registration: Registration) => {
        setRegistrationToDelete(registration);
    }, []);

    const handleConfirmDelete = useCallback(async () => {
        if (registrationToDelete) {
            try {
                await deleteRegistration(registrationToDelete.id);
                addToast(`Inscrição de ${registrationToDelete.person.name} excluída.`, 'success');
                setRegistrationToDelete(null);
                setView('list');
            } catch (error) {
                addToast('Falha ao excluir inscrição.', 'error');
                console.error(error);
            }
        }
    }, [registrationToDelete, deleteRegistration, addToast]);
    
    const handleCancelDelete = useCallback(() => {
        setRegistrationToDelete(null);
    }, []);

    const handleDeletePaymentRequest = useCallback((registration: Registration) => {
        setRegistrationPaymentToDelete(registration);
    }, []);

    const handleConfirmDeletePayment = useCallback(async () => {
        if (registrationPaymentToDelete) {
            const registrationToUpdate: Registration = {
                ...registrationPaymentToDelete,
                payment: {
                    ...registrationPaymentToDelete.payment,
                    status: PaymentStatus.PENDENTE,
                    date: undefined,
                    type: undefined,
                    receiptUrl: null,
                }
            };
             try {
                await updateRegistration(registrationToUpdate);
                addToast('Pagamento removido com sucesso.', 'success');
                setRegistrationPaymentToDelete(null);
                setView('detail');
            } catch (error) {
                addToast('Falha ao remover pagamento.', 'error');
                console.error(error);
            }
        }
    }, [registrationPaymentToDelete, updateRegistration, addToast]);
    
    const handleCancelDeletePayment = useCallback(() => {
        setRegistrationPaymentToDelete(null);
    }, []);


    const handleSaveRegistration = useCallback(async (formData: RegistrationFormData) => {
        if (!selectedEventId) {
            addToast('Nenhum evento selecionado.', 'error');
            return;
        }
        await addRegistration(formData, selectedEventId);
    }, [addRegistration, selectedEventId, addToast]);

    const handleUpdateRegistration = useCallback(async (updatedRegistration: Registration) => {
        await updateRegistration(updatedRegistration);
    }, [updateRegistration]);

    const handleRegisterPayment = useCallback(async (updatedRegistration: Registration) => {
        try {
            await updateRegistration(updatedRegistration);
            setView('detail');
            addToast('Pagamento salvo com sucesso.', 'success');
        } catch (error) {
             addToast('Falha ao salvar pagamento.', 'error');
             console.error(error);
             // Re-throw to allow form to handle its submitting state
             throw error;
        }
    }, [updateRegistration, addToast]);

    const renderContent = () => {
        if (isLoadingEvents || (selectedEventId && isLoadingRegistrations)) {
            return <div className="flex justify-center items-center h-screen"><p>Carregando...</p></div>;
        }

        switch (view) {
            case 'detail':
                return selectedRegistration && <AttendeeDetail attendee={selectedRegistration} onBack={handleCancel} onEdit={handleEdit} onDelete={handleDeleteRequest} onManagePayment={handleShowPaymentForm} onUpdateAttendee={handleUpdateRegistration} totalBuses={totalBuses} busAssignments={busAssignments} />;
            case 'form':
                // FIX: Pass registrations to AddAttendeeForm. The prop type in the component was also fixed to match.
                return <AddAttendeeForm onAddAttendee={handleSaveRegistration} onCancel={handleCancel} registrations={registrations} event={selectedEvent} />;
            case 'editForm':
                 // FIX: Pass registrations to AddAttendeeForm. The prop in the component was renamed from 'attendees' to 'registrations'.
                 return selectedRegistration && <AddAttendeeForm onUpdateAttendee={handleUpdateRegistration} onCancel={() => setView('detail')} attendeeToEdit={selectedRegistration} registrations={registrations} event={selectedEvent} />;
            case 'payment':
                return selectedRegistration && <RegisterPaymentForm attendee={selectedRegistration} onRegisterPayment={handleRegisterPayment} onCancel={() => setView('detail')} onDeletePayment={handleDeletePaymentRequest} />;
             case 'reports':
                // FIX: Removed unused 'event' prop to match component's props interface.
                return <Reports attendees={registrations} onLogout={handleLogout} onUpdateAttendee={updateRegistration} onSelectAttendee={handleSelectRegistration} event={selectedEvent} />;
             case 'info':
                return <InfoPage onLogout={handleLogout} event={selectedEvent} />;
             case 'management':
                return <ManagementPage events={events} onAddEvent={addEvent} onUpdateEvent={updateEvent} onLogout={handleLogout} selectedEventId={selectedEventId} onEventChange={setSelectedEventId} />;
            case 'list':
            default:
                return (
                    // FIX: Pass events, selectedEventId, and onEventChange to AttendeeList. The component props were updated to accept these.
                    <AttendeeList 
                        attendees={registrations} 
                        onSelectAttendee={handleSelectRegistration} 
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
                        events={events}
                        selectedEventId={selectedEventId}
                        onEventChange={setSelectedEventId}
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
                <main key={view + selectedEventId} className="flex-grow overflow-y-auto pb-20 md:pb-0">
                    {renderContent()}
                </main>
                {registrationToDelete && <ConfirmDelete attendee={registrationToDelete} onConfirm={handleConfirmDelete} onCancel={handleCancelDelete} />}
                {registrationPaymentToDelete && <ConfirmDeletePayment attendee={registrationPaymentToDelete} onConfirm={handleConfirmDeletePayment} onCancel={handleCancelDeletePayment} />}
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
