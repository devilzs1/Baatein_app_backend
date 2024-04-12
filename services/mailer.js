const sgMail = require("@sendgrid/mail");
const dotenv = require("dotenv");

dotenv.config({path: "../.env"});
// sgMail.setApiKey(process.env.SG_KEY);

const sendSGMail = async ({ to, sender, subject, html, attachments, text }) => {
  try {
    const from = sender || "mohammadadil3292@gmail.com";

    const msg = {
      to: to, 
      from: from,
      subject: subject,
      html: html,
      text: text,
      attachments,
    };

    return sgMail.send(msg);
  } catch (error) {
    console.log(error);
  }
};

exports.sendEmail = async (args) => {
  if (!process.env.NODE_ENV === "development") {
    return Promise.resolve();
  } else {
    return sendSGMail(args);
  }
};
