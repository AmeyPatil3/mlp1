import React, { useState, useEffect, useRef } from 'react';
import { CameraIcon, LockClosedIcon } from '../ui/icons';
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

const ROLE_TYPES = [
    "Clinical Psychologist (RCI Registered)",
    "Psychiatrist (Medical Doctor - NMC Registered)",
    "Counseling Psychologist / Psychotherapist"
];

const LANGUAGES_LIST = ["English", "Hindi", "Bengali", "Telugu", "Marathi", "Tamil", "Gujarati", "Kannada", "Odia", "Malayalam", "Punjabi", "Urdu"];

const SPECIALTIES_LIST = [
    "Academic & Exam Stress (JEE/NEET)",
    "Family Expectations & Intergenerational Conflict",
    "Corporate Burnout & Career Anxiety",
    "Anxiety & Panic Attacks",
    "Depression & Low Mood",
    "Inter-caste & Inter-faith Relationship Counseling",
    "LGBTQIA+ Affirmative Therapy",
    "Trauma & Grief Support"
];

const TherapistProfilePage: React.FC = () => {
    const { auth, updateUser } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        mobile: '',
        education: '',
        experienceYears: '',
        roleType: 'Counseling Psychologist / Psychotherapist',
        licenseNumber: '',
        stateResidence: '',
        cityResidence: '',
        bio: '',
        profileImage: '',
    });

    const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
    const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
    const [digitalSignature, setDigitalSignature] = useState<string | null>(null);

    // "Other" free-text state for role & specialties
    const [otherRoleType, setOtherRoleType] = useState('');
    const [otherSpecialty, setOtherSpecialty] = useState('');
    const [isOtherSpecialtyChecked, setIsOtherSpecialtyChecked] = useState(false);

    const profileInputRef = useRef<HTMLInputElement>(null);
    const signatureInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchTherapistProfile = async () => {
            try {
                setIsLoading(true);
                const response = await api.get('/therapists/profile');
                if (response.data?.success && response.data.therapist) {
                    const t = response.data.therapist;

                    // Detect if saved roleType is a non-standard (custom) value
                    const savedRole = t.roleType || 'Counseling Psychologist / Psychotherapist';
                    const isCustomRole = savedRole && ![
                        'Clinical Psychologist (RCI Registered)',
                        'Psychiatrist (Medical Doctor - NMC Registered)',
                        'Counseling Psychologist / Psychotherapist'
                    ].includes(savedRole);

                    // Detect if any saved specialty is a custom (non-standard) value
                    const savedSpecialties: string[] = t.specialties || [];
                    const KNOWN_SPECS = [
                        'Academic & Exam Stress (JEE/NEET)',
                        'Family Expectations & Intergenerational Conflict',
                        'Corporate Burnout & Career Anxiety',
                        'Anxiety & Panic Attacks',
                        'Depression & Low Mood',
                        'Inter-caste & Inter-faith Relationship Counseling',
                        'LGBTQIA+ Affirmative Therapy',
                        'Trauma & Grief Support'
                    ];
                    const standardSpecialties = savedSpecialties.filter(s => KNOWN_SPECS.includes(s));
                    const customSpecialty = savedSpecialties.find(s => !KNOWN_SPECS.includes(s)) || '';

                    setFormData({
                        fullName: t.user?.fullName || auth?.user?.fullName || '',
                        email: t.user?.email || auth?.user?.email || '',
                        mobile: t.user?.mobile || auth?.user?.mobile || '',
                        education: t.education || '',
                        experienceYears: t.experienceYears?.toString() || '',
                        roleType: isCustomRole ? '__other__' : savedRole,
                        licenseNumber: t.licenseNumber || '',
                        stateResidence: t.stateResidence || '',
                        cityResidence: t.cityResidence || '',
                        bio: t.bio || '',
                        profileImage: t.user?.profileImage || auth?.user?.profileImage || 'https://i.pravatar.cc/150'
                    });
                    if (isCustomRole) setOtherRoleType(savedRole);
                    setSelectedLanguages(t.languagesSpoken || []);
                    setSelectedSpecialties(standardSpecialties);
                    if (customSpecialty) {
                        setIsOtherSpecialtyChecked(true);
                        setOtherSpecialty(customSpecialty);
                    }
                    setDigitalSignature(t.digitalSignature || null);
                }
            } catch (err) {
                console.error('Failed to load therapist profile details:', err);
                setError('Failed to fetch full profile details from server.');
                // Fallback to local auth context if server call fails
                if (auth?.user) {
                    setFormData(prev => ({
                        ...prev,
                        fullName: auth.user.fullName || '',
                        email: auth.user.email || '',
                        mobile: auth.user.mobile || '',
                        profileImage: auth.user.profileImage || 'https://i.pravatar.cc/150',
                    }));
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchTherapistProfile();
    }, [auth]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedState = e.target.value;
        setFormData(prev => ({
            ...prev,
            stateResidence: selectedState,
            cityResidence: '' // reset city
        }));
    };

    const handleLanguageToggle = (lang: string) => {
        setSelectedLanguages(prev => 
            prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
        );
    };

    const handleSpecialtyToggle = (spec: string) => {
        setSelectedSpecialties(prev => 
            prev.includes(spec) ? prev.filter(s => s !== spec) : [...prev, spec]
        );
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, isSignature = false) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            setError('Image size must be less than 5MB');
            return;
        }

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
                    if (!ctx) return;
                    ctx.drawImage(img, 0, 0, width, height);
                    const resizedBase64 = canvas.toDataURL('image/jpeg', 0.8);
                    
                    if (isSignature) {
                        setDigitalSignature(resizedBase64);
                    } else {
                        setFormData(prev => ({ ...prev, profileImage: resizedBase64 }));
                        // Auto-upload user avatar profile immediately if editing
                        if (!isEditing) {
                            (async () => {
                                try {
                                    const { data } = await api.put('/users/profile', { profileImage: resizedBase64 });
                                    const updatedUser = data?.user || data;
                                    if (updatedUser) {
                                        updateUser(updatedUser);
                                    }
                                } catch (err) {
                                    console.error('Failed to auto-upload avatar image:', err);
                                }
                            })();
                        }
                    }
                    setError('');
                } catch (err) {
                    console.error('Failed to process image file:', err);
                    setError('Failed to process selected image.');
                }
            };
        };
        reader.readAsDataURL(file);
    };

    const handleSaveChanges = async () => {
        try {
            setError('');
            
            // Front-end validations
            if (!formData.fullName.trim()) {
                setError('Full name is required');
                return;
            }
            if (!formData.mobile.trim()) {
                setError('Mobile number is required');
                return;
            }
            const phoneRegex = /^[0-9+\-\s()]{10,15}$/;
            if (!phoneRegex.test(formData.mobile.trim())) {
                setError('Please enter a valid mobile number (10-15 digits)');
                return;
            }
            if (!formData.education.trim()) {
                setError('Educational qualification details are required');
                return;
            }
            if (formData.education.trim().length < 10) {
                setError('Education details must be at least 10 characters long');
                return;
            }
            if (!formData.experienceYears.trim() || isNaN(Number(formData.experienceYears))) {
                setError('Valid years of experience is required');
                return;
            }
            const exp = Number(formData.experienceYears);
            if (exp < 0 || exp > 50) {
                setError('Experience years must be between 0 and 50');
                return;
            }
            if (selectedSpecialties.length === 0) {
                setError('Please select at least one specialty');
                return;
            }
            if (selectedLanguages.length === 0) {
                setError('Please select at least one spoken language');
                return;
            }
            if (!formData.stateResidence) {
                setError('State of practice is required');
                return;
            }
            if (!formData.cityResidence) {
                setError('City of practice is required');
                return;
            }

            // Resolve final roleType (custom or standard)
            const resolvedRoleType = formData.roleType === '__other__' ? otherRoleType.trim() : formData.roleType;
            if (formData.roleType === '__other__' && !otherRoleType.trim()) {
                setError('Please specify your professional role classification');
                return;
            }
            const isRegulated = resolvedRoleType.includes('Clinical') || resolvedRoleType.includes('Psychiatrist');
            if (isRegulated && !formData.licenseNumber.trim()) {
                setError(`Valid license or registration number is required for ${resolvedRoleType}`);
                return;
            }

            // Merge custom specialty if provided
            const finalSpecialties = [
                ...selectedSpecialties,
                ...(isOtherSpecialtyChecked && otherSpecialty.trim() ? [otherSpecialty.trim()] : [])
            ];
            if (finalSpecialties.length === 0) {
                setError('Please select at least one specialty');
                return;
            }

            // 1. Update user profile fields (fullName/profileImage/stateResidence/cityResidence/mobile)
            const userPayload = {
                fullName: formData.fullName,
                profileImage: formData.profileImage,
                stateResidence: formData.stateResidence,
                cityResidence: formData.cityResidence,
                mobile: formData.mobile
            };
            const userRes = await api.put('/users/profile', userPayload);

            // 2. Update therapist-specific fields
            const therapistPayload = {
                education: formData.education,
                experienceYears: Number(formData.experienceYears),
                specialties: finalSpecialties,
                languagesSpoken: selectedLanguages,
                roleType: resolvedRoleType,
                licenseNumber: formData.licenseNumber,
                digitalSignature: digitalSignature || '',
                stateResidence: formData.stateResidence,
                cityResidence: formData.cityResidence,
                bio: formData.bio
            };
            const therapistRes = await api.put('/therapists/profile', therapistPayload);

            // 3. Update local auth context
            const updatedUser = {
                ...(auth?.user || {}),
                ...(userRes.data?.user || {}),
                education: therapistRes.data?.therapist?.education || formData.education,
                specialties: therapistRes.data?.therapist?.specialties || selectedSpecialties,
                experienceYears: therapistRes.data?.therapist?.experienceYears || Number(formData.experienceYears),
            };
            updateUser(updatedUser);

            setSuccessMessage('Your professional profile was updated successfully!');
            setIsEditing(false);
            setTimeout(() => setSuccessMessage(''), 4000);
        } catch (err) {
            console.error('Failed to update therapist profile:', err);
            setError('Failed to save profile changes. Please verify all inputs and try again.');
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="mt-4 text-sm text-gray-500 font-medium">Retrieving professional profile details...</p>
            </div>
        );
    }

    const availableCities = formData.stateResidence ? INDIAN_STATES_CITIES[formData.stateResidence] : [];

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-fadeIn">
            {/* Header section with gradient banner */}
            <div className="relative bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="h-32 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-700 w-full" />
                <div className="px-6 pb-6 pt-16 md:pt-6 relative flex flex-col md:flex-row items-center md:items-start md:space-x-6">
                    {/* Profile avatar overlay */}
                    <div className="absolute -top-16 md:-top-12 left-1/2 md:left-6 transform -translate-x-1/2 md:translate-x-0 relative">
                        <div className="w-28 h-28 rounded-full border-4 border-white bg-white shadow-md overflow-hidden flex items-center justify-center">
                            <img src={formData.profileImage} alt="Profile" className="w-full h-full object-cover" />
                        </div>
                        {isEditing && (
                            <button 
                                type="button" 
                                onClick={() => profileInputRef.current?.click()} 
                                className="absolute bottom-0 right-0 bg-blue-600 p-2 rounded-full text-white hover:bg-blue-700 shadow-md transition-all scale-90"
                            >
                                <CameraIcon className="w-4 h-4" />
                            </button>
                        )}
                        <input type="file" ref={profileInputRef} onChange={(e) => handleImageChange(e, false)} accept="image/*" className="hidden" />
                    </div>

                    <div className="flex-1 text-center md:text-left mt-4 md:mt-0 space-y-2">
                        <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-3">
                            <h1 className="text-2xl font-bold text-gray-900">{formData.fullName || 'MindLink Practitioner'}</h1>
                        </div>
                        <p className="text-sm font-semibold text-indigo-600 tracking-wide uppercase">{formData.roleType}</p>
                        <p className="text-xs text-gray-500 flex items-center justify-center md:justify-start space-x-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                            </svg>
                            <span>{formData.cityResidence ? `${formData.cityResidence}, ` : ''}{formData.stateResidence || 'Practice location not set'}</span>
                        </p>
                    </div>

                    <div className="mt-6 md:mt-0 flex space-x-2">
                        {isEditing ? (
                            <>
                                <button 
                                    onClick={() => { setIsEditing(false); setError(''); }} 
                                    className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleSaveChanges} 
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all"
                                >
                                    Save Profile
                                </button>
                            </>
                        ) : (
                            <button 
                                onClick={() => setIsEditing(true)} 
                                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all"
                            >
                                Edit Profile
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Alert Messages */}
            {successMessage && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 text-sm font-medium flex items-center shadow-sm animate-fadeIn">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-500 mr-2.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {successMessage}
                </div>
            )}
            {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 text-sm font-medium flex items-center shadow-sm animate-fadeIn">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-rose-500 mr-2.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {error}
                </div>
            )}

            {/* Main content split panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* LEFT PANEL: Identity & Regulatory Credentials */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* Card 1: Account & Regional Credentials */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
                        <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                            <h3 className="text-md font-bold text-gray-800 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                Practitioner Identity & Role
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Full Legal Name</label>
                                <input 
                                    name="fullName" 
                                    value={formData.fullName} 
                                    onChange={handleInputChange} 
                                    readOnly={!isEditing} 
                                    className={`mt-1.5 w-full p-2.5 border rounded-lg text-sm transition-all ${
                                        isEditing 
                                            ? 'border-gray-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600' 
                                            : 'bg-gray-50 border-transparent text-gray-700 cursor-not-allowed'
                                    }`} 
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                                    <span>Email Address</span>
                                    <LockClosedIcon className="h-3 w-3 text-gray-400" />
                                </label>
                                <input 
                                    name="email" 
                                    value={formData.email} 
                                    readOnly 
                                    className="mt-1.5 w-full p-2.5 border border-transparent rounded-lg text-sm bg-gray-50 text-gray-400 cursor-not-allowed flex items-center" 
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Mobile Number</label>
                                <input 
                                    name="mobile" 
                                    value={formData.mobile} 
                                    onChange={handleInputChange} 
                                    readOnly={!isEditing} 
                                    className={`mt-1.5 w-full p-2.5 border rounded-lg text-sm transition-all ${
                                        isEditing 
                                            ? 'border-gray-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600' 
                                            : 'bg-gray-50 border-transparent text-gray-700 cursor-not-allowed'
                                    }`} 
                                />
                            </div>
                            <div /> {/* Spacer */}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">State of Practice</label>
                                {isEditing ? (
                                    <select
                                        name="stateResidence"
                                        value={formData.stateResidence}
                                        onChange={handleStateChange}
                                        className="mt-1.5 w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                                    >
                                        <option value="">Select State</option>
                                        {Object.keys(INDIAN_STATES_CITIES).map(state => (
                                            <option key={state} value={state}>{state}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input 
                                        value={formData.stateResidence || 'Not Configured'} 
                                        readOnly 
                                        className="mt-1.5 w-full p-2.5 border border-transparent rounded-lg text-sm bg-gray-50 text-gray-700 cursor-not-allowed" 
                                    />
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">City of Practice</label>
                                {isEditing ? (
                                    <select
                                        name="cityResidence"
                                        value={formData.cityResidence}
                                        onChange={handleInputChange}
                                        disabled={!formData.stateResidence}
                                        className="mt-1.5 w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 disabled:bg-gray-50 disabled:text-gray-400"
                                    >
                                        <option value="">Select City</option>
                                        {availableCities.map(city => (
                                            <option key={city} value={city}>{city}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input 
                                        value={formData.cityResidence || 'Not Configured'} 
                                        readOnly 
                                        className="mt-1.5 w-full p-2.5 border border-transparent rounded-lg text-sm bg-gray-50 text-gray-700 cursor-not-allowed" 
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Card 2: Academic Qualifications & Licenses */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
                        <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                            <h3 className="text-md font-bold text-gray-800 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                                Qualifications & License Credentials
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Role Classification</label>
                                {isEditing ? (
                                    <>
                                        <select
                                            name="roleType"
                                            value={formData.roleType}
                                            onChange={handleInputChange}
                                            className="mt-1.5 w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                                        >
                                            {ROLE_TYPES.map(role => (
                                                <option key={role} value={role}>{role}</option>
                                            ))}
                                            <option value="__other__">Other (specify below)</option>
                                        </select>
                                        {formData.roleType === '__other__' && (
                                            <input
                                                type="text"
                                                value={otherRoleType}
                                                onChange={(e) => setOtherRoleType(e.target.value)}
                                                placeholder="e.g. Child & Adolescent Psychiatrist, Neuropsychologist..."
                                                className="mt-2 w-full p-2.5 border border-blue-300 rounded-lg text-sm bg-blue-50 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                                            />
                                        )}
                                    </>
                                ) : (
                                    <input 
                                        value={formData.roleType === '__other__' ? otherRoleType : formData.roleType} 
                                        readOnly 
                                        className="mt-1.5 w-full p-2.5 border border-transparent rounded-lg text-sm bg-gray-50 text-indigo-700 font-medium cursor-not-allowed" 
                                    />
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    {formData.roleType.includes('Clinical') 
                                        ? 'RCI CRR Registration Number' 
                                        : formData.roleType.includes('Psychiatrist') 
                                            ? 'NMC / SMC Registration Number' 
                                            : 'License / Registration Number (Optional)'}
                                </label>
                                <input 
                                    name="licenseNumber" 
                                    value={formData.licenseNumber} 
                                    onChange={handleInputChange} 
                                    readOnly={!isEditing} 
                                    placeholder={formData.roleType.includes('Counseling') ? 'N/A' : 'e.g. CRR-A20459'}
                                    className={`mt-1.5 w-full p-2.5 border rounded-lg text-sm transition-all ${
                                        isEditing 
                                            ? 'border-gray-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600' 
                                            : 'bg-gray-50 border-transparent text-gray-700 cursor-not-allowed'
                                    }`} 
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Years of Experience</label>
                                <input 
                                    name="experienceYears" 
                                    type="number" 
                                    value={formData.experienceYears} 
                                    onChange={handleInputChange} 
                                    readOnly={!isEditing} 
                                    className={`mt-1.5 w-full p-2.5 border rounded-lg text-sm transition-all ${
                                        isEditing 
                                            ? 'border-gray-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600' 
                                            : 'bg-gray-50 border-transparent text-gray-700 cursor-not-allowed'
                                    }`} 
                                />
                            </div>

                            <div />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Educational Qualification Details</label>
                            <textarea 
                                name="education" 
                                rows={2} 
                                value={formData.education} 
                                onChange={handleInputChange} 
                                readOnly={!isEditing} 
                                placeholder="Enter academic achievements (e.g. M.Phil in Clinical Psychology from NIMHANS)"
                                className={`mt-1.5 w-full p-2.5 border rounded-lg text-sm transition-all ${
                                    isEditing 
                                        ? 'border-gray-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600' 
                                        : 'bg-gray-50 border-transparent text-gray-700 cursor-not-allowed'
                                }`} 
                            />
                        </div>
                    </div>
                </div>

                {/* RIGHT PANEL: Specializations, Spoken Languages & Signature Card */}
                <div className="space-y-6">
                    
                    {/* Spoken Languages & Specialties Badge List */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
                        <div className="border-b border-gray-100 pb-2">
                            <h3 className="text-md font-bold text-gray-800 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 002 2h1.5A2.5 2.5 0 0019 9.5V8a.5.5 0 00-.5-.5h-1a1.5 1.5 0 01-1.5-1.5V5.5A2.5 2.5 0 0013.5 3h-1.164" />
                                </svg>
                                Vernacular Languages
                            </h3>
                        </div>

                        {isEditing ? (
                            <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto border border-gray-200 p-2.5 rounded-lg bg-gray-50">
                                {LANGUAGES_LIST.map(lang => (
                                    <label key={lang} className="flex items-center space-x-2 text-xs text-gray-700 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedLanguages.includes(lang)}
                                            onChange={() => handleLanguageToggle(lang)}
                                            className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <span>{lang}</span>
                                    </label>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-1.5">
                                {selectedLanguages.length > 0 ? (
                                    selectedLanguages.map(lang => (
                                        <span key={lang} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                                            {lang}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-xs text-gray-400 italic">No spoken languages set.</span>
                                )}
                            </div>
                        )}

                        <div className="border-b border-gray-100 pt-3 pb-2">
                            <h3 className="text-md font-bold text-gray-800 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                                Clinical Specializations
                            </h3>
                        </div>

                        {isEditing ? (
                            <>
                                <div className="grid grid-cols-1 gap-2 max-h-36 overflow-y-auto border border-gray-200 p-2.5 rounded-lg bg-gray-50">
                                    {SPECIALTIES_LIST.map(spec => (
                                        <label key={spec} className="flex items-start space-x-2 text-xs text-gray-700 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selectedSpecialties.includes(spec)}
                                                onChange={() => handleSpecialtyToggle(spec)}
                                                className="mt-0.5 h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            />
                                            <span>{spec}</span>
                                        </label>
                                    ))}
                                    {/* Other option */}
                                    <label className="flex items-start space-x-2 text-xs text-blue-600 font-semibold cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={isOtherSpecialtyChecked}
                                            onChange={(e) => {
                                                setIsOtherSpecialtyChecked(e.target.checked);
                                                if (!e.target.checked) setOtherSpecialty('');
                                            }}
                                            className="mt-0.5 h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <span>Other (specify below)</span>
                                    </label>
                                </div>
                                {isOtherSpecialtyChecked && (
                                    <input
                                        type="text"
                                        value={otherSpecialty}
                                        onChange={(e) => setOtherSpecialty(e.target.value)}
                                        placeholder="e.g. Geriatric Mental Health, Sports Psychology..."
                                        className="mt-2 w-full p-2.5 border border-blue-300 rounded-lg text-sm bg-blue-50 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                                    />
                                )}
                            </>
                        ) : (
                            <div className="flex flex-wrap gap-1.5">
                                {selectedSpecialties.length > 0 ? (
                                    selectedSpecialties.map(spec => (
                                        <span key={spec} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                                            {spec}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-xs text-gray-400 italic">No specialties set.</span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Practitioner Bio Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
                        <div className="border-b border-gray-100 pb-2">
                            <h3 className="text-md font-bold text-gray-800 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                Clinical Biography
                            </h3>
                        </div>

                        {isEditing ? (
                            <textarea
                                name="bio"
                                rows={4}
                                value={formData.bio}
                                onChange={handleInputChange}
                                placeholder="Describe your clinical practice philosophy, focus, or client approach..."
                                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                            />
                        ) : (
                            <p className="text-xs text-gray-600 leading-relaxed italic bg-gray-50 p-3 rounded-lg border border-gray-100">
                                {formData.bio || "No biography provided yet. Add details about your therapeutic style in Edit mode."}
                            </p>
                        )}
                    </div>

                    {/* RCI/NMC Digital Signature Attestation Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4 text-center">
                        <div className="border-b border-gray-100 pb-2 text-left">
                            <h3 className="text-md font-bold text-gray-800 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                                Official Attestation
                            </h3>
                        </div>

                        <div className="flex flex-col items-center py-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                            <div className="relative">
                                <div className="w-44 h-20 bg-white flex items-center justify-center overflow-hidden border border-gray-200 shadow-sm rounded-lg">
                                    {digitalSignature ? (
                                        <img src={digitalSignature} alt="Digital Signature" className="w-full h-full object-contain" />
                                    ) : (
                                        <span className="text-xs text-gray-400 italic font-medium">No Signature Uploaded</span>
                                    )}
                                </div>
                                {isEditing && (
                                    <button 
                                        type="button" 
                                        onClick={() => signatureInputRef.current?.click()} 
                                        className="absolute bottom-1 right-1 bg-blue-600 p-1.5 rounded-full text-white hover:bg-blue-700 shadow-md transition-all scale-90"
                                    >
                                        <CameraIcon className="w-4 h-4" />
                                    </button>
                                )}
                                <input type="file" ref={signatureInputRef} onChange={(e) => handleImageChange(e, true)} accept="image/*" className="hidden" />
                            </div>
                            <span className="text-[10px] text-gray-400 mt-3 font-semibold uppercase tracking-wider">
                                Legal Digitized Signature
                            </span>
                            <span className="text-[9px] text-gray-400 px-4 mt-1 font-medium leading-normal">
                                Used solely for signing clinical consultation summaries and records.
                            </span>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
};

export default TherapistProfilePage;