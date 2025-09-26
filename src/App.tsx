import React, { useState, useEffect } from 'react';
import { HomePage } from './components/HomePage';
import { ClassForm } from './components/ClassForm';
import { ClassListing } from './components/ClassListing';
import { ClassDetail } from './components/ClassDetail';
import { BulletinBoard } from './components/BulletinBoard';
import { Navigation } from './components/Navigation';
import { AuthModal } from './components/AuthModal';
import { OnboardingModal } from './components/OnboardingModal';
import { EmailVerificationBanner } from './components/EmailVerificationBanner';
import { EmailDebugInfo } from './components/EmailDebugInfo';
import { DevAuthHelper } from './components/DevAuthHelper';
import { ProfilePage } from './components/ProfilePage';
import { Dashboard } from './components/Dashboard';
import { ClassManagement } from './components/ClassManagement';
import { BookingTestHelper } from './components/BookingTestHelper';
import { ServerDiagnostics } from './components/ServerDiagnostics';
import { ClassSyncHelper } from './components/ClassSyncHelper';
import { supabase } from './utils/supabase/client';
import { projectId, publicAnonKey } from './utils/supabase/info';

export type User = {
  id: string;
  email: string;
  name: string;
  farmName?: string;
  bio?: string;
  profilePicture?: string;
  location?: string;
  stripeConnected: boolean;
  isAdmin?: boolean;
  createdAt: string;
};

export type Class = {
  id: string;
  title: string;
  shortSummary: string;
  startDate: string;
  startTime: string;
  numberOfDays: number;
  hoursPerDay?: number;
  pricePerPerson: number;
  maxStudents: number;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country?: string;
  };
  instructorName: string;
  instructorId: string;
  minimumAge: number;
  instructorBio: string;
  advisories: string;
  houseRules: string;
  photos?: string[];
  autoApproveBookings: boolean;
  createdAt: string;
};

export type Post = {
  id: string;
  title: string;
  content: string;
  author: string;
  authorId: string;
  createdAt: string;
  category: string;
  photos?: string[];
};

