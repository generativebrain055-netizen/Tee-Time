/**
 * Support API - send support/contact email via backend
 */
import { API_ENDPOINTS } from "../../config/api";
import { apiCall } from "./core";

export interface SendSupportEmailRequest {
  subject?: string;
  message: string;
}

export const supportApi = {
  sendSupportEmail: (data: SendSupportEmailRequest) =>
    apiCall<{ success: boolean; message?: string }>(API_ENDPOINTS.SUPPORT_EMAIL, {
      method: "POST",
      body: JSON.stringify({
        subject: data.subject || "Support Request",
        message: data.message,
      }),
    }),
};
