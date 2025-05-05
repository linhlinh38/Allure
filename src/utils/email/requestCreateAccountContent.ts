export function generateRequestCreateAccountContent(link: string): {
  html: string;
  text: string;
} {
  const htmlContent = `
<body
  style="
    font-family: Arial, sans-serif;
    line-height: 1.6;
    margin: 0;
    padding: 12px 0;
  "
>
  <div style="max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
    <h2 style="color: #4CAF50; text-align: center;">🎉 Tạo tài khoản của bạn ngay! 🎉</h2>
    <p style="font-size: 16px; color: #333;">
      Xin chào,  
      <br /><br />
      Chúng tôi đã nhận được yêu cầu tạo tài khoản trên nền tảng của chúng tôi.  
      <br /><br />
      Vui lòng nhấn vào liên kết bên dưới để thiết lập tài khoản của bạn:
    </p>
    <div style="text-align: center; margin: 20px 0;">
      <a
        href="${link}"
        target="_blank"
        style="background: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-size: 16px;"
      >
        Thiết lập tài khoản của tôi
      </a>
    </div>
    <p style="font-size: 14px; color: #666; text-align: center;">
      Nếu bạn không yêu cầu tạo tài khoản, vui lòng bỏ qua email này.
    </p>
  </div>
</body>
`;

  const textContent = `
    Xin chào, chúng tôi đã nhận được yêu cầu tạo tài khoản. Vui lòng nhấn vào liên kết sau để thiết lập tài khoản của bạn: ${link}
  `;
  return { html: htmlContent, text: textContent };
}