export default function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'classes' | 'class-detail' | 'create-class' | 'bulletin' | 'profile' | 'dashboard' | 'manage-class'>('home');
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [classes, setClasses] = useState<Class[]>(() => {
    // Load classes from localStorage on initial render
    if (typeof window !== 'undefined') {
      try {
        const savedClasses = localStorage.getItem('herd-classes');
        if (savedClasses) {
          const parsedClasses = JSON.parse(savedClasses);
          return parsedClasses;
        }
      } catch (error) {
        console.error('Error loading classes from localStorage:', error);
      }
    }
    
    // Start with empty array - no mock classes
    return [];
  });
  const [posts, setPosts] = useState<Post[]>(() => {
    // Load posts from localStorage on initial render
    if (typeof window !== 'undefined') {
      try {
        const savedPosts = localStorage.getItem('herd-bulletin-posts');
        return savedPosts ? JSON.parse(savedPosts) : [];
      } catch (error) {
        console.error('Error loading posts from localStorage:', error);
        return [];
      }
    }
    return [];
  });
  const [user, setUser] = useState<User | null>(null);
  const [authSession, setAuthSession] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Loading...');
  const [emailVerified, setEmailVerified] = useState(true); // Track email verification status
  const [serverConnected, setServerConnected] = useState<boolean | null>(null); // Track server connectivity

  // Safe development mode check
  const isDevelopment = typeof import.meta !== 'undefined' && 
                       import.meta.env && 
                       import.meta.env.DEV === true;

  // Utility to get localStorage usage info
  const getStorageInfo = () => {
    if (typeof window === 'undefined') return null;
    
    try {
      let totalSize = 0;
      const sizes: Record<string, number> = {};
      
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          const value = localStorage.getItem(key) || '';
          const size = new Blob([value]).size;
          sizes[key] = size;
          totalSize += size;
        }
      }
      
      return {
        totalSizeKB: Math.round(totalSize / 1024),
        maxSizeKB: 5120, // Typical 5MB limit
        usagePercent: Math.round((totalSize / (5 * 1024 * 1024)) * 100),
        itemSizes: Object.entries(sizes).map(([key, size]) => ({
          key,
          sizeKB: Math.round(size / 1024)
        })).sort((a, b) => b.sizeKB - a.sizeKB)
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return null;
    }
  };

  // Safe environment variable access
  const getEnvVar = (key: string) => {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return import.meta.env[key];
    }
    return undefined;
  };

  // Development setting to bypass email verification
  const bypassEmailVerification = isDevelopment && 
    getEnvVar('VITE_BYPASS_EMAIL_VERIFICATION') === 'true';

  // Save posts to localStorage whenever posts change
  useEffect(() => {
    saveToLocalStorage('herd-bulletin-posts', posts, 1024); // 1MB limit for posts
  }, [posts]);

  // Utility function for safe localStorage operations with cleanup
  const saveToLocalStorage = (key: string, data: any, maxSizeKB: number = 2048) => {
    if (typeof window === 'undefined') return;
    
    try {
      const dataString = JSON.stringify(data);
      const dataSizeKB = new Blob([dataString]).size / 1024;
      
      console.log(`Attempting to save ${key}:`, {
        items: Array.isArray(data) ? data.length : 'N/A',
        sizeKB: Math.round(dataSizeKB),
        maxSizeKB
      });
      
      // If data is too large, try to compress by removing photos from older items
      if (dataSizeKB > maxSizeKB && Array.isArray(data) && key === 'herd-classes') {
        console.warn(`Data size (${Math.round(dataSizeKB)}KB) exceeds limit (${maxSizeKB}KB), removing photos from older classes`);
        
        // Sort by creation date and remove photos from older classes
        const compressedData = data
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .map((item, index) => {
            // Keep photos for newest 10 classes, remove for others
            if (index >= 10 && item.photos && item.photos.length > 0) {
              console.log(`Removing ${item.photos.length} photos from class: ${item.title}`);
              return { ...item, photos: [] };
            }
            return item;
          });
        
        const compressedString = JSON.stringify(compressedData);
        const compressedSizeKB = new Blob([compressedString]).size / 1024;
        
        console.log(`Compressed data size: ${Math.round(compressedSizeKB)}KB`);
        
        // If still too large, keep only the newest classes
        if (compressedSizeKB > maxSizeKB) {
          const limitedData = compressedData.slice(0, 20); // Keep only newest 20 classes
          const limitedString = JSON.stringify(limitedData);
          
          console.warn(`Further compressed to ${limitedData.length} newest classes`);
          localStorage.setItem(key, limitedString);
          return limitedData;
        } else {
          localStorage.setItem(key, compressedString);
          return compressedData;
        }
      } else {
        localStorage.setItem(key, dataString);
        return data;
      }
      
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.error('LocalStorage quota exceeded, attempting cleanup...');
        
        // Try to clear some space and retry
        try {
          // Remove old items first
          const keysToCheck = ['herd-classes', 'herd-bulletin-posts'];
          let spaceClearedKB = 0;
          
          for (const keyToClean of keysToCheck) {
            if (keyToClean !== key) {
              const oldData = localStorage.getItem(keyToClean);
              if (oldData) {
                const oldSizeKB = new Blob([oldData]).size / 1024;
                localStorage.removeItem(keyToClean);
                spaceClearedKB += oldSizeKB;
                console.log(`Removed ${keyToClean} (${Math.round(oldSizeKB)}KB) to free space`);
              }
            }
          }
          
          // If we're saving classes and cleared some space, try saving without photos
          if (key === 'herd-classes' && Array.isArray(data)) {
            const dataWithoutPhotos = data.map(item => ({ ...item, photos: [] }));
            const compressedString = JSON.stringify(dataWithoutPhotos);
            localStorage.setItem(key, compressedString);
            
            console.warn(`Saved classes without photos due to storage constraints. Cleared ${Math.round(spaceClearedKB)}KB`);
            
            // Show user-friendly message
            setTimeout(() => {
              alert('Storage space is limited. Some class photos have been removed from local storage to free space. Your classes are still saved, but photos may need to be re-uploaded when editing older classes.');
            }, 1000);
            
            return dataWithoutPhotos;
          } else {
            // For other data, try to save anyway
            localStorage.setItem(key, JSON.stringify(data));
            return data;
          }
          
        } catch (retryError) {
          console.error('Failed to save even after cleanup:', retryError);
          alert('Unable to save data locally due to storage limitations. The app will continue to work, but some data may not persist between sessions.');
          return null;
        }
      } else {
        console.error(`Error saving ${key} to localStorage:`, error);
        return null;
      }
    }
  };

  // Save classes to localStorage whenever classes change
  useEffect(() => {
    const savedData = saveToLocalStorage('herd-classes', classes, 3072); // 3MB limit for classes
    
    // If data was compressed, update state to reflect the changes
    if (savedData && savedData !== classes && Array.isArray(savedData)) {
      console.log('Classes were compressed during save, updating state');
      setClasses(savedData);
    }
  }, [classes]);

  // Load classes from server when user is loaded - try even if server connectivity is uncertain
  useEffect(() => {
    if (user) {
      // Try to load classes regardless of server connectivity status
      // This handles cases where health check might fail but actual endpoints work
      loadClassesFromServer();
    }
  }, [user]); // Removed serverConnected dependency to be more resilient

  const loadClassesFromServer = async () => {
    try {
      console.log('📚 Loading classes from server...');
      
      // Show user-friendly message for slow loading
      let slowLoadingTimeout = setTimeout(() => {
        console.log('📚 Classes taking longer than expected to load...');
      }, 5000);
      
      // Add timeout and abort controller with extended timeout for classes
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout for classes (server may be cold starting)
      
      const startTime = Date.now();
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-568778ec/classes`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        },
        signal: controller.signal
      });
      
      clearTimeout(slowLoadingTimeout);
      
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;
      
      if (response.ok) {
        const serverClasses = await response.json();
        console.log(`📚 Loaded classes from server in ${duration}ms:`, serverClasses.length, 'classes');
        
        // Validate that serverClasses is an array
        if (!Array.isArray(serverClasses)) {
          console.warn('Server returned non-array response for classes:', typeof serverClasses);
          return;
        }
        
        // Merge with local classes, server takes precedence
        setClasses(prevClasses => {
          const localClassIds = prevClasses.map(c => c.id);
          const newClasses = serverClasses.filter((c: Class) => !localClassIds.includes(c.id));
          const merged = [...prevClasses, ...newClasses];
          console.log('📚 Merged classes:', merged.length, 'total classes');
          return merged;
        });
      } else {
        const errorText = await response.text();
        console.warn(`❌ Failed to load classes from server (${duration}ms):`, response.status, errorText);
      }
    } catch (error) {
      clearTimeout(slowLoadingTimeout);
      
      if (error.name === 'AbortError') {
        console.warn('⏰ Classes loading request timed out after 20 seconds');
        console.log('📚 Server may be cold starting or experiencing high load. Using cached classes.');
        // Show user-friendly message about timeout
      } else {
        console.error('❌ Error loading classes from server:', error);
        console.log('📚 Network error loading classes from server. Using cached classes.');
      }
      
      // Don't mark server as disconnected just for classes loading issues
      // The server might be working for other operations
    }
  };

  // Health check function to test server connectivity
  const checkServerHealth = async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // Reasonable 8 second timeout for health check
      
      console.log('🔍 Checking server health at:', `https://${projectId}.supabase.co/functions/v1/make-server-8744ac0d/health`);
      
      const startTime = Date.now();
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8744ac0d/health`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Server health check passed in', duration + 'ms:', data);
        return true;
      } else {
        console.warn('❌ Server health check failed:', response.status, response.statusText, 'in', duration + 'ms');
        return false;
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn('⏰ Server health check timed out after 8 seconds');
      } else {
        console.warn('🚫 Server health check error:', error.message);
      }
      return false;
    }
  };

  useEffect(() => {
    let mounted = true;

    // Check for email verification success from URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('verified') === 'true') {
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Get initial session with timeout fallback
    Promise.race([
      supabase.auth.getSession(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Session check timeout')), 5000)
      )
    ]).then(({ data: { session } }: any) => {
      if (!mounted) return;
      
      setAuthSession(session);
      if (session?.user) {
        const actuallyVerified = !!session.user.email_confirmed_at || bypassEmailVerification;
        setEmailVerified(actuallyVerified);
        
        // Check server health before attempting to load profile
        checkServerHealth().then(isHealthy => {
          if (!mounted) return;
          
          setServerConnected(isHealthy);
          if (isHealthy) {
            console.log('Server is healthy, loading user profile normally');
            loadUserProfile(session.user.id, 0);
          } else {
            console.warn('Server health check failed, but attempting profile load anyway (server may be cold starting)');
            setLoadingMessage('Server appears to be starting up, this may take a moment...');
            loadUserProfile(session.user.id, 0);
          }
        });
      } else {
        setLoading(false);
      }
    }).catch((error) => {
      if (!mounted) return;
      console.warn('Session check failed or timed out:', error.message);
      setLoading(false);
      setServerConnected(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      
      setAuthSession(session);
      
      // Handle email confirmation
      if (event === 'SIGNED_IN' && session?.user) {
        const actuallyVerified = !!session.user.email_confirmed_at || bypassEmailVerification;
        setEmailVerified(actuallyVerified);
        if (session.user.email_confirmed_at) {
          // Check current URL params for newly verified users
          const currentUrlParams = new URLSearchParams(window.location.search);
          if (currentUrlParams.get('verified') === 'true') {
            setTimeout(() => {
              if (mounted) {
                alert('Email verified successfully! Welcome to HERD.');
              }
            }, 500);
          }
        }
        loadUserProfile(session.user.id, 0);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        const actuallyVerified = !!session.user.email_confirmed_at || bypassEmailVerification;
        setEmailVerified(actuallyVerified);
        // Only reload profile if we don't already have user data
        if (!user) {
          loadUserProfile(session.user.id, 0);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setEmailVerified(true);
        setLoading(false);
        // Redirect to home page when user signs out
        setCurrentPage('home');
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [bypassEmailVerification]);

  // Handle URL parameters for Stripe onboarding completion
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    let timeoutId: NodeJS.Timeout;
    let intervalId: NodeJS.Timeout;
    
    // Only process Stripe parameters once per page load
    const stripeParam = urlParams.get('stripe');
    if (!stripeParam) return;

    if (stripeParam === 'connected') {
      if (user) {
        // User data is available, process immediately
        timeoutId = setTimeout(() => {
          window.history.replaceState({}, document.title, window.location.pathname);
          alert('Stripe account connected successfully! You can now create classes.');
          loadUserProfile(user.id, 0);
          if (currentPage !== 'profile') {
            setCurrentPage('profile');
          }
        }, 500);
      } else {
        // Wait for user data to load, but with a timeout
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max
        
        intervalId = setInterval(() => {
          attempts++;
          if (user) {
            clearInterval(intervalId);
            window.history.replaceState({}, document.title, window.location.pathname);
            alert('Stripe account connected successfully! You can now create classes.');
            loadUserProfile(user.id, 0);
            if (currentPage !== 'profile') {
              setCurrentPage('profile');
            }
          } else if (attempts >= maxAttempts) {
            clearInterval(intervalId);
            window.history.replaceState({}, document.title, window.location.pathname);
            console.warn('Timeout waiting for user data after Stripe connection');
          }
        }, 100);
      }
    } else if (stripeParam === 'error') {
      timeoutId = setTimeout(() => {
        alert('There was an error connecting your Stripe account. Please try again.');
        window.history.replaceState({}, document.title, window.location.pathname);
      }, 500);
    } else if (stripeParam === 'refresh') {
      timeoutId = setTimeout(() => {
        alert('Stripe onboarding needs to be completed. Please finish the setup process.');
        window.history.replaceState({}, document.title, window.location.pathname);
      }, 500);
    }

    // Cleanup function
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [user]); // Only depend on user, not currentPage to avoid loops

  // Handle URL parameters for booking approval/denial from email links
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const pageParam = urlParams.get('page');
    const bookingParam = urlParams.get('booking');
    const actionParam = urlParams.get('action');
    
    console.log('📧 URL params detected:', { pageParam, bookingParam, actionParam, hasUser: !!user });
    
    // Only process booking parameters if they exist and user is loaded
    if (!pageParam || !bookingParam || !actionParam || !user) {
      if (pageParam || bookingParam || actionParam) {
        console.log('📧 Waiting for user to load before processing booking action...');
      }
      return;
    }
    
    if (pageParam === 'dashboard' && (actionParam === 'approve' || actionParam === 'decline')) {
      console.log('📧 Processing booking action from email link:', { bookingParam, actionParam });
      
      // Navigate to dashboard
      setCurrentPage('dashboard');
      
      // Show booking action modal or notification
      setTimeout(() => {
        const message = actionParam === 'approve' 
          ? `Do you want to approve booking ${bookingParam}?`
          : `Do you want to decline booking ${bookingParam}?`;
          
        if (confirm(message)) {
          console.log('📧 User confirmed action, executing:', actionParam);
          handleBookingAction(bookingParam, actionParam);
        } else {
          console.log('📧 User cancelled action');
        }
        
        // Clean up URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
      }, 1000);
    } else {
      console.log('📧 URL params do not match expected booking action format');
    }
  }, [user]);

  const handleBookingAction = async (bookingId: string, action: 'approve' | 'decline') => {
    if (!user) {
      console.error('📧 No user available for booking action');
      return;
    }
    
    console.log('📧 Executing booking action:', { bookingId, action, userId: user.id });
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('📧 No access token available');
        alert('Please log in to manage bookings.');
        return;
      }
      
      const message = action === 'decline' ? prompt('Please provide a reason for declining (optional):') || '' : '';
      
      console.log('📧 Sending booking action request to server...');
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-568778ec/booking/${bookingId}/respond`;
      console.log('📧 Request URL:', url);
      console.log('📧 Request body:', { action, message });
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action, message })
      });
      
      console.log('📧 Server response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('📧 Booking action successful:', result);
        alert(`Booking ${action}d successfully.`);
        
        // Refresh user profile to update any cached data
        loadUserProfile(user.id, 0);
      } else {
        const error = await response.text();
        console.error('📧 Server error response:', error);
        console.error('Error handling booking action:', error);
        alert(`Failed to ${action} booking. Please try again.`);
      }
    } catch (error) {
      console.error('📧 Network or other error:', error);
      console.error('Error handling booking action:', error);
      alert(`Error occurred while ${action}ing booking. Please try again.`);
    }
  };

  const loadUserProfile = async (userId: string, retryCount = 0) => {
    const maxRetries = 2; // Reduced retries with reasonable timeouts
    const baseTimeout = 10000; // Reasonable timeout for normal operations
    const timeoutDuration = baseTimeout + (retryCount * 5000); // Progressive timeout: 10s, 15s, 20s
    
    try {
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);
      
      // Show progressive loading messages
      const warningTimeoutId = setTimeout(() => {
        if (retryCount === 0) {
          setLoadingMessage('Server is taking longer than expected...');
        }
      }, 5000);
      
      const extendedWarningTimeoutId = setTimeout(() => {
        if (retryCount === 0) {
          setLoadingMessage('Still connecting... this may take a moment');
        }
      }, 8000);
      
      // Update loading message for retries
      if (retryCount > 0) {
        setLoadingMessage(`Connecting to server... (attempt ${retryCount + 1})`);
      } else {
        setLoadingMessage('Loading your profile...');
      }
      
      // Use the configured Supabase info instead of environment variables
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-568778ec/user/${userId}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      clearTimeout(warningTimeoutId);
      clearTimeout(extendedWarningTimeoutId);
      
      if (response.ok) {
        const userData = await response.json();
        console.log('User profile loaded from server:', {
          id: userData.id,
          name: userData.name,
          profilePicture: userData.profilePicture ? userData.profilePicture.substring(0, 50) + '...' : 'null'
        });
        setUser(userData);
        setServerConnected(true); // Mark server as connected on successful request
        setLoading(false);
        setLoadingMessage('Loading...'); // Reset loading message
      } else if (response.status === 404) {
        // User doesn't exist in our system yet, show onboarding
        console.log('User not found in system, showing onboarding');
        setShowOnboarding(true);
        setLoading(false);
        setLoadingMessage('Loading...');
      } else {
        console.error('Failed to load user profile:', response.status, response.statusText);
        handleProfileLoadError(userId, retryCount, maxRetries, `Server error: ${response.status}`);
      }
    } catch (error) {
      clearTimeout(warningTimeoutId);
      clearTimeout(extendedWarningTimeoutId);
      
      if (error.name === 'AbortError') {
        console.warn(`User profile request timed out after ${timeoutDuration}ms (attempt ${retryCount + 1})`);
        
        // If this is the final timeout, try graceful fallback instead of retry
        if (retryCount >= maxRetries) {
          console.log('Final timeout reached, falling back to offline mode');
          handleFinalTimeout(userId);
          return;
        }
        
        handleProfileLoadError(userId, retryCount, maxRetries, `Request timeout (${Math.ceil(timeoutDuration/1000)}s)`);
      } else {
        console.error('Error loading user profile:', error);
        handleProfileLoadError(userId, retryCount, maxRetries, error.message || 'Network error');
      }
    }
  };



  const handleFinalTimeout = (userId: string) => {
    console.log('Server connection timed out completely, entering offline mode');
    
    // Create minimal user object from auth session
    if (authSession?.user) {
      const fallbackUser: User = {
        id: authSession.user.id,
        email: authSession.user.email || '',
        name: authSession.user.user_metadata?.name || authSession.user.email?.split('@')[0] || 'User',
        stripeConnected: false,
        createdAt: new Date().toISOString(),
      };
      
      console.log('Using fallback user profile for offline mode:', fallbackUser);
      setUser(fallbackUser);
      setServerConnected(false);
      setLoading(false);
      setLoadingMessage('Loading...');
      
      // Show user-friendly message about timeout
      setTimeout(() => {
        alert('The server is taking too long to respond. HERD is now running in offline mode with limited features. You can still browse existing content and the app will reconnect automatically when possible.');
      }, 500);
    } else {
      setLoading(false);
      setLoadingMessage('Loading...');
    }
  };

  const handleProfileLoadError = (userId: string, retryCount: number, maxRetries: number, errorType: string) => {
    if (retryCount < maxRetries) {
      const nextRetryIn = Math.min(3000 * Math.pow(1.5, retryCount), 8000); // Reasonable backoff: 3s, 4.5s, max 8s
      console.log(`Retrying profile load in ${nextRetryIn}ms... (${retryCount + 1}/${maxRetries + 1})`);
      setLoadingMessage(`Connection issue, retrying in ${Math.ceil(nextRetryIn/1000)}s... (attempt ${retryCount + 1}/${maxRetries + 1})`);
      
      setTimeout(() => {
        loadUserProfile(userId, retryCount + 1);
      }, nextRetryIn);
    } else {
      console.warn(`Failed to load profile after ${maxRetries + 1} attempts. Last error: ${errorType}`);
      console.log('Falling back to offline mode with basic user profile');
      
      // Create minimal user object from auth session to allow app to function
      if (authSession?.user) {
        const fallbackUser: User = {
          id: authSession.user.id,
          email: authSession.user.email || '',
          name: authSession.user.user_metadata?.name || authSession.user.email?.split('@')[0] || 'User',
          stripeConnected: false,
          createdAt: new Date().toISOString(),
        };
        console.log('Using fallback user profile for offline mode:', fallbackUser);
        setUser(fallbackUser);
        
        // Show onboarding to complete profile setup when server is available
        setShowOnboarding(true);
        
        setServerConnected(false); // Mark server as disconnected
        
        // Show a user-friendly message about offline mode
        setTimeout(() => {
          const message = errorType.includes('timeout') 
            ? 'The server is taking too long to respond. HERD will work in offline mode with limited features until the connection improves.'
            : 'HERD is running in offline mode due to server connectivity issues. Some features may be limited until connection is restored.';
          alert(message);
        }, 1000);
      }
      setLoading(false);
      setLoadingMessage('Loading...');
    }
  };

  const handleCreateClass = async (classData: Omit<Class, 'id' | 'createdAt' | 'instructorId'>) => {
    if (!user) return;
    
    const newClass: Class = {
      ...classData,
      id: `class:${Date.now()}`,
      instructorId: user.id,
      instructorName: user.name,
      createdAt: new Date().toISOString(),
    };
    
    console.log('Creating new class:', newClass);
    
    // Save to server first (if connected)
    if (serverConnected) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // Slightly longer for create operations
          
          const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-568778ec/class`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(newClass),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const savedClass = await response.json();
            console.log('Class saved to server:', savedClass);
            // Update local state with server response
            setClasses(prev => {
              const updated = [...prev, savedClass];
              console.log('Updated classes array:', updated.length, 'classes');
              return updated;
            });
          } else {
            console.error('Failed to save class to server:', response.status);
            // Fallback to local storage
            setClasses(prev => [...prev, newClass]);
          }
        } else {
          // No auth token, save locally
          setClasses(prev => [...prev, newClass]);
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          console.warn('Class creation request timed out, saving locally');
        } else {
          console.error('Error saving class to server:', error);
        }
        // Fallback to local storage
        setClasses(prev => [...prev, newClass]);
      }
    } else {
      // Server not connected, save locally
      setClasses(prev => [...prev, newClass]);
    }
    
    setCurrentPage('dashboard');
  };

  const handleCreatePost = (postData: Omit<Post, 'id' | 'createdAt' | 'authorId'>) => {
    if (!user) return;
    
    const newPost: Post = {
      ...postData,
      authorId: user.id,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    console.log('Creating new post:', newPost);
    setPosts(prev => {
      const updated = [newPost, ...prev];
      console.log('Updated posts array:', updated);
      return updated;
    });
  };

  const handleDeletePost = (postId: string) => {
    setPosts(posts.filter(post => post.id !== postId));
  };

  const handleDeleteClass = async (classId: string) => {
    if (!user) return;

    try {
      // Check if user has permission to delete this class
      const classToDelete = classes.find(c => c.id === classId);
      if (!classToDelete) {
        alert('Class not found.');
        return;
      }

      // Admin can delete any class, host can only delete their own classes with restrictions
      const isAdmin = user.isAdmin === true;
      const isHost = classToDelete.instructorId === user.id;

      if (!isAdmin && !isHost) {
        alert('You do not have permission to delete this class.');
        return;
      }

      // If not admin, check for active paid bookings
      if (!isAdmin && serverConnected) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);
            
            const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-568778ec/class/${classId}/bookings`, {
              headers: {
                'Authorization': `Bearer ${session.access_token}`
              },
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);

            if (response.ok) {
              const bookings = await response.json();
              const activePaidBookings = bookings.filter((booking: any) => 
                booking.status === 'confirmed' && booking.paymentStatus === 'completed'
              );

              if (activePaidBookings.length > 0) {
                alert(`Cannot delete class. There are ${activePaidBookings.length} active paid booking(s). Please contact students to cancel their bookings first, or contact support if you need assistance.`);
                return;
              }
            }
          }
        } catch (error) {
          if (error.name === 'AbortError') {
            console.warn('Booking check request timed out');
          } else {
            console.error('Error checking bookings:', error);
          }
          // For hosts, require confirmation when we can't check bookings
          if (!confirm('Unable to verify if there are active bookings for this class. Are you sure you want to delete it? This action cannot be undone.')) {
            return;
          }
        }
      }

      // Show confirmation dialog
      const confirmMessage = isAdmin 
        ? 'Are you sure you want to delete this class? This action cannot be undone and will affect any associated bookings.'
        : 'Are you sure you want to delete this class? This action cannot be undone.';
      
      if (!confirm(confirmMessage)) {
        return;
      }

      // Delete from server first (if connected)
      if (serverConnected) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);
            
            const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-568778ec/class/${classId}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${session.access_token}`
              },
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);

            if (!response.ok) {
              console.error('Failed to delete class from server:', response.status);
              if (!confirm('Failed to delete class from server. Delete locally anyway?')) {
                return;
              }
            } else {
              console.log('Class deleted from server successfully');
            }
          }
        } catch (error) {
          if (error.name === 'AbortError') {
            console.warn('Delete class request timed out');
          } else {
            console.error('Error deleting class from server:', error);
          }
          if (!confirm('Error occurred while deleting from server. Delete locally anyway?')) {
            return;
          }
        }
      }

      // Delete from local state
      setClasses(prev => {
        const updated = prev.filter(c => c.id !== classId);
        console.log('Class deleted locally:', classId, '- Remaining classes:', updated.length);
        return updated;
      });

      alert('Class deleted successfully.');

    } catch (error) {
      console.error('Error deleting class:', error);
      alert('An error occurred while deleting the class. Please try again.');
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    // loadUserProfile will be called by the auth state change listener
  };

  const handleOnboardingComplete = (userData: User) => {
    setUser(userData);
    setShowOnboarding(false);
  };

  const handleProfileUpdate = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const requireAuth = (action: () => void) => {
    if (!user) {
      setShowAuthModal(true);
    } else if (!emailVerified) {
      alert('Please verify your email address before continuing. Check your inbox for a verification link.');
    } else {
      action();
    }
  };

  const requireStripe = (action: () => void) => {
    if (!user) {
      setShowAuthModal(true);
    } else if (!emailVerified) {
      alert('Please verify your email address before creating classes. Check your inbox for a verification link.');
    } else if (!user.stripeConnected) {
      alert('You need to connect your Stripe account before creating classes. Please complete your profile setup.');
      setCurrentPage('profile');
    } else {
      action();
    }
  };

  const renderPage = () => {
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8f9f6]">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#556B2F] mx-auto mb-4"></div>
            <h2 className="text-[#3c4f21] mb-2">Loading HERD</h2>
            <p className="text-[#556B2F] text-sm mb-4">{loadingMessage}</p>
            
            {loadingMessage.includes('retrying') && (
              <div className="bg-[#fff8e1] border border-[#f9cc33] rounded-lg p-4 mt-4">
                <p className="text-[#8b6f00] text-sm">
                  <strong>Connection Issue:</strong> We're having trouble reaching our servers. 
                  Don't worry - HERD will continue working with your local data if the connection isn't restored.
                </p>
              </div>
            )}
            
            {loadingMessage.includes('slow') && (
              <div className="bg-[#e8f5e8] border border-[#556B2F] rounded-lg p-4 mt-4">
                <p className="text-[#3c4f21] text-sm">
                  <strong>Slow Connection:</strong> Our servers are responding slowly. 
                  Please be patient while we establish a connection.
                </p>
              </div>
            )}
            
            {loadingMessage.includes('expected') && (
              <div className="bg-[#fff3cd] border border-[#ffeaa7] rounded-lg p-4 mt-4">
                <p className="text-[#856404] text-sm">
                  <strong>Slow Connection:</strong> The server is taking longer than expected. 
                  Please be patient while we establish a connection.
                </p>
              </div>
            )}
            
            {loadingMessage.includes('moment') && (
              <div className="bg-[#e8f5e8] border border-[#556B2F] rounded-lg p-4 mt-4">
                <p className="text-[#3c4f21] text-sm">
                  <strong>Still Connecting:</strong> The server connection is taking longer than usual. 
                  This may be due to server initialization.
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    switch (currentPage) {
      case 'home':
        return <HomePage onNavigate={setCurrentPage} user={user} onRequireAuth={() => setShowAuthModal(true)} />;
      case 'classes':
        return <ClassListing classes={classes} onNavigate={setCurrentPage} user={user} onRequireAuth={() => setShowAuthModal(true)} onSelectClass={(classData) => {
          setSelectedClass(classData);
          setCurrentPage('class-detail');
        }} />;
      case 'class-detail':
        return selectedClass ? <ClassDetail classData={selectedClass} user={user} onNavigate={setCurrentPage} onRequireAuth={() => setShowAuthModal(true)} /> : null;
      case 'create-class':
        return <ClassForm onSubmit={handleCreateClass} onCancel={() => setCurrentPage('classes')} user={user} />;
      case 'bulletin':
        return <BulletinBoard posts={posts} onCreatePost={handleCreatePost} onDeletePost={handleDeletePost} user={user} onRequireAuth={() => setShowAuthModal(true)} />;
      case 'profile':
        return user ? <ProfilePage user={user} onUpdate={handleProfileUpdate} authSession={authSession} onReloadProfile={() => user && loadUserProfile(user.id, 0)} /> : null;
      case 'dashboard':
        return user ? <Dashboard user={user} classes={classes} onNavigate={setCurrentPage} onDeleteClass={handleDeleteClass} onManageClass={(classData) => {
          setSelectedClass(classData);
          setCurrentPage('manage-class');
        }} /> : null;
      case 'manage-class':
        return user && selectedClass ? <ClassManagement classData={selectedClass} user={user} onNavigate={setCurrentPage} onDeleteClass={handleDeleteClass} /> : null;
      default:
        return <HomePage onNavigate={setCurrentPage} user={user} onRequireAuth={() => setShowAuthModal(true)} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9f6]">
      <Navigation 
        currentPage={currentPage} 
        onNavigate={(page) => {
          if (page === 'create-class') {
            requireStripe(() => setCurrentPage(page));
          } else if (page === 'profile' || page === 'dashboard') {
            requireAuth(() => setCurrentPage(page));
          } else {
            setCurrentPage(page);
          }
        }}
        user={user}
        onSignOut={handleSignOut}
        onShowAuth={() => setShowAuthModal(true)}
      />
      
      {/* Server Connectivity Banner */}
      {serverConnected === false && (
        <div className="bg-[#fff3cd] border-b border-[#ffeaa7] px-4 py-3">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-[#f39c12] rounded-full animate-pulse"></div>
              <span className="text-[#856404]">
                <strong>Server Connection Issue:</strong> Cannot connect to HERD servers. Some features may not work properly.
              </span>
            </div>
            <div className="flex gap-2 text-sm">
              <button
                onClick={() => checkServerHealth().then(healthy => {
                  setServerConnected(healthy);
                  if (healthy && user) {
                    loadUserProfile(user.id, 0);
                  }
                })}
                className="text-[#856404] hover:text-[#533f03] underline"
              >
                Test Connection
              </button>
              <button
                onClick={() => window.location.reload()}
                className="text-[#856404] hover:text-[#533f03] underline"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Verification Banner */}
      {user && !emailVerified && (
        <EmailVerificationBanner userEmail={authSession?.user?.email} />
      )}
      
      {/* Debug Info for Development */}
      {authSession && isDevelopment && (
        <EmailDebugInfo authSession={authSession} />
      )}
      
      {/* Development Auth Helper - only show if not logged in */}
      {!user && isDevelopment && (
        <DevAuthHelper onAuthSuccess={handleAuthSuccess} />
      )}
      
      {/* Development Tools */}
      {isDevelopment && (
        <div className="bg-yellow-50 border-b border-yellow-200 p-2">
          <div className="max-w-7xl mx-auto">
            <details className="text-sm">
              <summary className="cursor-pointer text-yellow-800 font-medium">🧪 Development Tools</summary>
              <div className="mt-2 space-y-4">
                <ServerDiagnostics />
                
                {/* Storage Monitor */}
                <div className="bg-white border border-yellow-300 rounded p-3">
                  <h4 className="font-medium text-yellow-800 mb-2">📦 Local Storage Monitor</h4>
                  {(() => {
                    const storageInfo = getStorageInfo();
                    if (!storageInfo) return <p className="text-gray-500">Storage info unavailable</p>;
                    
                    return (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span>Usage:</span>
                          <span className={`font-medium ${storageInfo.usagePercent > 80 ? 'text-red-600' : storageInfo.usagePercent > 50 ? 'text-yellow-600' : 'text-green-600'}`}>
                            {storageInfo.totalSizeKB}KB / {storageInfo.maxSizeKB}KB ({storageInfo.usagePercent}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${storageInfo.usagePercent > 80 ? 'bg-red-500' : storageInfo.usagePercent > 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                            style={{ width: `${Math.min(storageInfo.usagePercent, 100)}%` }}
                          ></div>
                        </div>
                        <details className="mt-2">
                          <summary className="cursor-pointer text-yellow-700 text-sm">View breakdown</summary>
                          <div className="mt-1 text-xs space-y-1">
                            {storageInfo.itemSizes.map(({ key, sizeKB }) => (
                              <div key={key} className="flex justify-between">
                                <span className="truncate">{key}</span>
                                <span>{sizeKB}KB</span>
                              </div>
                            ))}
                          </div>
                        </details>
                        {storageInfo.usagePercent > 80 && (
                          <button
                            onClick={() => {
                              if (confirm('Clear all local storage? This will remove all locally stored classes and posts.')) {
                                localStorage.clear();
                                window.location.reload();
                              }
                            }}
                            className="mt-2 px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                          >
                            Clear Storage
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>
                
                {user && (
                  <>
                    <ClassSyncHelper 
                      classes={classes} 
                      onClassesUpdated={setClasses}
                    />
                    <BookingTestHelper classes={classes} />
                  </>
                )}
              </div>
            </details>
          </div>
        </div>
      )}
      
      {renderPage()}
      
      {showAuthModal && (
        <AuthModal 
          onClose={() => setShowAuthModal(false)} 
          onSuccess={handleAuthSuccess}
        />
      )}
      
      {showOnboarding && authSession && emailVerified && (
        <OnboardingModal 
          onComplete={handleOnboardingComplete}
          authSession={authSession}
        />
      )}
    </div>
  );
}