import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

const app = new Hono();

// =====================================================
// EMAIL TEMPLATES - Easy to Edit
// =====================================================

const EMAIL_TEMPLATES = {
  // Base template wrapper
  BASE: '<!DOCTYPE html>\n' +
    '<html lang="en">\n' +
    '<head>\n' +
    '    <meta charset="UTF-8">\n' +
    '    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    '    <title>{{SUBJECT}}</title>\n' +
    '</head>\n' +
    '<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8f9f6;">\n' +
    '    <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9f6;">\n' +
    '        <div style="background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">\n' +
    '            <!-- Header -->\n' +
    '            <div style="text-align: center; margin-bottom: 30px;">\n' +
    '                <h1 style="color: #556B2F; margin: 0; font-size: 28px; font-weight: bold;">HERD</h1>\n' +
    '                <p style="color: #556B2F; margin: 5px 0 0 0; font-size: 14px;">Homesteading Community</p>\n' +
    '            </div>\n' +
    '            \n' +
    '            <!-- Content will be inserted here -->\n' +
    '            {{CONTENT}}\n' +
    '            \n' +
    '            <!-- Footer -->\n' +
    '            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">\n' +
    '                <p style="color: #666; font-size: 14px;">Questions? Reply to this email or contact us at support@herd-app.com</p>\n' +
    '                <p style="color: #666; font-size: 12px; margin-top: 20px;">This email was sent by HERD - Homesteading Community Platform</p>\n' +
    '            </div>\n' +
    '        </div>\n' +
    '    </div>\n' +
    '</body>\n' +
    '</html>',

  // Host booking confirmed template
  BOOKING_CONFIRMED: '<h2 style="color: #3c4f21; margin-bottom: 20px;">🎉 New Booking Received!</h2>\n\n' +
    '<p style="color: #333; font-size: 16px;">Hi {{HOST_NAME}},</p>\n\n' +
    '<p style="color: #333; font-size: 16px;">You have a new confirmed booking for your class <strong>{{CLASS_TITLE}}</strong>!</p>\n\n' +
    '<div style="background-color: #f8f9f6; border-left: 4px solid #556B2F; padding: 20px; margin: 20px 0; border-radius: 5px;">\n' +
    '    <h3 style="color: #3c4f21; margin: 0 0 15px 0;">Booking Details</h3>\n' +
    '    <p style="margin: 5px 0; color: #333;"><strong>👤 Guest:</strong> {{GUEST_NAME}}</p>\n' +
    '    <p style="margin: 5px 0; color: #333;"><strong>👥 Students:</strong> {{STUDENT_COUNT}} ({{STUDENT_NAMES}})</p>\n' +
    '    <p style="margin: 5px 0; color: #333;"><strong>📅 Class Date:</strong> {{CLASS_DATE}}</p>\n' +
    '    <p style="margin: 5px 0; color: #333;"><strong>💰 Your Earnings:</strong> ${{HOST_EARNINGS}}</p>\n' +
    '    <p style="margin: 5px 0; color: #333;"><strong>💳 Payment:</strong> Processed Successfully</p>\n' +
    '</div>\n\n' +
    '<div style="background-color: #e8f5e8; padding: 20px; margin: 20px 0; border-radius: 5px;">\n' +
    '    <h3 style="color: #3c4f21; margin: 0 0 10px 0;">Next Steps</h3>\n' +
    '    <ul style="color: #333; margin: 0; padding-left: 20px;">\n' +
    '        <li>The student has been notified and received their confirmation.</li>\n' +
    '        <li>Payment has been processed and will be transferred to your account.</li>\n' +
    '        <li>Use HERD\'s messaging system to contact the student with any pre-class instructions.</li>\n' +
    '        <li>Send any class-specific preparation details or materials list.</li>\n' +
    '    </ul>\n' +
    '</div>\n\n' +
    '<div style="text-align: center; margin-top: 30px;">\n' +
    '    <a href="{{DASHBOARD_URL}}" style="display: inline-block; background-color: #556B2F; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">View in Dashboard</a>\n' +
    '</div>',

  // Host approval request template  
  BOOKING_APPROVAL_REQUEST: '<h2 style="color: #3c4f21; margin-bottom: 20px;">📋 Booking Approval Required</h2>\n\n' +
    '<p style="color: #333; font-size: 16px;">Hi {{HOST_NAME}},</p>\n\n' +
    '<p style="color: #333; font-size: 16px;">You have a new booking request for your class <strong>{{CLASS_TITLE}}</strong> that requires your approval.</p>\n\n' +
    '<div style="background-color: #f8f9f6; border-left: 4px solid #556B2F; padding: 20px; margin: 20px 0; border-radius: 5px;">\n' +
    '    <h3 style="color: #3c4f21; margin: 0 0 15px 0;">Request Details</h3>\n' +
    '    <p style="margin: 5px 0; color: #333;"><strong>👤 Guest:</strong> {{GUEST_NAME}}</p>\n' +
    '    <p style="margin: 5px 0; color: #333;"><strong>👥 Students:</strong> {{STUDENT_COUNT}} ({{STUDENT_NAMES}})</p>\n' +
    '    <p style="margin: 5px 0; color: #333;"><strong>📅 Class Date:</strong> {{CLASS_DATE}}</p>\n' +
    '    <p style="margin: 5px 0; color: #333;"><strong>💰 Your Earnings:</strong> ${{HOST_EARNINGS}}</p>\n' +
    '</div>\n\n' +
    '<div style="background-color: #fff3cd; padding: 15px; margin: 20px 0; border-radius: 5px; border: 1px solid #ffeaa7;">\n' +
    '    <p style="margin: 0; color: #856404;"><strong>⏰ Action Required:</strong> Please review and respond to this booking request. Payment will only be processed after your approval.</p>\n' +
    '</div>\n\n' +
    '<div style="text-align: center; margin: 30px 0;">\n' +
    '    <a href="{{APPROVE_URL}}" style="display: inline-block; background-color: #556B2F; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-right: 10px;">Approve Booking</a>\n' +
    '    <a href="{{DECLINE_URL}}" style="display: inline-block; background-color: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Decline Booking</a>\n' +
    '</div>\n\n' +
    '<div style="background-color: #e8f5e8; padding: 20px; margin: 20px 0; border-radius: 5px;">\n' +
    '    <h3 style="color: #3c4f21; margin: 0 0 10px 0;">What Happens Next?</h3>\n' +
    '    <ul style="color: #333; margin: 0; padding-left: 20px;">\n' +
    '        <li><strong>If Approved:</strong> Payment will be processed and the student will be notified.</li>\n' +
    '        <li><strong>If Declined:</strong> The student will be notified and no payment will be charged.</li>\n' +
    '        <li>Use HERD\'s messaging system to contact the student with any questions or special instructions.</li>\n' +
    '    </ul>\n' +
    '</div>',

  // Guest booking confirmed template
  BOOKING_CONFIRMED_GUEST: '<h2 style="color: #3c4f21; margin-bottom: 20px;">🎉 Booking Confirmed!</h2>\n\n' +
    '<p style="color: #333; font-size: 16px;">Hi {{GUEST_NAME}},</p>\n\n' +
    '<p style="color: #333; font-size: 16px;">Great news! Your booking has been confirmed for <strong>{{CLASS_TITLE}}</strong>!</p>\n\n' +
    '<div style="background-color: #f8f9f6; border-left: 4px solid #556B2F; padding: 20px; margin: 20px 0; border-radius: 5px;">\n' +
    '    <h3 style="color: #3c4f21; margin: 0 0 15px 0;">Your Booking Details</h3>\n' +
    '    <p style="margin: 5px 0; color: #333;"><strong>🏫 Class:</strong> {{CLASS_TITLE}}</p>\n' +
    '    <p style="margin: 5px 0; color: #333;"><strong>👩‍🏫 Instructor:</strong> {{INSTRUCTOR_NAME}}</p>\n' +
    '    <p style="margin: 5px 0; color: #333;"><strong>📅 Date:</strong> {{CLASS_DATE}}</p>\n' +
    '    <p style="margin: 5px 0; color: #333;"><strong>👥 Students:</strong> {{STUDENT_COUNT}} ({{STUDENT_NAMES}})</p>\n' +
    '    <p style="margin: 5px 0; color: #333;"><strong>💳 Total Paid:</strong> ${{TOTAL_AMOUNT}}</p>\n' +
    '    <p style="margin: 5px 0; color: #333;"><strong>📍 Location:</strong> {{CLASS_ADDRESS}}</p>\n' +
    '</div>\n\n' +
    '<div style="background-color: #e8f5e8; padding: 20px; margin: 20px 0; border-radius: 5px;">\n' +
    '    <h3 style="color: #3c4f21; margin: 0 0 10px 0;">What\'s Next?</h3>\n' +
    '    <ul style="color: #333; margin: 0; padding-left: 20px;">\n' +
    '        <li>You\'ll receive any pre-class instructions from your instructor through HERD\'s messaging system.</li>\n' +
    '        <li>Make sure to arrive on time and bring any required materials.</li>\n' +
    '        <li>Contact your instructor through HERD if you have any questions.</li>\n' +
    '        <li>We hope you have an amazing learning experience!</li>\n' +
    '    </ul>\n' +
    '</div>\n\n' +
    '<div style="text-align: center; margin-top: 30px;">\n' +
    '    <a href="{{DASHBOARD_URL}}" style="display: inline-block; background-color: #556B2F; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">View in Dashboard</a>\n' +
    '</div>',

  // Booking denied template
  BOOKING_DENIED: '<h2 style="color: #c54a2c; margin-bottom: 20px;">📋 Booking Update</h2>\n\n' +
    '<p style="color: #333; font-size: 16px;">Hi {{GUEST_NAME}},</p>\n\n' +
    '<p style="color: #333; font-size: 16px;">We wanted to let you know that your booking request for <strong>{{CLASS_TITLE}}</strong> has been declined by the instructor.</p>\n\n' +
    '<div style="background-color: #f8f9f6; border-left: 4px solid #c54a2c; padding: 20px; margin: 20px 0; border-radius: 5px;">\n' +
    '    <h3 style="color: #8b3a1a; margin: 0 0 15px 0;">Booking Details</h3>\n' +
    '    <p style="margin: 5px 0; color: #333;"><strong>🏫 Class:</strong> {{CLASS_TITLE}}</p>\n' +
    '    <p style="margin: 5px 0; color: #333;"><strong>👩‍🏫 Instructor:</strong> {{INSTRUCTOR_NAME}}</p>\n' +
    '    <p style="margin: 5px 0; color: #333;"><strong>📅 Date:</strong> {{CLASS_DATE}}</p>\n' +
    '    <p style="margin: 5px 0; color: #333;"><strong>👥 Students:</strong> {{STUDENT_COUNT}} ({{STUDENT_NAMES}})</p>\n' +
    '    {{#HOST_MESSAGE}}\n' +
    '    <p style="margin: 5px 0; color: #333;"><strong>💬 Message from Instructor:</strong> {{HOST_MESSAGE}}</p>\n' +
    '    {{/HOST_MESSAGE}}\n' +
    '</div>\n\n' +
    '<div style="background-color: #fff3cd; padding: 15px; margin: 20px 0; border-radius: 5px; border: 1px solid #ffeaa7;">\n' +
    '    <p style="margin: 0; color: #856404;"><strong>💳 Payment Status:</strong> No payment has been charged for this booking.</p>\n' +
    '</div>\n\n' +
    '<div style="background-color: #e8f5e8; padding: 20px; margin: 20px 0; border-radius: 5px;">\n' +
    '    <h3 style="color: #3c4f21; margin: 0 0 10px 0;">What\'s Next?</h3>\n' +
    '    <ul style="color: #333; margin: 0; padding-left: 20px;">\n' +
    '        <li>Browse other available classes on HERD that might interest you.</li>\n' +
    '        <li>Contact the instructor through HERD\'s messaging system if you have questions.</li>\n' +
    '        <li>Consider trying different dates if the instructor offers similar classes.</li>\n' +
    '        <li>Explore other instructors in your area who might offer similar topics.</li>\n' +
    '    </ul>\n' +
    '</div>\n\n' +
    '<div style="text-align: center; margin-top: 30px;">\n' +
    '    <a href="{{CLASSES_URL}}" style="display: inline-block; background-color: #556B2F; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Browse Other Classes</a>\n' +
    '</div>'
};

