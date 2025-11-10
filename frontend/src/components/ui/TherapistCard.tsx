import React from 'react';
import type { Therapist } from '../../types';

interface TherapistCardProps {
    therapist: Therapist;
    onBook: (therapist: Therapist) => void;
}

const TherapistCard: React.FC<TherapistCardProps> = ({ therapist, onBook }) => {
    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden transform hover:scale-105 transition-transform duration-300 flex flex-col">
            <img src={therapist.profileImage} alt={therapist.fullName} className="w-full h-56 object-cover" />
            <div className="p-6 flex flex-col flex-grow">
                <h3 className="text-xl font-bold">{therapist.fullName}</h3>
                <p className="text-gray-500 mt-1">{therapist.experienceYears} years of experience</p>
                <div className="mt-4 flex flex-wrap gap-2">
                    {therapist.specialties.map(specialty => (
                        <span key={specialty} className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-1 rounded-full">
                            {specialty}
                        </span>
                    ))}
                </div>
                <div className="mt-auto pt-6">
                    <button 
                        onClick={() => onBook(therapist)}
                        className="w-full bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors duration-300"
                    >
                        Book a Session
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TherapistCard;