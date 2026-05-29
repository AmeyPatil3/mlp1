
import React, { useState, useEffect } from 'react';
import { Outlet, Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { io } from 'socket.io-client';
import { 
    BrainCircuitIcon, 
    CalendarDaysIcon,
    ArrowLeftOnRectangleIcon,
    ChatBubbleLeftEllipsisIcon,
    UserIcon,
    Squares2X2Icon
} from './icons';

const ClipboardIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
);

const TherapistSidebar: React.FC = () => {
    const { auth, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [unread, setUnread] = useState<number>(0);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    useEffect(() => {
        let isMounted = true;
        const fetchUnread = async () => {
            try {
                const res = await api.get('/rooms/unread-count');
                if (isMounted) setUnread(res.data?.unreadCount || 0);
            } catch (_e) {
                if (isMounted) setUnread(0);
            }
        };
        fetchUnread();

        // Establish Socket.IO subscription for unread count increment
        const authData = localStorage.getItem('auth');
        const token = authData ? JSON.parse(authData).token : null;
        if (!token) return;

        const socketUrl = (process.env.VITE_SOCKET_URL as string) || 'http://localhost:5001';
        const socket = io(socketUrl, {
            auth: { token },
            transports: ['websocket']
        });

        socket.on('new_message_notification', () => {
            if (isMounted && !location.pathname.endsWith('/messages')) {
                setUnread(prev => prev + 1);
            }
        });

        return () => {
            isMounted = false;
            socket.disconnect();
        };
    }, [location.pathname]);

    useEffect(() => {
        if (location.pathname.endsWith('/messages')) {
            setUnread(0);
        }
    }, [location.pathname]);

    const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
        `flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 ${
            isActive 
                ? 'bg-blue-600 text-white shadow' 
                : 'text-gray-600 hover:bg-gray-200'
        }`;

    return (
        <div className="flex flex-col w-64 bg-white border-r border-gray-200 p-4">
            <Link to="/app/therapist" className="flex items-center space-x-2 px-4 mb-8">
                <BrainCircuitIcon className="w-11 h-11 text-blue-600" />
                <span className="text-2xl font-bold text-gray-800">MindLink</span>
            </Link>

            <nav className="flex-1 flex flex-col space-y-2">
                <NavLink to="/app/therapist" end className={navLinkClasses}>
                    <Squares2X2Icon className="w-5 h-5 mr-3" /> Dashboard
                </NavLink>
                <NavLink to="/app/therapist/schedule" className={navLinkClasses}>
                    <CalendarDaysIcon className="w-5 h-5 mr-3" /> Schedule
                </NavLink>
                <NavLink to="/app/therapist/records" className={navLinkClasses}>
                    <ClipboardIcon className="w-5 h-5 mr-3" /> Clinical Records
                </NavLink>
                <NavLink to="/app/therapist/messages" className={navLinkClasses}>
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center">
                            <ChatBubbleLeftEllipsisIcon className="w-5 h-5 mr-3" /> Messages
                        </div>
                        {unread > 0 && (
                            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-md shadow-red-500/50 flex-shrink-0"></span>
                        )}
                    </div>
                </NavLink>
                <NavLink to="/app/therapist/profile" className={navLinkClasses}>
                    <UserIcon className="w-5 h-5 mr-3" /> Profile
                </NavLink>
            </nav>

            <div className="mt-auto border-t border-gray-200 pt-4">
                 <div className="flex items-center px-4">
                    <img src={auth?.user?.profileImage || 'https://picsum.photos/seed/therapist1/40/40'} alt="Therapist avatar" className="w-10 h-10 rounded-full" />
                    <div className="ml-3">
                        <p className="text-sm font-semibold text-gray-800">{auth?.user?.fullName}</p>
                        <p className="text-xs text-gray-500">Therapist</p>
                    </div>
                </div>
                <button onClick={handleLogout} className="flex items-center mt-4 w-full px-4 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors">
                    <ArrowLeftOnRectangleIcon className="w-5 h-5 mr-3" />
                    Logout
                </button>
            </div>
        </div>
    );
};

const TherapistDashboardLayout: React.FC = () => {
    return (
        <div className="flex h-screen bg-gray-100">
            <TherapistSidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default TherapistDashboardLayout;