// Template processing function
function processEmailTemplate(templateName: keyof typeof EMAIL_TEMPLATES, variables: Record<string, any>): { html: string; text: string } {
  if (templateName === 'BASE') {
    throw new Error('Cannot process BASE template directly');
  }
  
  try {
    // Get the content template
    const contentTemplate = EMAIL_TEMPLATES[templateName];
    if (!contentTemplate) {
      throw new Error(`Template ${templateName} not found`);
    }
    
    // Process content template variables
    let processedContent = contentTemplate;
    
    // Process conditional blocks first ({{#VARIABLE}}content{{/VARIABLE}})
    processedContent = processedContent.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (match, varName, content) => {
      const value = variables[varName];
      return (value && value !== '' && value !== false) ? content : '';
    });
    
    // Process simple variable replacements ({{VARIABLE}})
    processedContent = processedContent.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      const value = variables[varName];
      return value !== undefined ? String(value) : match;
    });
    
    // Insert content into base template
    let finalHtml = EMAIL_TEMPLATES.BASE.replace('{{CONTENT}}', processedContent);
    
    // Process base template variables
    finalHtml = finalHtml.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      const value = variables[varName];
      return value !== undefined ? String(value) : match;
    });
    
    // Generate text version
    const textVersion = generateTextVersion(processedContent, variables);
    
    return {
      html: finalHtml,
      text: textVersion
    };
    
  } catch (error) {
    console.error(`Error processing email template ${templateName}:`, error);
    
    // Fallback
    const fallbackHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>HERD - ${variables.SUBJECT || 'Notification'}</h2>
        <p>We're having trouble loading the email template. Please check your HERD dashboard for the latest updates.</p>
        <p>Questions? Contact us at support@herd-app.com</p>
      </div>
    `;
    
    const fallbackText = `
HERD - ${variables.SUBJECT || 'Notification'}

We're having trouble loading the email template. Please check your HERD dashboard for the latest updates.

Questions? Contact us at support@herd-app.com
    `.trim();
    
    return {
      html: fallbackHtml,
      text: fallbackText
    };
  }
}

// Convert HTML to plain text
function generateTextVersion(html: string, variables: Record<string, any>): string {
  let text = html
    .replace(/<h[1-6][^>]*>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<br[^>]*>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<\/li>/gi, '')
    .replace(/<ul[^>]*>|<\/ul>/gi, '\n')
    .replace(/<ol[^>]*>|<\/ol>/gi, '\n')
    .replace(/<strong[^>]*>|<\/strong>/gi, '')
    .replace(/<em[^>]*>|<\/em>/gi, '')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
    
  text = `HERD - ${variables.SUBJECT || 'Notification'}\n\n${text}`;
  text += '\n\nQuestions? Reply to this email or contact us at support@herd-app.com';
  
  return text;
}

// =====================================================
// END EMAIL TEMPLATES
// =====================================================";

// Middleware
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));
app.use('*', logger(console.log));

// Add a root route for debugging
app.get('/', (c) => {
  console.log('Root route hit');
  return c.json({ 
    message: 'HERD Booking Server is running', 
    timestamp: new Date().toISOString(),
    availableRoutes: [
      'GET /make-server-8744ac0d/health',
      'GET /make-server-8744ac0d/classes',
      'POST /make-server-8744ac0d/class',
      'DELETE /make-server-8744ac0d/class/:classId',
      'GET /make-server-8744ac0d/class/:classId/bookings',
      'GET /make-server-8744ac0d/class/:classId/available-spots',
      'POST /make-server-8744ac0d/booking',
      'GET /make-server-8744ac0d/bookings/:userId'
    ]
  });
});

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// User management routes
app.post('/make-server-8744ac0d/user', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Check if email is verified
    if (!user.email_confirmed_at) {
      return new Response('Email not verified', { status: 403 });
    }

    const { id, email, name } = await c.req.json();
    
    const userData = {
      id,
      email,
      name,
      farmName: null,
      bio: null,
      profilePicture: null,
      location: null,
      stripeConnected: false,
      createdAt: new Date().toISOString(),
    };

    await kv.set(`user:${id}`, userData);
    
    return c.json(userData);
  } catch (error) {
    console.error('Error creating user:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
});

app.get('/make-server-8744ac0d/user/:id', async (c) => {
  try {
    const userId = c.req.param('id');
    const userData = await kv.get(`user:${userId}`);
    
    if (!userData) {
      return new Response('User not found', { status: 404 });
    }
    
    return c.json(userData);
  } catch (error) {
    console.error('Error fetching user:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
});

app.put('/make-server-8744ac0d/user/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Check if email is verified
    if (!user.email_confirmed_at) {
      return new Response('Email not verified', { status: 403 });
    }

    const userId = c.req.param('id');
    const updates = await c.req.json();
    
    const existingUser = await kv.get(`user:${userId}`);
    if (!existingUser) {
      return new Response('User not found', { status: 404 });
    }
    
    const updatedUser = { ...existingUser, ...updates };
    await kv.set(`user:${userId}`, updatedUser);
    
    return c.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
});

// Stripe Connect routes
app.post('/make-server-8744ac0d/stripe/connect', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { userId } = await c.req.json();
    
    // Validate that the requesting user matches the userId
    if (user.id !== userId) {
      return new Response('Forbidden', { status: 403 });
    }

    const stripeSecretKey = Deno.env.get('VITE_STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('Stripe secret key not configured');
    }

    // Get user data for Stripe account creation
    const userData = await kv.get(`user:${userId}`);
    if (!userData) {
      return new Response('User not found', { status: 404 });
    }

    // Create Stripe Connect Express account
    const createAccountResponse = await fetch('https://api.stripe.com/v1/accounts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'type': 'express',
        'country': 'US',
        'email': userData.email,
        'business_profile[name]': userData.farmName || userData.name,
        'business_profile[product_description]': 'Homesteading classes and workshops',
        'business_profile[mcc]': '8299', // Educational services
        'capabilities[card_payments][requested]': 'true',
        'capabilities[transfers][requested]': 'true',
      }).toString()
    });

    if (!createAccountResponse.ok) {
      const errorData = await createAccountResponse.text();
      console.error('Stripe account creation failed:', errorData);
      throw new Error('Failed to create Stripe account');
    }

    const account = await createAccountResponse.json();
    console.log('Created Stripe account:', account.id);

    // Store the Stripe account ID
    userData.stripeAccountId = account.id;
    await kv.set(`user:${userId}`, userData);

    // Create account link for onboarding
    const createLinkResponse = await fetch('https://api.stripe.com/v1/account_links', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'account': account.id,
        'refresh_url': `${c.req.header('origin') || 'http://localhost:3000'}?stripe=refresh`,
        'return_url': `${c.req.header('origin') || 'http://localhost:3000'}?stripe=connected`,
        'type': 'account_onboarding',
      }).toString()
    });

    if (!createLinkResponse.ok) {
      const errorData = await createLinkResponse.text();
      console.error('Stripe account link creation failed:', errorData);
      throw new Error('Failed to create onboarding link');
    }

    const accountLink = await createLinkResponse.json();
    
    return c.json({ url: accountLink.url });
  } catch (error) {
    console.error('Error creating Stripe connect URL:', error);
    return new Response(`Internal Server Error: ${error.message}`, { status: 500 });
  }
});

app.get('/make-server-8744ac0d/stripe/callback', async (c) => {
  try {
    const code = c.req.query('code');
    const state = c.req.query('state'); // This is the user ID
    
    if (!code || !state) {
      return new Response('Missing parameters', { status: 400 });
    }
    
    const stripeSecretKey = Deno.env.get('VITE_STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('Stripe secret key not configured');
    }
    
    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://connect.stripe.com/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'client_secret': stripeSecretKey,
        'code': code,
        'grant_type': 'authorization_code',
      }).toString()
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      throw new Error('Failed to exchange code for token');
    }

    const tokenData = await tokenResponse.json();
    console.log('Token exchange successful, account ID:', tokenData.stripe_user_id);

    // Update user data
    const userData = await kv.get(`user:${state}`);
    if (userData) {
      userData.stripeConnected = true;
      userData.stripeAccountId = tokenData.stripe_user_id;
      await kv.set(`user:${state}`, userData);
    }
    
    // Redirect back to the app
    return c.redirect('/?stripe=connected');
  } catch (error) {
    console.error('Error handling Stripe callback:', error);
    return c.redirect('/?stripe=error');
  }
});

// Check Stripe account status
app.get('/make-server-8744ac0d/stripe/status/:userId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const userId = c.req.param('userId');
    
    // Validate that the requesting user matches the userId
    if (user.id !== userId) {
      return new Response('Forbidden', { status: 403 });
    }

    const userData = await kv.get(`user:${userId}`);
    if (!userData || !userData.stripeAccountId) {
      return c.json({ connected: false, details_submitted: false, charges_enabled: false });
    }

    const stripeSecretKey = Deno.env.get('VITE_STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('Stripe secret key not configured');
    }

    // Check account status with Stripe
    const accountResponse = await fetch(`https://api.stripe.com/v1/accounts/${userData.stripeAccountId}`, {
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
      },
    });

    if (!accountResponse.ok) {
      console.error('Failed to fetch Stripe account status');
      return c.json({ connected: false, details_submitted: false, charges_enabled: false });
    }

    const account = await accountResponse.json();
    
    // Update local status based on Stripe data
    const isFullyConnected = account.details_submitted && account.charges_enabled;
    if (userData.stripeConnected !== isFullyConnected) {
      userData.stripeConnected = isFullyConnected;
      await kv.set(`user:${userId}`, userData);
    }

    return c.json({
      connected: isFullyConnected,
      details_submitted: account.details_submitted,
      charges_enabled: account.charges_enabled,
      requirements: account.requirements
    });
  } catch (error) {
    console.error('Error checking Stripe status:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
});

