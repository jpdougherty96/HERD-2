import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { X, Eye, EyeOff, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { ResendVerificationHelper } from './ResendVerificationHelper';

type AuthModalProps = {
  onClose: () => void;
  onSuccess: () => void;
};

type PasswordRequirement = {
  label: string;
  test: (password: string) => boolean;
};

const passwordRequirements: PasswordRequirement[] = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'Contains uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'Contains lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'Contains a number', test: (p) => /\d/.test(p) },
];

export function AuthModal({ onClose, onSuccess }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);
  const [showResendHelper, setShowResendHelper] = useState(false);
  const [resendEmail, setResendEmail] = useState('');

  // Safe development mode check
  const isDevelopment = typeof import.meta !== 'undefined' && 
                       import.meta.env && 
                       import.meta.env.DEV === true;

  const isPasswordValid = passwordRequirements.every(req => req.test(password));
  const doPasswordsMatch = password === confirmPassword;
  const isFormValid = isSignUp 
    ? email && fullName.trim() && isPasswordValid && doPasswordsMatch
    : email && password;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        if (!isPasswordValid) {
          throw new Error('Password does not meet requirements');
        }
        if (!doPasswordsMatch) {
          throw new Error('Passwords do not match');
        }

        console.log('Attempting to sign up with email:', email);
        
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName.trim(),
            },
            emailRedirectTo: `${window.location.origin}?verified=true`
          }
        });
        
        if (error) {
          console.error('Sign up error:', error);
          
          // Handle specific sign up errors
          if (error.message.includes('already registered')) {
            throw new Error('An account with this email already exists. Please sign in instead.');
          }
          throw error;
        }
        
        console.log('Sign up response:', { 
          user: data.user, 
          session: data.session,
          userEmailConfirmed: !!data.user?.email_confirmed_at,
          userCreatedAt: data.user?.created_at
        });
        
        if (data?.user && !data.session) {
          // User needs to verify email
          console.log('User created, email verification required');
          onClose();
          alert('Account created! Please check your email and click the verification link to complete your registration. If you don\'t see the email, check your spam folder.');
        } else if (data?.session) {
          // User was automatically signed in (email confirmation disabled)
          console.log('User created and automatically signed in - email confirmation may be disabled');
          onSuccess();
        } else {
          console.warn('Unexpected sign up response:', data);
          throw new Error('Unexpected response during account creation');
        }
      } else {
        console.log('Attempting to sign in with email:', email);
        
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) {
          console.error('Sign in error details:', {
            message: error.message,
            status: error.status,
            name: error.name
          });
          
          // Handle specific sign in errors
          if (error.message.includes('Invalid login credentials')) {
            // This is the most common error when email verification is required but not configured
            console.log('Invalid credentials error - likely unverified email issue');
            
            // In development, offer to try signing up instead to bypass verification
            if (isDevelopment) {
              throw new Error('Sign in failed - this is likely because your email needs verification.\n\n🔧 Development Mode Options:\n• Try the "Need to verify your email?" button below\n• Use the debug panel to manually confirm your account\n• Check if email confirmation is properly configured in Supabase\n\nFor production, enable email confirmation in your Supabase dashboard.');
            } else {
              throw new Error('Sign in failed. This might be because:\n• Your email address needs to be verified\n• Your password is incorrect\n• Email verification is not properly configured\n\nTry verifying your email first, or contact support if the issue persists.');
            }
          } else if (error.message.includes('Email not confirmed')) {
            throw new Error('Please verify your email address before signing in. Check your inbox for a verification link.');
          } else if (error.message.includes('Too many requests')) {
            throw new Error('Too many sign-in attempts. Please wait a few minutes before trying again.');
          } else if (error.message.includes('Invalid email')) {
            throw new Error('Please enter a valid email address.');
          }
          
          // Generic error with debug info
          throw new Error(`Sign in failed: ${error.message}. ${isDevelopment ? 'Check the debug panel below for more details.' : 'Please try again or contact support.'}`);
        }
        
        console.log('Sign in response:', { 
          user: data.user, 
          emailConfirmed: !!data.user?.email_confirmed_at,
          sessionExists: !!data.session,
          userCreatedAt: data.user?.created_at
        });
        
        if (data?.user && !data.user.email_confirmed_at) {
          // User exists but email not verified (this might not happen if Supabase blocks login)
          console.log('User exists but email not verified');
          onClose();
          alert('Please verify your email address before signing in. Check your inbox for a verification link.');
        } else {
          console.log('User signed in successfully');
          onSuccess();
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      setError(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setShowPasswordRequirements(false);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <Card className="bg-[#ffffff] border-[#a8b892] max-w-md w-full">
          <CardHeader className="bg-[#556B2F] text-[#f8f9f6]">
            <div className="flex justify-between items-center">
              <CardTitle>{isSignUp ? 'Create Account' : 'Sign In'}</CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={onClose}
                className="text-[#f8f9f6] hover:bg-[#6B7F3F]"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div>
                  <Label htmlFor="fullName" className="text-[#2d3d1f]">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="mt-1 bg-[#ffffff] border-[#a8b892] focus:border-[#556B2F] focus:ring-[#556B2F]"
                    placeholder="Enter your full name"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="email" className="text-[#2d3d1f]">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1 bg-[#ffffff] border-[#a8b892] focus:border-[#556B2F] focus:ring-[#556B2F]"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-[#2d3d1f]">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => isSignUp && setShowPasswordRequirements(true)}
                    required
                    className="mt-1 bg-[#ffffff] border-[#a8b892] focus:border-[#556B2F] focus:ring-[#556B2F] pr-10"
                    placeholder="Enter your password"
                    minLength={isSignUp ? 8 : 6}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-auto p-1 text-[#556B2F] hover:bg-transparent"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {isSignUp && (
                <div>
                  <Label htmlFor="confirmPassword" className="text-[#2d3d1f]">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="mt-1 bg-[#ffffff] border-[#a8b892] focus:border-[#556B2F] focus:ring-[#556B2F] pr-10"
                      placeholder="Confirm your password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-auto p-1 text-[#556B2F] hover:bg-transparent"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                  {confirmPassword && !doPasswordsMatch && (
                    <p className="text-red-600 text-sm mt-1 flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Passwords do not match
                    </p>
                  )}
                </div>
              )}

              {/* Password Requirements */}
              {isSignUp && showPasswordRequirements && (
                <div className="bg-[#f8f9f6] border border-[#a8b892] rounded-lg p-3">
                  <p className="text-sm text-[#2d3d1f] mb-2">Password requirements:</p>
                  <div className="space-y-1">
                    {passwordRequirements.map((req, index) => (
                      <div key={index} className="flex items-center text-xs">
                        <Check 
                          className={`w-3 h-3 mr-2 ${
                            req.test(password) ? 'text-green-600' : 'text-gray-400'
                          }`} 
                        />
                        <span className={req.test(password) ? 'text-green-600' : 'text-[#3c4f21]'}>
                          {req.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="space-y-3">
                  <div className="text-red-600 text-sm bg-red-50 p-2 rounded flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    {error}
                  </div>
                  
                  {/* Show resend verification option for sign-in errors that might be due to unverified email */}
                  {!isSignUp && error.includes('Invalid email or password') && email && (
                    <div className="text-center">
                      <Button
                        type="button"
                        onClick={() => {
                          setResendEmail(email);
                          setShowResendHelper(true);
                        }}
                        variant="outline"
                        size="sm"
                        className="border-[#556B2F] text-[#556B2F] hover:bg-[#556B2F] hover:text-[#f8f9f6]"
                      >
                        Need to verify your email?
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || !isFormValid}
                className="w-full bg-[#c54a2c] hover:bg-[#b8432a] text-[#f8f9f6] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Loading...' : (isSignUp ? 'Create Account' : 'Sign In')}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={toggleMode}
                  className="text-[#556B2F] hover:underline"
                >
                  {isSignUp 
                    ? 'Already have an account? Sign in' 
                    : "Don't have an account? Sign up"
                  }
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
      
      {/* Resend Verification Helper */}
      {showResendHelper && (
        <ResendVerificationHelper 
          email={resendEmail}
          onClose={() => setShowResendHelper(false)}
        />
      )}
    </>
  );
}