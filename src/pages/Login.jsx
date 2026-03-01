
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import './Login.css';

export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [resetMode, setResetMode] = useState(false);
    const [error, setError] = useState(null);

    // AUTO-LOGIN: If invite link contains token, Supabase handles it and updates session.
    // We need to listen and redirect if logged in.
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (session) {
                navigate('/');
            }
            if (event === 'PASSWORD_RECOVERY') {
                setResetMode(true);
            }
        });
        return () => subscription.unsubscribe();
    }, [navigate]);

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (resetMode) {
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: window.location.origin + '/',
                });
                if (error) throw error;
                alert('Password reset instructions sent to your email!');
                setResetMode(false);
            } else if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                alert('Check your email for the confirmation link!');
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                navigate('/');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-bg-shape shape-1"></div>
            <div className="login-bg-shape shape-2"></div>

            <div className="login-card">
                <div className="login-header">
                    <h1 className="brand-name">MAGOO MAP</h1>
                    <h2 className="login-title">
                        {resetMode ? 'Reset Password' : (isSignUp ? 'Join the Adventure' : 'Welcome Back')}
                    </h2>
                    <p className="login-subtitle">
                        {resetMode
                            ? 'Enter your email to receive recovery instructions.'
                            : (isSignUp
                                ? 'Create your account to start planning your next journey.'
                                : 'Sign in to access your travel plans.')}
                    </p>
                </div>

                {error && (
                    <div className="error-message">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleAuth} className="login-form">
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input
                            className="form-input"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="you@example.com"
                        />
                    </div>

                    {!resetMode && (
                        <div className="form-group">
                            <div className="password-header">
                                <label className="form-label">Password</label>
                                {!isSignUp && (
                                    <button
                                        type="button"
                                        onClick={() => setResetMode(true)}
                                        className="forgot-password-btn"
                                    >
                                        Forgot Password?
                                    </button>
                                )}
                            </div>
                            <input
                                className="form-input"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required={!resetMode}
                                placeholder="••••••••"
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="submit-btn"
                    >
                        {loading && <div className="spinner"></div>}
                        {loading ? 'Processing...' : (resetMode ? 'Send Instructions' : (isSignUp ? 'Sign Up' : 'Sign In'))}
                    </button>
                </form>

                <div className="login-footer">
                    {resetMode ? (
                        <button
                            onClick={() => setResetMode(false)}
                            className="toggle-mode-btn"
                        >
                            Back to Sign In
                        </button>
                    ) : (
                        <>
                            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                            <button
                                onClick={() => setIsSignUp(!isSignUp)}
                                className="toggle-mode-btn"
                            >
                                {isSignUp ? 'Sign In' : 'Sign Up'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