// Health check route
app.get('/make-server-8744ac0d/health', (c) => {
  return c.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'HERD Booking Server'
  });
});

// Class management routes
app.post('/make-server-8744ac0d/class', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ message: 'Authorization token required' }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ message: 'Invalid or expired token' }, 401);
    }

    const classData = await c.req.json();
    
    // Use the provided ID if it exists, otherwise generate a new one
    const classId = classData.id || `class:${Date.now()}`;
    
    const newClass = {
      ...classData,
      id: classId,
      instructorId: user.id,
      createdAt: classData.createdAt || new Date().toISOString(),
    };

    await kv.set(classId, newClass);
    
    return c.json(newClass);
  } catch (error) {
    console.error('Error creating class:', error);
    return c.json({ message: 'Internal server error' }, 500);
  }
});

app.get('/make-server-8744ac0d/classes', async (c) => {
  try {
    console.log('📚 Fetching classes from KV store...');
    const startTime = Date.now();
    
    const classes = await kv.getByPrefix('class:');
    const duration = Date.now() - startTime;
    
    console.log(`📚 Classes fetched successfully in ${duration}ms:`, {
      count: classes?.length || 0,
      sampleIds: classes?.slice(0, 3).map(c => c.id) || []
    });
    
    return c.json(classes || []);
  } catch (error) {
    console.error('❌ Error fetching classes:', error);
    return c.json({ message: 'Internal server error', error: error.message }, 500);
  }
});

