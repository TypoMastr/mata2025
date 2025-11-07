import React, { useState, useMemo, useEffect } from 'react';
import { useAttendees } from './hooks/useAttendees';
import type { View, Attendee, AttendeeFormData } from './types';
import { PaymentStatus } from './types';
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

const App: React.FC = () => {
    const { attendees, isLoading, addAttendee, updateAttendee, deleteAttendee } = useAttendees();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [view, setView] = useState<View>('list');
    const [selectedAttendeeId, setSelectedAttendeeId] = useState<string | null>(null);
    const [attendeeToDelete, setAttendeeToDelete] = useState<Attendee | null>(null);
    const [attendeePaymentToDelete, setAttendeePaymentToDelete] = useState<Attendee | null>(null);

    useEffect(() => {
        const loggedIn = sessionStorage.getItem('isAuthenticated') === 'true';
        if (loggedIn) {
            setIsAuthenticated(true);
        }
    }, []);

    const handleLoginSuccess = () => {
        sessionStorage.setItem('isAuthenticated', 'true');
        setIsAuthenticated(true);
    };

    const handleLogout = () => {
        sessionStorage.removeItem('isAuthenticated');
        setIsAuthenticated(false);
        setView('list'); 
    };


    const selectedAttendee = useMemo(() => {
        return attendees.find(a => a.id === selectedAttendeeId) || null;
    }, [attendees, selectedAttendeeId]);

    const handleSelectAttendee = (id: string) => {
        setSelectedAttendeeId(id);
        setView('detail');
    };

    const handleAddAttendeeClick = () => {
        setSelectedAttendeeId(null);
        setView('form');
    };

    const handleCancel = () => {
        setSelectedAttendeeId(null);
        setView('list');
    };
    
    const handleEdit = () => {
        setView('editForm');
    };

    const handleShowPaymentForm = () => {
        setView('payment');
    };
    
    const handleEditPayment = () => {
        setView('editPayment');
    };

    const handleDeleteRequest = (attendee: Attendee) => {
        setAttendeeToDelete(attendee);
    };

    const handleConfirmDelete = async () => {
        if (attendeeToDelete) {
            await deleteAttendee(attendeeToDelete.id);
            setAttendeeToDelete(null);
            setView('list');
        }
    };
    
    const handleCancelDelete = () => {
        setAttendeeToDelete(null);
    };

    const handleDeletePaymentRequest = (attendee: Attendee) => {
        setAttendeePaymentToDelete(attendee);
    };

    const handleConfirmDeletePayment = async () => {
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
            await updateAttendee(attendeeToUpdate);
            setAttendeePaymentToDelete(null);
            setView('detail');
        }
    };
    
    const handleCancelDeletePayment = () => {
        setAttendeePaymentToDelete(null);
    };


    const handleSaveAttendee = async (formData: AttendeeFormData & { paymentAmount: number }) => {
        await addAttendee(formData);
        setView('list');
    };

    const handleUpdateAttendee = async (updatedAttendee: Attendee) => {
        await updateAttendee(updatedAttendee);
        setView('detail');
    };

    const handleRegisterPayment = async (updatedAttendee: Attendee) => {
        await updateAttendee(updatedAttendee);
        setView('detail');
    };

    const renderContent = () => {
        if (isLoading) {
            return <div className="flex justify-center items-center h-screen"><p>Carregando...</p></div>;
        }

        switch (view) {
            case 'detail':
                return selectedAttendee && <AttendeeDetail attendee={selectedAttendee} onBack={handleCancel} onEdit={handleEdit} onDelete={handleDeleteRequest} onRegisterPayment={handleShowPaymentForm} onEditPayment={handleEditPayment} />;
            case 'form':
                return <AddAttendeeForm onAddAttendee={handleSaveAttendee} onCancel={handleCancel} />;
            case 'editForm':
                 return selectedAttendee && <AddAttendeeForm onUpdateAttendee={handleUpdateAttendee} onCancel={() => setView('detail')} attendeeToEdit={selectedAttendee} />;
            case 'payment':
            case 'editPayment':
                return selectedAttendee && <RegisterPaymentForm attendee={selectedAttendee} onRegisterPayment={handleRegisterPayment} onCancel={() => setView('detail')} onDeletePayment={handleDeletePaymentRequest} />;
             case 'reports':
                return <Reports attendees={attendees} onLogout={handleLogout} onUpdateAttendee={updateAttendee} />;
             case 'info':
                return <InfoPage onLogout={handleLogout} />;
            case 'list':
            default:
                return <AttendeeList attendees={attendees} onSelectAttendee={handleSelectAttendee} onAddAttendee={handleAddAttendeeClick} onLogout={handleLogout} />;
        }
    };

    if (!isAuthenticated) {
        return <Login onLoginSuccess={handleLoginSuccess} />;
    }

    return (
        <div className="bg-zinc-50 font-sans md:max-w-7xl md:mx-auto md:my-8 md:rounded-2xl md:shadow-2xl md:flex flex-grow w-full">
             <SideNav currentView={view} setView={setView} />
            <div className="flex-grow min-h-screen relative pb-20 md:pb-0 md:min-h-0">
                <main key={view}>
                    {renderContent()}
                </main>
                {attendeeToDelete && <ConfirmDelete attendee={attendeeToDelete} onConfirm={handleConfirmDelete} onCancel={handleCancelDelete} />}
                {attendeePaymentToDelete && <ConfirmDeletePayment attendee={attendeePaymentToDelete} onConfirm={handleConfirmDeletePayment} onCancel={handleCancelDeletePayment} />}
                <BottomNav currentView={view} setView={setView} />
            </div>
        </div>
    );
};

export default App;
