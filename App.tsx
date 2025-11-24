
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useRegistrations } from './hooks/useAttendees';
import { useEvents } from './hooks/useEvents';
import { usePeople } from './hooks/usePeople';
import { useHistory } from './hooks/useHistory';
import type { View, Registration, RegistrationFormData } from './types';
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
import PeopleManagementPage from './components/management/PeopleManagementPage';
import HistoryPage from './components/management/HistoryPage';
import { ToastProvider, useToast } from './contexts/ToastContext';
import ToastContainer from './components/ToastContainer';
import DatabaseMigration from './components/DatabaseMigration';
import * as api from './services/api';

const AppContent: React.FC = () => {
    const { events, isLoading: isLoadingEvents, addEvent, updateEvent, deleteEvent } = useEvents();
    const { people, isLoading: isLoadingPeople, addPerson, updatePerson, deletePerson } = usePeople();
    const historyHook = useHistory();
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

    const { 
        registrations, 
        isLoading: isLoadingRegistrations, 
        addRegistration, 
        updateRegistration, 
        deleteRegistration,
        refresh: refreshRegistrations 
    } = useRegistrations(selectedEventId);
    
    const { addToast } = useToast();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [view, setView] = useState<View>('list');
    const [previousView, setPreviousView] = useState<View>('list');
    const [selectedRegistrationId, setSelectedRegistrationId] = useState<string | null>(null);
    const [registrationToDelete, setRegistrationToDelete] = useState<Registration | null>(null);
    const [registrationPaymentToDelete, setRegistrationPaymentToDelete] = useState<Registration | null>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | PaymentStatus | 'partial_exempt'>('all');
    const [packageFilter, setPackageFilter] = useState<'all' | PackageType>('all');
    const [scrollPosition, setScrollPosition] = useState(0);

    const activeEvents = useMemo(() => events.filter(e => !e.is_archived), [events]);

    useEffect(() => {
        if (!selectedEventId && activeEvents.length > 0) {
            const activeEvent = activeEvents.find(e => !e.is_deleted);
            if(activeEvent) setSelectedEventId(activeEvent.id);
        }
    }, [activeEvents, selectedEventId]);

    useEffect(() => {
        historyHook.fetchLatestHistory();
    }, []);

    // Background refresh when switching to list view
    useEffect(() => {
        if (view === 'list') {
            refreshRegistrations({ silent: true });
        }
    }, [view, refreshRegistrations]);

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
        if (loggedIn) setIsAuthenticated(true);
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
        if (view !== 'detail') setPreviousView(view);
        setScrollPosition(0); 
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
    
    const handleEdit = useCallback(() => setView('editForm'), []);
    const handleShowPaymentForm = useCallback(() => setView('payment'), []);
    const handleDeleteRequest = useCallback((registration: Registration) => setRegistrationToDelete(registration), []);
    const handleCancelDelete = useCallback(() => setRegistrationToDelete(null), []);
    const handleDeletePaymentRequest = useCallback((registration: Registration) => setRegistrationPaymentToDelete(registration), []);
    const handleCancelDeletePayment = useCallback(() => setRegistrationPaymentToDelete(null), []);

    const afterAction = () => {
        historyHook.fetchLatestHistory();
        if (view === 'history') {
             historyHook.fetchAllHistory();
        }
    }
    
    const handleConfirmDelete = useCallback(async () => {
        if (registrationToDelete) {
            try {
                await deleteRegistration(registrationToDelete.id);
                addToast(`Inscrição de ${registrationToDelete.person.name} excluída.`, 'success');
                setRegistrationToDelete(null);
                setView('list');
                afterAction();
            } catch (error) {
                addToast('Falha ao excluir inscrição.', 'error');
            }
        }
    }, [registrationToDelete, deleteRegistration, addToast, historyHook]);
    
    const handleConfirmDeletePayment = useCallback(async () => {
        if (registrationPaymentToDelete) {
            try {
                await updateRegistration({ ...registrationPaymentToDelete, payment: { ...registrationPaymentToDelete.payment, status: PaymentStatus.PENDENTE, date: undefined, type: undefined, receiptUrl: null } });
                addToast('Pagamento removido com sucesso.', 'success');
                setRegistrationPaymentToDelete(null);
                setView('detail');
                afterAction();
            } catch (error) {
                addToast('Falha ao remover pagamento.', 'error');
            }
        }
    }, [registrationPaymentToDelete, updateRegistration, addToast, historyHook]);

    const handleSaveRegistration = useCallback(async (formData: RegistrationFormData) => {
        if (!selectedEventId) {
            addToast('Nenhum evento selecionado.', 'error');
            return;
        }
        await addRegistration(formData, selectedEventId);
        afterAction();
    }, [addRegistration, selectedEventId, addToast, historyHook]);

    const handleUpdateRegistration = useCallback(async (updatedRegistration: Registration) => {
        await updateRegistration(updatedRegistration);
        afterAction();
    }, [updateRegistration, historyHook]);

    const handleRegisterPayment = useCallback(async (updatedRegistration: Registration) => {
        try {
            await updateRegistration(updatedRegistration);
            setView('detail');
            addToast('Pagamento salvo com sucesso.', 'success');
            afterAction();
        } catch (error) {
             addToast('Falha ao salvar pagamento.', 'error');
             throw error;
        }
    }, [updateRegistration, addToast, historyHook]);

    const renderContent = () => {
        if (isLoadingEvents || (selectedEventId && isLoadingRegistrations) || isLoadingPeople) {
            return <div className="flex justify-center items-center h-full"><p>Carregando...</p></div>;
        }

        switch (view) {
            case 'detail':
                return selectedRegistration && <AttendeeDetail attendee={selectedRegistration} onBack={handleCancel} onEdit={handleEdit} onDelete={handleDeleteRequest} onManagePayment={handleShowPaymentForm} onUpdateAttendee={handleUpdateRegistration} totalBuses={totalBuses} busAssignments={busAssignments} />;
            case 'form':
                return <AddAttendeeForm onAddAttendee={handleSaveRegistration} onCancel={handleCancel} registrations={registrations} event={selectedEvent} />;
            case 'editForm':
                 return selectedRegistration && <AddAttendeeForm onUpdateAttendee={handleUpdateRegistration} onCancel={() => setView('detail')} attendeeToEdit={selectedRegistration} registrations={registrations} event={selectedEvent} />;
            case 'payment':
                return selectedRegistration && <RegisterPaymentForm attendee={selectedRegistration} onRegisterPayment={handleRegisterPayment} onCancel={() => setView('detail')} onDeletePayment={handleDeletePaymentRequest} event={selectedEvent} />;
             case 'reports':
                return <Reports attendees={registrations} onLogout={handleLogout} onUpdateAttendee={handleUpdateRegistration} onSelectAttendee={handleSelectRegistration} event={selectedEvent} />;
             case 'info':
                return <InfoPage onLogout={handleLogout} event={selectedEvent} />;
             case 'management':
                return <ManagementPage events={events} onAddEvent={addEvent} onUpdateEvent={updateEvent} onDeleteEvent={deleteEvent} onLogout={handleLogout} selectedEventId={selectedEventId} onEventChange={setSelectedEventId} setView={setView} latestHistory={historyHook.latestHistory} />;
             case 'peopleManagement':
                return <PeopleManagementPage people={people} onAddPerson={addPerson} onUpdatePerson={updatePerson} onDeletePerson={deletePerson} onBack={() => setView('management')} />;
            case 'history':
                return <HistoryPage history={historyHook.history} isLoading={historyHook.isLoading} onUndo={historyHook.undoAction} onBack={() => setView('management')} />;
            case 'list':
            default:
                return (
                    <AttendeeList 
                        attendees={registrations} onSelectAttendee={handleSelectRegistration} onAddAttendee={handleAddAttendeeClick} onLogout={handleLogout}
                        searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} statusFilter={statusFilter} onStatusFilterChange={setStatusFilter}
                        packageFilter={packageFilter} onPackageFilterChange={setPackageFilter} scrollPosition={scrollPosition} onScrollPositionReset={() => setScrollPosition(0)}
                        events={activeEvents} selectedEventId={selectedEventId} onEventChange={setSelectedEventId}
                        onRefresh={refreshRegistrations}
                    />
                );
        }
    };

    useEffect(() => {
        if(view === 'history') {
            historyHook.fetchAllHistory();
        }
    }, [view, historyHook.fetchAllHistory]);

    if (!isAuthenticated) return <Login onLoginSuccess={handleLoginSuccess} />;

    return (
        // Layout structure updated for iOS PWA scrolling:
        // md:w-full ensures full width utilization.
        // md:h-[calc(100dvh-4rem)] uses dvh to better handle tablet/mobile browser bars.
        <div className="bg-zinc-50 font-sans h-full flex flex-col md:flex-row md:h-[calc(100dvh-4rem)] md:max-w-7xl md:w-full md:mx-auto md:my-8 md:rounded-2xl md:shadow-2xl md:overflow-hidden">
             <SideNav currentView={view} setView={setView} />
            
            <div className="flex-grow flex flex-col h-full overflow-hidden relative">
                {/* Main content scrolls independently */}
                {/* overflow-y-scroll enforces a vertical scrollbar always, preventing horizontal layout shifts when content height toggles */}
                {/* Increased bottom padding (md:pb-20) ensures the last item is not cut off on tablets */}
                <main key={view + selectedEventId} className="flex-grow overflow-y-scroll overscroll-contain pb-32 md:pb-20">
                    {renderContent()}
                </main>
                
                {/* Bottom Nav is fixed at the bottom of the flex container, not fixed to window */}
                <div className="md:hidden flex-shrink-0 z-50">
                     <BottomNav currentView={view} setView={setView} />
                </div>
            </div>

            {/* Modals sit on top of everything */}
            {registrationToDelete && <ConfirmDelete attendee={registrationToDelete} onConfirm={handleConfirmDelete} onCancel={handleCancelDelete} />}
            {registrationPaymentToDelete && <ConfirmDeletePayment attendee={registrationPaymentToDelete} onConfirm={handleConfirmDeletePayment} onCancel={handleCancelDeletePayment} />}
        </div>
    );
};

const AppInitializer: React.FC = () => {
    const [schemaErrors, setSchemaErrors] = useState<string[] | null>(null);
    const [isVerifying, setIsVerifying] = useState(true);

    useEffect(() => {
        const checkSchema = async () => {
            try {
                const result = await api.verifySchema();
                if (!result.success) {
                    setSchemaErrors(result.missingIn);
                }
            } catch (e) {
                console.error("Error verifying schema:", e);
                setSchemaErrors(['desconhecido']);
            } finally {
                setIsVerifying(false);
            }
        };
        checkSchema();
    }, []);

    if (isVerifying) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-zinc-50">
                <p className="text-zinc-600 font-semibold animate-pulse">Verificando banco de dados...</p>
            </div>
        );
    }

    if (schemaErrors && schemaErrors.length > 0) {
        return <DatabaseMigration missingIn={schemaErrors} />;
    }

    return <AppContent />;
};


const App: React.FC = () => (
    <ToastProvider>
        <AppInitializer />
        <ToastContainer />
    </ToastProvider>
);


export default App;