// Delete class endpoint
app.delete('/make-server-8744ac0d/class/:classId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ message: 'Authorization token required' }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ message: 'Invalid or expired token' }, 401);
    }

    const classId = c.req.param('classId');
    
    // Get class data
    const classData = await kv.get(classId);
    if (!classData) {
      return c.json({ message: 'Class not found' }, 404);
    }

    // Get user data to check admin status
    const userData = await kv.get(`user:${user.id}`);
    const isAdmin = userData?.isAdmin === true;
    const isHost = classData.instructorId === user.id;

    // Permission check
    if (!isAdmin && !isHost) {
      return c.json({ message: 'Access denied - you can only delete your own classes' }, 403);
    }

    // If not admin, check for active paid bookings
    if (!isAdmin) {
      const allBookings = await kv.getByPrefix('booking:');
      const classBookings = allBookings.filter(booking => booking.classId === classId);
      const activePaidBookings = classBookings.filter(booking => 
        booking.status === 'confirmed' && booking.paymentStatus === 'completed'
      );

      if (activePaidBookings.length > 0) {
        return c.json({ 
          message: `Cannot delete class. There are ${activePaidBookings.length} active paid booking(s). Please contact students to cancel their bookings first.`,
          activeBookings: activePaidBookings.length
        }, 400);
      }
    }

    // Delete the class
    await kv.del(classId);
    
    console.log(`Class deleted: ${classId} by ${isAdmin ? 'admin' : 'host'} ${user.id}`);
    
    return c.json({ 
      success: true, 
      message: 'Class deleted successfully',
      deletedClassId: classId 
    });
  } catch (error) {
    console.error('Error deleting class:', error);
    return c.json({ message: 'Internal server error' }, 500);
  }
});

// Get bookings for a specific class
app.get('/make-server-8744ac0d/class/:classId/bookings', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ message: 'Authorization token required' }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ message: 'Invalid or expired token' }, 401);
    }

    const classId = c.req.param('classId');
    
    // Get class data to verify ownership
    const classData = await kv.get(classId);
    if (!classData) {
      return c.json({ message: 'Class not found' }, 404);
    }

    // Get user data to check admin status
    const userData = await kv.get(`user:${user.id}`);
    const isAdmin = userData?.isAdmin === true;
    const isHost = classData.instructorId === user.id;

    // Permission check - only host or admin can view class bookings
    if (!isAdmin && !isHost) {
      return c.json({ message: 'Access denied - you can only view bookings for your own classes' }, 403);
    }

    // Get all bookings for this class
    const allBookings = await kv.getByPrefix('booking:');
    const classBookings = allBookings.filter(booking => booking.classId === classId);

    return c.json(classBookings || []);
  } catch (error) {
    console.error('Error fetching class bookings:', error);
    return c.json({ message: 'Internal server error' }, 500);
  }
});

// Get available spots for a class (public endpoint)
app.get('/make-server-8744ac0d/class/:classId/available-spots', async (c) => {
  try {
    const classId = c.req.param('classId');
    
    // Get class data to verify it exists
    const classData = await kv.get(classId);
    if (!classData) {
      return c.json({ message: 'Class not found' }, 404);
    }

    // Get all bookings for this class
    const allBookings = await kv.getByPrefix('booking:');
    const classBookings = allBookings.filter(booking => booking.classId === classId);
    
    // Count only confirmed and paid bookings
    const confirmedBookings = classBookings.filter(booking => 
      booking.status === 'confirmed' && booking.paymentStatus === 'completed'
    ).length;
    
    const availableSpots = Math.max(0, classData.maxStudents - confirmedBookings);
    
    return c.json({
      maxStudents: classData.maxStudents,
      confirmedBookings: confirmedBookings,
      availableSpots: availableSpots
    });
  } catch (error) {
    console.error('Error fetching available spots:', error);
    return c.json({ message: 'Internal server error' }, 500);
  }
});

// Post management routes
app.post('/make-server-8744ac0d/post', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ message: 'Authorization token required' }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ message: 'Invalid or expired token' }, 401);
    }

    const postData = await c.req.json();
    const postId = `post:${Date.now()}`;
    
    const newPost = {
      ...postData,
      id: postId,
      authorId: user.id,
      createdAt: new Date().toISOString(),
    };

    await kv.set(postId, newPost);
    
    return c.json(newPost);
  } catch (error) {
    console.error('Error creating post:', error);
    return c.json({ message: 'Internal server error' }, 500);
  }
});

app.get('/make-server-8744ac0d/posts', async (c) => {
  try {
    const posts = await kv.getByPrefix('post:');
    return c.json(posts || []);
  } catch (error) {
    console.error('Error fetching posts:', error);
    return c.json({ message: 'Internal server error' }, 500);
  }
});

// Direct payment booking route for users without Stripe Connect
app.post('/make-server-8744ac0d/booking-direct', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ message: 'Authorization token required' }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ message: 'Invalid or expired token' }, 401);
    }

    // Check if email is verified
    if (!user.email_confirmed_at) {
      return c.json({ message: 'Email not verified' }, 403);
    }

    const bookingData = await c.req.json();
    const { classId, studentCount, studentNames, totalAmount, subtotal, herdFee, autoApprove, paymentMethod, paymentData } = bookingData;

    console.log('📋 Processing direct payment booking for class:', classId);

    // Get class data
    let classData = await kv.get(classId);
    if (!classData) {
      console.log('❌ Class not found on server:', classId);
      return c.json({ 
        message: `Class not found on server. Class ID '${classId}' does not exist in the database.`
      }, 404);
    }

    console.log('✅ Found class on server:', classData.title);

    // Get user data
    const userData = await kv.get(`user:${user.id}`);
    if (!userData) {
      return c.json({ message: 'User profile not found' }, 404);
    }

    // Get host data
    const hostData = await kv.get(`user:${classData.instructorId}`);
    if (!hostData) {
      return c.json({ message: 'Host not found' }, 404);
    }

    // For direct payment bookings, we still need the host to have Stripe Connect
    // so they can receive the payment, but the user doesn't need it
    if (!hostData.stripeConnected || !hostData.stripeAccountId) {
      console.log('❌ Host payment setup incomplete:', {
        hostId: hostData.id,
        hostName: hostData.name,
        stripeConnected: hostData.stripeConnected,
        hasStripeAccountId: !!hostData.stripeAccountId
      });
      return c.json({ 
        message: `The host of this class (${hostData.name}) hasn't completed their payment setup yet. Classes can only be booked from hosts who have connected their Stripe account for payment processing.`,
        hostName: hostData.name
      }, 400);
    }

    // Create booking record
    const bookingId = `booking:${Date.now()}`;
    const booking = {
      id: bookingId,
      classId,
      userId: user.id,
      userEmail: paymentData.email, // Use email from payment form
      userName: userData.name,
      hostId: classData.instructorId,
      hostEmail: hostData.email,
      hostName: hostData.name,
      studentCount,
      studentNames,
      totalAmount,
      subtotal,
      herdFee,
      status: autoApprove ? 'confirmed' : 'pending',
      paymentStatus: 'pending',
      paymentMethod: 'direct_card',
      paymentData: {
        nameOnCard: paymentData.nameOnCard,
        email: paymentData.email,
        // Don't store sensitive card data in the database
        lastFourDigits: paymentData.cardNumber.slice(-4)
      },
      createdAt: new Date().toISOString(),
      autoApprove
    };

    await kv.set(bookingId, booking);

    try {
      // Process direct card payment
      const paymentResult = await processDirectCardPayment(booking, classData, hostData, paymentData);
      booking.paymentStatus = 'completed';
      booking.stripePaymentIntentId = paymentResult.paymentIntentId;
      await kv.set(bookingId, booking);

      // Send confirmation emails
      const origin = c.req.header('origin') || 'https://your-domain.com';
      try {
        console.log('📧 About to send booking confirmation email to user:', paymentData.email);
        console.log('📧 User data for email:', { 
          id: userData.id, 
          name: userData.name, 
          email: userData.email, 
          paymentEmail: paymentData.email 
        });
        await sendBookingConfirmationEmail(booking, classData, { ...userData, email: paymentData.email }, origin);
        console.log('📧 Booking confirmation email process completed');
      } catch (emailError) {
        console.error('📧 Error sending user confirmation email (non-blocking):', emailError);
        // Don't fail the booking if email fails
      }
      
      try {
        if (autoApprove) {
          console.log('📧 About to send host booking notification email to:', hostData.email);
          await sendHostBookingNotificationEmail(booking, classData, hostData, origin);
          console.log('📧 Host booking notification email process completed');
        } else {
          console.log('📧 About to send booking approval request email to:', hostData.email);
          await sendBookingApprovalRequestEmail(booking, classData, hostData, origin);
          console.log('📧 Booking approval request email process completed');
        }
      } catch (emailError) {
        console.error('📧 Error sending host email (non-blocking):', emailError);
        // Don't fail the booking if email fails
      }

      return c.json({ 
        success: true, 
        booking, 
        message: autoApprove 
          ? 'Booking confirmed and payment processed' 
          : 'Booking request submitted and payment processed. The host will review your request.'
      });
    } catch (paymentError) {
      console.error('Direct payment processing failed:', paymentError);
      booking.status = 'failed';
      booking.paymentStatus = 'failed';
      await kv.set(bookingId, booking);
      
      return c.json({ message: `Payment processing failed: ${paymentError.message}` }, 500);
    }
  } catch (error) {
    console.error('Error processing direct payment booking:', error);
    return c.json({ message: 'Internal server error' }, 500);
  }
});

