import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Mail, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../utils/supabase/client';

type EmailVerificationBannerProps = {
  userEmail?: string;
};

export function EmailVerificationBanner({ userEmail }: EmailVerificationBannerProps) {
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [lastResendTime, setLastResendTime] = useState<number | null>(null);

  const handleResendVerification = async () => {
    if (!userEmail) return;

    // Prevent spam - only allow resend every 60 seconds
    const now = Date.now();
    if (lastResendTime && now - lastResendTime < 60000) {
      const remainingTime = Math.ceil((60000 - (now - lastResendTime)) / 1000);
      alert(`Please wait ${remainingTime} seconds before requesting another verification email.`);
      return;
    }

    setIsResending(true);
    setResendStatus('idle');

    try {
      console.log('Attempting to resend verification email to:', userEmail);
      
      // Safe environment variable access
      const supabaseUrl = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_URL : 'unknown';
      console.log('Supabase URL:', supabaseUrl);
      console.log('Using resend with type: signup');
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: userEmail,
      });

      if (error) {
        console.error('Resend verification error details:', {
          message: error.message,
          status: error.status,
          name: error.name
        });
        throw error;
      }

      console.log('Verification email resent successfully');
      setResendStatus('success');
      setLastResendTime(now);
      
      // Reset success message after 5 seconds
      setTimeout(() => {
        setResendStatus('idle');
      }, 5000);
    } catch (error: any) {
      console.error('Error resending verification email:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to send verification email. ';
      
      if (error.message?.includes('email confirmation')) {
        errorMessage += 'Email verification is not enabled for this project. You need to configure email settings in your Supabase dashboard.';
      } else if (error.message?.includes('rate limit')) {
        errorMessage += 'Too many requests. Please wait before trying again.';
      } else if (error.status === 422) {
        errorMessage += 'Email confirmation may not be enabled in your Supabase project settings.';
      } else {
        errorMessage += `Error: ${error.message}`;
      }
      
      setResendStatus('error');
      alert(errorMessage);
      
      // Reset error message after 5 seconds
      setTimeout(() => {
        setResendStatus('idle');
      }, 5000);
    } finally {
      setIsResending(false);
    }
  };

  const getStatusIcon = () => {
    switch (resendStatus) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Mail className="w-4 h-4 text-[#556B2F]" />;
    }
  };

  const getStatusMessage = () => {
    switch (resendStatus) {
      case 'success':
        return 'Verification email sent! Check your inbox.';
      case 'error':
        return 'Failed to send verification email. Please try again.';
      default:
        return `Please verify your email address (${userEmail}) to access all features.`;
    }
  };

  const getStatusColor = () => {
    switch (resendStatus) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-[#fff8dc] border-[#c54a2c]';
    }
  };

  return (
    <Card className={`mx-4 mt-4 border-2 ${getStatusColor()} shadow-sm`}>
      <div className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <p className="text-sm text-[#2d3d1f]">
                {getStatusMessage()}
              </p>
              {resendStatus === 'idle' && (
                <p className="text-xs text-[#3c4f21] mt-1">
                  You can browse content but cannot book classes or create posts until verified.
                </p>
              )}
            </div>
          </div>
          
          {resendStatus !== 'success' && (
            <Button
              onClick={handleResendVerification}
              disabled={isResending}
              variant="outline"
              size="sm"
              className="border-[#556B2F] text-[#556B2F] hover:bg-[#556B2F] hover:text-[#f8f9f6] whitespace-nowrap"
            >
              {isResending ? (
                <>
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-3 h-3 mr-1" />
                  Resend Email
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}