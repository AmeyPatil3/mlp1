
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ui/ProtectedRoute';

import LandingPage from './components/pages/LandingPage';
import LoginPage from './components/pages/LoginPage';
import RegisterUserPage from './components/pages/RegisterUserPage';
import RegisterTherapistPage from './components/pages/RegisterTherapistPage';

import MemberDashboardLayout from './components/ui/MemberDashboardLayout';
import MemberDashboardPage from './components/pages/DashboardPage';
import RoomsPage from './components/pages/RoomsPage';
import BookingsPage from './components/pages/BookingsPage';
import RoomHistoryPage from './components/pages/RoomHistoryPage';
import ProfilePage from './components/pages/ProfilePage';
import TherapistDirectoryPage from './components/pages/TherapistDirectoryPage';
import PeerSupportRoomPage from './components/pages/PeerSupportRoomPage';

import TherapistDashboardLayout from './components/ui/TherapistDashboardLayout';
import TherapistDashboardPage from './components/pages/TherapistDashboardPage';
import SchedulePage from './components/pages/SchedulePage';
import TherapistProfilePage from './components/pages/TherapistProfilePage';

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register-user" element={<RegisterUserPage />} />
          <Route path="/register-therapist" element={<RegisterTherapistPage />} />
          
          {/* Member-specific Routes */}
          <Route element={<ProtectedRoute allowedRoles={['user']} />}>
            <Route path="/app/member" element={<MemberDashboardLayout />}>
              <Route index element={<MemberDashboardPage />} />
              <Route path="rooms" element={<RoomsPage />} />
              <Route path="therapists" element={<TherapistDirectoryPage />} />
              <Route path="bookings" element={<BookingsPage />} />
              <Route path="history" element={<RoomHistoryPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="room/:roomId" element={<PeerSupportRoomPage />} />
            </Route>
          </Route>

          {/* Therapist-specific Routes */}
          <Route element={<ProtectedRoute allowedRoles={['therapist']} />}>
            <Route path="/app/therapist" element={<TherapistDashboardLayout />}>
              <Route index element={<TherapistDashboardPage />} />
              <Route path="schedule" element={<SchedulePage />} />
              <Route path="profile" element={<TherapistProfilePage />} />
            </Route>
          </Route>

        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}

export default App;