// Booking management routes
app.post('/make-server-8744ac0d/booking', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ message: 'Authorization token required' }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ message: 'Invalid or expired token' }, 401);
    }

    // Check if email is verified
    if (!user.email_confirmed_at) {
      return c.json({ message: 'Email not verified' }, 403);
    }

    const bookingData = await c.req.json();
    const { classId, studentCount, studentNames, totalAmount, subtotal, herdFee, autoApprove } = bookingData;

    console.log('📋 Processing booking request for class:', classId);

    // Get class data
    let classData = await kv.get(classId);
    if (!classData) {
      console.log('❌ Class not found on server:', classId);
      console.log('📊 Available classes on server:');
      const allClasses = await kv.getByPrefix('class');
      if (allClasses && allClasses.length > 0) {
        allClasses.forEach(cls => {
          console.log(`  - ${cls.id}: ${cls.title}`);
        });
      } else {
        console.log('  - No classes found on server');
      }
      
      return c.json({ 
        message: `Class not found on server. Class ID '${classId}' does not exist in the database. Please ensure the class has been properly created and synced.`,
        availableClasses: allClasses ? allClasses.map(cls => ({ id: cls.id, title: cls.title })) : []
      }, 404);
    }

    console.log('✅ Found class on server:', classData.title);

    // Get user data
    const userData = await kv.get(`user:${user.id}`);
    if (!userData) {
      return c.json({ message: 'User profile not found' }, 404);
    }

    // Get host data
    const hostData = await kv.get(`user:${classData.instructorId}`);
    if (!hostData) {
      return c.json({ message: 'Host not found' }, 404);
    }

    // Check if host has Stripe connected
    if (!hostData.stripeConnected || !hostData.stripeAccountId) {
      console.log('❌ Host payment setup incomplete:', {
        hostId: hostData.id,
        hostName: hostData.name,
        stripeConnected: hostData.stripeConnected,
        hasStripeAccountId: !!hostData.stripeAccountId
      });
      return c.json({ 
        message: `The host of this class (${hostData.name}) hasn't completed their payment setup yet. Classes can only be booked from hosts who have connected their Stripe account for payment processing.`,
        hostName: hostData.name,
        hostStripeStatus: {
          connected: hostData.stripeConnected,
          hasAccountId: !!hostData.stripeAccountId
        }
      }, 400);
    }

    // Create booking record
    const bookingId = `booking:${Date.now()}`;
    const booking = {
      id: bookingId,
      classId,
      userId: user.id,
      userEmail: userData.email,
      userName: userData.name,
      hostId: classData.instructorId,
      hostEmail: hostData.email,
      hostName: hostData.name,
      studentCount,
      studentNames,
      totalAmount,
      subtotal,
      herdFee,
      status: autoApprove ? 'confirmed' : 'pending',
      paymentStatus: 'pending',
      createdAt: new Date().toISOString(),
      autoApprove
    };

    await kv.set(bookingId, booking);

    if (autoApprove) {
      // Process payment immediately
      try {
        const paymentResult = await processBookingPayment(booking, classData, hostData);
        booking.paymentStatus = 'completed';
        booking.stripePaymentIntentId = paymentResult.paymentIntentId;
        await kv.set(bookingId, booking);

        // Send confirmation emails
        const origin = c.req.header('origin') || 'https://your-domain.com';
        try {
          console.log('📧 About to send booking confirmation email to user:', userData.email);
          console.log('📧 User data for email:', { id: userData.id, name: userData.name, email: userData.email });
          await sendBookingConfirmationEmail(booking, classData, userData, origin);
          console.log('📧 Booking confirmation email process completed');
        } catch (emailError) {
          console.error('📧 Error sending user confirmation email (non-blocking):', emailError);
          // Don't fail the booking if email fails
        }
        try {
          console.log('📧 About to send host notification email to:', hostData.email);
          await sendHostBookingNotificationEmail(booking, classData, hostData, origin);
          console.log('📧 Host notification email process completed');
        } catch (emailError) {
          console.error('📧 Error sending host email (non-blocking):', emailError);
          // Don't fail the booking if email fails
        }

        return c.json({ 
          success: true, 
          booking, 
          message: 'Booking confirmed and payment processed' 
        });
      } catch (paymentError) {
        console.error('Payment processing failed:', paymentError);
        booking.status = 'failed';
        booking.paymentStatus = 'failed';
        await kv.set(bookingId, booking);
        
        return c.json({ message: `Payment processing failed: ${paymentError.message}` }, 500);
      }
    } else {
      // Send approval request to host
      try {
        const origin = c.req.header('origin') || 'https://your-domain.com';
        console.log('📧 About to send booking approval request email to:', hostData.email);
        await sendBookingApprovalRequestEmail(booking, classData, hostData, origin);
        console.log('📧 Booking approval request email process completed');
      } catch (emailError) {
        console.error('📧 Error sending approval request email (non-blocking):', emailError);
        // Don't fail the booking if email fails
      }
      
      return c.json({ 
        success: true, 
        booking, 
        message: 'Booking request submitted. The host will review your request.' 
      });
    }
  } catch (error) {
    console.error('Error processing booking:', error);
    return c.json({ message: 'Internal server error' }, 500);
  }
});

// Respond to booking request (approve/deny)
app.post('/make-server-8744ac0d/booking/:bookingId/respond', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ message: 'Authorization token required' }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ message: 'Invalid or expired token' }, 401);
    }

    const bookingId = c.req.param('bookingId');
    const { action, message } = await c.req.json();

    // Get booking data
    const booking = await kv.get(bookingId);
    if (!booking) {
      return c.json({ message: 'Booking not found' }, 404);
    }

    // Get class data
    const classData = await kv.get(booking.classId);
    if (!classData) {
      return c.json({ message: 'Class not found' }, 404);
    }

    // Get guest data
    const guestData = await kv.get(`user:${booking.userId}`);
    if (!guestData) {
      return c.json({ message: 'Guest not found' }, 404);
    }

    // Verify host permission
    if (classData.instructorId !== user.id) {
      return c.json({ message: 'Access denied - only the class host can respond to bookings' }, 403);
    }

    if (action === 'approve') {
      // Process payment
      try {
        const paymentResult = await processBookingPayment(booking, classData, { id: user.id });
        booking.status = 'confirmed';
        booking.paymentStatus = 'completed';
        booking.stripePaymentIntentId = paymentResult.paymentIntentId;
        booking.approvedAt = new Date().toISOString();
        booking.hostMessage = message;
        await kv.set(bookingId, booking);

        // Send confirmation emails
        try {
          const origin = c.req.header('origin') || 'https://your-domain.com';
          console.log('📧 About to send booking confirmation email to guest:', guestData.email);
          await sendBookingConfirmationEmail(booking, classData, guestData, origin);
          console.log('📧 Booking confirmation email process completed');
        } catch (emailError) {
          console.error('📧 Error sending guest confirmation email (non-blocking):', emailError);
          // Don't fail the booking if email fails
        }
        
        return c.json({ 
          success: true, 
          booking, 
          message: 'Booking approved and payment processed' 
        });
      } catch (paymentError) {
        console.error('Payment processing failed:', paymentError);
        booking.status = 'failed';
        booking.paymentStatus = 'failed';
        await kv.set(bookingId, booking);
        
        return c.json({ message: `Payment processing failed: ${paymentError.message}` }, 500);
      }
    } else if (action === 'decline' || action === 'deny') {
      booking.status = 'denied';
      booking.deniedAt = new Date().toISOString();
      booking.hostMessage = message;
      await kv.set(bookingId, booking);

      // Send denial email
      try {
        const origin = c.req.header('origin') || 'https://your-domain.com';
        console.log('📧 About to send booking denial email to guest:', guestData.email);
        await sendBookingDenialEmail(booking, classData, guestData, message, origin);
        console.log('📧 Booking denial email process completed');
      } catch (emailError) {
        console.error('📧 Error sending denial email (non-blocking):', emailError);
        // Don't fail the booking if email fails
      }
      
      return c.json({ 
        success: true, 
        booking, 
        message: 'Booking denied' 
      });
    } else {
      return c.json({ message: 'Invalid action - must be approve, decline, or deny' }, 400);
    }
  } catch (error) {
    console.error('Error responding to booking:', error);
    return c.json({ message: 'Internal server error' }, 500);
  }
});

