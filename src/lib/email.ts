import nodemailer from "nodemailer";

export async function sendEmail(email: string, message: string): Promise<void> {
  try {
    // Use OAuth2 authentication with better configuration
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        type: "OAuth2",
        user: process.env.EMAIL_USER,
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        refreshToken: process.env.REFRESH_TOKEN,
        accessToken: process.env.ACCESS_TOKEN, 
      },
    });

    // Verify connection
    await transporter.verify();
    console.log("✅ OAuth2 email service connected");

    await transporter.sendMail({
      from: `"PCBWAY Support" <${process.env.EMAIL_USER || "kefifyoucef2020@gmail.com"}>`,
      to: email,
      subject: "Message Received - PCBWAY",
      html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2c3e50; margin: 0; font-size: 24px;">PCBWAY</h1>
        </div>
        <div style="background-color: white; padding: 30px; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h2 style="color: #27ae60; margin-top: 0;">✅ Message Received Successfully</h2>
        <p style="color: #555; font-size: 16px; line-height: 1.6;">
          Thank you for contacting PCBWAY! We have successfully received your message and our team will review it shortly.
        </p>
        <div style="background-color: #f1f8ff; padding: 15px; border-left: 4px solid #3498db; margin: 20px 0;">
          <p style="margin: 0; color: #2980b9; font-weight: 500;">
          Your message: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"
          </p>
        </div>
        <p style="color: #555; font-size: 14px; line-height: 1.6;">
          We typically respond within 24-48 hours. If your matter is urgent, please don't hesitate to contact us directly.
        </p>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #7f8c8d; font-size: 12px;">
        © ${new Date().getFullYear()} PCBWAY. All rights reserved.
        </div>
      </div>
      `,
    });

    console.log(`📧 Email sent successfully to ${email}`);
  } catch (error) {
    console.error("❌ Email error:", error);
    throw new Error(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}