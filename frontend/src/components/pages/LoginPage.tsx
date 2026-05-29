import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import AuthLayout from '../ui/AuthLayout';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const LoginPage: React.FC = () => {
    const [role, setRole] = useState<'user' | 'therapist'>('user');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleGoogleCallback = async (response: any) => {
        setError('');
        try {
            const res = await api.post('/auth/google-login', {
                token: response.credential,
                role
            });

            if (res.data?.success) {
                if (res.data.isNewUser) {
                    // New Google User -> redirect to registration with pre-filled state details
                    const googleUser = res.data.googleUser;
                    if (role === 'user') {
                        navigate('/register-user', { state: { googleUser } });
                    } else {
                        navigate('/register-therapist', { state: { googleUser } });
                    }
                } else {
                    // Existing User -> login directly
                    const { token, ...user } = res.data;
                    login({ token, user });
                    if (user.role === 'user') {
                        navigate('/app/member');
                    } else {
                        navigate('/app/therapist');
                    }
                }
            }
        } catch (err) {
            console.error('Google Sign-In failed:', err);
            setError('Google Sign-In failed. Please try again.');
        }
    };

    useEffect(() => {
        // Dynamically load Google Identity Services library
        const script = document.createElement('script');
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);

        script.onload = () => {
            const g = (window as any).google;
            if (g) {
                g.accounts.id.initialize({
                    client_id: (process.env.VITE_GOOGLE_CLIENT_ID as string) || "717272708294-d4cvf82np8hcv2pvd622ecu108i7pjh1.apps.googleusercontent.com",
                    callback: handleGoogleCallback,
                    auto_select: false
                });

                g.accounts.id.renderButton(
                    document.getElementById("googleSignInButton"),
                    { theme: "outline", size: "large", width: "100%", text: "signin_with" }
                );
            }
        };

        return () => {
            document.body.removeChild(script);
        };
    }, [role]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            const response = await api.post('/auth/login', { email, password, role });
            const { token, ...user } = response.data;
            login({ token, user });

            if (user.role === 'user') {
                navigate('/app/member');
            } else {
                navigate('/app/therapist');
            }
        } catch (err) {
            if (isAxiosError(err)) {
                setError(err.response?.data?.message || 'Login failed. Please try again.');
            } else {
                setError('An unexpected error occurred during login.');
            }
        }
    };

    return (
        <AuthLayout title={`Sign in as a ${role === 'user' ? 'Member' : 'Therapist'}`}>
            <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-2 rounded-lg p-1 bg-gray-100">
                    <button type="button" onClick={() => setRole('user')} className={`w-full py-2 text-sm font-medium rounded-md transition-colors ${role === 'user' ? 'bg-white text-blue-600 shadow' : 'text-gray-500 hover:bg-gray-200'}`}>
                        I need support
                    </button>
                    <button type="button" onClick={() => setRole('therapist')} className={`w-full py-2 text-sm font-medium rounded-md transition-colors ${role === 'therapist' ? 'bg-white text-blue-600 shadow' : 'text-gray-500 hover:bg-gray-200'}`}>
                        I'm a Therapist
                    </button>
                </div>

                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email address</label>
                    <div className="mt-1">
                        <input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                    </div>
                </div>

                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                    <div className="mt-1">
                        <input id="password" name="password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                    </div>
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="flex items-center justify-between">
                    <div className="text-sm">
                        <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                            Forgot your password?
                        </a>
                    </div>
                </div>

                <div>
                    <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                        Sign in
                    </button>
                </div>

                <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-gray-500 font-semibold">Or continue with</span>
                    </div>
                </div>

                <div className="w-full flex justify-center mt-3">
                    <div id="googleSignInButton" className="w-full min-h-[40px] flex justify-center" />
                </div>
            </form>

            <div className="mt-6 text-center">
                <Link to={role === 'user' ? "/register-user" : "/register-therapist"} className="font-medium text-blue-600 hover:text-blue-500">
                    Create an account
                </Link>
            </div>
        </AuthLayout>
    );
};

export default LoginPage;