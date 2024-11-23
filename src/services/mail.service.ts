import { config } from "../configs/envConfig";
import { Account } from "../entities/account.entity";
import { generateAccountRegisterContent } from "../utils/email/accountRegisterContent";
import jwt from "jsonwebtoken";
import { generateResetPasswordContent } from "../utils/email/resetPasswordContent";
import { generateRequestCreateAccountContent } from "../utils/email/requestCreateAccountContent";

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
    const payload = { accountId: account.id.toString() };
    const code = jwt.sign(payload, config.SECRET_KEY_FOR_ACCESS_TOKEN, {
      expiresIn: "3h",
    });

    const link = `http://localhost:3000/verify-email?code=${code}`;

    const body = generateAccountRegisterContent(link, account?.username);

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
    const payload = { accountId: account.id.toString() };
    const code = jwt.sign(payload, config.SECRET_KEY_FOR_ACCESS_TOKEN, {
      expiresIn: "3h",
    });

    const link = `http://localhost:3000/reset-pass?code=${code}`;

    const body = generateResetPasswordContent(link, account?.username);

    const mailOptions = {
      from: config.FROM_EMAIL,
      to: account.email,
      subject: "[Allure Register] Reset Password Request",
      html: body.html,
      text: body.text,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error in sendResetPasswordEmail:", error);
  }
}

export async function sendRequestCreateAccountEmail(
  email: string,
  brand: string,
  role: string,
  url: string
) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: config.EMAIL_USERNAME,
        pass: config.EMAIL_PASSWORD,
      },
    });
    const payload = { email, brand, role, key: "allure" };
    const code = jwt.sign(payload, config.SECRET_KEY_FOR_ACCESS_TOKEN, {
      expiresIn: "1d",
    });

    const link = `${url}?code=${code}`;

    const body = generateRequestCreateAccountContent(link);

    const mailOptions = {
      from: config.FROM_EMAIL,
      to: email,
      subject: "[Allure Register] Register Account",
      html: body.html,
      text: body.text,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error in sendRequestCreateAccountEmail:", error);
  }
}
