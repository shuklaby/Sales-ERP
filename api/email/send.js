import {
  getStoredEmailConfig,
  createSmtpTransporter,
  formatSmtpError
} from "../_emailService.js";
async function parseJsonBody(req) {
  if (req.body) {
    if (typeof req.body === "object") return req.body;
    if (typeof req.body === "string") {
      try {
        return JSON.parse(req.body);
      } catch {
        return {};
      }
    }
  }
  if (req.readableEnded || req.complete) {
    return {};
  }
  return new Promise((resolve) => {
    let raw = "";
    const timer = setTimeout(() => resolve({}), 500);
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      clearTimeout(timer);
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
    req.on("error", () => {
      clearTimeout(timer);
      resolve({});
    });
  });
}
function sendJson(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.end(JSON.stringify(data));
}
async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    res.end();
    return;
  }
  if (req.method !== "POST") {
    return sendJson(res, 405, {
      success: false,
      message: "Method not allowed",
      error: "Only POST is supported on /api/email/send"
    });
  }
  try {
    const config = getStoredEmailConfig();
    const body = await parseJsonBody(req);
    const { to, cc, bcc, subject, body: emailBody, html, attachments } = body;
    if (!to) {
      return sendJson(res, 400, {
        success: false,
        error: "Recipient email address (to) is required."
      });
    }
    if (config.provider === "smtp") {
      if (!config.smtpHost || !config.smtpUser || !config.smtpPass) {
        return sendJson(res, 400, {
          success: false,
          error: "SMTP server is not fully configured. Please configure email settings first."
        });
      }
      const transporter = createSmtpTransporter(config);
      const fromAddress = `"${config.senderName || "SparkGenTechnology"}" <${config.senderEmail || "sales@sparkgentechnology.in"}>`;
      const replyToAddress = config.replyTo || config.senderEmail || "sales@sparkgentechnology.in";
      const mailOptions = {
        from: fromAddress,
        to,
        cc: cc || void 0,
        bcc: bcc || void 0,
        replyTo: replyToAddress,
        subject: subject || "Notice from SparkGenTechnology",
        text: emailBody || "",
        html: html || void 0
      };
      if (attachments && Array.isArray(attachments)) {
        mailOptions.attachments = attachments.map((att) => ({
          filename: att.filename,
          content: att.content ? Buffer.from(att.content, "base64") : void 0,
          path: att.path,
          contentType: att.contentType
        }));
      }
      try {
        const info = await transporter.sendMail(mailOptions);
        return sendJson(res, 200, {
          success: true,
          status: "Sent",
          providerMessageId: info.messageId,
          sentAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      } catch (smtpErr) {
        const parsed = formatSmtpError(smtpErr);
        return sendJson(res, 400, {
          success: false,
          status: "Failed",
          error: parsed.message,
          isAuth: parsed.isAuth
        });
      }
    }
    return sendJson(res, 400, {
      success: false,
      error: `Email provider '${config.provider}' is not supported for direct dispatch.`
    });
  } catch (err) {
    return sendJson(res, 500, {
      success: false,
      message: "Email dispatch failed",
      error: err?.message || "Internal server error while sending email"
    });
  }
}
export {
  handler as default
};
