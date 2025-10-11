import React, { useState, useEffect, useMemo } from 'react';
import type { Therapist } from '../../types';
import TherapistCard from '../ui/TherapistCard';
import BookingModal from '../ui/BookingModal';
import TherapistCardSkeleton from '../ui/skeletons/TherapistCardSkeleton';
import api from '../../services/api';

const TherapistDirectoryPage: React.FC = () => {
    const [therapists, setTherapists] = useState<Therapist[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [selectedTherapist, setSelectedTherapist] = useState<Therapist | null>(null);

    useEffect(() => {
        const fetchTherapists = async () => {
            setLoading(true);
            try {
                const response = await api.get('/therapists');
                const rawList = response.data.therapists || response.data || [];
                const mapped = (Array.isArray(rawList) ? rawList : []).map((t: any) => ({
                    _id: t._id,
                    fullName: t.user?.fullName ?? t.fullName ?? '',
                    email: t.user?.email ?? t.email ?? '',
                    profileImage: t.user?.profileImage ?? t.profileImage ?? 'https://i.pravatar.cc/150',
                    specialties: Array.isArray(t.specialties) ? t.specialties : [],
                    experienceYears: typeof t.experienceYears === 'number' ? t.experienceYears : Number(t.experienceYears) || 0
                }));
                setTherapists(mapped);
            } catch (err) {
                console.error('Therapists fetch error:', err);
                setError('Failed to load therapists. Please try again later.');
            } finally {
                setLoading(false);
            }
        };
        fetchTherapists();
    }, []);

    const handleBookSession = (therapist: Therapist) => {
        setSelectedTherapist(therapist);
        setIsBookingModalOpen(true);
    };

    const filteredTherapists = useMemo(() => {
        if (!searchTerm) return therapists;
        return therapists.filter(therapist =>
            therapist.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            therapist.specialties.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [searchTerm, therapists]);

    return (
        <div>
            <h1 className="text-3xl font-bold text-center mb-2">Find a Therapist</h1>
            <p className="text-center text-gray-600 mb-8">Connect with a professional who can help.</p>
            
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <p className="text-red-600">{error}</p>
                </div>
            )}
            
            <div className="mb-8 max-w-lg mx-auto">
                <input
                    type="text"
                    placeholder="Search by name or specialty (e.g., Anxiety)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {loading ? (
                    Array.from({ length: 6 }).map((_, index) => <TherapistCardSkeleton key={index} />)
                ) : filteredTherapists.length > 0 ? (
                    filteredTherapists.map(therapist => (
                        <TherapistCard key={therapist._id} therapist={therapist} onBook={handleBookSession} />
                    ))
                ) : (
                    <div className="col-span-full text-center py-16">
                        <p className="text-gray-500 text-lg">No therapists found matching your search.</p>
                    </div>
                )}
            </div>

            {selectedTherapist && (
                <BookingModal
                    isOpen={isBookingModalOpen}
                    onClose={() => setIsBookingModalOpen(false)}
                    therapist={selectedTherapist}
                />
            )}
        </div>
    );
};

export default TherapistDirectoryPage;