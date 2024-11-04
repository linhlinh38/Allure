import { config } from "../configs/envConfig";
import { Account } from "../entities/account.entity";
import { generateAccountRegisterContent } from "../utils/email/accountRegisterContent";
import jwt from "jsonwebtoken";
import { generateResetPasswordContent } from "../utils/email/resetPasswordContent";

const nodemailer = require("nodemailer");

export async function sendRegisterAccountEmail(account: Account) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: config.EMAIL_USERNAME,
        pass: config.EMAIL_PASSWORD,
      },
    });
    const code = jwt.sign(account.id, config.SECRET_KEY_FOR_ACCESS_TOKEN, {
      expiresIn: "3h",
    });

    const link = `http://localhost:3000/verify-email?code=${code}`;

    const body = generateAccountRegisterContent(account.username, link);

    const mailOptions = {
      from: config.FROM_EMAIL,
      to: account.email,
      subject: "[Allure Register] Verify Email",
      html: body.html,
      text: body.text,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error in sendRegisterAccountEmail:", error);
  }
}

export async function sendResetPasswordEmail(account: Account) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: config.EMAIL_USERNAME,
        pass: config.EMAIL_PASSWORD,
      },
    });
    const code = jwt.sign(account.id, config.SECRET_KEY_FOR_ACCESS_TOKEN, {
      expiresIn: "3h",
    });

    const link = `http://localhost:3000/reset-pass?code=${code}`;

    const body = generateResetPasswordContent(account.username, link);

    const mailOptions = {
      from: config.FROM_EMAIL,
      to: account.email,
      subject: "[Allure Register] Reset Password Request",
      html: body.html,
      text: body.text,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error in sendRegisterAccountEmail:", error);
  }
}
