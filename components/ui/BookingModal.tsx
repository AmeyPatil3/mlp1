import React, { useState, useMemo, useEffect } from 'react';
import type { Therapist } from '../../types';
import Modal from './Modal';
import { CheckCircleIcon } from './icons';
import api from '../../services/api';

interface BookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    therapist: Therapist;
}

// Helper to generate mock time slots
const generateTimeSlots = (date: Date): string[] => {
    // In a real app, this would come from an API
    if (date.getDay() === 0 || date.getDay() === 6) return []; // No weekends
    return ["09:00 AM", "10:00 AM", "11:00 AM", "02:00 PM", "03:00 PM", "04:00 PM"];
};

const BookingModal: React.FC<BookingModalProps> = ({ isOpen, onClose, therapist }) => {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [isBooked, setIsBooked] = useState(false);
    const [isBooking, setIsBooking] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const availableDates = useMemo(() => {
        return Array.from({ length: 7 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() + i);
            return date;
        });
    }, []);

    const timeSlots = useMemo(() => generateTimeSlots(selectedDate), [selectedDate]);

    // This effect resets the modal's internal state when it's closed.
    // This is cleaner than using setTimeout in the close handler.
    useEffect(() => {
        if (!isOpen) {
            // Add a small delay to allow the closing animation to finish before resetting state
            const timer = setTimeout(() => {
                setIsBooked(false);
                setSelectedTime(null);
                setSelectedDate(new Date());
                setIsBooking(false);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const parseTimeToDate = (baseDate: Date, timeLabel: string): Date => {
        // timeLabel format like "02:00 PM"
        const match = timeLabel.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        if (!match) return baseDate;
        const hour12 = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const ampm = match[3].toUpperCase();
        let hours = hour12 % 12;
        if (ampm === 'PM') hours += 12;
        const dt = new Date(baseDate);
        dt.setHours(hours, minutes, 0, 0);
        return dt;
    };

    const handleBooking = async () => {
        if (!selectedTime) return;
        setIsBooking(true);
        setError(null);
        try {
            const scheduledAt = parseTimeToDate(selectedDate, selectedTime);
            await api.post('/appointments', {
                therapistId: therapist._id,
                scheduledDate: scheduledAt.toISOString(),
                duration: 60,
                type: 'video'
            });
            setIsBooked(true);
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Failed to book appointment');
        } finally {
            setIsBooking(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isBooked ? 'Session Confirmed' : `Book with ${therapist.fullName}`}>
            {isBooked ? (
                <div className="text-center p-4">
                    <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-gray-800">Appointment Confirmed!</h3>
                    <div className="bg-gray-100 rounded-lg p-4 my-4 text-left">
                        <p><span className="font-semibold">Therapist:</span> {therapist.fullName}</p>
                        <p><span className="font-semibold">Date:</span> {selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        <p><span className="font-semibold">Time:</span> {selectedTime}</p>
                    </div>
                    <p className="text-gray-600 mt-2 text-sm">
                        You'll receive a confirmation email shortly.
                    </p>
                    <button
                        onClick={onClose}
                        className="mt-6 w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Done
                    </button>
                </div>
            ) : (
                <div>
                    <div className="mb-6">
                        <h4 className="font-semibold mb-3 text-gray-700">1. Select a Date</h4>
                        <div className="grid grid-cols-4 gap-2">
                            {availableDates.map(date => (
                                <button
                                    key={date.toISOString()}
                                    onClick={() => { setSelectedDate(date); setSelectedTime(null); }}
                                    className={`p-2 rounded-lg text-center border transition-all duration-200 ${selectedDate.toDateString() === date.toDateString() ? 'bg-blue-600 text-white border-blue-600 shadow-lg scale-105' : 'hover:bg-gray-100 hover:border-gray-300'}`}
                                >
                                    <div className="text-xs font-medium">{date.toLocaleString('default', { month: 'short' })}</div>
                                    <div className="font-bold text-lg">{date.getDate()}</div>
                                    <div className="text-xs text-gray-500">{date.toLocaleString('default', { weekday: 'short' })}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="mb-6">
                         <h4 className="font-semibold mb-3 text-gray-700">2. Select a Time</h4>
                         <div className="grid grid-cols-3 gap-2">
                            {timeSlots.length > 0 ? timeSlots.map(time => (
                                <button
                                    key={time}
                                    onClick={() => setSelectedTime(time)}
                                    className={`p-2 rounded-lg border text-sm font-medium transition-all duration-200 ${selectedTime === time ? 'bg-blue-600 text-white border-blue-600 shadow-lg scale-105' : 'hover:bg-gray-100 hover:border-gray-300'}`}
                                >
                                    {time}
                                </button>
                            )) : <p className="text-gray-500 col-span-3 text-center py-4">No available slots on this day.</p>}
                         </div>
                    </div>

                    {error && (
                        <div className="mb-4 text-red-600 text-sm">{error}</div>
                    )}

                    <div className="mt-8 pt-4 border-t">
                        <button
                            onClick={handleBooking}
                            disabled={!selectedTime || isBooking}
                            className="w-full bg-green-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-300 transition-colors flex items-center justify-center"
                        >
                           {isBooking ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Booking...
                                </>
                           ) : (
                                selectedTime ? `Confirm for ${selectedTime}` : 'Select a time slot'
                           )}
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default BookingModal;
