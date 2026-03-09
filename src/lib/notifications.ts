import { supabase } from "@/integrations/supabase/client";

interface NotificationPayload {
  user_id: string;
  title: string;
  message: string;
  type: string;
  link?: string;
  related_id?: string;
}

export async function createNotification(payload: NotificationPayload) {
  try {
    await supabase.from("notifications").insert({
      user_id: payload.user_id,
      title: payload.title,
      message: payload.message,
      type: payload.type,
      link: payload.link || null,
      related_id: payload.related_id || null,
    });
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
}

export async function notifyPrescriptionApproved(
  prescribedBy: string,
  antibioticName: string,
  prescriptionId: string,
  patientName: string
) {
  await createNotification({
    user_id: prescribedBy,
    title: "Prescription Approved",
    message: `Your ${antibioticName} prescription for ${patientName} has been approved.`,
    type: "success",
    link: `/prescriptions/${prescriptionId}`,
    related_id: prescriptionId,
  });
}

export async function notifyPrescriptionRejected(
  prescribedBy: string,
  antibioticName: string,
  prescriptionId: string,
  patientName: string,
  reason: string
) {
  await createNotification({
    user_id: prescribedBy,
    title: "Prescription Rejected",
    message: `Your ${antibioticName} prescription for ${patientName} was rejected: ${reason}`,
    type: "warning",
    link: `/prescriptions/${prescriptionId}`,
    related_id: prescriptionId,
  });
}

export async function notifyMdrDetected(
  doctorId: string,
  patientName: string,
  mdrTypes: string[],
  labReportId: string
) {
  await createNotification({
    user_id: doctorId,
    title: "⚠️ MDR Pathogen Detected",
    message: `MDR pathogen (${mdrTypes.join(", ")}) detected for patient ${patientName}. Infection control measures recommended.`,
    type: "warning",
    link: `/lab-reports/${labReportId}`,
    related_id: labReportId,
  });
}

export async function notifyRestrictedPrescription(adminIds: string[], prescribedByName: string, antibioticName: string, prescriptionId: string, patientName: string) {
  for (const adminId of adminIds) {
    await createNotification({
      user_id: adminId,
      title: "Restricted Antibiotic Review",
      message: `${prescribedByName} prescribed ${antibioticName} (restricted) for ${patientName}. Stewardship review required.`,
      type: "prescription",
      link: `/prescriptions/${prescriptionId}`,
      related_id: prescriptionId,
    });
  }
}
