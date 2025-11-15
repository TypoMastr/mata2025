
import { useState, useEffect, useCallback } from 'react';
import type { Event } from '../types';
import * as api from '../services/api';

export const useEvents = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchEvents = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await api.fetchEvents();
            setEvents(data);
        } catch (err) {
            console.error("Failed to fetch events:", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    const addEvent = async (eventData: Omit<Event, 'id'>) => {
        try {
            const newEvent = await api.createEvent(eventData);
            setEvents(prev => [newEvent, ...prev]);
            return newEvent;
        } catch (err) {
            console.error("Failed to add event:", err);
            throw err;
        }
    };

    const updateEvent = async (updatedEvent: Event) => {
        try {
            const savedEvent = await api.updateEvent(updatedEvent);
            setEvents(prev => prev.map(e => e.id === savedEvent.id ? savedEvent : e));
            return savedEvent;
        } catch (err) {
            console.error("Failed to update event:", err);
            throw err;
        }
    };

    const deleteEvent = async (eventId: string) => {
        try {
            await api.deleteEvent(eventId);
            setEvents(prev => prev.filter(e => e.id !== eventId));
        } catch (err) {
            console.error("Failed to delete event:", err);
            throw err;
        }
    };

    return {
        events,
        isLoading,
        addEvent,
        updateEvent,
        deleteEvent,
    };
};
