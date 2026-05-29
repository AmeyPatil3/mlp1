import React, { useEffect, useState, useMemo } from 'react';
import { CalendarDaysIcon, ClockIcon, UserIcon } from '../ui/icons';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import BookingModal from '../ui/BookingModal';
import type { Therapist } from '../../types';

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
    specialties?: string[];
    experienceYears?: number;
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
    price?: number;
    paymentStatus?: string;
};

const BookingsPage: React.FC = () => {
    const { auth } = useAuth();
    const navigate = useNavigate();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [cancellingId, setCancellingId] = useState<string | null>(null);
    const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    // Booking modal state
    const [bookingTherapist, setBookingTherapist] = useState<Therapist | null>(null);
    const [bookingOpen, setBookingOpen] = useState(false);

    // Redirect therapists to their dashboard
    useEffect(() => {
        if (auth?.user?.role === 'therapist') {
            navigate('/app/therapist');
            return;
        }
    }, [auth, navigate]);

    useEffect(() => {
        // Don't fetch if user is a therapist (they'll be redirected)
        if (auth?.user?.role === 'therapist') {
            return;
        }

        let isMounted = true;
        const fetchAppointments = async () => {
            try {
                setLoading(true);
                setError(null);
                console.log('Fetching appointments...');
                const res = await api.get('/appointments', { params: { page: 1, limit: 100 } });
                if (!isMounted) return;
                const items: Appointment[] = res.data?.appointments || [];
                console.log('Fetched appointments:', items);
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
    }, [auth]);

    const formatTimeRange = (isoDate: string, durationMinutes: number) => {
        const start = new Date(isoDate);
        const end = new Date(start.getTime() + durationMinutes * 60000);
        const fmt = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        return `${fmt(start)} - ${fmt(end)}`;
    };

    const fmtDate = (iso: string) =>
        new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

    const fmtTime = (iso: string) =>
        new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    const handleBookAgain = (apt: Appointment) => {
        const t = apt.therapist;
        const therapistObj: Therapist = {
            _id: t._id,
            fullName: t.user?.fullName || 'Therapist',
            email: t.user?.email || '',
            profileImage: t.user?.profileImage || 'https://i.pravatar.cc/150',
            specialties: t.specialties || [],
            experienceYears: t.experienceYears || 0,
        };
        setBookingTherapist(therapistObj);
        setBookingOpen(true);
    };

    const statusColors: Record<string, string> = {
        completed: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        cancelled: 'bg-red-50 text-red-700 border-red-100',
        'no-show': 'bg-orange-50 text-orange-700 border-orange-100',
        scheduled: 'bg-blue-50 text-blue-700 border-blue-100',
        confirmed: 'bg-green-50 text-green-700 border-green-100',
        'in-progress': 'bg-yellow-50 text-yellow-700 border-yellow-100',
    };

    const upcomingAppointments = useMemo(() => {
        const now = new Date();
        return appointments.filter(apt => {
            const aptDate = new Date(apt.scheduledDate);
            return aptDate >= now && (apt.status === 'scheduled' || apt.status === 'confirmed');
        });
    }, [appointments]);

    const pastAppointments = useMemo(() => {
        const now = new Date();
        return appointments.filter(apt => {
            const aptDate = new Date(apt.scheduledDate);
            return aptDate < now || apt.status === 'completed' || apt.status === 'cancelled' || apt.status === 'no-show';
        });
    }, [appointments]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
            case 'in-progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200';
            case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
            case 'no-show': return 'bg-orange-100 text-orange-800 border-orange-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const handleCancelAppointment = async (appointmentId: string) => {
        if (!confirm('Are you sure you want to cancel this appointment? This action cannot be undone.')) return;
        
        setCancellingId(appointmentId);
        try {
            console.log('Cancelling appointment:', appointmentId);
            console.log('Auth token:', localStorage.getItem('auth'));
            const response = await api.delete(`/appointments/${appointmentId}`);
            console.log('Cancel response:', response.data);
            
            if (response.data?.success) {
                // Update the appointment status instead of removing it
                setAppointments(prev => prev.map(apt => 
                    apt._id === appointmentId 
                        ? { ...apt, status: 'cancelled' as const }
                        : apt
                ));
                
                // Show success message
                setNotification({ type: 'success', message: 'Appointment cancelled successfully' });
                setTimeout(() => setNotification(null), 3000);
            } else {
                throw new Error(response.data?.message || 'Failed to cancel appointment');
            }
        } catch (e: any) {
            console.error('Cancel appointment error:', e);
            const errorMessage = e?.response?.data?.message || e?.message || 'Failed to cancel appointment';
            setNotification({ type: 'error', message: errorMessage });
            setTimeout(() => setNotification(null), 5000);
        } finally {
            setCancellingId(null);
        }
    };

    // Show loading if user is a therapist (being redirected)
    if (auth?.user?.role === 'therapist') {
        return (
            <div className="text-center py-8">
                <CalendarDaysIcon className="w-16 h-16 mx-auto mb-4 animate-pulse text-blue-600" />
                <p className="text-gray-500">Redirecting to therapist dashboard...</p>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-gray-900">Your Bookings</h1>
                <p className="mt-2 text-lg text-gray-600">Manage your therapy appointments and sessions.</p>
            </div>

            {loading && (
                <div className="text-center py-8">
                    <CalendarDaysIcon className="w-16 h-16 mx-auto mb-4 animate-pulse text-blue-600" />
                    <p className="text-gray-500">Loading your appointments...</p>
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <p className="text-red-600">{error}</p>
                </div>
            )}

            {notification && (
                <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
                    notification.type === 'success' 
                        ? 'bg-green-50 border border-green-200 text-green-800' 
                        : 'bg-red-50 border border-red-200 text-red-800'
                }`}>
                    <div className="flex items-center">
                        <span className="font-medium">{notification.message}</span>
                        <button 
                            onClick={() => setNotification(null)}
                            className="ml-4 text-gray-500 hover:text-gray-700"
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}

            {!loading && !error && (
                <div className="space-y-8">
                    {/* Upcoming Appointments */}
                    <div className="bg-white rounded-xl shadow-md p-6">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                            <CalendarDaysIcon className="w-6 h-6 mr-2 text-blue-600" />
                            Upcoming Appointments
                        </h2>
                        {upcomingAppointments.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <CalendarDaysIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                <p>No upcoming appointments</p>
                                <p className="text-sm">Book a session with a therapist to get started</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {upcomingAppointments.map((apt) => (
                                    <div key={apt._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex items-center mb-2">
                                                    <UserIcon className="w-5 h-5 mr-2 text-gray-500" />
                                                    <h3 className="text-lg font-semibold text-gray-800">
                                                        {apt.therapist?.user?.fullName || 'Therapist'}
                                                    </h3>
                                                    <span className={`ml-3 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(apt.status)}`}>
                                                        {apt.status}
                                                    </span>
                                                </div>
                                                <div className="flex items-center text-gray-600 mb-2">
                                                    <ClockIcon className="w-4 h-4 mr-2" />
                                                    <span>
                                                        {new Date(apt.scheduledDate).toLocaleDateString('en-US', { 
                                                            weekday: 'long',
                                                            year: 'numeric', 
                                                            month: 'long', 
                                                            day: 'numeric' 
                                                        })}
                                                    </span>
                                                    <span className="mx-2">•</span>
                                                    <span>{formatTimeRange(apt.scheduledDate, apt.duration || 60)}</span>
                                                </div>
                                                <div className="flex items-center text-sm text-gray-500">
                                                    <span>Session type: {apt.type}</span>
                                                    {apt.price && (
                                                        <>
                                                            <span className="mx-2">•</span>
                                                            <span>${apt.price}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex space-x-2 ml-4">
                                                {apt.meetingLink && (
                                                    apt.status === 'completed' ? (
                                                        <button
                                                            disabled
                                                            className="bg-gray-100 text-gray-400 px-4 py-2 rounded-lg text-sm font-medium cursor-not-allowed border border-gray-200"
                                                        >
                                                            Completed
                                                        </button>
                                                    ) : (
                                                        <a
                                                            href={apt.meetingLink}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                                                        >
                                                            Join Session
                                                        </a>
                                                    )
                                                )}
                                                {apt.status === 'scheduled' && (
                                                    <button
                                                        onClick={() => handleCancelAppointment(apt._id)}
                                                        disabled={cancellingId === apt._id}
                                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                                            cancellingId === apt._id
                                                                ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                                                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                                                        }`}
                                                    >
                                                        {cancellingId === apt._id ? 'Cancelling...' : 'Cancel'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Your Past Appointments */}
                    {pastAppointments.length > 0 && (
                        <div className="bg-white rounded-xl shadow-md p-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                                <ClockIcon className="w-6 h-6 mr-2 text-blue-600" />
                                Your Past Appointments
                            </h2>
                            <div className="space-y-3">
                                {pastAppointments.map((apt) => {
                                    const therapistName = apt.therapist?.user?.fullName || 'Therapist';
                                    const therapistImg = apt.therapist?.user?.profileImage;
                                    const statusCls = statusColors[apt.status] || 'bg-gray-100 text-gray-600 border-gray-200';

                                    return (
                                        <div
                                            key={apt._id}
                                            className="bg-white rounded-2xl border border-gray-100 hover:border-gray-200 shadow-sm hover:shadow transition-all p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                                        >
                                            {/* Left — therapist info + date */}
                                            <div className="flex items-center gap-4">
                                                <img
                                                    src={therapistImg || `https://i.pravatar.cc/150?u=${apt.therapist?._id}`}
                                                    alt={therapistName}
                                                    className="w-12 h-12 rounded-full object-cover border-2 border-gray-100 flex-shrink-0"
                                                />
                                                <div>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="font-bold text-gray-800 text-sm">{therapistName}</p>
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${statusCls}`}>
                                                            {apt.status}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                                                        <span>📅</span>
                                                        {fmtDate(apt.scheduledDate)}
                                                        <span>•</span>
                                                        <span>🕒</span>
                                                        {fmtTime(apt.scheduledDate)}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Right — Book Again button */}
                                            <button
                                                onClick={() => handleBookAgain(apt)}
                                                className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl text-xs transition-all shadow-md shadow-blue-500/15 flex items-center gap-1.5"
                                            >
                                                🔁 Book Again
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Booking Modal */}
            {bookingTherapist && (
                <BookingModal
                    isOpen={bookingOpen}
                    onClose={() => { setBookingOpen(false); setBookingTherapist(null); }}
                    therapist={bookingTherapist}
                />
            )}
        </div>
    );
};

export default BookingsPage;
