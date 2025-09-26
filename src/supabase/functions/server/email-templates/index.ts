// Email template processor for HERD
// This module handles loading and processing HTML email templates

interface TemplateVariables {
  [key: string]: string | number | boolean;
}

/**
 * Process template variables in HTML content
 * Supports both simple {{VARIABLE}} and conditional {{#VARIABLE}}content{{/VARIABLE}} syntax
 */
function processTemplate(html: string, variables: TemplateVariables): string {
  let result = html;
  
  // Process conditional blocks first ({{#VARIABLE}}content{{/VARIABLE}})
  result = result.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (match, varName, content) => {
    const value = variables[varName];
    return (value && value !== '' && value !== false) ? content : '';
  });
  
  // Process simple variable replacements ({{VARIABLE}})
  result = result.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    const value = variables[varName];
    return value !== undefined ? String(value) : match;
  });
  
  return result;
}

/**
 * Load and process an email template
 */
export async function renderEmailTemplate(templateName: string, variables: TemplateVariables): Promise<{ html: string; text: string }> {
  try {
    // Load base template
    const basePath = new URL('base.html', import.meta.url).pathname;
    const baseTemplate = await Deno.readTextFile(basePath);
    
    // Load content template
    const contentPath = new URL(`${templateName}.html`, import.meta.url).pathname;
    const contentTemplate = await Deno.readTextFile(contentPath);
    
    // Process content template
    const processedContent = processTemplate(contentTemplate, variables);
    
    // Insert content into base template
    const processedBase = processTemplate(baseTemplate, {
      ...variables,
      CONTENT: processedContent
    });
    
    // Generate text version by stripping HTML
    const textVersion = generateTextVersion(processedContent, variables);
    
    return {
      html: processedBase,
      text: textVersion
    };
    
  } catch (error) {
    console.error(`Error rendering email template ${templateName}:`, error);
    
    // Fallback to a basic template
    const fallbackHtml = `
      <div>
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

/**
 * Convert HTML content to plain text for email text version
 */
function generateTextVersion(html: string, variables: TemplateVariables): string {
  // Remove HTML tags and convert to plain text
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
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
    
  // Add header
  text = `HERD - ${variables.SUBJECT || 'Notification'}\n\n${text}`;
  
  // Add footer
  text += '\n\nQuestions? Reply to this email or contact us at support@herd-app.com';
  
  return text;
}

// Template name constants for easy reference
export const TEMPLATES = {
  BOOKING_CONFIRMED: 'booking-confirmed',
  BOOKING_APPROVAL_REQUEST: 'booking-approval-request', 
  BOOKING_CONFIRMED_GUEST: 'booking-confirmed-guest',
  BOOKING_DENIED: 'booking-denied'
} as const;