// services/emailService.js
const { Resend } = require('resend');
const fs = require('fs').promises;
const path = require('path');
const handlebars = require('handlebars');

class EmailService {
  constructor() {
    // Initialize Resend with API key
    this.resend = new Resend(process.env.RESEND_API_KEY);
    
    console.log('Email service initialized with Resend');
  }

  /**
   * Load and compile HBS template
   * @param {string} templateName - Name of the template file (without extension)
   * @param {object} data - Data to inject into the template
   * @returns {Promise<string>} - Compiled HTML string
   */
  async loadTemplate(templateName, data) {
    try {
      // Path to templates folder
      const templatePath = path.join(__dirname, '../templates', `${templateName}.hbs`);
      
      // Read the template file
      const templateSource = await fs.readFile(templatePath, 'utf-8');
      
      // Compile the template
      const template = handlebars.compile(templateSource);
      
      // Return compiled HTML with data
      return template(data);
    } catch (error) {
      console.error(`Error loading template ${templateName}:`, error);
      throw new Error(`Failed to load email template: ${templateName}`);
    }
  }

  /**
   * Send email using a template
   * @param {object} options - Email options
   * @param {string} options.to - Recipient email address (or array of addresses)
   * @param {string} options.subject - Email subject
   * @param {string} options.template - Template name (without extension)
   * @param {object} options.data - Data to inject into template
   * @param {array} options.attachments - Optional attachments
   * @param {string} options.from - Optional custom from address
   * @returns {Promise<object>} - Resend response
   */
  async sendEmail({ to, subject, template, data, attachments = [], from = null }) {
    try {
      // Load and compile template
      const html = await this.loadTemplate(template, data);

      // Email options for Resend
      const emailOptions = {
        from: from || process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      };

      // Add attachments if provided
      if (attachments && attachments.length > 0) {
        emailOptions.attachments = attachments.map(att => ({
          filename: att.filename,
          content: att.content || att.path, // Resend supports both content and path
        }));
      }

      // Send email via Resend
      const response = await this.resend.emails.send(emailOptions);
      
      console.log('Email sent successfully:', response.id);
      return { success: true, messageId: response.id };
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  /**
   * Send bulk emails (batch sending)
   * @param {array} emails - Array of email objects
   * @returns {Promise<object>} - Resend batch response
   */
  async sendBulkEmails(emails) {
    try {
      const emailPromises = emails.map(async (email) => {
        const html = await this.loadTemplate(email.template, email.data);
        return {
          from: email.from || process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
          to: Array.isArray(email.to) ? email.to : [email.to],
          subject: email.subject,
          html,
        };
      });

      const emailData = await Promise.all(emailPromises);
      const response = await this.resend.batch.send(emailData);
      
      console.log('Bulk emails sent successfully');
      return { success: true, data: response };
    } catch (error) {
      console.error('Error sending bulk emails:', error);
      throw new Error(`Failed to send bulk emails: ${error.message}`);
    }
  }
}

// Export singleton instance
module.exports = new EmailService();

/*
// ============================================
// INSTALLATION
// ============================================
npm install resend handlebars

// ============================================
// USAGE EXAMPLES
// ============================================

const emailService = require('./services/emailService');

// Example 1: Send simple email with template
await emailService.sendEmail({
  to: 'employee@example.com',
  subject: 'Welcome to Our Platform',
  template: 'welcome',
  data: {
    name: 'John Doe',
    loginUrl: 'https://app.example.com/login'
  }
});

// Example 2: Send to multiple recipients
await emailService.sendEmail({
  to: ['user1@example.com', 'user2@example.com'],
  subject: 'Team Update',
  template: 'team-notification',
  data: { message: 'Important update' }
});

// Example 3: Send email with attachments
await emailService.sendEmail({
  to: 'employee@example.com',
  subject: 'Document Attached',
  template: 'document-notification',
  data: { name: 'John' },
  attachments: [
    {
      filename: 'document.pdf',
      path: '/path/to/document.pdf'
    }
  ]
});

// Example 4: Send bulk emails (batch)
await emailService.sendBulkEmails([
  {
    to: 'user1@example.com',
    subject: 'Welcome',
    template: 'welcome',
    data: { name: 'User 1' }
  },
  {
    to: 'user2@example.com',
    subject: 'Welcome',
    template: 'welcome',
    data: { name: 'User 2' }
  }
]);

// Example 5: Custom from address
await emailService.sendEmail({
  to: 'employee@example.com',
  from: 'noreply@yourdomain.com',
  subject: 'Custom Sender',
  template: 'notification',
  data: { message: 'Hello' }
});

// ============================================
// ENVIRONMENT VARIABLES (.env)
// ============================================

RESEND_API_KEY=re_123456789
RESEND_FROM_EMAIL=noreply@yourdomain.com

// ============================================
// SETUP INSTRUCTIONS
// ============================================

1. Sign up at https://resend.com
2. Get your API key from the dashboard
3. Verify your domain (for production) or use onboarding@resend.dev (for testing)
4. Add your API key to .env file
5. Create your email templates in /templates folder (e.g., welcome.hbs)

// ============================================
// BENEFITS OF RESEND
// ============================================

- Simple, modern API
- Better deliverability
- Built-in analytics
- Easy domain verification
- No complex SMTP configuration
- Supports React Email components (optional)
- Built-in rate limiting and retry logic

*/