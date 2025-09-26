import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Camera, Check, X, Upload } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { ImageCropperModal } from './ImageCropperModal';
import type { User } from '../App';

type ProfilePageProps = {
  user: User;
  onUpdate: (user: User) => void;
  authSession?: any;
  onReloadProfile?: () => void;
};

export function ProfilePage({ user, onUpdate, authSession, onReloadProfile }: ProfilePageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name,
    farmName: user.farmName || '',
    bio: user.bio || '',
    location: user.location || '',
  });
  const [profileImage, setProfileImage] = useState(user.profilePicture || '');
  const [showImageCropper, setShowImageCropper] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debug user prop changes
  useEffect(() => {
    console.log('ProfilePage: user prop changed:', {
      id: user.id,
      name: user.name,
      profilePicture: user.profilePicture ? user.profilePicture.substring(0, 50) + '...' : 'null'
    });
    
    // Update local state when user prop changes
    setFormData({
      name: user.name,
      farmName: user.farmName || '',
      bio: user.bio || '',
      location: user.location || '',
    });
    setProfileImage(user.profilePicture || '');
  }, [user]);

  // Check Stripe status on component mount and when user changes
  useEffect(() => {
    let mounted = true;
    
    if (user && !user.stripeConnected && authSession?.access_token && mounted) {
      checkStripeStatus();
    }
    
    return () => {
      mounted = false;
    };
  }, [user?.id, user?.stripeConnected, authSession?.access_token]);

  const checkStripeStatus = async () => {
    if (!authSession?.access_token || !user) return;
    
    try {
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-568778ec/stripe/status/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${authSession.access_token}`
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const statusData = await response.json();
        if (statusData.connected && !user.stripeConnected) {
          // Status has changed, reload the profile
          if (onReloadProfile) {
            onReloadProfile();
          }
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('Stripe status check timed out');
      } else {
        console.error('Error checking Stripe status:', error);
      }
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      
      // Check if it's a HEIC file and convert it
      if (file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
        convertHEICToJPEG(file);
      } else {
        // Create preview URL for the cropper
        const url = URL.createObjectURL(file);
        setImagePreviewUrl(url);
        setShowImageCropper(true);
      }
    }
  };

  const convertHEICToJPEG = async (heicFile: File) => {
    try {
      // Import heic2any dynamically
      const heic2any = (await import('heic2any')).default;
      
      // Convert HEIC to JPEG
      const convertedBlob = await heic2any({
        blob: heicFile,
        toType: 'image/jpeg',
        quality: 0.9
      }) as Blob;
      
      // Create a new File object from the converted blob
      const convertedFile = new File([convertedBlob], heicFile.name.replace(/\.(heic|heif)$/i, '.jpg'), {
        type: 'image/jpeg'
      });
      
      setSelectedFile(convertedFile);
      
      // Create preview URL for the cropper
      const url = URL.createObjectURL(convertedFile);
      setImagePreviewUrl(url);
      setShowImageCropper(true);
    } catch (error) {
      console.error('Error converting HEIC file:', error);
      alert('Sorry, there was an error processing your HEIC image. Please try selecting a different image or convert it to JPEG first.');
    }
  };

  const handleImageCrop = (croppedImageUrl: string) => {
    console.log('Profile picture cropped:', croppedImageUrl.substring(0, 50) + '...');
    setProfileImage(croppedImageUrl);
    setShowImageCropper(false);
    setSelectedFile(null);
    // Clean up the preview URL
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl('');
    }
  };

  const handleCropCancel = () => {
    setShowImageCropper(false);
    setSelectedFile(null);
    // Clean up the preview URL
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!authSession?.access_token) {
        throw new Error('No authorization token available');
      }

      const updateData = {
        ...formData,
        profilePicture: profileImage
      };
      
      console.log('Saving profile with profilePicture:', profileImage ? profileImage.substring(0, 50) + '...' : 'null');
      console.log('Update data keys:', Object.keys(updateData));

      // Update user profile on server
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-568778ec/user/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authSession.access_token}`
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        const userData = await response.json();
        console.log('Profile saved successfully, returned profilePicture:', userData.profilePicture ? userData.profilePicture.substring(0, 50) + '...' : 'null');
        onUpdate(userData);
        setIsEditing(false);
      } else {
        const errorText = await response.text();
        console.error('Server error:', response.status, errorText);
        throw new Error(`Failed to update profile: ${errorText}`);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert(`Failed to update profile: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStripeConnect = async () => {
    setStripeLoading(true);
    try {
      if (!authSession?.access_token) {
        throw new Error('No authorization token available');
      }

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-568778ec/stripe/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authSession.access_token}`
        },
        body: JSON.stringify({ userId: user.id })
      });

      if (response.ok) {
        const { url } = await response.json();
        console.log('Stripe onboarding URL:', url);
        
        // Try opening in a new window first
        const newWindow = window.open(url, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
        
        if (!newWindow || newWindow.closed || typeof newWindow.closed == 'undefined') {
          // If popup was blocked, fall back to current window
          console.log('Popup blocked, redirecting in current window');
          window.location.href = url;
        } else {
          // Monitor the popup window
          const checkClosed = setInterval(() => {
            if (newWindow.closed) {
              clearInterval(checkClosed);
              // Reload user profile to check if Stripe was connected
              setTimeout(() => {
                if (onReloadProfile) {
                  onReloadProfile();
                }
              }, 1000);
            }
          }, 1000);
        }
      } else {
        const errorText = await response.text();
        console.error('Stripe connect error:', response.status, errorText);
        throw new Error(`Failed to create Stripe connect URL: ${errorText}`);
      }
    } catch (error) {
      console.error('Error connecting to Stripe:', error);
      alert(`Failed to connect to Stripe: ${error.message}`);
    } finally {
      setStripeLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card className="bg-[#ffffff] border-[#a8b892] shadow-lg">
        <CardHeader className="bg-[#556B2F] text-[#f8f9f6]">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl">Profile</CardTitle>
              <p className="text-[#a8b892]">Manage your homesteading profile</p>
            </div>
            {!isEditing && (
              <Button
                onClick={() => setIsEditing(true)}
                variant="secondary"
                className="bg-[#f8f9f6] text-[#556B2F] hover:bg-[#f0f2ed]"
              >
                Edit Profile
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Profile Picture */}
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-[#a8b892] flex items-center justify-center overflow-hidden">
                    {profileImage ? (
                      <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-8 h-8 text-[#556B2F]" />
                    )}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0 bg-[#556B2F] hover:bg-[#6B7F3F]"
                  >
                    <Upload className="w-4 h-4" />
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.heic,.heif"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </div>
                <div>
                  <h3 className="text-lg text-[#2d3d1f]">Profile Picture</h3>
                  <p className="text-sm text-[#3c4f21]">Upload a photo to help others recognize you (supports HEIC from iPhone)</p>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="name" className="text-[#2d3d1f]">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                    className="mt-1 bg-[#ffffff] border-[#a8b892] focus:border-[#556B2F] focus:ring-[#556B2F]"
                  />
                </div>

                <div>
                  <Label htmlFor="farmName" className="text-[#2d3d1f]">Farm/Homestead Name</Label>
                  <Input
                    id="farmName"
                    value={formData.farmName}
                    onChange={(e) => setFormData(prev => ({ ...prev, farmName: e.target.value }))}
                    className="mt-1 bg-[#ffffff] border-[#a8b892] focus:border-[#556B2F] focus:ring-[#556B2F]"
                    placeholder="e.g., Green Valley Farm"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="location" className="text-[#2d3d1f]">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    className="mt-1 bg-[#ffffff] border-[#a8b892] focus:border-[#556B2F] focus:ring-[#556B2F]"
                    placeholder="City, State"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="bio" className="text-[#2d3d1f]">Bio</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                    className="mt-1 bg-[#ffffff] border-[#a8b892] focus:border-[#556B2F] focus:ring-[#556B2F] resize-none"
                    rows={4}
                    placeholder="Tell others about your homesteading journey..."
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-[#a8b892]">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-[#c54a2c] hover:bg-[#b8432a] text-[#f8f9f6]"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      name: user.name,
                      farmName: user.farmName || '',
                      bio: user.bio || '',
                      location: user.location || '',
                    });
                    setProfileImage(user.profilePicture || '');
                  }}
                  className="flex-1 border-[#556B2F] text-[#556B2F] hover:bg-[#556B2F] hover:text-[#f8f9f6]"
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              {/* Profile Display */}
              <div className="flex items-center space-x-6">
                <div className="w-24 h-24 rounded-full bg-[#a8b892] flex items-center justify-center overflow-hidden">
                  {user.profilePicture ? (
                    <img src={user.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-8 h-8 text-[#556B2F]" />
                  )}
                </div>
                <div>
                  <h2 className="text-2xl text-[#2d3d1f]">{user.name}</h2>
                  {user.farmName && <p className="text-lg text-[#3c4f21]">{user.farmName}</p>}
                  {user.location && <p className="text-[#3c4f21]">{user.location}</p>}
                </div>
              </div>

              {user.bio && (
                <div>
                  <h3 className="text-lg font-semibold text-[#2d3d1f] mb-2">About</h3>
                  <p className="text-[#3c4f21]">{user.bio}</p>
                </div>
              )}

              {/* Account Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-[#a8b892]">
                <div>
                  <h3 className="text-lg font-semibold text-[#2d3d1f] mb-2">Account Information</h3>
                  <p className="text-[#3c4f21]">Email: {user.email}</p>
                  <p className="text-[#3c4f21]">Member since: {new Date(user.createdAt).toLocaleDateString()}</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-[#2d3d1f] mb-2">Teaching Status</h3>
                  <div className="flex items-center gap-2">
                    {user.stripeConnected ? (
                      <Badge className="bg-green-100 text-green-800">
                        <Check className="w-3 h-3 mr-1" />
                        Stripe Connected
                      </Badge>
                    ) : (
                      <div className="space-y-2">
                        <Badge className="bg-yellow-100 text-yellow-800">
                          <X className="w-3 h-3 mr-1" />
                          Stripe Not Connected
                        </Badge>
                        <div>
                          <Button
                            onClick={handleStripeConnect}
                            disabled={stripeLoading}
                            size="sm"
                            className="bg-[#635bff] hover:bg-[#5a52e0] text-white"
                          >
                            {stripeLoading ? 'Connecting...' : 'Connect Stripe'}
                          </Button>
                          <p className="text-xs text-[#3c4f21] mt-1">
                            Required to receive payments for classes
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image Cropper Modal */}
      {showImageCropper && imagePreviewUrl && (
        <ImageCropperModal
          imageUrl={imagePreviewUrl}
          onCrop={handleImageCrop}
          onCancel={handleCropCancel}
        />
      )}
    </div>
  );
}