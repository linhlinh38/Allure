export const generateBrandActivationTemplate = (brandName: string, url: string) => {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 10px;">
      <h2 style="color: #4CAF50; text-align: center;">🎉 Chúc mừng ${brandName}! 🎉</h2>
      <p style="font-size: 16px; color: #333;">
        Xin chào,  
        <br /><br />
        Chúng tôi rất vui thông báo rằng thương hiệu <b>${brandName}</b> của bạn đã được kích hoạt thành công trên nền tảng của chúng tôi! 🎊  
        <br /><br />
        Hãy bắt đầu trải nghiệm ngay bằng cách quản lý sản phẩm, đơn hàng và kết nối với khách hàng.
      </p>
      <div style="text-align: center; margin: 20px 0;">
        <a href="${url}" 
           style="background: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-size: 16px;">
          Quản lý thương hiệu của bạn
        </a>
      </div>
    </div>
  `;
  const textContent = `Chúc mừng ${brandName}! Thương hiệu của bạn đã được kích hoạt. Truy cập ngay: ${url}`;

  return { html: htmlContent, text: textContent };
};
