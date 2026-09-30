import { ClinicSettings, WhatsAppConfig } from './types';

export type WhatsAppMessageType = 'scheduled' | 'completed' | 'no_show' | 'cancelled' | 'payment_reminder';

export interface AppointmentMessageData {
  patientName: string;
  phone: string;
  procedure?: string;
  date: string; // YYYY-MM-DD
  time?: string;
  doctorName?: string;
  clinicSettings?: ClinicSettings;
}

export interface PaymentMessageData {
  patientName: string;
  phone: string;
  invoiceNumber: string;
  procedureOrServices?: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  date: string; // YYYY-MM-DD
  clinicSettings?: ClinicSettings;
}

/**
 * Standardize phone number for WhatsApp wa.me link:
 * - Removes dashes, spaces, parentheses, '+'
 * - If Pakistani number starting with '03...', converts to '923...'
 * - If starts with '3...', adds '92'
 */
export function cleanPhoneNumber(rawPhone: string): string {
  if (!rawPhone) return '';
  let cleaned = rawPhone.replace(/[\s\-\(\)\+\.]/g, '');
  if (cleaned.startsWith('03')) {
    cleaned = '92' + cleaned.substring(1);
  } else if (cleaned.length === 10 && cleaned.startsWith('3')) {
    cleaned = '92' + cleaned;
  }
  return cleaned;
}

/**
 * Format a YYYY-MM-DD date into friendly readable string
 */
export function formatFriendlyDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Format a 24-hour time string ("14:30") into a friendly 12-hour string with AM/PM ("02:30 PM")
 */
export function formatFriendlyTime(timeStr?: string | null): string {
  if (!timeStr) return '';
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return timeStr;
  const h = parseInt(parts[0], 10);
  const m = parts[1].padStart(2, '0');
  if (isNaN(h)) return timeStr;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, '0')}:${m} ${period}`;
}

/**
 * Generate highly personalized appointment message based on appointment status
 */
export function generateAppointmentWhatsAppMessage(
  type: 'scheduled' | 'completed' | 'no_show' | 'cancelled',
  data: AppointmentMessageData
): string {
  const clinicName = data.clinicSettings?.clinic_name || 'Clinsyst Dental';
  const clinicPhone = data.clinicSettings?.phone || '(+92) 300-0979185';
  const clinicAddress = data.clinicSettings?.address || 'Clinic Reception';
  const doctorName = data.doctorName ? `Dr. ${data.doctorName}` : 'Attending Dentist';
  const procedure = data.procedure || 'Dental Consultation';
  const formattedDate = formatFriendlyDate(data.date);
  const formattedTime = formatFriendlyTime(data.time) || data.time || 'Scheduled Time';

  switch (type) {
    case 'scheduled':
      return [
        `🌟 *Appointment Reminder — ${clinicName}* 🌟`,
        ``,
        `Dear *${data.patientName}*,`,
        `This is a friendly reminder for your upcoming appointment with us:`,
        ``,
        `📅 *Date:* ${formattedDate}`,
        `⏰ *Time:* ${formattedTime}`,
        `🩺 *Procedure / Visit:* ${procedure}`,
        `👨‍⚕️ *Doctor:* ${doctorName}`,
        `📍 *Location:* ${clinicAddress}`,
        ``,
        `Please arrive 5 to 10 minutes prior to your slot. If you need to reschedule or have any queries, please reply directly to this message or call us at *${clinicPhone}*.`,
        ``,
        `We look forward to seeing you!`,
        `Warm regards,`,
        `*${clinicName} Team*`,
      ].join('\n');

    case 'completed':
      return [
        `🦷 *Post-Treatment Care & Follow-Up — ${clinicName}* 🦷`,
        ``,
        `Dear *${data.patientName}*,`,
        `Thank you for visiting us today! We hope you had a comfortable experience during your *${procedure}* with ${doctorName}.`,
        ``,
        `💡 *Post-Treatment Reminders:*`,
        `• Follow prescribed medications and oral hygiene advice as instructed.`,
        `• Avoid excessively hot, hard, or spicy foods near the treated area for 24 hours.`,
        `• Keep yourself hydrated and rest well.`,
        ``,
        `If you experience any unusual discomfort, swelling, or have questions regarding your recovery, our team is right here to help you. Reach us at *${clinicPhone}*.`,
        ``,
        `Wishing you a smooth and swift recovery!`,
        `Warm regards,`,
        `*${clinicName}*`,
      ].join('\n');

    case 'no_show':
    case 'cancelled':
      return [
        `⚠️ *We Missed You Today — ${clinicName}* ⚠️`,
        ``,
        `Dear *${data.patientName}*,`,
        `We noticed you were unable to make your scheduled appointment for *${procedure}* with ${doctorName} on *${formattedDate} at ${formattedTime}*.`,
        ``,
        `Your dental health and treatment continuity are very important to us. We would be happy to reschedule your visit to a time that best suits your routine this week.`,
        ``,
        `👉 *Reply to this message* with your preferred date and time, or call our reception directly at *${clinicPhone}* to reserve your slot.`,
        ``,
        `Best regards,`,
        `*${clinicName} Reception*`,
      ].join('\n');
  }
}

/**
 * Generate highly personalized payment reminder message for pending/partial invoices
 */
export function generatePaymentWhatsAppMessage(data: PaymentMessageData): string {
  const clinicName = data.clinicSettings?.clinic_name || 'Clinsyst Dental';
  const clinicPhone = data.clinicSettings?.phone || '(+92) 300-0979185';
  const currency = data.clinicSettings?.currency_symbol || 'Rs.';
  const procedure = data.procedureOrServices || 'Dental Services & Treatment';
  const formattedDate = formatFriendlyDate(data.date);

  return [
    `💳 *Payment Statement & Reminder — ${clinicName}* 💳`,
    ``,
    `Dear *${data.patientName}*,`,
    `We hope this message finds you well. This is a gentle reminder regarding the outstanding balance on your invoice *#${data.invoiceNumber}*:`,
    ``,
    `📋 *Billing Summary:*`,
    `• Service / Procedure: *${procedure}*`,
    `• Date of Visit: *${formattedDate}*`,
    `• Total Bill: *${currency} ${data.totalAmount.toLocaleString()}*`,
    `• Paid Amount: *${currency} ${data.paidAmount.toLocaleString()}*`,
    `• Outstanding Balance: *${currency} ${data.pendingAmount.toLocaleString()}*`,
    ``,
    `Kindly arrange for the settlement of the pending balance of *${currency} ${data.pendingAmount.toLocaleString()}* at your earliest convenience.`,
    ``,
    `If you have already processed this payment or require an itemized breakdown, please reply to this message or contact our accounts desk at *${clinicPhone}*.`,
    ``,
    `Thank you for placing your trust in *${clinicName}*!`,
    `Finance & Accounts`,
    `*${clinicName}*`,
  ].join('\n');
}

