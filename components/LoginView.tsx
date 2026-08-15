import React, { useState } from 'react';
import { Loader } from './Loader';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import type { UserProfile } from '../types';
import { SmartChalkLogo, EmailIcon, LockIcon } from './Icons';


interface LoginViewProps {
    onLoginSuccess: (user: UserProfile) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);


    const handleGoogleSuccess = (credentialResponse: any) => {
        setIsLoading(true);
        setError(null);
        if (credentialResponse.credential) {
            try {
                const decoded: any = jwtDecode(credentialResponse.credential);
                
                if (!decoded.sub || !decoded.email) {
                    console.error("JWT is missing required fields (sub, email)", decoded);
                    setError("Login failed: Your profile information from Google is incomplete. Please ensure your account has a primary email address.");
                    setIsLoading(false);
                    return;
                }
                
                // Robustly determine the user's name
                let potentialName = decoded.name;
                if (typeof potentialName !== 'string' || !potentialName.trim()) {
                    potentialName = decoded.email ? String(decoded.email).split('@')[0] : 'Valued User';
                }

                const profileName = potentialName;
                const profilePic = decoded.picture || `https://api.dicebear.com/8.x/initials/svg?seed=${decoded.email || 'user'}`;

                onLoginSuccess({
                    sub: decoded.sub,
                    name: profileName,
                    email: decoded.email,
                    picture: profilePic
                });
            } catch (e) {
                console.error("Error decoding JWT", e);
                setError("Login failed: Could not process user information.");
                setIsLoading(false);
            }
        } else {
            setError("Login failed: No credential returned from Google.");
            setIsLoading(false);
        }
    };
    
    const handleGoogleError = () => {
        setError("Google login failed. Please try again.");
        setIsLoading(false);
    };

    const handleEmailSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!email || !password) {
            setError("Please enter both email and password.");
            return;
        }

        setIsLoading(true);
        // Simulate an API call for either login or signup
        setTimeout(() => {
             // In a real app, you'd hit /login or /signup endpoints.
             // For this demo, we'll create a mock user profile for both cases.
             onLoginSuccess({
                sub: `email|${email}`,
                name: email.split('@')[0],
                email: email,
                picture: `https://api.dicebear.com/8.x/initials/svg?seed=${email}` // A nice placeholder avatar
            });
        }, 1000);
    };
    
    return (
        <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4 antialiased">
             <div className="w-full max-w-md">
                <div className="bg-white p-8 rounded-2xl shadow-2xl border border-slate-200/50">
                    <div className="text-center mb-8">
                        <SmartChalkLogo className="h-28 w-auto mx-auto" />
                        <h1 className="text-3xl font-bold text-brand-navy mt-6">
                            {isSignUp ? 'Create an Account' : 'Welcome Back'}
                        </h1>
                        <p className="text-slate-500 mt-1">
                             {isSignUp ? 'Enter your details to get started.' : 'Please enter your details to sign in.'}
                        </p>
                    </div>

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center space-y-2 h-48">
                           <Loader className="text-brand-green" />
                           <p className="text-sm font-medium text-slate-600">Signing In...</p>
                        </div>
                    ) : (
                       <>
                         {error && (
                            <p className="text-sm text-red-600 text-center mb-4 bg-red-50 p-3 rounded-lg border border-red-200">{error}</p>
                        )}
                        <form onSubmit={handleEmailSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="email" className="text-sm font-medium text-slate-700 sr-only">Email</label>
                                <div className="relative">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <EmailIcon className="h-5 w-5 text-slate-400" />
                                    </div>
                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="email@example.com"
                                        className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-green focus:border-brand-green transition-shadow"
                                        required
                                    />
                                </div>
                            </div>
                             <div>
                                <label htmlFor="password-login" className="text-sm font-medium text-slate-700 sr-only">Password</label>
                                <div className="relative">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <LockIcon className="h-5 w-5 text-slate-400" />
                                    </div>
                                    <input
                                        id="password-login"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Password"
                                        className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-green focus:border-brand-green transition-shadow"
                                        required
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                className="w-full flex justify-center items-center bg-brand-green text-white font-semibold py-2.5 px-4 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-green transition-colors duration-200"
                            >
                                {isSignUp ? 'Sign Up' : 'Sign In'}
                            </button>
                        </form>

                        <div className="my-6 flex items-center">
                            <div className="flex-grow border-t border-slate-200"></div>
                            <span className="flex-shrink mx-4 text-xs font-medium text-slate-400">OR</span>
                            <div className="flex-grow border-t border-slate-200"></div>
                        </div>

                        <div className="flex justify-center">
                             <GoogleLogin
                                onSuccess={handleGoogleSuccess}
                                onError={handleGoogleError}
                                useOneTap={false}
                                shape="pill"
                                size="large"
                                theme="outline"
                            />
                        </div>

                        <p className="text-center text-sm text-slate-500 mt-6">
                            {isSignUp ? "Already have an account? " : "Don't have an account? "}
                            <button
                                type="button"
                                onClick={() => {
                                    setIsSignUp(!isSignUp);
                                    setError(null);
                                }}
                                className="font-semibold text-brand-green hover:text-green-700 focus:outline-none"
                            >
                                {isSignUp ? "Sign In" : "Sign Up"}
                            </button>
                        </p>
                       </>
                    )}
                </div>
                 <p className="text-center text-xs text-slate-400 mt-8">
                    By signing in, you agree to our imaginary Terms of Service.
                </p>
             </div>
        </div>
    );
};


    const handleLogin = async (response: any) => {
        console.log('Login successful:', response);
        const token = response.credential;
        console.log('Google Token:', token);
        localStorage.setItem('google_token', token);

        // Fetch user profile
    };