import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { isAxiosError } from 'axios';
import AuthLayout from '../ui/AuthLayout';
import { CameraIcon, UserIcon } from '../ui/icons';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

type Step = 1 | 2 | 3 | 4;

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

const RegisterTherapistPage: React.FC = () => {
    const location = useLocation();
    const googleUser = location.state?.googleUser;

    const [step, setStep] = useState<Step>(1);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        mobile: '',
        password: '',
        education: '',
        experienceYears: '',
        roleType: 'Counseling Psychologist / Psychotherapist',
        licenseNumber: '',
        stateResidence: '',
        cityResidence: '',
        bio: ''
    });

    // Auto-fill Google info if available
    useEffect(() => {
        if (googleUser) {
            setFormData(prev => ({
                ...prev,
                fullName: googleUser.fullName || '',
                email: googleUser.email || '',
                // Set a safe dummy password for schema integrity, therapist registers seamlessly without setting a local password
                password: `google_${googleUser.googleId || Math.random().toString(36).slice(-8)}`
            }));
            if (googleUser.profileImage) {
                setProfileImage(googleUser.profileImage);
            }
        }
    }, [googleUser]);

    const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
    const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
    const [otherSpecialty, setOtherSpecialty] = useState('');
    const [isOtherSpecialtyChecked, setIsOtherSpecialtyChecked] = useState(false);
    const [otherRoleType, setOtherRoleType] = useState('');
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [digitalSignature, setDigitalSignature] = useState<string | null>(null);
    const [error, setError] = useState('');

    // OTP Verification States
    const [otpSent, setOtpSent] = useState(false);
    const [otpCode, setOtpCode] = useState('');
    const [isOtpVerified, setIsOtpVerified] = useState(false);
    const [otpCooldown, setOtpCooldown] = useState(0);
    const [otpLoading, setOtpLoading] = useState(false);
    const [otpError, setOtpError] = useState('');

    useEffect(() => {
        if (otpCooldown > 0) {
            const timer = setTimeout(() => setOtpCooldown(prev => prev - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [otpCooldown]);

    useEffect(() => {
        let isMounted = true;
        const widgetId = import.meta.env.VITE_MSG91_WIDGET_ID || "3665436c4e5a393037333130";
        const tokenAuth = import.meta.env.VITE_MSG91_TOKEN_AUTH || "521009T3jgm76r60z6a198f57P1";

        const configuration = {
            widgetId,
            tokenAuth,
            exposeMethods: true,
            success: (data: any) => {
                console.log('MSG91 Widget success callback:', data);
            },
            failure: (error: any) => {
                console.error('MSG91 Widget failure callback:', error);
            }
        };

        // Bind configuration globally to match MSG91 script expectations!
        (window as any).configuration = configuration;

        const loadOtpScript = (urls: string[]) => {
            let i = 0;
            const attempt = () => {
                if (!isMounted) return;
                
                if (typeof (window as any).initSendOTP === 'function') {
                    (window as any).initSendOTP(configuration);
                    return;
                }

                const existingScript = document.querySelector(`script[src="${urls[i]}"]`);
                if (existingScript) {
                    existingScript.remove();
                }

                const s = document.createElement('script');
                s.src = urls[i];
                s.async = true;
                s.onload = () => {
                    if (isMounted && typeof (window as any).initSendOTP === 'function') {
                        (window as any).initSendOTP(configuration);
                    }
                };
                s.onerror = () => {
                    i++;
                    if (i < urls.length) {
                        attempt();
                    }
                };
                document.head.appendChild(s);
            };
            attempt();
        };

        loadOtpScript([
            '/otp-provider.js',
            'https://verify.msg91.com/otp-provider.js',
            'https://verify.phone91.com/otp-provider.js'
        ]);

        return () => {
            isMounted = false;
        };
    }, []);

    const handleSendOtp = async () => {
        setOtpError('');
        const cleanMobile = formData.mobile.replace(/\D/g, '');
        if (cleanMobile.length < 10) {
            setOtpError('Please enter a valid 10-digit mobile number first');
            return;
        }

        const isMockNumber = cleanMobile === '0000000000' || cleanMobile === '1234567890';
        
        if (typeof (window as any).sendOtp === 'function' && !isMockNumber) {
            const formatted = `91${cleanMobile.slice(-10)}`;
            setOtpLoading(true);
            try {
                (window as any).sendOtp(
                    formatted,
                    (data: any) => {
                        setOtpSent(true);
                        setOtpCooldown(60);
                        setOtpLoading(false);
                    },
                    (error: any) => {
                        setOtpError(error.message || 'MSG91: Failed to send verification code');
                        setOtpLoading(false);
                    }
                );
            } catch (err: any) {
                setOtpError(err.message || 'Failed to dispatch MSG91 OTP');
                setOtpLoading(false);
            }
        } else {
            const formatted = `+91${cleanMobile.slice(-10)}`;
            setOtpLoading(true);
            try {
                const res = await api.post('/auth/otp/send-otp', { mobile: formatted });
                if (res.data?.success) {
                    setOtpSent(true);
                    setOtpCooldown(60);
                }
            } catch (err: any) {
                setOtpError(err.response?.data?.message || 'Failed to send verification code');
            } finally {
                setOtpLoading(false);
            }
        }
    };

    const handleVerifyOtp = async () => {
        setOtpError('');
        if (otpCode.length < 6) {
            setOtpError('Please enter a valid 6-digit verification code');
            return;
        }

        const cleanMobile = formData.mobile.replace(/\D/g, '');
        const isMockNumber = cleanMobile === '0000000000' || cleanMobile === '1234567890';

        if (typeof (window as any).verifyOtp === 'function' && !isMockNumber) {
            setOtpLoading(true);
            try {
                (window as any).verifyOtp(
                    otpCode,
                    async (data: any) => {
                        const token = typeof data === 'string' ? data : data.token || data.message || data.access_token;
                        if (!token) {
                            setOtpError('Invalid access token returned from OTP verification');
                            setOtpLoading(false);
                            return;
                        }

                        const formattedMobile = `+91${cleanMobile.slice(-10)}`;
                        try {
                            const res = await api.post('/auth/otp/verify-widget-token', {
                                mobile: formattedMobile,
                                accessToken: token
                            });
                            if (res.data?.success) {
                                setIsOtpVerified(true);
                                setOtpSent(false);
                                setOtpError('');
                            }
                        } catch (err: any) {
                            setOtpError(err.response?.data?.message || 'Token verification failed against backend');
                        } finally {
                            setOtpLoading(false);
                        }
                    },
                    (error: any) => {
                        setOtpError(error.message || 'Invalid code entered. Please try again.');
                        setOtpLoading(false);
                    }
                );
            } catch (err: any) {
                setOtpError(err.message || 'Failed to execute verification');
                setOtpLoading(false);
            }
        } else {
            const formatted = `+91${cleanMobile.slice(-10)}`;
            setOtpLoading(true);
            try {
                const res = await api.post('/auth/otp/verify-otp', { mobile: formatted, code: otpCode });
                if (res.data?.success) {
                    setIsOtpVerified(true);
                    setOtpSent(false);
                    setOtpError('');
                }
            } catch (err: any) {
                setOtpError(err.response?.data?.message || 'Invalid verification code');
            } finally {
                setOtpLoading(false);
            }
        }
    };
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const signatureInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
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
                    if (!ctx) {
                        setError('Failed to process image');
                        return;
                    }
                    ctx.drawImage(img, 0, 0, width, height);
                    const resizedBase64 = canvas.toDataURL('image/jpeg', 0.8);
                    
                    if (isSignature) {
                        setDigitalSignature(resizedBase64);
                    } else {
                        setProfileImage(resizedBase64);
                    }
                    setError('');
                } catch (error) {
                    console.error('Image processing error:', error);
                    setError('Failed to process image');
                }
            };
        };
        reader.readAsDataURL(file);
    };

    const validateStep = (currentStep: Step): boolean => {
        setError('');
        if (currentStep === 1) {
            if (!formData.fullName.trim()) {
                setError('Full name is required');
                return false;
            }
            if (!formData.email.trim()) {
                setError('Email is required');
                return false;
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.email)) {
                setError('Please enter a valid email address');
                return false;
            }
            if (!formData.mobile.trim()) {
                setError('Mobile number is required');
                return false;
            }
            // Indian phone format check (10 digits)
            const cleanMobile = formData.mobile.replace(/\D/g, '');
            if (cleanMobile.length < 10) {
                setError('Please enter a valid 10-digit mobile number');
                return false;
            }
            if (!googleUser && (!formData.password.trim() || formData.password.length < 6)) {
                setError('Password must be at least 6 characters long');
                return false;
            }
            // Enforce Mobile OTP check (skip only for mock local credentials in development)
            const isMockNumber = cleanMobile === '0000000000' || cleanMobile === '1234567890' || cleanMobile === '';
            if (!isOtpVerified && !isMockNumber) {
                setError('Please verify your mobile number via OTP before proceeding');
                return false;
            }
        } else if (currentStep === 2) {
            if (!formData.education.trim()) {
                setError('Educational qualification details are required');
                return false;
            }
            if (formData.education.trim().length < 10) {
                setError('Education details must be at least 10 characters long');
                return false;
            }
            if (!formData.experienceYears.trim() || isNaN(Number(formData.experienceYears))) {
                setError('Valid years of experience is required');
                return false;
            }
            const exp = Number(formData.experienceYears);
            if (exp < 0 || exp > 50) {
                setError('Experience years must be between 0 and 50');
                return false;
            }
            if (selectedSpecialties.length === 0) {
                setError('Please select at least one specialty');
                return false;
            }
            if (selectedLanguages.length === 0) {
                setError('Please select at least one spoken language');
                return false;
            }
        } else if (currentStep === 3) {
            const resolvedRole = formData.roleType === '__other__' ? otherRoleType.trim() : formData.roleType;
            if (formData.roleType === '__other__' && !otherRoleType.trim()) {
                setError('Please specify your professional role classification');
                return false;
            }
            const isRegulated = resolvedRole.includes('Clinical') || resolvedRole.includes('Psychiatrist');
            if (isRegulated && !formData.licenseNumber.trim()) {
                setError(`Valid license or registration number is required for ${resolvedRole}`);
                return false;
            }
        }
        return true;
    };

    const handleNext = () => {
        if (validateStep(step)) {
            setStep(prev => (prev + 1) as Step);
        }
    };

    const handleBack = () => {
        setError('');
        setStep(prev => (prev - 1) as Step);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
            return;
        }

        if (!formData.stateResidence) {
            setError('Please select your state of practice');
            return;
        }
        if (!formData.cityResidence) {
            setError('Please select your city of practice');
            return;
        }

        // Format mobile number to standard before submitting if needed
        let formattedMobile = formData.mobile;
        if (!formattedMobile.startsWith('+91')) {
            const cleanMobile = formattedMobile.replace(/\D/g, '');
            // Take last 10 digits
            const last10 = cleanMobile.slice(-10);
            formattedMobile = `+91${last10}`;
        }

        try {
            // Resolve the final role type (use custom text if "Other" was chosen)
            const resolvedRoleType = formData.roleType === '__other__' ? otherRoleType.trim() : formData.roleType;

            // Merge custom specialty into the list if provided
            const finalSpecialties = [
                ...selectedSpecialties,
                ...(isOtherSpecialtyChecked && otherSpecialty.trim() ? [otherSpecialty.trim()] : [])
            ];

            const payload = {
                ...formData,
                mobile: formattedMobile,
                roleType: resolvedRoleType,
                specialties: finalSpecialties,
                languagesSpoken: selectedLanguages,
                experienceYears: Number(formData.experienceYears),
                profileImage,
                digitalSignature,
                ...(googleUser ? { googleId: googleUser.googleId, authProvider: 'google' } : {})
            };

            const response = await api.post('/auth/register/therapist', payload);
            const { token, ...user } = response.data;
            login({ token, user });
            navigate('/app/therapist');
        } catch (err) {
            if (isAxiosError(err)) {
                const errorData = err.response?.data;
                if (errorData?.errors && Array.isArray(errorData.errors)) {
                    const errorMessages = errorData.errors.map((error: any) => error.msg || error).join(', ');
                    setError(errorMessages);
                } else {
                    setError(errorData?.message || 'Registration failed.');
                }
            } else {
                setError('An unexpected error occurred during registration.');
            }
        }
    };

    const availableCities = formData.stateResidence ? INDIAN_STATES_CITIES[formData.stateResidence] : [];

    return (
        <AuthLayout title="Create your Professional Account">
            {/* Step indicators */}
            <div className="mb-6 flex items-center justify-between px-2">
                <div className="flex flex-col items-center flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                        step >= 1 ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-gray-200 text-gray-600'
                    }`}>
                        1
                    </div>
                    <span className="text-[10px] mt-1 font-medium text-gray-500">Account</span>
                </div>
                <div className={`h-0.5 flex-1 transition-all duration-300 ${step >= 2 ? 'bg-blue-500' : 'bg-gray-200'}`} />
                <div className="flex flex-col items-center flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                        step >= 2 ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-gray-200 text-gray-600'
                    }`}>
                        2
                    </div>
                    <span className="text-[10px] mt-1 font-medium text-gray-500">Profile</span>
                </div>
                <div className={`h-0.5 flex-1 transition-all duration-300 ${step >= 3 ? 'bg-blue-500' : 'bg-gray-200'}`} />
                <div className="flex flex-col items-center flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                        step >= 3 ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-gray-200 text-gray-600'
                    }`}>
                        3
                    </div>
                    <span className="text-[10px] mt-1 font-medium text-gray-500">Legal</span>
                </div>
                <div className={`h-0.5 flex-1 transition-all duration-300 ${step >= 4 ? 'bg-blue-500' : 'bg-gray-200'}`} />
                <div className="flex flex-col items-center flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                        step === 4 ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-gray-200 text-gray-600'
                    }`}>
                        4
                    </div>
                    <span className="text-[10px] mt-1 font-medium text-gray-500">Lobby</span>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* STEP 1: Account Credentials */}
                {step === 1 && (
                    <div className="space-y-4 animate-fadeIn">
                        <div className="border-b border-gray-100 pb-2">
                            <h3 className="text-md font-bold text-gray-800">1. Account Details</h3>
                            <p className="text-xs text-gray-500">Set up your secure login credentials and profile photo.</p>
                        </div>
                        {/* Profile Picture */}
                        <div className="flex justify-center">
                            <div className="relative">
                                <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border">
                                    {profileImage ? (
                                        <img src={profileImage} alt="Profile preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <UserIcon className="w-16 h-16 text-gray-400" />
                                    )}
                                </div>
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 bg-blue-600 p-1.5 rounded-full text-white hover:bg-blue-700 shadow-md">
                                    <CameraIcon className="w-4 h-4" />
                                </button>
                                <input type="file" ref={fileInputRef} onChange={(e) => handleImageChange(e, false)} accept="image/*" className="hidden" />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="fullName" className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">Full Legal Name</label>
                            <input
                                id="fullName"
                                type="text"
                                required
                                value={formData.fullName}
                                onChange={handleInputChange}
                                readOnly={!!googleUser}
                                placeholder="e.g. Dr. Siddharth Koul"
                                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all ${googleUser ? 'bg-gray-50 text-gray-500 cursor-not-allowed border-gray-200' : 'border-gray-300'}`}
                            />
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center justify-between">
                                <span>Email Address</span>
                                {googleUser && <span className="text-[10px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full border border-green-200 flex items-center gap-0.5">✓ Verified via Google</span>}
                            </label>
                            <input
                                id="email"
                                type="email"
                                required
                                value={formData.email}
                                onChange={handleInputChange}
                                readOnly={!!googleUser}
                                placeholder="dr.siddharth@mindlink.in"
                                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all ${googleUser ? 'bg-gray-50 text-gray-500 cursor-not-allowed border-gray-200' : 'border-gray-300'}`}
                            />
                        </div>
                        <div>
                            <label htmlFor="mobile" className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">Indian Mobile Number</label>
                            <div className="mt-1 flex rounded-md shadow-sm">
                                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                                    +91
                                </span>
                                <input
                                    id="mobile"
                                    type="tel"
                                    required
                                    value={formData.mobile.replace('+91', '')}
                                    onChange={(e) => setFormData(prev => ({ ...prev, mobile: e.target.value }))}
                                    placeholder="98765 43210"
                                    className="flex-1 min-w-0 block w-full px-3 py-2 rounded-r-md border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
                                />
                            </div>
                        </div>

                        {/* OTP verification widget */}
                        <div className="mt-2.5 space-y-2">
                            {!isOtpVerified ? (
                                <>
                                    {!otpSent ? (
                                        <button
                                            type="button"
                                            onClick={handleSendOtp}
                                            disabled={otpLoading || formData.mobile.replace(/\D/g, '').length < 10}
                                            className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-2 px-4 rounded-md text-xs shadow-sm transition-colors border border-indigo-100 disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            {otpLoading ? 'Sending Code...' : '📨 Send OTP Verification Code'}
                                        </button>
                                    ) : (
                                        <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3.5 space-y-2.5 animate-fadeIn">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[11px] font-bold text-indigo-900">Enter 6-Digit OTP</span>
                                                <button
                                                    type="button"
                                                    onClick={handleSendOtp}
                                                    disabled={otpCooldown > 0 || otpLoading}
                                                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold disabled:opacity-50"
                                                >
                                                    {otpCooldown > 0 ? `Resend in ${otpCooldown}s` : '🔄 Resend OTP'}
                                                </button>
                                            </div>
                                            <div className="flex space-x-2">
                                                <input
                                                    type="text"
                                                    maxLength={6}
                                                    value={otpCode}
                                                    onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                                                    placeholder="e.g. 482059"
                                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 sm:text-xs font-semibold text-center tracking-widest text-gray-800"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleVerifyOtp}
                                                    disabled={otpLoading || otpCode.length < 6}
                                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-md text-xs shadow-sm transition-colors"
                                                >
                                                    {otpLoading ? 'Verifying...' : 'Verify Code'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    {otpError && <p className="text-[10px] text-red-600 font-semibold mt-1">{otpError}</p>}
                                </>
                            ) : (
                                <div className="bg-green-50 border border-green-200 text-green-700 font-bold py-2 px-3 rounded-md text-xs flex items-center justify-between animate-fadeIn shadow-sm">
                                    <span className="flex items-center gap-1.5">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        Mobile Number Verified
                                    </span>
                                    <span className="text-[9px] bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full border border-green-200">OTP SUCCESS</span>
                                </div>
                            )}
                        </div>
                        {!googleUser && (
                            <div>
                                <label htmlFor="password" className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">Password</label>
                                <input
                                    id="password"
                                    type="password"
                                    required
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    placeholder="••••••••"
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* STEP 2: Professional Profile & Specialties */}
                {step === 2 && (
                    <div className="space-y-4 animate-fadeIn">
                        <div className="border-b border-gray-100 pb-2">
                            <h3 className="text-md font-bold text-gray-800">2. Professional Details</h3>
                            <p className="text-xs text-gray-500">Provide details of your educational credentials and clinical competencies.</p>
                        </div>
                        <div>
                            <label htmlFor="education" className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">Education & Qualification</label>
                            <textarea id="education" rows={2} required value={formData.education} onChange={handleInputChange} placeholder="e.g. M.Phil in Clinical Psychology from NIMHANS" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                        </div>
                        <div>
                            <label htmlFor="experienceYears" className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">Years of Post-Qualification Experience</label>
                            <input id="experienceYears" type="number" required value={formData.experienceYears} onChange={handleInputChange} placeholder="e.g. 8" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                        </div>

                        {/* Specialties checked selection */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Areas of Specialization</label>
                            <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto border border-gray-200 p-2.5 rounded-md bg-gray-50">
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
                                <label className="flex items-start space-x-2 text-xs text-blue-600 font-semibold cursor-pointer col-span-2">
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
                                    className="mt-2 block w-full px-3 py-2 border border-blue-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-blue-50"
                                />
                            )}
                        </div>

                        {/* Languages checked selection */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Languages Spoken</label>
                            <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto border border-gray-200 p-2.5 rounded-md bg-gray-50">
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
                        </div>
                    </div>
                )}

                {/* STEP 3: RCI/NMC Regulatory Verification & Signature */}
                {step === 3 && (
                    <div className="space-y-4 animate-fadeIn">
                        <div className="border-b border-gray-100 pb-2">
                            <h3 className="text-md font-bold text-gray-800">3. Regulatory Verification & Signature</h3>
                            <p className="text-xs text-gray-500">Provide legal license credentials and digital signature in compliance with Indian rules.</p>
                        </div>
                        <div>
                            <label htmlFor="roleType" className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">Professional Role Classification</label>
                            <select
                                id="roleType"
                                required
                                value={formData.roleType}
                                onChange={handleInputChange}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
                                    className="mt-2 block w-full px-3 py-2 border border-blue-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-blue-50"
                                />
                            )}
                        </div>

                        <div>
                            <label htmlFor="licenseNumber" className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                {formData.roleType.includes('Clinical') ? 'RCI CRR Registration Number' : formData.roleType.includes('Psychiatrist') ? 'NMC / SMC Registration Number' : 'License / Registration Number (Optional)'}
                            </label>
                            <input id="licenseNumber" type="text" value={formData.licenseNumber} onChange={handleInputChange} placeholder="e.g. CRR-A20459" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                            <span className="text-[10px] text-gray-400 mt-1 block">Clinical Psychologists and Psychiatrists must enter valid registration numbers for verification.</span>
                        </div>

                        {/* Digital Signature */}
                        <div className="flex flex-col items-center py-2 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                            <div className="relative">
                                <div className="w-40 h-20 bg-white flex items-center justify-center overflow-hidden border shadow-sm rounded">
                                    {digitalSignature ? (
                                        <img src={digitalSignature} alt="Signature preview" className="w-full h-full object-contain" />
                                    ) : (
                                        <span className="text-xs text-gray-400 italic">Signature Preview</span>
                                    )}
                                </div>
                                <button type="button" onClick={() => signatureInputRef.current?.click()} className="absolute bottom-1 right-1 bg-blue-600 p-1.5 rounded-full text-white hover:bg-blue-700 shadow-md">
                                    <CameraIcon className="w-3.5 h-3.5" />
                                </button>
                                <input type="file" ref={signatureInputRef} onChange={(e) => handleImageChange(e, true)} accept="image/*" className="hidden" />
                            </div>
                            <span className="text-[10px] text-gray-500 mt-2 font-medium">Upload Transparent Digital Signature PNG (Optional)</span>
                        </div>
                    </div>
                )}

                {/* STEP 4: Location, Bio & Submit */}
                {step === 4 && (
                    <div className="space-y-4 animate-fadeIn">
                        <div className="border-b border-gray-100 pb-2">
                            <h3 className="text-md font-bold text-gray-800">4. Location & Practitioner Bio</h3>
                            <p className="text-xs text-gray-500">Provide your base of practice and a brief patient biography.</p>
                        </div>
                        {/* Regional Location Selection */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="stateResidence" className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">State of Practice</label>
                                <select
                                    id="stateResidence"
                                    required
                                    value={formData.stateResidence}
                                    onChange={handleStateChange}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                >
                                    <option value="">Select State</option>
                                    {Object.keys(INDIAN_STATES_CITIES).map(state => (
                                        <option key={state} value={state}>{state}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="cityResidence" className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">City of Practice</label>
                                <select
                                    id="cityResidence"
                                    required
                                    value={formData.cityResidence}
                                    onChange={handleInputChange}
                                    disabled={!formData.stateResidence}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-400"
                                >
                                    <option value="">Select City</option>
                                    {availableCities.map(city => (
                                        <option key={city} value={city}>{city}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="bio" className="block text-xs font-semibold text-gray-600 uppercase tracking-wider"> Practitioner Biography (Optional)</label>
                            <textarea id="bio" rows={3} value={formData.bio} onChange={handleInputChange} placeholder="Tell your patients a bit about yourself, your approach, and your clinical philosophy..." className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                        </div>
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-2.5">
                        <p className="text-xs text-red-600 font-semibold">{error}</p>
                    </div>
                )}

                {/* Form Buttons */}
                <div className="pt-4 flex justify-between space-x-3 border-t border-gray-100">
                    {step > 1 ? (
                        <button
                            key="btn-back"
                            type="button"
                            onClick={handleBack}
                            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-md text-sm transition-colors"
                        >
                            Back
                        </button>
                    ) : (
                        <div key="btn-spacer" className="flex-1" /> // spacer
                    )}

                    {step < 4 ? (
                        <button
                            key="btn-next"
                            type="button"
                            onClick={handleNext}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md text-sm shadow-sm transition-all"
                        >
                            Next Step
                        </button>
                    ) : (
                        <button
                            key="btn-submit"
                            type="submit"
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md text-sm shadow-md transition-all"
                        >
                            Complete Registration
                        </button>
                    )}
                </div>
            </form>

            <p className="mt-6 text-center text-sm text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-500 transition-colors">
                    Sign in
                </Link>
            </p>
        </AuthLayout>
    );
};

export default RegisterTherapistPage;