// Get bookings for a user (both as guest and host)
app.get('/make-server-8744ac0d/bookings/:userId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ message: 'Authorization token required' }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ message: 'Invalid or expired token' }, 401);
    }

    const userId = c.req.param('userId');
    
    // Validate that the requesting user matches the userId
    if (user.id !== userId) {
      return c.json({ message: 'Access denied - can only view your own bookings' }, 403);
    }

    const allBookings = await kv.getByPrefix('booking:');
    const userBookings = allBookings.filter(booking => 
      booking.userId === userId || booking.hostId === userId
    );

    return c.json(userBookings || []);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return c.json({ message: 'Internal server error' }, 500);
  }
});

// Payment processing function
async function processBookingPayment(booking, classData, hostData) {
  const stripeSecretKey = Deno.env.get('VITE_STRIPE_SECRET_KEY');
  if (!stripeSecretKey) {
    throw new Error('Stripe secret key not configured');
  }

  // Calculate platform fee (5%)
  const platformFeeAmount = Math.round(booking.herdFee * 100); // Convert to cents
  const hostAmount = Math.round(booking.subtotal * 100); // Convert to cents

  console.log('Processing payment for booking:', {
    bookingId: booking.id,
    totalAmount: booking.totalAmount,
    hostAmount: booking.subtotal,
    platformFee: booking.herdFee,
    hostStripeAccount: hostData.stripeAccountId
  });

  // For MVP, we'll simulate payment processing
  // In production, implement proper Stripe payment intent with frontend payment confirmation
  
  // Simulate payment processing delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // For now, we'll skip the actual Stripe payment processing since it requires:
  // 1. Frontend payment form with Stripe Elements
  // 2. Payment method collection from user
  // 3. 3D Secure authentication flow
  
  // Instead, we'll simulate a successful payment
  const simulatedPaymentIntentId = `pi_simulated_${Date.now()}`;
  
  console.log('✅ Simulated payment processed successfully:', {
    paymentIntentId: simulatedPaymentIntentId,
    amount: booking.totalAmount,
    hostReceives: booking.subtotal,
    herdFee: booking.herdFee
  });

  return { paymentIntentId: simulatedPaymentIntentId };
  
  /* TODO: Replace with actual Stripe payment processing:
  
  // Create payment intent
  const paymentIntentResponse = await fetch('https://api.stripe.com/v1/payment_intents', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${stripeSecretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      'amount': Math.round(booking.totalAmount * 100).toString(),
      'currency': 'usd',
      'application_fee_amount': platformFeeAmount.toString(),
      'transfer_data[destination]': hostData.stripeAccountId,
      'metadata[booking_id]': booking.id,
      'metadata[class_id]': classData.id,
    }).toString()
  });

  if (!paymentIntentResponse.ok) {
    const errorData = await paymentIntentResponse.text();
    console.error('Payment intent creation failed:', errorData);
    throw new Error('Failed to create payment intent');
  }

  const paymentIntent = await paymentIntentResponse.json();
  return { paymentIntentId: paymentIntent.id };
  */
}

// Email sending utility function
async function sendEmail(to, subject, html, text) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    console.warn('⚠️ RESEND_API_KEY not configured - email sending disabled');
    return null;
  }

  try {
    console.log('📧 Preparing to send email:', { to, subject });
    
    // For development/testing: Check if we need to redirect emails to verified address
    const isDevelopment = true; // In production, set this based on environment
    const verifiedEmail = 'scraunch@gmail.com'; // The verified email address for development
    
    let actualRecipient = to;
    let emailNote = '';
    
    // In development, redirect all emails to the verified address for testing
    if (isDevelopment) {
      actualRecipient = verifiedEmail;
      if (to !== verifiedEmail) {
        emailNote = `\n\n---\nDEVELOPMENT NOTE: This email was originally intended for ${to} but redirected to ${verifiedEmail} for testing purposes. In production, this would be sent to the actual recipient.`;
        console.log(`📧 Development mode: Redirecting email from ${to} to ${verifiedEmail}`);
      } else {
        console.log(`📧 Development mode: Sending email to verified address ${verifiedEmail}`);
      }
    }
    
    // Use Resend's default verified domain for from address
    const fromAddress = 'HERD <onboarding@resend.dev>'; // Use Resend's verified domain
    
    try {
      console.log('🔄 Attempting to send email from:', fromAddress, 'to:', actualRecipient);
      
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [actualRecipient],
          subject: isDevelopment && to !== verifiedEmail ? `[DEV] ${subject} (for ${to})` : subject,
          html: html + (emailNote ? `<div style="margin-top: 30px; padding: 15px; background: #f0f0f0; border-left: 4px solid #666; font-size: 12px; color: #666;">${emailNote.replace(/\n/g, '<br>')}</div>` : ''),
          text: text + emailNote
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Email sent successfully:', { 
          originalRecipient: to, 
          actualRecipient, 
          subject, 
          id: result.id,
          redirected: to !== actualRecipient 
        });
        return result;
      } else {
        const errorData = await response.text();
        console.error('❌ Email sending failed:', errorData);
        
        // Parse error for better logging
        try {
          const errorObj = JSON.parse(errorData);
          console.error('📧 Detailed error:', errorObj);
          
          // Provide specific guidance for common errors
          if (errorObj.message?.includes('domain is not verified')) {
            console.log('💡 Email domain verification required. Using fallback messaging for development.');
          } else if (errorObj.message?.includes('validation_error')) {
            console.log('💡 Email validation error. This is expected in development mode.');
          }
        } catch (e) {
          console.error('📧 Raw error response:', errorData);
        }
        
        // Don't return null, return a mock success to prevent booking failures
        return { 
          id: `dev-email-${Date.now()}`, 
          status: 'development-mode',
          note: 'Email would be sent in production'
        };
      }
    } catch (fetchError) {
      console.error('❌ Network error sending email:', fetchError);
      return null;
    }
    
  } catch (error) {
    console.error('❌ Unexpected error in email sending:', error);
    console.log('📧 Email details that failed:', { to, subject });
    // Don't throw error - we don't want booking to fail if email fails
    return null;
  }
}

