
import React from 'react';
import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
    BrainCircuitIcon, 
    UsersIcon, 
    UserHeartIcon, 
    ClockIcon, 
    Cog6ToothIcon, 
    ArrowLeftOnRectangleIcon,
    VideoCameraIcon,
    CalendarDaysIcon
} from './icons';

const MemberSidebar: React.FC = () => {
    const { auth, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
        `flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 ${
            isActive 
                ? 'bg-blue-600 text-white shadow' 
                : 'text-gray-600 hover:bg-gray-200'
        }`;

    return (
        <div className="flex flex-col w-64 bg-white border-r border-gray-200 p-4">
            <Link to="/app/member" className="flex items-center space-x-2 px-4 mb-8">
                <BrainCircuitIcon className="w-8 h-8 text-blue-600" />
                <span className="text-2xl font-bold text-gray-800">MindLink</span>
            </Link>

            <nav className="flex-1 flex flex-col space-y-2">
                <NavLink to="/app/member" end className={navLinkClasses}>
                    <UsersIcon className="w-5 h-5 mr-3" /> Dashboard
                </NavLink>
                <NavLink to="/app/member/rooms" className={navLinkClasses}>
                    <VideoCameraIcon className="w-5 h-5 mr-3" /> Live Rooms
                </NavLink>
                <NavLink to="/app/member/therapists" className={navLinkClasses}>
                    <UserHeartIcon className="w-5 h-5 mr-3" /> Find a Therapist
                </NavLink>
                <NavLink to="/app/member/bookings" className={navLinkClasses}>
                    <CalendarDaysIcon className="w-5 h-5 mr-3" /> Your Bookings
                </NavLink>
                <NavLink to="/app/member/history" className={navLinkClasses}>
                    <ClockIcon className="w-5 h-5 mr-3" /> Room History
                </NavLink>
                <NavLink to="/app/member/profile" className={navLinkClasses}>
                    <Cog6ToothIcon className="w-5 h-5 mr-3" /> Profile
                </NavLink>
            </nav>

            <div className="mt-auto border-t border-gray-200 pt-4">
                 <div className="flex items-center px-4">
                    <img src={auth?.user?.profileImage || 'https://picsum.photos/seed/avatar1/40/40'} alt="User avatar" className="w-10 h-10 rounded-full" />
                    <div className="ml-3">
                        <p className="text-sm font-semibold text-gray-800">{auth?.user?.fullName}</p>
                        <p className="text-xs text-gray-500">Member</p>
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


const MemberDashboardLayout: React.FC = () => {
    return (
        <div className="flex h-screen bg-gray-100">
            <MemberSidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default MemberDashboardLayout;
