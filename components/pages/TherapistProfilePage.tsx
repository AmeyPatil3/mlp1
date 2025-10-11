import React, { useState, useEffect } from 'react';
import { CameraIcon } from '../ui/icons';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const TherapistProfilePage: React.FC = () => {
    const { auth, updateUser } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        education: '',
        specialties: '',
        experienceYears: '',
        profileImage: '',
    });

    useEffect(() => {
        if (auth?.user) {
            setFormData({
                fullName: auth.user.fullName || '',
                email: auth.user.email || '',
                education: auth.user.education || '',
                specialties: (auth.user.specialties || []).join(', '),
                experienceYears: auth.user.experienceYears?.toString() || '',
                profileImage: auth.user.profileImage || 'https://picsum.photos/seed/therapist1/200/200'
            });
        }
    }, [auth]);
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 500;
                const MAX_HEIGHT = 500;
                let { width, height } = img;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;
                ctx.drawImage(img, 0, 0, width, height);
                const resizedBase64 = canvas.toDataURL('image/jpeg', 0.8);
                setFormData({ ...formData, profileImage: resizedBase64 });
            };
        };
        reader.readAsDataURL(file);
    };

    const handleSaveChanges = async () => {
        try {
            const { data } = await api.put('/therapists/profile', formData);
            updateUser(data);
            setIsEditing(false);
        } catch (error) {
            console.error('Failed to update profile:', error);
        }
    };

    return (
        <div>
            <h1 className="text-4xl font-bold">Your Professional Profile</h1>
            <p className="mt-2 text-lg text-gray-600">Keep your information up to date.</p>

            <div className="mt-8 bg-white rounded-xl shadow-md p-8">
                 <div className="flex justify-center mb-6">
                     <div className="relative">
                        <img src={formData.profileImage} alt="Profile" className="w-32 h-32 rounded-full object-cover" />
                         {isEditing && (
                            <label htmlFor="profile-upload" className="absolute bottom-0 right-0 bg-blue-600 p-2 rounded-full text-white cursor-pointer">
                                <CameraIcon className="w-5 h-5" />
                                <input id="profile-upload" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                            </label>
                         )}
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium">Full Name</label>
                            <input name="fullName" value={formData.fullName} onChange={handleInputChange} readOnly={!isEditing} className={`mt-1 w-full p-2 border rounded-md ${isEditing ? 'border-gray-300' : 'bg-gray-100 border-transparent'}`} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Email Address</label>
                            <input name="email" value={formData.email} readOnly className="mt-1 w-full p-2 border rounded-md bg-gray-100 border-transparent text-gray-500" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Education</label>
                        <input name="education" value={formData.education} onChange={handleInputChange} readOnly={!isEditing} className={`mt-1 w-full p-2 border rounded-md ${isEditing ? 'border-gray-300' : 'bg-gray-100 border-transparent'}`} />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium">Specialties (comma-separated)</label>
                            <input name="specialties" value={formData.specialties} onChange={handleInputChange} readOnly={!isEditing} className={`mt-1 w-full p-2 border rounded-md ${isEditing ? 'border-gray-300' : 'bg-gray-100 border-transparent'}`} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Years of Experience</label>
                            <input name="experienceYears" type="number" value={formData.experienceYears} onChange={handleInputChange} readOnly={!isEditing} className={`mt-1 w-full p-2 border rounded-md ${isEditing ? 'border-gray-300' : 'bg-gray-100 border-transparent'}`} />
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t flex justify-end space-x-3">
                     {isEditing ? (
                        <>
                            <button onClick={() => setIsEditing(false)} className="bg-gray-200 font-semibold py-2 px-4 rounded-lg">Cancel</button>
                            <button onClick={handleSaveChanges} className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg">Save Changes</button>
                        </>
                    ) : (
                        <button onClick={() => setIsEditing(true)} className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg">Edit Profile</button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TherapistProfilePage;