async function sendBookingConfirmationEmail(booking, classData, userData, origin) {
  console.log('📧 Attempting to send booking confirmation email');
  console.log('📧 User data received:', {
    hasUserData: !!userData,
    userId: userData?.id,
    userName: userData?.name,
    userEmail: userData?.email,
    bookingUserEmail: booking?.userEmail
  });
  
  // Determine the correct email to use
  const emailToUse = userData?.email || booking?.userEmail;
  
  if (!emailToUse) {
    console.error('❌ No email address found for user confirmation email');
    console.error('  - userData.email:', userData?.email);
    console.error('  - booking.userEmail:', booking?.userEmail);
    console.error('  - Full userData:', JSON.stringify(userData, null, 2));
    console.error('  - Full booking:', JSON.stringify(booking, null, 2));
    return;
  }
  
  console.log('📧 Sending booking confirmation email to:', emailToUse);
  
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const subject = `Booking Confirmed: ${classData.title}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9f6;">
      <div style="background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #556B2F; margin: 0; font-size: 28px; font-weight: bold;">HERD</h1>
          <p style="color: #556B2F; margin: 5px 0 0 0; font-size: 14px;">Homesteading Community</p>
        </div>
        
        <h2 style="color: #3c4f21; margin-bottom: 20px;">🎉 Your Booking is Confirmed!</h2>
        
        <p style="color: #333; font-size: 16px;">Hi ${userData?.name || booking?.userName || 'there'},</p>
        
        <p style="color: #333; font-size: 16px;">Great news! Your booking for <strong>${classData.title}</strong> has been confirmed and your payment has been processed.</p>
        
        <div style="background-color: #f8f9f6; border-left: 4px solid #556B2F; padding: 20px; margin: 20px 0; border-radius: 5px;">
          <h3 style="color: #3c4f21; margin: 0 0 15px 0;">Class Details</h3>
          <p style="margin: 5px 0; color: #333;"><strong>📚 Class:</strong> ${classData.title}</p>
          <p style="margin: 5px 0; color: #333;"><strong>📅 Date:</strong> ${formatDate(classData.startDate)}</p>
          ${classData.startTime ? `<p style="margin: 5px 0; color: #333;"><strong>🕐 Time:</strong> ${formatTime(classData.startTime)}</p>` : ''}
          <p style="margin: 5px 0; color: #333;"><strong>📍 Location:</strong><br>
            ${classData.address.street}<br>
            ${classData.address.city}, ${classData.address.state} ${classData.address.zipCode}
          </p>
          <p style="margin: 5px 0; color: #333;"><strong>👥 Students:</strong> ${booking.studentNames.join(', ')}</p>
          <p style="margin: 5px 0; color: #333;"><strong>💰 Total Paid:</strong> ${booking.totalAmount.toFixed(2)}</p>
        </div>
        
        <div style="background-color: #e8f5e8; padding: 20px; margin: 20px 0; border-radius: 5px;">
          <h3 style="color: #3c4f21; margin: 0 0 10px 0;">What to Expect</h3>
          <ul style="color: #333; margin: 0; padding-left: 20px;">
            <li>You'll receive a reminder email 24 hours before the class.</li>
            <li>Please arrive 10-15 minutes early for check-in.</li>
            <li>Bring any materials mentioned in the class description.</li>
            <li>Use HERD's messaging system to contact the host if you have questions.</li>
          </ul>
        </div>
        
        <div style="background-color: #fff3cd; padding: 15px; margin: 20px 0; border-radius: 5px; border: 1px solid #ffeaa7;">
          <p style="margin: 0; color: #856404;"><strong>Need to Cancel?</strong> Please use HERD's messaging system to contact the host as soon as possible. Cancellation policies may apply.</p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 14px;">Questions? Use HERD's messaging system to contact the host, or reach out to us at support@herd-app.com</p>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">This email was sent by HERD - Homesteading Community Platform</p>
        </div>
      </div>
    </div>
  `;

  const text = `
HERD - Booking Confirmed

Hi ${userData?.name || booking?.userName || 'there'},

Your booking for "${classData.title}" has been confirmed and your payment has been processed.

Class Details:
- Class: ${classData.title}
- Date: ${formatDate(classData.startDate)}
${classData.startTime ? `- Time: ${formatTime(classData.startTime)}` : ''}
- Location: ${classData.address.street}, ${classData.address.city}, ${classData.address.state} ${classData.address.zipCode}
- Students: ${booking.studentNames.join(', ')}
- Total Paid: ${booking.totalAmount.toFixed(2)}

What to Expect:
• You'll receive a reminder email 24 hours before the class
• Please arrive 10-15 minutes early for check-in
• Bring any materials mentioned in the class description
• Use HERD's messaging system to contact the host if you have questions

Need to Cancel? Please use HERD's messaging system to contact the host as soon as possible. Cancellation policies may apply.

Questions? Use HERD's messaging system to contact the host, or reach out to us at support@herd-app.com
  `;

  await sendEmail(emailToUse, subject, html, text);
}

async function sendHostBookingNotificationEmail(booking, classData, hostData, origin) {
  console.log('📧 Sending host notification email to:', hostData.email);
  
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const subject = `New Booking: ${classData.title}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9f6;">
      <div style="background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #556B2F; margin: 0; font-size: 28px; font-weight: bold;">HERD</h1>
          <p style="color: #556B2F; margin: 5px 0 0 0; font-size: 14px;">Homesteading Community</p>
        </div>
        
        <h2 style="color: #3c4f21; margin-bottom: 20px;">🎉 New Booking Received!</h2>
        
        <p style="color: #333; font-size: 16px;">Hi ${hostData.name},</p>
        
        <p style="color: #333; font-size: 16px;">You have a new confirmed booking for your class <strong>${classData.title}</strong>!</p>
        
        <div style="background-color: #f8f9f6; border-left: 4px solid #556B2F; padding: 20px; margin: 20px 0; border-radius: 5px;">
          <h3 style="color: #3c4f21; margin: 0 0 15px 0;">Booking Details</h3>
          <p style="margin: 5px 0; color: #333;"><strong>👤 Guest:</strong> ${booking.userName}</p>
          <p style="margin: 5px 0; color: #333;"><strong>👥 Students:</strong> ${booking.studentCount} (${booking.studentNames.join(', ')})</p>
          <p style="margin: 5px 0; color: #333;"><strong>📅 Class Date:</strong> ${formatDate(classData.startDate)}</p>
          <p style="margin: 5px 0; color: #333;"><strong>💰 Your Earnings:</strong> ${booking.subtotal.toFixed(2)}</p>
          <p style="margin: 5px 0; color: #333;"><strong>💳 Payment:</strong> Processed Successfully</p>
        </div>
        
        <div style="background-color: #e8f5e8; padding: 20px; margin: 20px 0; border-radius: 5px;">
          <h3 style="color: #3c4f21; margin: 0 0 10px 0;">Next Steps</h3>
          <ul style="color: #333; margin: 0; padding-left: 20px;">
            <li>The student has been notified and received their confirmation.</li>
            <li>Payment has been processed and will be transferred to your account.</li>
            <li>Use HERD's messaging system to contact the student with any pre-class instructions.</li>
            <li>Send any class-specific preparation details or materials list.</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="${origin}?page=dashboard" style="display: inline-block; background-color: #556B2F; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">View in Dashboard</a>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 14px;">Questions? Reply to this email or contact us at support@herd-app.com</p>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">This email was sent by HERD - Homesteading Community Platform</p>
        </div>
      </div>
    </div>
  `;

  const text = `
HERD - New Booking Received

Hi ${hostData.name},

You have a new confirmed booking for your class "${classData.title}"!

Booking Details:
- Guest: ${booking.userName}
- Students: ${booking.studentCount} (${booking.studentNames.join(', ')})
- Class Date: ${formatDate(classData.startDate)}
- Your Earnings: ${booking.subtotal.toFixed(2)}
- Payment: Processed Successfully

Next Steps:
• The student has been notified and received their confirmation
• Payment has been processed and will be transferred to your account
• Use HERD's messaging system to contact the student with any pre-class instructions
• Send any class-specific preparation details or materials list

Questions? Reply to this email or contact us at support@herd-app.com
  `;

  await sendEmail(hostData.email, subject, html, text);
}

