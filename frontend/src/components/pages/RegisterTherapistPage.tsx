import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import AuthLayout from '../ui/AuthLayout';
import { CameraIcon, UserIcon } from '../ui/icons';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const RegisterTherapistPage: React.FC = () => {
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        education: '',
        specialties: '',
        experienceYears: ''
    });
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
            if (!formData.education.trim()) {
                setError('Education is required');
                return;
            }
            if (!formData.specialties.trim()) {
                setError('At least one specialty is required');
                return;
            }
            if (!formData.experienceYears.trim()) {
                setError('Experience years is required');
                return;
            }

            const payload = {
                ...formData,
                specialties: formData.specialties.split(',').map(s => s.trim()).filter(s => s.length > 0),
                experienceYears: Number(formData.experienceYears),
                profileImage
            };
            const response = await api.post('/auth/register/therapist', payload);
            const { token, ...user } = response.data;
            login({ token, user });
            navigate('/app/therapist');
        } catch (err) {
            if (isAxiosError(err)) {
                const errorData = err.response?.data as any;
                // Prefer explicit validation errors
                if (errorData?.errors && Array.isArray(errorData.errors)) {
                    const msgs = errorData.errors.map((e: any) => (typeof e === 'string' ? e : e?.msg || e?.message)).filter(Boolean);
                    if (msgs.length > 0) {
                        setError(msgs.join(', '));
                        return;
                    }
                }
                // Fallback to detail (dev) or message
                setError(errorData?.detail || errorData?.message || 'Registration failed.');
            } else {
                setError('An unexpected error occurred during registration.');
            }
        }
    };

    return (
        <AuthLayout title="Create your Therapist Account">
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
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 bg-blue-600 p-1.5 rounded-full text-white hover:bg-blue-700">
                                <CameraIcon className="w-4 h-4" />
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                        </div>
                    </div>
                <div>
                    <label htmlFor="fullName">Full Name</label>
                    <input id="fullName" type="text" required onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                </div>
                <div>
                    <label htmlFor="email">Email address</label>
                    <input id="email" type="email" required onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                </div>
                 <div>
                    <label htmlFor="education">Education</label>
                    <textarea id="education" rows={2} required onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                </div>
                 <div>
                    <label htmlFor="specialties">Specialties (comma-separated)</label>
                    <input id="specialties" type="text" required onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                </div>
                 <div>
                    <label htmlFor="experienceYears">Years of Experience</label>
                    <input id="experienceYears" type="number" required onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                </div>
                <div>
                    <label htmlFor="password">Password</label>
                    <input id="password" type="password" required onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                </div>
                
                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="pt-2">
                    <button type="submit" className="w-full flex justify-center py-2 px-4 border rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
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

export default RegisterTherapistPage;