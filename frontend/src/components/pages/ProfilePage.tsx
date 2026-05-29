import React, { useState, useEffect, useRef } from 'react';
import { CameraIcon } from '../ui/icons';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const INDIAN_STATES_CITIES: Record<string, string[]> = {
    "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Thane", "Nashik"],
    "Karnataka": ["Bengaluru", "Mysore", "Hubli", "Mangalore", "Belgaum"],
    "Delhi": ["New Delhi", "Dwarka", "Saket", "Vasant Kunj", "Rohini"],
    "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Trichy", "Salem"],
    "Telangana": ["Hyderabad", "Secunderabad", "Warangal", "Nizamabad", "Khammam"],
    "West Bengal": ["Kolkata", "Howrah", "Darjeeling", "Siliguri", "Asansol"],
    "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Gandhinagar"],
    "Uttar Pradesh": ["Noida", "Lucknow", "Kanpur", "Agra", "Varanasi"],
    "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer"]
};

const PRIMARY_CONCERNS = [
    "JEE/NEET Prep Stress & Academic Pressure",
    "Family Expectations & Parental Pressure",
    "Corporate Burnout & Career Anxiety",
    "Anxiety, Panic Attacks & Overthinking",
    "Depression, Loneliness & Low Mood",
    "Relationship, Marriage & Codependency Issues",
    "Self-Esteem & Identity Discovery"
];

// Icons
const TabUserIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);

const TabShieldIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
);

const TabSafetyIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
);

const TabGoalsIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
);