async function sendBookingApprovalRequestEmail(booking, classData, hostData, origin) {
  console.log('📧 Sending approval request email to host:', hostData.email);
  
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const subject = `Booking Request: ${classData.title}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9f6;">
      <div style="background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #556B2F; margin: 0; font-size: 28px; font-weight: bold;">HERD</h1>
          <p style="color: #556B2F; margin: 5px 0 0 0; font-size: 14px;">Homesteading Community</p>
        </div>
        
        <h2 style="color: #3c4f21; margin-bottom: 20px;">📋 New Booking Request</h2>
        
        <p style="color: #333; font-size: 16px;">Hi ${hostData.name},</p>
        
        <p style="color: #333; font-size: 16px;">You have a new booking request for your class <strong>${classData.title}</strong> that requires your approval.</p>
        
        <div style="background-color: #f8f9f6; border-left: 4px solid #556B2F; padding: 20px; margin: 20px 0; border-radius: 5px;">
          <h3 style="color: #3c4f21; margin: 0 0 15px 0;">Request Details</h3>
          <p style="margin: 5px 0; color: #333;"><strong>👤 Guest:</strong> ${booking.userName}</p>
          <p style="margin: 5px 0; color: #333;"><strong>👥 Students:</strong> ${booking.studentCount} (${booking.studentNames.join(', ')})</p>
          <p style="margin: 5px 0; color: #333;"><strong>📅 Class Date:</strong> ${formatDate(classData.startDate)}</p>
          <p style="margin: 5px 0; color: #333;"><strong>💰 Your Earnings:</strong> ${booking.subtotal.toFixed(2)}</p>
        </div>
        
        <div style="background-color: #fff3cd; padding: 15px; margin: 20px 0; border-radius: 5px; border: 1px solid #ffeaa7;">
          <p style="margin: 0; color: #856404;"><strong>⏰ Action Required:</strong> Please review and respond to this booking request. Payment will only be processed after your approval.</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${origin}?page=dashboard&booking=${booking.id}&action=approve" style="display: inline-block; background-color: #556B2F; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-right: 10px;">Approve Booking</a>
          <a href="${origin}?page=dashboard&booking=${booking.id}&action=decline" style="display: inline-block; background-color: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Decline Booking</a>
        </div>
        
        <div style="background-color: #e8f5e8; padding: 20px; margin: 20px 0; border-radius: 5px;">
          <h3 style="color: #3c4f21; margin: 0 0 10px 0;">What Happens Next?</h3>
          <ul style="color: #333; margin: 0; padding-left: 20px;">
            <li><strong>If Approved:</strong> Payment will be processed and the student will be notified.</li>
            <li><strong>If Declined:</strong> The student will be notified and no payment will be charged.</li>
            <li>Use HERD's messaging system to contact the student with any questions or special instructions.</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 14px;">Questions? Reply to this email or contact us at support@herd-app.com</p>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">This email was sent by HERD - Homesteading Community Platform</p>
        </div>
      </div>
    </div>
  `;

  const text = `
HERD - New Booking Request

Hi ${hostData.name},

You have a new booking request for your class "${classData.title}" that requires your approval.

Request Details:
- Guest: ${booking.userName}
- Students: ${booking.studentCount} (${booking.studentNames.join(', ')})
- Class Date: ${formatDate(classData.startDate)}
- Your Earnings: ${booking.subtotal.toFixed(2)}

⏰ Action Required: Please review and respond to this booking request. Payment will only be processed after your approval.

What Happens Next?
• If Approved: Payment will be processed and the student will be notified
• If Declined: The student will be notified and no payment will be charged
• Use HERD's messaging system to contact the student with any questions or special instructions

Please log into your HERD dashboard to approve or decline this request.

Questions? Reply to this email or contact us at support@herd-app.com
  `;

  await sendEmail(hostData.email, subject, html, text);
}

async function sendBookingDenialEmail(booking, classData, userData, hostMessage, origin) {
  console.log('📧 Attempting to send booking denial email');
  console.log('📧 User data received:', {
    hasUserData: !!userData,
    userEmail: userData?.email,
    bookingUserEmail: booking?.userEmail
  });
  
  // Determine the correct email to use
  const emailToUse = userData?.email || booking?.userEmail;
  
  if (!emailToUse) {
    console.error('❌ No email address found for booking denial email');
    return;
  }
  
  console.log('📧 Sending booking denial email to:', emailToUse);
  
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const subject = `Booking Update: ${classData.title}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9f6;">
      <div style="background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #556B2F; margin: 0; font-size: 28px; font-weight: bold;">HERD</h1>
          <p style="color: #556B2F; margin: 5px 0 0 0; font-size: 14px;">Homesteading Community</p>
        </div>
        
        <h2 style="color: #3c4f21; margin-bottom: 20px;">📋 Booking Request Update</h2>
        
        <p style="color: #333; font-size: 16px;">Hi ${userData?.name || booking?.userName || 'there'},</p>
        
        <p style="color: #333; font-size: 16px;">Thank you for your interest in <strong>${classData.title}</strong>. Unfortunately, the host was unable to approve your booking request at this time.</p>
        
        <div style="background-color: #f8f9f6; border-left: 4px solid #dc3545; padding: 20px; margin: 20px 0; border-radius: 5px;">
          <h3 style="color: #721c24; margin: 0 0 15px 0;">Request Details</h3>
          <p style="margin: 5px 0; color: #333;"><strong>📚 Class:</strong> ${classData.title}</p>
          <p style="margin: 5px 0; color: #333;"><strong>📅 Date:</strong> ${formatDate(classData.startDate)}</p>
          <p style="margin: 5px 0; color: #333;"><strong>👥 Students:</strong> ${booking.studentNames.join(', ')}</p>
          <p style="margin: 5px 0; color: #333;"><strong>💳 Payment:</strong> No charge (request declined)</p>
        </div>
        
        ${hostMessage ? `
        <div style="background-color: #fff3cd; padding: 15px; margin: 20px 0; border-radius: 5px; border: 1px solid #ffeaa7;">
          <h4 style="color: #856404; margin: 0 0 10px 0;">Message from Host:</h4>
          <p style="margin: 0; color: #856404; font-style: italic;">"${hostMessage}"</p>
        </div>
        ` : ''}
        
        <div style="background-color: #e8f5e8; padding: 20px; margin: 20px 0; border-radius: 5px;">
          <h3 style="color: #3c4f21; margin: 0 0 10px 0;">What's Next?</h3>
          <ul style="color: #333; margin: 0; padding-left: 20px;">
            <li>No payment has been charged to your account.</li>
            <li>You can browse other available classes on HERD.</li>
            <li>Use HERD's messaging system to contact the host to discuss alternative dates.</li>
            <li>Consider booking another similar class from a different host.</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${origin}?page=classes" style="display: inline-block; background-color: #556B2F; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Browse Other Classes</a>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 14px;">Questions? Reply to this email or contact us at support@herd-app.com</p>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">This email was sent by HERD - Homesteading Community Platform</p>
        </div>
      </div>
    </div>
  `;

  const text = `
HERD - Booking Request Update

Hi ${userData?.name || booking?.userName || 'there'},

Thank you for your interest in "${classData.title}". Unfortunately, the host was unable to approve your booking request at this time.

Request Details:
- Class: ${classData.title}
- Date: ${formatDate(classData.startDate)}
- Students: ${booking.studentNames.join(', ')}
- Payment: No charge (request declined)

${hostMessage ? `Message from Host: "${hostMessage}"` : ''}

What's Next?
• No payment has been charged to your account
• You can browse other available classes on HERD
• Use HERD's messaging system to contact the host to discuss alternative dates
• Consider booking another similar class from a different host

Questions? Reply to this email or contact us at support@herd-app.com
  `;

  await sendEmail(emailToUse, subject, html, text);
}

// Direct card payment processing function for users without Stripe Connect
async function processDirectCardPayment(booking, classData, hostData, paymentData) {
  const stripeSecretKey = Deno.env.get('VITE_STRIPE_SECRET_KEY');
  if (!stripeSecretKey) {
    throw new Error('Stripe secret key not configured');
  }

  // Calculate platform fee (5%)
  const platformFeeAmount = Math.round(booking.herdFee * 100); // Convert to cents
  const hostAmount = Math.round(booking.subtotal * 100); // Convert to cents

  console.log('Processing direct card payment for booking:', {
    bookingId: booking.id,
    totalAmount: booking.totalAmount,
    hostAmount: booking.subtotal,
    platformFee: booking.herdFee,
    hostStripeAccount: hostData.stripeAccountId,
    nameOnCard: paymentData.nameOnCard,
    lastFourDigits: paymentData.cardNumber.slice(-4)
  });

  // For MVP, we'll simulate direct payment processing
  // In production, implement proper Stripe payment intent with card collection
  
  // Simulate payment processing delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Simulate a successful payment
  const simulatedPaymentIntentId = `pi_direct_simulated_${Date.now()}`;
  
  console.log('✅ Simulated direct payment processed successfully:', {
    paymentIntentId: simulatedPaymentIntentId,
    amount: booking.totalAmount,
    hostReceives: booking.subtotal,
    herdFee: booking.herdFee,
    cardLastFour: paymentData.cardNumber.slice(-4)
  });

  return { paymentIntentId: simulatedPaymentIntentId };
}

// Start the server
Deno.serve(app.fetch);