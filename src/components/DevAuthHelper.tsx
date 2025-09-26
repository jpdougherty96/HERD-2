import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Settings, User, Zap, AlertTriangle } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';

type DevAuthHelperProps = {
  onAuthSuccess: () => void;
};

export function DevAuthHelper({ onAuthSuccess }: DevAuthHelperProps) {
  const [email, setEmail] = useState('test@herdapp.com');
  const [password, setPassword] = useState('TestPassword123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Safe development mode check
  const isDevelopment = typeof import.meta !== 'undefined' && 
                       import.meta.env && 
                       import.meta.env.DEV === true;

  const handleDevSignUp = async () => {
    setLoading(true);
    setError('');

    try {
      console.log('🔧 Dev: Creating account without email verification...');
      
      // Try to sign up and immediately confirm via server
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: 'Test User' }
        }
      });

      if (signUpError) {
        throw signUpError;
      }

      console.log('🔧 Dev: Sign up response:', signUpData);

      if (signUpData.user && !signUpData.session) {
        // Try to manually confirm the user via our dev endpoint
        console.log('🔧 Dev: Attempting to manually confirm user...');
        
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-568778ec/dev/confirm-user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({ 
            userId: signUpData.user.id,
            email: signUpData.user.email
          })
        });

        if (response.ok) {
          console.log('🔧 Dev: User confirmed successfully');
          
          // Now try to sign in
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password
          });

          if (signInError) {
            throw signInError;
          }

          console.log('🔧 Dev: Sign in successful:', signInData);
          onAuthSuccess();
          alert('🎉 Development account created and signed in successfully!');
        } else {
          const errorText = await response.text();
          throw new Error(`Failed to confirm user: ${errorText}`);
        }
      } else if (signUpData.session) {
        // User was automatically signed in
        console.log('🔧 Dev: User automatically signed in');
        onAuthSuccess();
        alert('🎉 Development account created and signed in successfully!');
      }
    } catch (error: any) {
      console.error('🔧 Dev: Error in dev auth flow:', error);
      
      if (error.message.includes('already registered')) {
        // Try to sign in instead
        try {
          const { data, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password
          });

          if (signInError) {
            throw signInError;
          }

          onAuthSuccess();
          alert('🎉 Signed in with existing development account!');
        } catch (signInError: any) {
          setError(`Sign in failed: ${signInError.message}`);
        }
      } else {
        setError(error.message || 'An error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDirectSignIn = async () => {
    setLoading(true);
    setError('');

    try {
      console.log('🔧 Dev: Attempting direct sign in...');
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw error;
      }

      console.log('🔧 Dev: Direct sign in successful:', data);
      onAuthSuccess();
      alert('🎉 Signed in successfully!');
    } catch (error: any) {
      console.error('🔧 Dev: Direct sign in error:', error);
      setError(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSignIn = async () => {
    setLoading(true);
    setError('');

    try {
      console.log('🔧 Dev: Quick sign in with test@herdapp.com...');
      
      // First try to sign in
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: 'test@herdapp.com',
        password: 'TestPassword123!'
      });

      if (signInData?.user) {
        console.log('🔧 Dev: Quick sign in successful:', signInData);
        onAuthSuccess();
        alert('🎉 Quick sign in successful!');
        return;
      }

      // If sign in failed, try to create the account
      console.log('🔧 Dev: Account doesn\'t exist, creating...');
      
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: 'test@herdapp.com',
        password: 'TestPassword123!',
        options: {
          data: { full_name: 'Test User' }
        }
      });

      if (signUpError) {
        throw signUpError;
      }

      console.log('🔧 Dev: Account created:', signUpData);

      if (signUpData.user && !signUpData.session) {
        // Confirm the user via our dev endpoint
        console.log('🔧 Dev: Confirming user...');
        
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-568778ec/dev/confirm-user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({ 
            userId: signUpData.user.id,
            email: signUpData.user.email
          })
        });

        if (response.ok) {
          // Now sign in
          const { data: finalSignInData, error: finalSignInError } = await supabase.auth.signInWithPassword({
            email: 'test@herdapp.com',
            password: 'TestPassword123!'
          });

          if (finalSignInError) {
            throw finalSignInError;
          }

          console.log('🔧 Dev: Final sign in successful:', finalSignInData);
          onAuthSuccess();
          alert('🎉 Test account created and signed in!');
        } else {
          const errorText = await response.text();
          throw new Error(`Failed to confirm user: ${errorText}`);
        }
      } else if (signUpData.session) {
        console.log('🔧 Dev: User automatically signed in');
        onAuthSuccess();
        alert('🎉 Test account created and signed in!');
      }
    } catch (error: any) {
      console.error('🔧 Dev: Quick sign in error:', error);
      setError(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isDevelopment) {
    return null;
  }

  return (
    <Card className="mx-4 mt-4 bg-orange-50 border-orange-200">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Settings className="w-5 h-5 text-orange-600" />
          <h3 className="text-orange-900 font-medium">Development Authentication Helper</h3>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
            <div className="text-yellow-800 text-sm">
              <p className="font-medium mb-1">Development Mode Only</p>
              <p>This helper creates test accounts and bypasses email verification for development purposes.</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="devEmail" className="text-sm text-orange-900">Test Email</Label>
            <Input
              id="devEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 text-sm"
              placeholder="test@herdapp.com"
            />
          </div>

          <div>
            <Label htmlFor="devPassword" className="text-sm text-orange-900">Test Password</Label>
            <Input
              id="devPassword"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 text-sm"
              placeholder="TestPassword123!"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleDevSignUp}
              disabled={loading}
              size="sm"
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
            >
              {loading ? 'Creating...' : (
                <>
                  <User className="w-3 h-3 mr-1" />
                  Create & Sign In
                </>
              )}
            </Button>

            <Button
              onClick={handleDirectSignIn}
              disabled={loading}
              variant="outline"
              size="sm"
              className="flex-1 border-orange-300 text-orange-700 hover:bg-orange-50"
            >
              {loading ? 'Signing In...' : (
                <>
                  <Zap className="w-3 h-3 mr-1" />
                  Direct Sign In
                </>
              )}
            </Button>
          </div>

          <div className="w-full">
            <Button
              onClick={handleQuickSignIn}
              disabled={loading}
              size="sm"
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              {loading ? 'Working...' : '⚡ Quick Test Sign In (test@herdapp.com)'}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}