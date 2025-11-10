import React, { useState, useEffect } from 'react';
import { CameraIcon } from '../ui/icons';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const ProfilePage: React.FC = () => {
    const { auth, updateUser } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        mobile: '',
        profileImage: ''
    });

    useEffect(() => {
        if (auth?.user) {
            setFormData({
                fullName: auth.user.fullName || '',
                email: auth.user.email || '',
                mobile: auth.user.mobile || '',
                profileImage: auth.user.profileImage || 'https://picsum.photos/seed/avatar1/200/200'
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
                // Auto-upload image immediately
                (async () => {
                    try {
                        const { data } = await api.put('/users/profile', { profileImage: resizedBase64 });
                        const updatedUser = (data && data.user) ? data.user : data;
                        if (updatedUser) {
                            updateUser(updatedUser);
                        }
                    } catch (err) {
                        console.error('Failed to upload profile image:', err);
                    }
                })();
            };
        };
        reader.readAsDataURL(file);
    };
    
    const handleSaveChanges = async () => {
        try {
            const { data } = await api.put('/users/profile', {
                fullName: formData.fullName,
                mobile: formData.mobile,
                profileImage: formData.profileImage
            });
            const updatedUser = (data && data.user) ? data.user : data;
            if (updatedUser) {
                updateUser(updatedUser);
            }
            setIsEditing(false);
        } catch (error) {
            console.error('Failed to update profile:', error);
            // Optionally, show an error message to the user
        }
    };

    return (
        <div>
            <h1 className="text-4xl font-bold">Your Profile</h1>
            <p className="mt-2 text-lg text-gray-600">Manage your personal information.</p>
            
            <div className="mt-8 bg-white rounded-xl shadow-md p-8">
                <div className="grid md:grid-cols-3 gap-8 items-center">
                    <div className="flex flex-col items-center md:items-start">
                         <div className="relative">
                            <img src={formData.profileImage} alt="Profile" className="w-32 h-32 rounded-full object-cover" />
                             {isEditing && (
                                <>
                                    <label htmlFor="profile-upload" className="absolute bottom-0 right-0 bg-blue-600 p-2 rounded-full text-white cursor-pointer">
                                        <CameraIcon className="w-5 h-5" />
                                    </label>
                                    <input id="profile-upload" type="file" onChange={handleImageChange} accept="image/*" className="hidden" />
                                </>
                             )}
                        </div>
                    </div>
                    <div className="md:col-span-2 space-y-4">
                        <div>
                            <label className="block text-sm font-medium">Full Name</label>
                            <input type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} readOnly={!isEditing} className={`mt-1 w-full p-2 border rounded-md ${isEditing ? 'border-gray-300' : 'bg-gray-100 border-transparent'}`} />
                        </div>
                         <div>
                            <label className="block text-sm font-medium">Email Address</label>
                            <input type="email" name="email" value={formData.email} readOnly className="mt-1 w-full p-2 border rounded-md bg-gray-100 border-transparent text-gray-500" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium">Mobile Number</label>
                            <input type="tel" name="mobile" value={formData.mobile} onChange={handleInputChange} readOnly={!isEditing} className={`mt-1 w-full p-2 border rounded-md ${isEditing ? 'border-gray-300' : 'bg-gray-100 border-transparent'}`} />
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

export default ProfilePage;