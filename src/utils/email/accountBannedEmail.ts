export function generateAccountBannedContent(username?: string): {
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
  <div>
    <p>Dear ${username},</p>
            <p>
              Your account has been banned due to violation of our terms of service.
            </p>
  </div>
</body>
`;

  const textContent = `
    Thank you for choosing Allure.`;
  return { html: htmlContent, text: textContent };
}
