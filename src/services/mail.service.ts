import { config } from "../configs/envConfig";
import { Account } from "../entities/account.entity";
import { generateAccountRegisterContent } from "../utils/email/accountRegisterContent";
import jwt from "jsonwebtoken";
import { generateResetPasswordContent } from "../utils/email/resetPasswordContent";
import { generateRequestCreateAccountContent } from "../utils/email/requestCreateAccountContent";
import { generateBrandActivationTemplate } from "../utils/email/activeBrandContent";
import { generateAccountBannedContent } from "../utils/email/accountBannedEmail";

const nodemailer = require("nodemailer");

export async function sendRegisterAccountEmail(account: Account, url: string) {
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

    const link = `${url}?code=${code}`;

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

export async function sendResetPasswordEmail(account: Account, url: string) {
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

    const link = `${url}?code=${code}`;

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

export async function sendConfirmActiveBrandEmail(
  email: string,
  brandName: string,
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
    const body = generateBrandActivationTemplate(brandName, url);

    const mailOptions = {
      from: config.FROM_EMAIL,
      to: email,
      subject: "[Allure Brand] Kích hoạt thương hiệu thành công",
      html: body.html,
      text: body.text,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error in generateBrandActivationTemplate:", error);
  }
}

export async function sendBannedAccountEmail(email: string, userName: string) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: config.EMAIL_USERNAME,
        pass: config.EMAIL_PASSWORD,
      },
    });
    const body = generateAccountBannedContent(userName);

    const mailOptions = {
      from: config.FROM_EMAIL,
      to: email,
      subject: "[Allure Brand] Vô hiệu hóa account",
      html: body.html,
      text: body.text,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error in sendBannedAccountEmail:", error);
  }
}
