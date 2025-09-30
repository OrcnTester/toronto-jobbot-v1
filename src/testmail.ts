import 'dotenv/config';
import { sendEmail } from './followup/mailer.js';

async function main() {
  const from = process.env.FROM_EMAIL!;
  const to = process.env.FROM_EMAIL!;
  const subject = "✅ Toronto JobBot SMTP Test";
  const text = `Hey ${process.env.APPLICANT_NAME},

This is a test message from your Toronto JobBot SMTP setup.
If you see this email, everything is working perfectly! 🚀

Now your bot can automatically send polite follow-up emails 7 days after applying.

Best,
Toronto JobBot 🤖`;

  console.log(`📨 Sending test email to ${to} ...`);
  try {
    await sendEmail(to, subject, text);
    console.log("✅ Test email sent successfully!");
  } catch (err) {
    console.error("❌ Failed to send email:", err);
  }
}

main();