import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { AlertCircle, Info, Eye, EyeOff, Settings, CheckCircle } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { ResendVerificationButton } from './ResendVerificationButton';
import { projectId, publicAnonKey } from '../utils/supabase/info';

type EmailDebugInfoProps = {
  authSession: any;
};

export function EmailDebugInfo({ authSession }: EmailDebugInfoProps) {
  const [showDebug, setShowDebug] = useState(false);
  const [authConfig, setAuthConfig] = useState<any>(null);
  const [testEmail, setTestEmail] = useState('test@example.com');
  const [isFixing, setIsFixing] = useState(false);

  // Safe development mode check
  const isDevelopment = typeof import.meta !== 'undefined' && 
                       import.meta.env && 
                       import.meta.env.DEV === true;

  useEffect(() => {
    const checkAuthConfig = async () => {
      try {
        // Try to get some auth configuration info
        const { data: { session } } = await supabase.auth.getSession();
        
        // Safe environment variable access
        const getEnvVar = (key: string) => {
          if (typeof import.meta !== 'undefined' && import.meta.env) {
            return import.meta.env[key];
          }
          return undefined;
        };

        setAuthConfig({
          hasSession: !!session,
          userEmail: session?.user?.email,
          emailConfirmed: !!session?.user?.email_confirmed_at,
          emailConfirmedAt: session?.user?.email_confirmed_at,
          userMetadata: session?.user?.user_metadata,
          appMetadata: session?.user?.app_metadata,
          supabaseUrl: `https://${projectId}.supabase.co`,
          supabaseConfigured: true,
          projectId: projectId,
          isDevelopment: isDevelopment,
        });
      } catch (error) {
        console.error('Error checking auth config:', error);
      }
    };

    if (authSession) {
      checkAuthConfig();
    }
  }, [authSession, isDevelopment]);

  const handleDevFix = async () => {
    if (!authSession?.user) return;
    
    setIsFixing(true);
    try {
      // Try to manually confirm the user using admin API
      console.log('Attempting to manually confirm user:', authSession.user.email);
      
      // Use the configured Supabase info instead of environment variables
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-568778ec/dev/confirm-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ 
          userId: authSession.user.id,
          email: authSession.user.email 
        })
      });

      if (response.ok) {
        alert('User confirmed! Please refresh the page.');
        window.location.reload();
      } else {
        const error = await response.text();
        console.error('Failed to confirm user:', error);
        alert('Failed to confirm user. This feature requires server-side implementation.');
      }
    } catch (error) {
      console.error('Error confirming user:', error);
      alert('Error confirming user. Check console for details.');
    } finally {
      setIsFixing(false);
    }
  };

  const testSignUp = async () => {
    try {
      console.log('Testing sign up with:', testEmail);
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: 'TestPassword123!',
        options: {
          data: { full_name: 'Test User' }
        }
      });
      
      console.log('Test sign up result:', { data, error });
      alert(`Test sign up: ${error ? `Error - ${error.message}` : 'Success!'}`);
    } catch (error) {
      console.error('Test sign up error:', error);
    }
  };

  if (!showDebug) {
    return (
      <Card className="mx-4 mt-4 bg-blue-50 border-blue-200">
        <div className="p-3">
          <Button
            onClick={() => setShowDebug(true)}
            variant="ghost"
            size="sm"
            className="text-blue-700 hover:bg-blue-100 p-2 h-auto"
          >
            <Info className="w-4 h-4 mr-2" />
            Debug Email Issues (Development Only)
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="mx-4 mt-4 bg-blue-50 border-blue-200">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-blue-900 font-medium flex items-center">
            <AlertCircle className="w-4 h-4 mr-2" />
            Email Verification Debug Info
          </h3>
          <Button
            onClick={() => setShowDebug(false)}
            variant="ghost"
            size="sm"
            className="text-blue-700 hover:bg-blue-100"
          >
            <EyeOff className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-3 text-sm">
          <div className="bg-white rounded p-3">
            <h4 className="font-medium text-blue-900 mb-2">Current Auth Status:</h4>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
              {JSON.stringify(authConfig, null, 2)}
            </pre>
          </div>

          {/* Development Tools */}
          {isDevelopment && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
              <h4 className="font-medium text-yellow-900 mb-2 flex items-center">
                <Settings className="w-4 h-4 mr-1" />
                Development Tools:
              </h4>
              
              <div className="space-y-2">
                <div className="flex gap-2 items-center">
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="px-2 py-1 border rounded text-xs flex-1"
                    placeholder="Test email"
                  />
                  <Button
                    onClick={testSignUp}
                    size="sm"
                    className="text-xs bg-yellow-600 hover:bg-yellow-700"
                  >
                    Test Sign Up
                  </Button>
                </div>

                {authSession?.user && !authSession.user.email_confirmed_at && (
                  <div className="space-y-2">
                    <Button
                      onClick={handleDevFix}
                      disabled={isFixing}
                      size="sm"
                      className="text-xs bg-green-600 hover:bg-green-700 w-full"
                    >
                      {isFixing ? 'Fixing...' : '🔧 Dev Fix: Confirm This User'}
                    </Button>
                    
                    <div className="text-center">
                      <div className="text-xs text-yellow-800 mb-1">Or try resending verification:</div>
                      <ResendVerificationButton 
                        email={authSession.user.email} 
                        size="sm" 
                        className="text-xs"
                        showStatus={true}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-red-50 border border-red-200 rounded p-3">
            <h4 className="font-medium text-red-900 mb-2">Likely Issue:</h4>
            <ul className="text-red-800 space-y-1 text-xs">
              <li>• Email confirmation is disabled in Supabase settings</li>
              <li>• Users can create accounts but can't sign in</li>
              <li>• Supabase treats unverified accounts as non-existent</li>
            </ul>
          </div>

          <div className="bg-green-50 border border-green-200 rounded p-3">
            <h4 className="font-medium text-green-900 mb-2">How to Fix:</h4>
            <ol className="text-green-800 space-y-1 text-xs">
              <li>1. Go to Supabase Dashboard → Authentication → Settings</li>
              <li>2. Under "User Signups", enable "Confirm email"</li>
              <li>3. Configure SMTP settings or use Supabase's email service</li>
              <li>4. For development: Consider disabling email confirmation temporarily</li>
              <li>5. Alternative: Set up custom SMTP provider (Gmail, SendGrid, etc.)</li>
            </ol>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded p-3">
            <h4 className="font-medium text-purple-900 mb-2">Supabase Configuration:</h4>
            <div className="text-xs space-y-1">
              <div>Supabase URL: ✅ https://{projectId}.supabase.co</div>
              <div>Project ID: ✅ {projectId}</div>
              <div>Anon Key: ✅ Configured</div>
              <div>Development Mode: {isDevelopment ? '✅ Yes' : '❌ No'}</div>
              <div>Email Bypass: {(typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BYPASS_EMAIL_VERIFICATION === 'true') ? '✅ Enabled' : '❌ Disabled'}</div>
            </div>
            
            {isDevelopment && (typeof import.meta === 'undefined' || !import.meta.env || import.meta.env.VITE_BYPASS_EMAIL_VERIFICATION !== 'true') && (
              <div className="mt-2 p-2 bg-purple-100 rounded text-xs">
                <strong>💡 Quick Fix:</strong> Add <code>VITE_BYPASS_EMAIL_VERIFICATION=true</code> to your environment to skip email verification in development.
              </div>
            )}
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded p-3">
            <h4 className="font-medium text-gray-900 mb-2">Console Logs:</h4>
            <p className="text-gray-700 text-xs">
              Check your browser's developer console (F12) for detailed logs about auth operations.
              All auth events are logged with detailed information.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}