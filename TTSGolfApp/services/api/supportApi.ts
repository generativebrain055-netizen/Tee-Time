/**
 * Support API - send support/contact email via backend
 */
import { API_ENDPOINTS } from "../../config/api";
import { apiCall } from "./core";

/** Matches backend POST /api/support/email */
export type SupportSubmissionCategory = "bug_report" | "feedback" | "support";

export interface SendSupportEmailRequest {
  subject?: string;
  message: string;
  /** bug_report | feedback | support — stored for admin triage and email subject line */
  category?: SupportSubmissionCategory;
}

export const supportApi = {
  sendSupportEmail: (data: SendSupportEmailRequest) =>
    apiCall<{ success: boolean; message?: string; data?: { id?: string } }>(
      API_ENDPOINTS.SUPPORT_EMAIL,
      {
        method: "POST",
        body: JSON.stringify({
          subject: data.subject || "Support Request",
          message: data.message,
          ...(data.category ? { category: data.category } : {}),
        }),
      },
    ),
};
