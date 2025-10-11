
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UsersIcon, UserHeartIcon, CalendarDaysIcon } from '../ui/icons';
import api from '../../services/api';

const MemberDashboardPage: React.FC = () => {
    const { auth } = useAuth();
    const firstName = auth?.user?.fullName?.split(' ')[0] || 'Member';
    const [upcomingCount, setUpcomingCount] = useState(0);

    // Redirect therapists to their dashboard
    useEffect(() => {
        if (auth?.user?.role === 'therapist') {
            window.location.href = '/app/therapist';
            return;
        }
    }, [auth]);

    useEffect(() => {
        const fetchUpcomingAppointments = async () => {
            try {
                const res = await api.get('/appointments', { params: { page: 1, limit: 10 } });
                const appointments = res.data?.appointments || [];
                const now = new Date();
                const upcoming = appointments.filter((apt: any) => {
                    const aptDate = new Date(apt.scheduledDate);
                    return aptDate >= now && (apt.status === 'scheduled' || apt.status === 'confirmed');
                });
                setUpcomingCount(upcoming.length);
            } catch (e) {
                // Ignore errors for dashboard summary
            }
        };
        fetchUpcomingAppointments();
    }, []);

    return (
        <div>
            <div className="mb-12">
                <h1 className="text-4xl font-bold text-gray-900">Welcome back, {firstName}</h1>
                <p className="mt-2 text-lg text-gray-600">Your safe space for connection and support is ready for you.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-shadow duration-300">
                    <div className="flex items-center">
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <UsersIcon className="w-8 h-8 text-blue-600" />
                        </div>
                        <div className="ml-4">
                            <h2 className="text-2xl font-bold text-gray-800">Peer Support Rooms</h2>
                            <p className="text-gray-600">Connect with others now.</p>
                        </div>
                    </div>
                    <p className="mt-4 text-gray-600">
                        Join an anonymous group video chat to share your experiences and listen in a supportive environment.
                    </p>
                    <Link
                        to="/app/member/rooms"
                        className="mt-6 inline-block w-full text-center bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors duration-300"
                    >
                        View Live Rooms
                    </Link>
                </div>
                 <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-shadow duration-300">
                    <div className="flex items-center">
                        <div className="p-3 bg-green-100 rounded-lg">
                            <UserHeartIcon className="w-8 h-8 text-green-600" />
                        </div>
                        <div className="ml-4">
                            <h2 className="text-2xl font-bold text-gray-800">Professional Therapy</h2>
                            <p className="text-gray-600">Find one-on-one support.</p>
                        </div>
                    </div>
                    <p className="mt-4 text-gray-600">
                        Browse our directory of professional therapists and book a private video session at your convenience.
                    </p>
                    <Link
                        to="/app/member/therapists"
                        className="mt-6 inline-block w-full text-center bg-green-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-green-700 transition-colors duration-300"
                    >
                        Find a Therapist
                    </Link>
                </div>
                <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-shadow duration-300">
                    <div className="flex items-center">
                        <div className="p-3 bg-purple-100 rounded-lg">
                            <CalendarDaysIcon className="w-8 h-8 text-purple-600" />
                        </div>
                        <div className="ml-4">
                            <h2 className="text-2xl font-bold text-gray-800">Your Bookings</h2>
                            <p className="text-gray-600">{upcomingCount} upcoming session{upcomingCount !== 1 ? 's' : ''}</p>
                        </div>
                    </div>
                    <p className="mt-4 text-gray-600">
                        View and manage your therapy appointments, join sessions, and track your progress.
                    </p>
                    <Link
                        to="/app/member/bookings"
                        className="mt-6 inline-block w-full text-center bg-purple-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-purple-700 transition-colors duration-300"
                    >
                        View Bookings
                    </Link>
                </div>
            </div>

            {null}
        </div>
    );
};

export default MemberDashboardPage;
