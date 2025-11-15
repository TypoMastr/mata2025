
import { useState, useEffect, useCallback } from 'react';
import type { Person } from '../types';
import * as api from '../services/api';
import { useToast } from '../contexts/ToastContext';

export const usePeople = () => {
    const [people, setPeople] = useState<Person[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { addToast } = useToast();

    const fetchPeople = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await api.fetchAllPeople();
            setPeople(data);
        } catch (err) {
            console.error("Failed to fetch people:", err);
            addToast("Falha ao carregar a lista de pessoas.", "error");
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchPeople();
    }, [fetchPeople]);

    const addPerson = async (personData: Omit<Person, 'id'>) => {
        try {
            const newPerson = await api.createPerson(personData);
            setPeople(prev => [...prev, newPerson].sort((a, b) => a.name.localeCompare(b.name)));
            addToast("Pessoa adicionada com sucesso.", "success");
            return newPerson;
        } catch (err) {
            console.error("Failed to add person:", err);
            addToast("Falha ao adicionar pessoa.", "error");
            throw err;
        }
    };

    const updatePerson = async (updatedPerson: Person) => {
        try {
            const savedPerson = await api.updatePerson(updatedPerson);
            setPeople(prev => prev.map(p => p.id === savedPerson.id ? savedPerson : p));
            addToast("Dados da pessoa atualizados.", "success");
            return savedPerson;
        } catch (err) {
            console.error("Failed to update person:", err);
            addToast("Falha ao atualizar dados.", "error");
            throw err;
        }
    };
    
    const deletePerson = async (personId: string) => {
        try {
            await api.deletePerson(personId);
            setPeople(prev => prev.filter(p => p.id !== personId));
            addToast("Pessoa excluída com sucesso.", "success");
        } catch (err: any) {
            console.error("Failed to delete person:", err);
            if (err.message === 'PERSON_HAS_REGISTRATIONS') {
                addToast("Não é possível excluir. A pessoa está inscrita em um ou mais eventos.", "error");
            } else {
                addToast("Falha ao excluir pessoa.", "error");
            }
            throw err;
        }
    };

    return {
        people,
        isLoading,
        addPerson,
        updatePerson,
        deletePerson,
    };
};
