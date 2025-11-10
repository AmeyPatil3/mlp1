import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import AuthLayout from '../ui/AuthLayout';
import { CameraIcon, UserIcon } from '../ui/icons';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const RegisterUserPage: React.FC = () => {
    const [formData, setFormData] = useState({ fullName: '', email: '', mobile: '', password: '' });
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setError('Image size must be less than 5MB');
            return;
        }

        // Check file type
        if (!file.type.startsWith('image/')) {
            setError('Please select a valid image file');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                try {
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
                    if (!ctx) {
                        setError('Failed to process image');
                        return;
                    }
                    ctx.drawImage(img, 0, 0, width, height);
                    const resizedBase64 = canvas.toDataURL('image/jpeg', 0.8);
                    setProfileImage(resizedBase64);
                    setError(''); // Clear any previous errors
                } catch (error) {
                    console.error('Image processing error:', error);
                    setError('Failed to process image');
                }
            };
            img.onerror = () => {
                setError('Invalid image file');
            };
        };
        reader.onerror = () => {
            setError('Failed to read image file');
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            // Validate required fields
            if (!formData.fullName.trim()) {
                setError('Full name is required');
                return;
            }
            if (!formData.email.trim()) {
                setError('Email is required');
                return;
            }
            if (!formData.password.trim()) {
                setError('Password is required');
                return;
            }
            if (!formData.mobile.trim()) {
                setError('Mobile number is required');
                return;
            }

            const response = await api.post('/auth/register/user', { ...formData, profileImage });
            const { token, ...user } = response.data;
            login({ token, user });
            navigate('/app/member');
        } catch (err) {
            if (isAxiosError(err)) {
                const errorData = err.response?.data;
                if (errorData?.errors && Array.isArray(errorData.errors)) {
                    // Show specific validation errors
                    const errorMessages = errorData.errors.map((error: any) => error.msg).join(', ');
                    setError(errorMessages);
                } else {
                    setError(errorData?.message || 'Registration failed.');
                }
            } else {
                setError('An unexpected error occurred during registration.');
            }
        }
    };

    return (
        <AuthLayout title="Create your Member Account">
            <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="flex justify-center">
                    <div className="relative">
                        <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                            {profileImage ? (
                                <img src={profileImage} alt="Profile preview" className="w-full h-full object-cover" />
                            ) : (
                                <UserIcon className="w-16 h-16 text-gray-400" />
                            )}
                        </div>
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 bg-blue-600 p-1.5 rounded-full text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                            <CameraIcon className="w-4 h-4" />
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                    </div>
                </div>

                <div>
                    <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">Full Name</label>
                    <input id="fullName" type="text" required onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email address</label>
                    <input id="email" type="email" required onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                    <label htmlFor="mobile" className="block text-sm font-medium text-gray-700">Mobile Number</label>
                    <input id="mobile" type="tel" required onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                    <input id="password" type="password" required onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                </div>
                
                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="pt-2">
                    <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                        Create Account
                    </button>
                </div>
            </form>
            <p className="mt-4 text-center text-sm text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                    Sign in
                </Link>
            </p>
        </AuthLayout>
    );
};

export default RegisterUserPage;