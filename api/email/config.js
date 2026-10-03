import {
  getStoredEmailConfig,
  saveStoredEmailConfig,
  createSmtpTransporter,
  formatSmtpError
} from "../_emailService.js";
import { getFirebaseAdminAuth } from "../_firebaseAdmin.js";
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
    const safetyTimer = setTimeout(() => {
      resolve({});
    }, 500);
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      clearTimeout(safetyTimer);
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
    req.on("error", () => {
      clearTimeout(safetyTimer);
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
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    res.end();
    return;
  }
  const startTime = Date.now();
  console.log(`[Email Config API] Received ${req.method} request`);
  try {
    if (req.method === "GET") {
      const config = getStoredEmailConfig();
      console.log(`[Email Config API] GET processed in ${Date.now() - startTime}ms (configured: ${!!config.configured})`);
      return sendJson(res, 200, {
        success: true,
        configured: !!config.configured,
        provider: config.provider,
        senderName: config.senderName || "SparkGenTechnology",
        senderEmail: config.senderEmail || "sales@sparkgentechnology.in",
        replyTo: config.replyTo || "sales@sparkgentechnology.in",
        status: config.status || (config.configured ? "Configured" : "Not Configured"),
        lastError: config.lastError,
        smtpHost: config.smtpHost ? `${config.smtpHost}` : "smtp.titan.email",
        smtpPort: config.smtpPort || 465,
        smtpSecure: config.smtpPort === 465 ? true : !!config.smtpSecure,
        smtpUser: config.smtpUser || "sales@sparkgentechnology.in",
        smtpUserMasked: config.smtpUser ? `${config.smtpUser.slice(0, 3)}***` : void 0,
        hasPassword: !!config.smtpPass
      });
    }
    if (req.method === "POST") {
      console.log("[Email Config API] Stage 1: Parsing request body...");
      const body = await parseJsonBody(req);
      const authHeader = req.headers["authorization"] || req.headers["Authorization"];
      if (authHeader && typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        const adminAuth = getFirebaseAdminAuth();
        if (adminAuth && token) {
          try {
            console.log("[Email Config API] Stage 2: Verifying caller token with Firebase Admin...");
            const decoded = await adminAuth.verifyIdToken(token);
            console.log(`[Email Config API] Authenticated caller UID: ${decoded.uid}`);
          } catch (authErr) {
            console.warn("[Email Config API] Token verification warning:", authErr?.message);
          }
        }
      }
      console.log("[Email Config API] Stage 3: Validating configuration payload...");
      const {
        provider,
        senderName,
        senderEmail,
        replyTo,
        smtpHost,
        smtpPort,
        smtpSecure,
        smtpUser,
        smtpPass,
        apiKey
      } = body;
      const existing = getStoredEmailConfig();
      const selectedProvider = provider || existing.provider || "smtp";
      if (selectedProvider === "smtp") {
        const effectiveHost = smtpHost !== void 0 && smtpHost !== "" ? smtpHost.trim() : existing.smtpHost;
        const effectiveUser = smtpUser !== void 0 && smtpUser !== "" ? smtpUser.trim() : existing.smtpUser;
        if (!effectiveHost) {
          return sendJson(res, 400, {
            success: false,
            message: "Validation Error: SMTP Host is required.",
            error: "SMTP Host Server is required."
          });
        }
        if (!effectiveUser) {
          return sendJson(res, 400, {
            success: false,
            message: "Validation Error: SMTP Username is required.",
            error: "SMTP Username is required."
          });
        }
      }
      const resolvedPort = smtpPort ? parseInt(smtpPort, 10) : existing.smtpPort || 465;
      const resolvedSecure = resolvedPort === 465 ? true : smtpSecure !== void 0 ? !!smtpSecure : existing.smtpSecure ?? true;
      const effectivePass = smtpPass && smtpPass.trim() ? smtpPass.trim() : existing.smtpPass;
      const updated = {
        provider: selectedProvider,
        senderName: senderName && senderName.trim() || existing.senderName || "SparkGenTechnology",
        senderEmail: senderEmail && senderEmail.trim() || existing.senderEmail || "sales@sparkgentechnology.in",
        replyTo: replyTo && replyTo.trim() || existing.replyTo || "sales@sparkgentechnology.in",
        smtpHost: smtpHost !== void 0 && smtpHost !== "" ? smtpHost.trim() : existing.smtpHost || "smtp.titan.email",
        smtpPort: resolvedPort,
        smtpSecure: resolvedSecure,
        smtpUser: smtpUser !== void 0 && smtpUser !== "" ? smtpUser.trim() : existing.smtpUser || "sales@sparkgentechnology.in",
        smtpPass: effectivePass,
        apiKey: apiKey ? apiKey.trim() : existing.apiKey
      };
      console.log(`[Email Config API] Stage 4: Preparing configuration (provider: ${updated.provider}, port: ${updated.smtpPort}, hasPass: ${!!updated.smtpPass})`);
      let status = "Not Configured";
      let warning;
      if (updated.provider === "smtp") {
        if (updated.smtpHost && updated.smtpUser && updated.smtpPass) {
          status = "Configured";
          updated.status = "Configured";
          updated.configured = true;
          try {
            console.log("[Email Config API] Stage 5: Quick non-blocking socket check...");
            const testTransporter = createSmtpTransporter(updated);
            const verifyPromise = testTransporter.verify();
            const timeoutPromise = new Promise(
              (_, reject) => setTimeout(() => reject(new Error("Quick verification timed out")), 2e3)
            );
            await Promise.race([verifyPromise, timeoutPromise]);
            console.log("[Email Config API] Quick socket check passed.");
          } catch (testErr) {
            console.log("[Email Config API] Quick socket check note:", testErr?.message);
            if (testErr?.message?.includes("timed out")) {
              warning = 'Configuration saved. Use "Test Connection" to perform full SMTP handshake.';
            } else {
              const parsed = formatSmtpError(testErr);
              warning = parsed.message;
            }
          }
        } else {
          status = "Not Configured";
          updated.status = status;
          updated.configured = false;
        }
      } else if (updated.provider === "resend" || updated.provider === "sendgrid") {
        if (updated.apiKey) {
          status = "Configured";
          updated.status = status;
          updated.configured = true;
        } else {
          status = "Not Configured";
          updated.status = status;
          updated.configured = false;
        }
      } else {
        status = "Not Configured";
        updated.status = status;
        updated.configured = false;
      }
      console.log("[Email Config API] Stage 6: Persisting configuration server-side...");
      await saveStoredEmailConfig(updated);
      console.log(`[Email Config API] Stage 7: Save completed in ${Date.now() - startTime}ms`);
      return sendJson(res, 200, {
        success: true,
        message: warning ? `Saved: ${warning}` : "Email provider configuration saved successfully.",
        configured: !!updated.configured,
        status: updated.status,
        warning,
        hasPassword: !!updated.smtpPass,
        config: {
          provider: updated.provider,
          senderName: updated.senderName,
          senderEmail: updated.senderEmail,
          replyTo: updated.replyTo,
          smtpHost: updated.smtpHost,
          smtpPort: updated.smtpPort,
          smtpSecure: updated.smtpSecure,
          smtpUser: updated.smtpUser,
          status: updated.status,
          configured: updated.configured,
          hasPassword: !!updated.smtpPass
        }
      });
    }
    return sendJson(res, 405, {
      success: false,
      message: "Method not allowed",
      error: `HTTP ${req.method} not allowed on /api/email/config`
    });
  } catch (err) {
    console.error("[Email Config API] Uncaught server error:", err?.message || err);
    return sendJson(res, 500, {
      success: false,
      message: "Failed to save email provider configuration",
      error: err?.message || "A server error occurred while processing the email configuration."
    });
  }
}
export {
  handler as default
};
