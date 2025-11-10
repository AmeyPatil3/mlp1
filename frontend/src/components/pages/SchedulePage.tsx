
import React, { useEffect, useState, useMemo } from 'react';
import { CalendarDaysIcon } from '../ui/icons';
import api from '../../services/api';

type PopulatedUser = {
    _id: string;
    fullName: string;
    email: string;
    profileImage?: string;
};

type PopulatedTherapistUser = {
    _id: string;
    fullName: string;
    email: string;
    profileImage?: string;
};

type PopulatedTherapist = {
    _id: string;
    user: PopulatedTherapistUser;
};

type Appointment = {
    _id: string;
    user: PopulatedUser;
    therapist: PopulatedTherapist;
    scheduledDate: string;
    duration: number;
    status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
    type: 'video' | 'audio' | 'chat';
    notes?: string;
    meetingLink?: string;
};

const SchedulePage: React.FC = () => {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        const fetchAppointments = async () => {
            try {
                setLoading(true);
                setError(null);
                const res = await api.get('/appointments', { params: { page: 1, limit: 100 } });
                if (!isMounted) return;
                const items: Appointment[] = res.data?.appointments || [];
                const sorted = items.sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
                setAppointments(sorted);
            } catch (e: any) {
                if (!isMounted) return;
                setError(e?.response?.data?.message || 'Failed to load appointments');
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchAppointments();
        return () => { isMounted = false; };
    }, []);

    const formatTimeRange = (isoDate: string, durationMinutes: number) => {
        const start = new Date(isoDate);
        const end = new Date(start.getTime() + durationMinutes * 60000);
        const fmt = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        return `${fmt(start)} - ${fmt(end)}`;
    };

    const upcomingAppointments = useMemo(() => {
        const now = new Date();
        return appointments.filter(apt => {
            const aptDate = new Date(apt.scheduledDate);
            return aptDate >= now && (apt.status === 'scheduled' || apt.status === 'confirmed');
        }).slice(0, 5);
    }, [appointments]);

    const todayAppointments = useMemo(() => {
        const today = new Date();
        const y = today.getFullYear();
        const m = today.getMonth();
        const d = today.getDate();
        const start = new Date(y, m, d, 0, 0, 0, 0).getTime();
        const end = new Date(y, m, d + 1, 0, 0, 0, 0).getTime();
        return appointments.filter(apt => {
            const t = new Date(apt.scheduledDate).getTime();
            return t >= start && t < end;
        });
    }, [appointments]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'scheduled': return 'bg-blue-50 border-blue-500 text-blue-800';
            case 'confirmed': return 'bg-green-50 border-green-500 text-green-800';
            case 'in-progress': return 'bg-yellow-50 border-yellow-500 text-yellow-800';
            case 'completed': return 'bg-gray-50 border-gray-500 text-gray-800';
            case 'cancelled': return 'bg-red-50 border-red-500 text-red-800';
            default: return 'bg-gray-50 border-gray-500 text-gray-800';
        }
    };

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-gray-900">Your Schedule</h1>
                <p className="mt-2 text-lg text-gray-600">Manage your appointments and availability.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-xl shadow-md p-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Today's Schedule</h2>
                    {loading && (
                        <div className="text-center text-gray-500 py-8">
                            <CalendarDaysIcon className="w-16 h-16 mx-auto mb-4 animate-pulse" />
                            <p>Loading appointments...</p>
                        </div>
                    )}
                    {error && (
                        <div className="text-center text-red-500 py-8">
                            <p>{error}</p>
                        </div>
                    )}
                    {!loading && !error && (
                        <div className="space-y-4">
                            {todayAppointments.length === 0 ? (
                                <div className="text-center text-gray-500 py-8">
                                    <CalendarDaysIcon className="w-16 h-16 mx-auto mb-4" />
                                    <p>No appointments scheduled for today.</p>
                                </div>
                            ) : (
                                todayAppointments.map((apt) => (
                                    <div key={apt._id} className={`p-4 rounded-lg border-l-4 ${getStatusColor(apt.status)}`}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-semibold">{formatTimeRange(apt.scheduledDate, apt.duration || 60)}</p>
                                                <p className="text-sm">Session with {apt.user?.fullName || 'Client'}</p>
                                                <p className="text-xs opacity-75">Status: {apt.status}</p>
                                            </div>
                                            {apt.meetingLink && (
                                                <a
                                                    href={apt.meetingLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                                                >
                                                    Join
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
                <div className="bg-white rounded-xl shadow-md p-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Upcoming</h2>
                    {loading && (
                        <div className="text-center text-gray-500 py-4">
                            <p>Loading...</p>
                        </div>
                    )}
                    {!loading && (
                        <ul className="space-y-4">
                            {upcomingAppointments.length === 0 ? (
                                <li className="p-4 bg-gray-50 rounded-lg text-center text-gray-500">
                                    No upcoming appointments
                                </li>
                            ) : (
                                upcomingAppointments.map((apt) => (
                                    <li key={apt._id} className={`p-4 rounded-lg border-l-4 ${getStatusColor(apt.status)}`}>
                                        <p className="font-semibold">
                                            {new Date(apt.scheduledDate).toLocaleDateString('en-US', { 
                                                month: 'short', 
                                                day: 'numeric',
                                                hour: 'numeric',
                                                minute: '2-digit',
                                                hour12: true 
                                            })}
                                        </p>
                                        <p className="text-sm">Session with {apt.user?.fullName || 'Client'}</p>
                                        <p className="text-xs opacity-75">{apt.status}</p>
                                    </li>
                                ))
                            )}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SchedulePage;
