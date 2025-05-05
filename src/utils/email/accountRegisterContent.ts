export function generateAccountRegisterContent(
  link: string,
  username?: string
): {
  html: string;
  text: string;
} {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 10px;">
      <h2 style="color: #4CAF50; text-align: center;">🎉 Chào mừng đến với Allure! 🎉</h2>
      <p style="font-size: 16px; color: #333;">
        Xin chào ${username},  
        <br /><br />
        Cảm ơn bạn đã đăng ký tài khoản trên nền tảng của chúng tôi!  
        <br /><br />
        Để bắt đầu, vui lòng xác minh địa chỉ email của bạn bằng cách nhấn vào nút bên dưới:
      </p>
      <div style="text-align: center; margin: 20px 0;">
        <a href="${link}" 
           style="background: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-size: 16px;">
          Xác minh email của tôi
        </a>
      </div>
      <p style="font-size: 14px; color: #666; text-align: center;">
        Nếu bạn không tạo tài khoản trên nền tảng của chúng tôi, vui lòng bỏ qua email này.
      </p>
    </div>
  `;

  const textContent = `Chào mừng đến với Allure! Cảm ơn bạn đã đăng ký tài khoản.`;

  return { html: htmlContent, text: textContent };
}
