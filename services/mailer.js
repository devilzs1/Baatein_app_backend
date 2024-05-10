// const sgMail = require("@sendgrid/mail");
// const dotenv = require("dotenv");

// dotenv.config({path: "../.env"});
// // sgMail.setApiKey(process.env.SG_KEY);

// const sendSGMail = async ({ to, sender, subject, html, attachments, text }) => {
//   try {
//     const from = sender || "mohammadadil3292@gmail.com";

//     const msg = {
//       to: to, 
//       from: from,
//       subject: subject,
//       html: html,
//       text: text,
//       attachments,
//     };

//     return sgMail.send(msg);
//   } catch (error) {
//     console.log(error);
//   }
// };

// exports.sendEmail = async (args) => {
//   if (!process.env.NODE_ENV === "development") {
//     return Promise.resolve();
//   } else {
//     return sendSGMail(args);
//   }
// };

const nodemailer = require("nodemailer");
const dotenv = require("dotenv");

dotenv.config({ path: "../.env" });

const sendEmail = async ({ to, sender, subject, html, attachments, text }) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "Gmail", // Change this to your email service provider
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
