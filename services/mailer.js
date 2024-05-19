const nodemailer = require("nodemailer");
const dotenv = require("dotenv");

dotenv.config({ path: "../.env" });

const sendEmail = async ({ to, sender, subject, html, attachments, text }) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: sender || "mohammadadil3292@gmail.com",
      to: to,
      subject: subject,
      html: html,
      text: text,
      attachments: attachments,
    };

    return await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

exports.sendEmail = sendEmail;
