
import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDaysIcon, UsersIcon } from '../ui/icons';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
                {icon}
            </div>
            <div className="ml-4">
                <p className="text-sm text-gray-500">{title}</p>
                <p className="text-2xl font-bold text-gray-800">{value}</p>
            </div>
        </div>
    </div>
);

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

const TherapistDashboardPage: React.FC = () => {
    const { auth } = useAuth();
    const displayName = auth?.user?.fullName || 'Therapist';

    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [unreadCount, setUnreadCount] = useState<number>(0);
    const [pendingCount, setPendingCount] = useState<number>(0);

    useEffect(() => {
        let isMounted = true;
        const fetchAppointments = async () => {
            try {
                setLoading(true);
                setError(null);
                const res = await api.get('/appointments', { params: { page: 1, limit: 100 } });
                if (!isMounted) return;
                const items: Appointment[] = res.data?.appointments || [];
                // Sort ascending by date and keep all records
                const sorted = items.sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
                setAppointments(sorted);
                // Pending requests: scheduled/confirmed that are in the future (actionables)
                const now = new Date().getTime();
                const pending = items.filter(a => (a.status === 'scheduled' || a.status === 'confirmed') && new Date(a.scheduledDate).getTime() >= now).length;
                setPendingCount(pending);
            } catch (e: any) {
                if (!isMounted) return;
                setError(e?.response?.data?.message || 'Failed to load appointments');
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        const fetchUnread = async () => {
            try {
                // Count messages in last 24h not sent by me in rooms I'm in
                const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
                const res = await api.get('/rooms/unread-count', { params: { since } });
                if (!isMounted) return;
                setUnreadCount(res.data?.unreadCount || 0);
            } catch (_e) {
                if (!isMounted) return;
                setUnreadCount(0);
            }
        };
        fetchAppointments();
        fetchUnread();
        return () => { isMounted = false; };
    }, []);

    const formatTimeRange = (isoDate: string, durationMinutes: number) => {
        const start = new Date(isoDate);
        const end = new Date(start.getTime() + durationMinutes * 60000);
        const fmt = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        return `${fmt(start)} - ${fmt(end)}`;
    };

    const todaysCount = useMemo(() => {
        const today = new Date();
        const y = today.getFullYear();
        const m = today.getMonth();
        const d = today.getDate();
        const start = new Date(y, m, d, 0, 0, 0, 0).getTime();
        const end = new Date(y, m, d + 1, 0, 0, 0, 0).getTime();
        return appointments.filter(a => {
            const t = new Date(a.scheduledDate).getTime();
            return t >= start && t < end && (a.status === 'scheduled' || a.status === 'confirmed');
        }).length;
    }, [appointments]);

    return (
        <div>
            <div className="mb-12">
                <h1 className="text-4xl font-bold text-gray-900">Welcome, {displayName}</h1>
                <p className="mt-2 text-lg text-gray-600">Here's a summary of your activity today.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                <StatCard title="Today's Appointments" value={String(todaysCount)} icon={<CalendarDaysIcon className="w-8 h-8 text-blue-600" />} />
                <StatCard title="New Messages" value={String(unreadCount)} icon={<UsersIcon className="w-8 h-8 text-blue-600" />} />
                <StatCard title="Pending Requests" value={String(pendingCount)} icon={<UsersIcon className="w-8 h-8 text-blue-600" />} />
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Upcoming Appointments</h2>
                {loading && (
                    <p className="text-gray-500">Loading appointments...</p>
                )}
                {error && (
                    <p className="text-red-600">{error}</p>
                )}
                {!loading && !error && (
                    <ul className="space-y-4">
                        {appointments.length === 0 && (
                            <li className="p-4 bg-gray-50 rounded-lg text-gray-600">No upcoming appointments.</li>
                        )}
                        {appointments.map((apt) => (
                            <li key={apt._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div>
                                    <p className="font-semibold text-gray-700">{apt.user?.fullName || 'Client'}</p>
                                    <p className="text-sm text-gray-500">
                                        {new Date(apt.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', weekday: 'short' })}
                                        {` · ${formatTimeRange(apt.scheduledDate, apt.duration || 60)} · ${apt.status}`}
                                    </p>
                                </div>
                                {(() => {
                                    const joinLink = apt.meetingLink ? apt.meetingLink.replace('app/member/room/', 'app/therapist/room/') : '';
                                    const enabled = Boolean(joinLink) && apt.status !== 'cancelled';
                                    return (
                                        <a
                                            href={enabled ? joinLink : '#'}
                                            target={enabled ? '_blank' : undefined}
                                            rel={enabled ? 'noopener noreferrer' : undefined}
                                            className={`bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 ${enabled ? '' : 'opacity-50 cursor-not-allowed'}`}
                                            onClick={(e) => { if (!enabled) e.preventDefault(); }}
                                        >
                                            {enabled ? 'Join Call' : (apt.status === 'cancelled' ? 'Cancelled' : 'Awaiting Link')}
                                        </a>
                                    );
                                })()}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default TherapistDashboardPage;
