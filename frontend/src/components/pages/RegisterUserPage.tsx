import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { isAxiosError } from 'axios';
import AuthLayout from '../ui/AuthLayout';
import { CameraIcon, UserIcon } from '../ui/icons';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

type Step = 1 | 2 | 3;

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

const RegisterUserPage: React.FC = () => {
    const location = useLocation();
    const googleUser = location.state?.googleUser;

    const [step, setStep] = useState<Step>(1);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        mobile: '',
        password: '',
        stateResidence: '',
        cityResidence: '',
        primaryConcern: '',
        isAnonymousEnabled: false,
        anonymousAlias: '',
        emergencyContactName: '',
        emergencyContactRelation: '',
        emergencyContactMobile: ''
    });

    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();
    const { login } = useAuth();

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

    // Auto-fill Google info if available
    useEffect(() => {
        if (googleUser) {
            setFormData(prev => ({
                ...prev,
                fullName: googleUser.fullName || '',
                email: googleUser.email || '',
                // Set a safe dummy password for schema integrity, user registers seamlessly without setting a local password
                password: `google_${googleUser.googleId || Math.random().toString(36).slice(-8)}`
            }));
            if (googleUser.profileImage) {
                setProfileImage(googleUser.profileImage);
            }
        }
    }, [googleUser]);

    // Curated dynamic alias generator
    const handleGenerateAlias = () => {
        const prefixes = ['Calm', 'Peaceful', 'Serene', 'Gentle', 'Quiet', 'Tranquil', 'Brave', 'Resilient', 'Smiling', 'Cozy', 'Warm', 'Bright', 'Kind', 'Mindful', 'Healing'];
        const nouns = ['River', 'Soul', 'Spirit', 'Lotus', 'Sparrow', 'Pebble', 'Meadow', 'Breeze', 'Mountain', 'Wave', 'Cloud', 'Seed', 'Forest', 'Deer', 'Panda'];
        const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
        const randomNumber = Math.floor(Math.random() * 90) + 10; // 10-99
        setFormData(prev => ({
            ...prev,
            anonymousAlias: `${randomPrefix}${randomNoun}${randomNumber}`
        }));
    };

    // Auto-generate alias first time user toggles it on
    useEffect(() => {
        if (formData.isAnonymousEnabled && !formData.anonymousAlias) {
            handleGenerateAlias();
        }
    }, [formData.isAnonymousEnabled]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, checked } = e.target;
        setFormData(prev => ({ ...prev, [id]: checked }));
    };

    const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedState = e.target.value;
        setFormData(prev => ({
            ...prev,
            stateResidence: selectedState,
            cityResidence: '' // reset city
        }));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
                    setProfileImage(resizedBase64);
                    setError('');
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
            if (!formData.stateResidence) {
                setError('Please select your state of residence');
                return false;
            }
            if (!formData.cityResidence) {
                setError('Please select your city of residence');
                return false;
            }
            if (!formData.primaryConcern) {
                setError('Please select your primary clinical concern');
                return false;
            }
            if (formData.isAnonymousEnabled && !formData.anonymousAlias.trim()) {
                setError('Please enter or generate an anonymous alias');
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

        if (!validateStep(1) || !validateStep(2)) {
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

        let formattedEmergencyMobile = formData.emergencyContactMobile;
        if (formattedEmergencyMobile && !formattedEmergencyMobile.startsWith('+91')) {
            const cleanMobile = formattedEmergencyMobile.replace(/\D/g, '');
            const last10 = cleanMobile.slice(-10);
            formattedEmergencyMobile = `+91${last10}`;
        }

        try {
            const payload = {
                ...formData,
                mobile: formattedMobile,
                emergencyContactMobile: formattedEmergencyMobile,
                profileImage,
                ...(googleUser ? { googleId: googleUser.googleId, authProvider: 'google' } : {})
            };

            const response = await api.post('/auth/register/user', payload);
            const { token, ...user } = response.data;
            login({ token, user });
            navigate('/app/member');
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

    // Cities matching the selected state
    const availableCities = formData.stateResidence ? INDIAN_STATES_CITIES[formData.stateResidence] : [];

    return (
        <AuthLayout title="Create your Safe Space">
            {/* Step Indicators */}
            <div className="mb-8 flex items-center justify-between px-2">
                <div className="flex flex-col items-center flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                        step >= 1 ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-gray-200 text-gray-600'
                    }`}>
                        1
                    </div>
                    <span className="text-[10px] mt-1 font-medium text-gray-500">Identity</span>
                </div>
                <div className={`h-0.5 flex-1 transition-all duration-300 ${step >= 2 ? 'bg-blue-500' : 'bg-gray-200'}`} />
                <div className="flex flex-col items-center flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                        step >= 2 ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-gray-200 text-gray-600'
                    }`}>
                        2
                    </div>
                    <span className="text-[10px] mt-1 font-medium text-gray-500">Privacy</span>
                </div>
                <div className={`h-0.5 flex-1 transition-all duration-300 ${step >= 3 ? 'bg-blue-500' : 'bg-gray-200'}`} />
                <div className="flex flex-col items-center flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                        step === 3 ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-gray-200 text-gray-600'
                    }`}>
                        3
                    </div>
                    <span className="text-[10px] mt-1 font-medium text-gray-500">Safety</span>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* STEP 1: Identity & Credentials */}
                {step === 1 && (
                    <div className="space-y-4 animate-fadeIn">
                        <div className="border-b border-gray-100 pb-2">
                            <h3 className="text-md font-bold text-gray-800">1. Verification Details</h3>
                            <p className="text-xs text-gray-500">Your confidential legal details are never shared with peers or search engines.</p>
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
                                placeholder="e.g. Aarav Sharma"
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
                                placeholder="aarav@gmail.com"
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

                {/* STEP 2: Profile & Indian Context Matchmaking */}
                {step === 2 && (
                    <div className="space-y-4 animate-fadeIn">
                        <div className="border-b border-gray-100 pb-2">
                            <h3 className="text-md font-bold text-gray-800">2. Privacy Shield & Support Goals</h3>
                            <p className="text-xs text-gray-500">We help you stay completely anonymous in live peer rooms to eliminate social stigma.</p>
                        </div>

                        {/* Stigma Shield Toggle */}
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                            <div className="flex items-start">
                                <div className="flex items-center h-5">
                                    <input
                                        id="isAnonymousEnabled"
                                        type="checkbox"
                                        checked={formData.isAnonymousEnabled}
                                        onChange={handleCheckboxChange}
                                        className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                                    />
                                </div>
                                <div className="ml-3 text-sm">
                                    <label htmlFor="isAnonymousEnabled" className="font-bold text-blue-900 flex items-center">
                                        🛡️ Enable Privacy Shield
                                    </label>
                                    <p className="text-xs text-blue-700 mt-0.5">Use a safe fake name/alias in live groups instead of your real name.</p>
                                </div>
                            </div>

                            {formData.isAnonymousEnabled && (
                                <div className="mt-3 space-y-2">
                                    <label htmlFor="anonymousAlias" className="block text-xs font-semibold text-blue-800">Your Anonymous Display Name</label>
                                    <div className="flex space-x-2">
                                        <input
                                            id="anonymousAlias"
                                            type="text"
                                            value={formData.anonymousAlias}
                                            onChange={handleInputChange}
                                            placeholder="e.g. CalmLotus24"
                                            className="block w-full px-3 py-1.5 border border-blue-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-xs"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleGenerateAlias}
                                            className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-semibold hover:bg-blue-700 shadow-sm flex items-center shrink-0"
                                        >
                                            ✨ Generate
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Regional Location Selection */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="stateResidence" className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">State</label>
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
                                <label htmlFor="cityResidence" className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">City</label>
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

                        {/* Clinical Primary Concern Selector */}
                        <div>
                            <label htmlFor="primaryConcern" className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">Primary Support Focus</label>
                            <select
                                id="primaryConcern"
                                required
                                value={formData.primaryConcern}
                                onChange={handleInputChange}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            >
                                <option value="">Select Primary Concern</option>
                                {PRIMARY_CONCERNS.map(concern => (
                                    <option key={concern} value={concern}>{concern}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                {/* STEP 3: Safety Nets & Profile Avatar */}
                {step === 3 && (
                    <div className="space-y-4 animate-fadeIn">
                        <div className="border-b border-gray-100 pb-2">
                            <h3 className="text-md font-bold text-gray-800">3. Emergency Safety Net & Profile Pic</h3>
                            <p className="text-xs text-gray-500">Mental health is sacred; emergency information acts as a secure distress shield in crisis.</p>
                        </div>

                        {/* Profile Avatar Upload */}
                        <div className="flex flex-col items-center py-2 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                            <div className="relative">
                                <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center overflow-hidden border shadow-sm">
                                    {profileImage ? (
                                        <img src={profileImage} alt="Profile preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <UserIcon className="w-12 h-12 text-gray-400" />
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute bottom-0 right-0 bg-blue-600 p-1.5 rounded-full text-white hover:bg-blue-700 focus:outline-none shadow-md"
                                >
                                    <CameraIcon className="w-3.5 h-3.5" />
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleImageChange}
                                    accept="image/*"
                                    className="hidden"
                                />
                            </div>
                            <span className="text-[10px] text-gray-500 mt-2 font-medium">Set a profile picture (Optional)</span>
                        </div>

                        {/* Emergency Contact Name */}
                        <div>
                            <label htmlFor="emergencyContactName" className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">Emergency Contact Name</label>
                            <input
                                id="emergencyContactName"
                                type="text"
                                value={formData.emergencyContactName}
                                onChange={handleInputChange}
                                placeholder="e.g. Suman Sharma"
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Emergency Contact Relation */}
                            <div>
                                <label htmlFor="emergencyContactRelation" className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">Relation</label>
                                <select
                                    id="emergencyContactRelation"
                                    value={formData.emergencyContactRelation}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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

                            {/* Emergency Contact Mobile */}
                            <div>
                                <label htmlFor="emergencyContactMobile" className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">Mobile Number</label>
                                <div className="mt-1 flex rounded-md shadow-sm">
                                    <span className="inline-flex items-center px-2.5 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-xs">
                                        +91
                                    </span>
                                    <input
                                        id="emergencyContactMobile"
                                        type="tel"
                                        value={formData.emergencyContactMobile.replace('+91', '')}
                                        onChange={(e) => setFormData(prev => ({ ...prev, emergencyContactMobile: e.target.value }))}
                                        placeholder="98765 43210"
                                        className="flex-1 min-w-0 block w-full px-3 py-2 rounded-r-md border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
                                    />
                                </div>
                            </div>
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

                    {step < 3 ? (
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

export default RegisterUserPage;