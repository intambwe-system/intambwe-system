// services/emailService.js
const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');
const handlebars = require('handlebars');

class EmailService {
  constructor() {
    // Create transporter with your email service credentials
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // Verify transporter configuration
    this.transporter.verify((error, success) => {
      if (error) {
        console.error('Email service configuration error:', error);
      } else {
        console.log('Email service is ready to send messages');
      }
    });
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
   * @param {string} options.to - Recipient email address
   * @param {string} options.subject - Email subject
   * @param {string} options.template - Template name (without extension)
   * @param {object} options.data - Data to inject into template
   * @param {array} options.attachments - Optional attachments
   * @returns {Promise<object>} - Nodemailer response
   */
  async sendEmail({ to, subject, template, data, attachments = [] }) {
    try {
      // Load and compile template
      const html = await this.loadTemplate(template, data);

      // Email options
      const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME || 'Your App'}" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
        attachments,
      };

      // Send email
      const info = await this.transporter.sendMail(mailOptions);
      
      console.log('Email sent successfully:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error('Failed to send email');
    }
  }


}

// Export singleton instance
module.exports = new EmailService();


/*
// In your controller or route:
const emailService = require('./services/emailService');

// Example 1: Send welcome email
await emailService.sendWelcomeEmail(
  'employee@example.com',
  'John Doe'
);

// Example 2: Send password reset
await emailService.sendPasswordResetEmail(
  'employee@example.com',
  'John Doe',
  'reset-token-here'
);

// Example 3: Send custom email with template
await emailService.sendEmail({
  to: 'employee@example.com',
  subject: 'Custom Subject',
  template: 'your-template-name',
  data: {
    customField1: 'value1',
    customField2: 'value2'
  }
});

// Example 4: Send email with attachments
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
*/


// ============================================
// ENVIRONMENT VARIABLES (.env)
// ============================================

/*
Add these to your .env file:



Note: For Gmail, you need to use an "App Password" not your regular password.
Generate one at: https://myaccount.google.com/apppasswords
*/