/**
 * Open WhatsApp directly in WhatsApp Web or native application
 */
export function openWhatsAppChat(phone: string, message: string): void {
  const cleanPhone = cleanPhoneNumber(phone);
  const encodedText = encodeURIComponent(message);
  const url = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodedText}`
    : `https://wa.me/?text=${encodedText}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Send WhatsApp Notification (supports direct Web/App dispatch or Cloud API placeholder dispatch)
 */
export async function sendWhatsAppNotification(
  phone: string,
  message: string,
  config?: WhatsAppConfig
): Promise<{ success: boolean; mode: string; message: string }> {
  const cleanPhone = cleanPhoneNumber(phone);

  if (!cleanPhone) {
    return { success: false, mode: 'error', message: 'Invalid or missing phone number' };
  }

  // If cloud API is enabled and credentials are provided
  if (config?.enabled && config.provider === 'cloud_api' && config.api_key && config.phone_number_id) {
    try {
      const endpoint = `${config.api_endpoint || 'https://graph.facebook.com/v19.0'}/${config.phone_number_id}/messages`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.api_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleanPhone,
          type: 'text',
          text: { body: message },
        }),
      });

      if (response.ok) {
        return { success: true, mode: 'cloud_api', message: 'Message sent via WhatsApp Cloud API successfully!' };
      } else {
        const errData = await response.json();
        console.warn('WhatsApp Cloud API call returned error, falling back to Web WhatsApp:', errData);
      }
    } catch (err) {
      console.warn('WhatsApp API network error, falling back to Web WhatsApp:', err);
    }
  }

  // Default & Reliable Mode: Instant WhatsApp Web / App Dispatch
  openWhatsAppChat(phone, message);
  return { success: true, mode: 'direct_web', message: 'Opened WhatsApp with personalized message!' };
}