const ProfilePage: React.FC = () => {
    const { auth, updateUser } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [activeTab, setActiveTab] = useState<'personal' | 'privacy' | 'safety' | 'clinical'>('personal');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        mobile: '',
        profileImage: '',
        anonymousAlias: '',
        isAnonymousEnabled: false,
        stateResidence: '',
        cityResidence: '',
        primaryConcern: '',
        emergencyContactName: '',
        emergencyContactRelation: '',
        emergencyContactMobile: ''
    });

    useEffect(() => {
        if (auth?.user) {
            setFormData({
                fullName: auth.user.fullName || '',
                email: auth.user.email || '',
                mobile: auth.user.mobile || '',
                profileImage: auth.user.profileImage || 'https://picsum.photos/seed/avatar1/200/200',
                anonymousAlias: auth.user.anonymousAlias || '',
                isAnonymousEnabled: auth.user.isAnonymousEnabled || false,
                stateResidence: auth.user.stateResidence || '',
                cityResidence: auth.user.cityResidence || '',
                primaryConcern: auth.user.primaryConcern || '',
                emergencyContactName: auth.user.emergencyContact?.name || '',
                emergencyContactRelation: auth.user.emergencyContact?.relation || '',
                emergencyContactMobile: auth.user.emergencyContact?.mobile || ''
            });
        }
    }, [auth]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.checked });
    };

    const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFormData({
            ...formData,
            stateResidence: e.target.value,
            cityResidence: '' // reset city
        });
    };

    const handleGenerateAlias = () => {
        const prefixes = ['Calm', 'Peaceful', 'Serene', 'Gentle', 'Quiet', 'Tranquil', 'Brave', 'Resilient', 'Smiling', 'Cozy', 'Warm', 'Bright', 'Kind', 'Mindful', 'Healing'];
        const nouns = ['River', 'Soul', 'Spirit', 'Lotus', 'Sparrow', 'Pebble', 'Meadow', 'Breeze', 'Mountain', 'Wave', 'Cloud', 'Seed', 'Forest', 'Deer', 'Panda'];
        const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
        const randomNumber = Math.floor(Math.random() * 90) + 10;
        setFormData(prev => ({
            ...prev,
            anonymousAlias: `${randomPrefix}${randomNoun}${randomNumber}`
        }));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            setError('Image size must be less than 5MB');
            return;
        }

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
                
                setFormData(prev => ({ ...prev, profileImage: resizedBase64 }));
                
                // Auto-upload image immediately
                (async () => {
                    try {
                        const { data } = await api.put('/users/profile', { profileImage: resizedBase64 });
                        const updatedUser = (data && data.user) ? data.user : data;
                        if (updatedUser) {
                            updateUser(updatedUser);
                            setSuccessMessage('Profile photo updated successfully!');
                            setTimeout(() => setSuccessMessage(''), 3000);
                        }
                    } catch (err) {
                        console.error('Failed to upload profile image:', err);
                        setError('Failed to save profile picture');
                    }
                })();
            };
        };
        reader.readAsDataURL(file);
    };
    
    const handleSaveChanges = async () => {
        setError('');
        setSuccessMessage('');

        if (!formData.fullName.trim()) {
            setError('Full name is required');
            return;
        }

        // Validate Mobile Numbers (Indian 10 digits check)
        let formattedMobile = formData.mobile;
        if (!formattedMobile.startsWith('+91')) {
            const cleanMobile = formattedMobile.replace(/\D/g, '');
            const last10 = cleanMobile.slice(-10);
            if (last10.length < 10) {
                setError('Please provide a valid 10-digit mobile number');
                return;
            }
            formattedMobile = `+91${last10}`;
        }

        let formattedEmergencyMobile = formData.emergencyContactMobile;
        if (formattedEmergencyMobile && !formattedEmergencyMobile.startsWith('+91')) {
            const cleanMobile = formattedEmergencyMobile.replace(/\D/g, '');
            const last10 = cleanMobile.slice(-10);
            if (last10.length < 10) {
                setError('Please provide a valid 10-digit emergency contact mobile number');
                return;
            }
            formattedEmergencyMobile = `+91${last10}`;
        }

        try {
            const { data } = await api.put('/users/profile', {
                fullName: formData.fullName,
                mobile: formattedMobile,
                profileImage: formData.profileImage,
                anonymousAlias: formData.anonymousAlias,
                isAnonymousEnabled: formData.isAnonymousEnabled,
                stateResidence: formData.stateResidence,
                cityResidence: formData.cityResidence,
                primaryConcern: formData.primaryConcern,
                emergencyContactName: formData.emergencyContactName,
                emergencyContactRelation: formData.emergencyContactRelation,
                emergencyContactMobile: formattedEmergencyMobile
            });

            const updatedUser = (data && data.user) ? data.user : data;
            if (updatedUser) {
                updateUser(updatedUser);
            }
            setSuccessMessage('Profile updated successfully!');
            setIsEditing(false);
            setTimeout(() => setSuccessMessage(''), 4000);
        } catch (error: any) {
            console.error('Failed to update profile:', error);
            setError(error.response?.data?.message || 'Failed to update profile. Please try again.');
        }
    };

    const availableCities = formData.stateResidence ? INDIAN_STATES_CITIES[formData.stateResidence] : [];

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Your Safe Profile</h1>
                <p className="mt-2 text-lg text-gray-600">Customize your privacy shield, regional settings, and emergency safety net.</p>
            </div>
            
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                {/* Header card area with avatar */}
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-8 py-10 text-white flex flex-col md:flex-row items-center md:space-x-6">
                    <div className="relative">
                        <img 
                            src={formData.profileImage || 'https://picsum.photos/seed/avatar1/200/200'} 
                            alt="Profile" 
                            className="w-28 h-28 rounded-full object-cover border-4 border-white shadow-lg bg-white" 
                        />
                        {isEditing && (
                            <>
                                <label 
                                    htmlFor="profile-upload" 
                                    className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 p-2 rounded-full text-white cursor-pointer shadow-md border border-white"
                                >
                                    <CameraIcon className="w-4 h-4" />
                                </label>
                                <input id="profile-upload" type="file" onChange={handleImageChange} accept="image/*" className="hidden" />
                            </>
                        )}
                    </div>
                    <div className="mt-4 md:mt-0 text-center md:text-left flex-grow">
                        <div className="flex flex-col md:flex-row md:items-center space-y-1 md:space-y-0 md:space-x-3">
                            <h2 className="text-2xl font-bold">{formData.fullName || 'Anonymous User'}</h2>
                            {formData.isAnonymousEnabled && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 self-center">
                                    🛡️ Privacy Shield Active
                                </span>
                            )}
                        </div>
                        <p className="text-blue-100 text-sm mt-1">{formData.email}</p>
                        {formData.isAnonymousEnabled && (
                            <p className="text-xs text-blue-200 mt-1">Displaying as: <strong className="text-white">{formData.anonymousAlias || 'No alias set'}</strong></p>
                        )}
                    </div>
                    <div className="mt-6 md:mt-0">
                        {isEditing ? (
                            <div className="flex space-x-2">
                                <button 
                                    onClick={() => {
                                        setIsEditing(false);
                                        setError('');
                                    }} 
                                    className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold py-2 px-4 rounded-xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleSaveChanges} 
                                    className="bg-white text-blue-600 hover:bg-blue-50 font-semibold py-2 px-5 rounded-xl shadow-md transition-all"
                                >
                                    Save Changes
                                </button>
                            </div>
                        ) : (
                            <button 
                                onClick={() => setIsEditing(true)} 
                                className="bg-white text-blue-600 hover:bg-blue-50 font-semibold py-2 px-6 rounded-xl shadow-md transition-all"
                            >
                                Edit Profile
                            </button>
                        )}
                    </div>
                </div>

                {/* Styled internal tabs */}
                <div className="flex border-b border-gray-100 bg-gray-50 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('personal')}
                        className={`flex items-center space-x-2 py-4 px-6 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${
                            activeTab === 'personal'
                                ? 'border-blue-600 text-blue-600 bg-white'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
                        }`}
                    >
                        <TabUserIcon className="w-4 h-4" />
                        <span>Identity & Location</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('privacy')}
                        className={`flex items-center space-x-2 py-4 px-6 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${
                            activeTab === 'privacy'
                                ? 'border-blue-600 text-blue-600 bg-white'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
                        }`}
                    >
                        <TabShieldIcon className="w-4 h-4" />
                        <span>Privacy Shield</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('safety')}
                        className={`flex items-center space-x-2 py-4 px-6 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${
                            activeTab === 'safety'
                                ? 'border-blue-600 text-blue-600 bg-white'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
                        }`}
                    >
                        <TabSafetyIcon className="w-4 h-4" />
                        <span>Safety Net</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('clinical')}
                        className={`flex items-center space-x-2 py-4 px-6 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${
                            activeTab === 'clinical'
                                ? 'border-blue-600 text-blue-600 bg-white'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
                        }`}
                    >
                        <TabGoalsIcon className="w-4 h-4" />
                        <span>Support Focus</span>
                    </button>
                </div>

                {/* Tab Contents */}
                <div className="p-8">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 text-sm font-medium">
                            ⚠️ {error}
                        </div>
                    )}
                    {successMessage && (
                        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl mb-6 text-sm font-medium">
                            ✨ {successMessage}
                        </div>
                    )}

                    {/* TAB 1: Personal & Location Details */}
                    {activeTab === 'personal' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Personal & Location Profile</h3>
                                <p className="text-sm text-gray-500 mt-1">Keep your contact and regional information updated to get localized Indian support matching.</p>
                            </div>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">Full Legal Name</label>
                                    <input 
                                        type="text" 
                                        name="fullName" 
                                        value={formData.fullName} 
                                        onChange={handleInputChange} 
                                        readOnly={!isEditing} 
                                        className={`mt-2 w-full px-4 py-3 border rounded-xl shadow-sm transition-all sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                                            isEditing ? 'border-gray-300' : 'bg-gray-50 border-gray-100 text-gray-600 cursor-not-allowed'
                                        }`} 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">Email Address</label>
                                    <input 
                                        type="email" 
                                        name="email" 
                                        value={formData.email} 
                                        readOnly 
                                        className="mt-2 w-full px-4 py-3 border border-gray-100 bg-gray-50 text-gray-500 rounded-xl cursor-not-allowed sm:text-sm focus:outline-none" 
                                    />
                                    <span className="text-[10px] text-gray-400 mt-1.5 block">Email address cannot be changed.</span>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">Mobile Number</label>
                                    <div className="mt-2 flex rounded-xl shadow-sm">
                                        <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                                            +91
                                        </span>
                                        <input 
                                            type="tel" 
                                            name="mobile" 
                                            value={formData.mobile.replace('+91', '')} 
                                            onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} 
                                            readOnly={!isEditing} 
                                            className={`flex-1 min-w-0 block w-full px-4 py-3 rounded-r-xl border border-l-0 shadow-sm transition-all sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                                                isEditing ? 'border-gray-300' : 'bg-gray-50 border-gray-100 text-gray-600 cursor-not-allowed'
                                            }`} 
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">State</label>
                                        <select
                                            name="stateResidence"
                                            value={formData.stateResidence}
                                            onChange={handleStateChange}
                                            disabled={!isEditing}
                                            className={`mt-2 block w-full px-3 py-3 border bg-white rounded-xl shadow-sm sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500 disabled:border-gray-100 ${
                                                isEditing ? 'border-gray-300' : 'border-gray-100 text-gray-600'
                                            }`}
                                        >
                                            <option value="">Select State</option>
                                            {Object.keys(INDIAN_STATES_CITIES).map(state => (
                                                <option key={state} value={state}>{state}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">City</label>
                                        <select
                                            name="cityResidence"
                                            value={formData.cityResidence}
                                            onChange={handleInputChange}
                                            disabled={!isEditing || !formData.stateResidence}
                                            className={`mt-2 block w-full px-3 py-3 border bg-white rounded-xl shadow-sm sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-100 ${
                                                isEditing && formData.stateResidence ? 'border-gray-300' : 'border-gray-100 text-gray-600'
                                            }`}
                                        >
                                            <option value="">Select City</option>
                                            {availableCities.map(city => (
                                                <option key={city} value={city}>{city}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: Privacy Shield Settings */}
                    {activeTab === 'privacy' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Stigma Protection Shield</h3>
                                <p className="text-sm text-gray-500 mt-1">Social stigma should never stand between you and mental health. Enable anonymous mode for peer interactions.</p>
                            </div>

                            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
                                <div className="flex items-start">
                                    <div className="flex items-center h-5">
                                        <input
                                            id="isAnonymousEnabled"
                                            name="isAnonymousEnabled"
                                            type="checkbox"
                                            checked={formData.isAnonymousEnabled}
                                            onChange={handleCheckboxChange}
                                            disabled={!isEditing}
                                            className="focus:ring-blue-500 h-5 w-5 text-blue-600 border-gray-300 rounded disabled:opacity-50"
                                        />
                                    </div>
                                    <div className="ml-4 text-sm">
                                        <label htmlFor="isAnonymousEnabled" className="font-bold text-blue-900 text-base">
                                            🛡️ Active Anonymous Shield
                                        </label>
                                        <p className="text-xs text-blue-700 mt-1">When turned on, your real legal name is masked. Therapists can see your profile details during booked 1-on-1 consultations for safety compliance, but group rooms and chats will see your alias.</p>
                                    </div>
                                </div>

                                {formData.isAnonymousEnabled && (
                                    <div className="mt-5 pt-5 border-t border-blue-200/50 space-y-3">
                                        <label className="block text-xs font-semibold text-blue-800 uppercase tracking-wider">Your Anonymous Alias / Display Name</label>
                                        <div className="flex space-x-3 max-w-md">
                                            <input
                                                type="text"
                                                name="anonymousAlias"
                                                value={formData.anonymousAlias}
                                                onChange={handleInputChange}
                                                readOnly={!isEditing}
                                                placeholder="e.g. SereneWave44"
                                                className={`block w-full px-4 py-2.5 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm ${
                                                    isEditing ? 'border-blue-300 bg-white' : 'border-blue-100 bg-blue-100/50 text-blue-800 cursor-not-allowed'
                                                }`}
                                            />
                                            {isEditing && (
                                                <button
                                                    type="button"
                                                    onClick={handleGenerateAlias}
                                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
                                                >
                                                    ✨ Generate
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB 3: Emergency Safety Net */}
                    {activeTab === 'safety' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Emergency Safety Net</h3>
                                <p className="text-sm text-gray-500 mt-1">A secure backup contact. This is purely confidential and only accessed by professionals in extreme clinical distress situations.</p>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">Emergency Contact Name</label>
                                    <input 
                                        type="text" 
                                        name="emergencyContactName" 
                                        value={formData.emergencyContactName} 
                                        onChange={handleInputChange} 
                                        readOnly={!isEditing} 
                                        placeholder="e.g. Suman Sharma"
                                        className={`mt-2 w-full px-4 py-3 border rounded-xl shadow-sm transition-all sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                                            isEditing ? 'border-gray-300' : 'bg-gray-50 border-gray-100 text-gray-600 cursor-not-allowed'
                                        }`} 
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">Relation</label>
                                        <select
                                            name="emergencyContactRelation"
                                            value={formData.emergencyContactRelation}
                                            onChange={handleInputChange}
                                            disabled={!isEditing}
                                            className={`mt-2 block w-full px-3 py-3 border bg-white rounded-xl shadow-sm sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500 disabled:border-gray-100 ${
                                                isEditing ? 'border-gray-300' : 'border-gray-100 text-gray-600'
                                            }`}
                                        >
                                            <option value="">Select Relation</option>
                                            <option value="Parent">Parent</option>
                                            <option value="Spouse">Spouse</option>
                                            <option value="Sibling">Sibling</option>
                                            <option value="Guardian">Guardian</option>
                                            <option value="Friend">Friend</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">Mobile Number</label>
                                        <div className="mt-2 flex rounded-xl shadow-sm">
                                            <span className="inline-flex items-center px-2.5 rounded-l-xl border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-xs">
                                                +91
                                            </span>
                                            <input 
                                                type="tel" 
                                                name="emergencyContactMobile" 
                                                value={formData.emergencyContactMobile.replace('+91', '')} 
                                                onChange={(e) => setFormData({ ...formData, emergencyContactMobile: e.target.value })} 
                                                readOnly={!isEditing} 
                                                placeholder="98765 43210"
                                                className={`flex-1 min-w-0 block w-full px-4 py-3 rounded-r-xl border border-l-0 shadow-sm transition-all sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                                                    isEditing ? 'border-gray-300' : 'bg-gray-50 border-gray-100 text-gray-600 cursor-not-allowed'
                                                }`} 
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 4: Support Focus Clinical Goals */}
                    {activeTab === 'clinical' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Clinical Focus & Objectives</h3>
                                <p className="text-sm text-gray-500 mt-1">Select the primary clinical stress vectors you are dealing with to optimize our matching algorithms.</p>
                            </div>

                            <div className="max-w-xl">
                                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">Primary clinical focus area</label>
                                <select
                                    name="primaryConcern"
                                    value={formData.primaryConcern}
                                    onChange={handleInputChange}
                                    disabled={!isEditing}
                                    className={`mt-2 block w-full px-3 py-3 border bg-white rounded-xl shadow-sm sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500 disabled:border-gray-100 ${
                                        isEditing ? 'border-gray-300' : 'border-gray-100 text-gray-600'
                                    }`}
                                >
                                    <option value="">Select Concern</option>
                                    {PRIMARY_CONCERNS.map(concern => (
                                        <option key={concern} value={concern}>{concern}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;