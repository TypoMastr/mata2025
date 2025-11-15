
import React, { useState, useMemo } from 'react';
import type { Person } from '../../types';
import { normalizeString, getDocumentType } from '../../utils/formatters';
import PersonForm from './PersonForm';
import ConfirmDeletePerson from '../ConfirmDeletePerson';

interface PersonFormData {
    name: string;
    document: string;
    phone: string;
}

interface PeopleManagementPageProps {
    people: Person[];
    onAddPerson: (personData: Omit<Person, 'id'>) => Promise<Person>;
    onUpdatePerson: (person: Person) => Promise<Person>;
    onDeletePerson: (personId: string) => Promise<void>;
    onBack: () => void;
}

const PeopleManagementPage: React.FC<PeopleManagementPageProps> = ({ people, onAddPerson, onUpdatePerson, onDeletePerson, onBack }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [personToEdit, setPersonToEdit] = useState<Person | null>(null);
    const [personToDelete, setPersonToDelete] = useState<Person | null>(null);

    const filteredPeople = useMemo(() => {
        const normalizedSearch = normalizeString(searchQuery);
        if (!normalizedSearch) {
            return people;
        }
        return people.filter(p => normalizeString(p.name).includes(normalizedSearch));
    }, [people, searchQuery]);

    const handleEdit = (person: Person) => {
        setPersonToEdit(person);
        setIsFormOpen(true);
    };

    const handleAdd = () => {
        setPersonToEdit(null);
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setPersonToEdit(null);
    };
    
    const handleSavePerson = async (formData: PersonFormData) => {
        const { type } = getDocumentType(formData.document);
        if (personToEdit) { // Edit Mode
            await onUpdatePerson({ ...personToEdit, ...formData, documentType: type });
        } else { // Create Mode
            await onAddPerson({ ...formData, documentType: type });
        }
        handleCloseForm();
    };

    const handleDelete = (person: Person) => {
        setPersonToDelete(person);
    };

    return (
        <div className="animate-fadeIn">
            <header className="sticky top-0 md:static bg-white md:bg-transparent z-10 p-4 border-b border-zinc-200 md:border-b-0 md:pt-6">
                <div className="flex justify-between items-center gap-4 mb-4">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="text-zinc-500 hover:text-zinc-800 p-1 rounded-full hover:bg-zinc-100">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <h1 className="text-xl md:text-2xl font-bold text-zinc-800">Gerenciar Pessoas ({filteredPeople.length})</h1>
                    </div>
                    <button
                        onClick={handleAdd}
                        className="bg-green-500 text-white font-bold py-2 px-4 rounded-full flex items-center gap-2 hover:bg-green-600 transition-colors shadow-sm flex-shrink-0"
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                        <span className="hidden md:inline">Nova Pessoa</span>
                    </button>
                </div>
                 <div className="relative">
                    <input
                        type="search"
                        placeholder="Buscar por nome..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-zinc-100 border border-transparent rounded-full focus:outline-none focus:ring-2 focus:ring-green-500"
                        autoComplete="off"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-zinc-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
                    </div>
                </div>
            </header>

            <main className="p-4 space-y-3">
                {filteredPeople.length > 0 ? (
                    filteredPeople.map((person, index) => (
                        <div
                            key={person.id}
                            className="bg-white p-3 rounded-xl border border-zinc-200 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-3 opacity-0 animate-fadeInUp"
                            style={{ animationDelay: `${index * 30}ms`, animationFillMode: 'forwards' }}
                        >
                            <div className="flex-grow">
                                <p className="font-bold text-zinc-800">{person.name}</p>
                                <p className="text-sm text-zinc-500 mt-1">{person.document} &bull; {person.phone}</p>
                            </div>
                            <div className="flex items-center gap-2 self-end md:self-center">
                                <button
                                    onClick={() => handleEdit(person)}
                                    className="text-sm font-semibold text-green-600 hover:bg-green-50 px-3 py-1.5 rounded-lg transition-colors"
                                >
                                    Editar
                                </button>
                                <button
                                    onClick={() => handleDelete(person)}
                                    className="text-sm font-semibold text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                                >
                                    Excluir
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-20 text-zinc-500">
                        <p className="font-semibold">Nenhuma pessoa encontrada.</p>
                        <p className="mt-2 text-sm">A lista de pessoas está vazia ou o termo de busca não retornou resultados.</p>
                    </div>
                )}
            </main>

            {isFormOpen && (
                <PersonForm
                    person={personToEdit}
                    onSave={handleSavePerson}
                    onClose={handleCloseForm}
                />
            )}
            
            {personToDelete && (
                <ConfirmDeletePerson
                    person={personToDelete}
                    onConfirm={async () => {
                        await onDeletePerson(personToDelete.id);
                        setPersonToDelete(null);
                    }}
                    onCancel={() => setPersonToDelete(null)}
                />
            )}
        </div>
    );
};

export default PeopleManagementPage;
