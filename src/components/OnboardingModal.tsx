import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import type { User } from '../App';

type OnboardingModalProps = {
  onComplete: (user: User) => void;
  authSession: any;
};

export function OnboardingModal({ onComplete, authSession }: OnboardingModalProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Pre-fill name from auth metadata if available
    if (authSession?.user?.user_metadata?.full_name) {
      setName(authSession.user.user_metadata.full_name);
    }
  }, [authSession]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-568778ec/user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authSession.access_token}`
        },
        body: JSON.stringify({
          id: authSession.user.id,
          email: authSession.user.email,
          name: name.trim(),
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || 'Failed to create user profile');
      }

      const userData = await response.json();
      onComplete(userData);
    } catch (error: any) {
      console.error('Onboarding error:', error);
      setError(error.message || 'Failed to complete onboarding');
    } finally {
      setLoading(false);
    }
  };

  const isNameFromAuth = authSession?.user?.user_metadata?.full_name;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="bg-[#ffffff] border-[#a8b892] max-w-md w-full">
        <CardHeader className="bg-[#556B2F] text-[#f8f9f6]">
          <CardTitle>Welcome to HERD!</CardTitle>
          <p className="text-[#a8b892] text-sm">
            {isNameFromAuth ? 'Complete your profile setup' : 'Let\'s set up your profile'}
          </p>
        </CardHeader>
        
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-[#2d3d1f]">Email</Label>
              <Input
                id="email"
                type="email"
                value={authSession?.user?.email || ''}
                disabled
                className="mt-1 bg-gray-100 border-[#a8b892]"
              />
            </div>

            <div>
              <Label htmlFor="name" className="text-[#2d3d1f]">Full Name *</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-1 bg-[#ffffff] border-[#a8b892] focus:border-[#556B2F] focus:ring-[#556B2F]"
                placeholder="Enter your full name"
                disabled={!!isNameFromAuth}
              />
              {isNameFromAuth && (
                <p className="text-xs text-[#3c4f21] mt-1">
                  Name from account registration. You can edit this later in your profile.
                </p>
              )}
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full bg-[#c54a2c] hover:bg-[#b8432a] text-[#f8f9f6]"
            >
              {loading ? 'Creating Profile...' : 'Complete Setup'}
            </Button>

            <p className="text-sm text-[#3c4f21] text-center">
              You can add more details to your profile later, including your farm information and Stripe connection for teaching classes.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}