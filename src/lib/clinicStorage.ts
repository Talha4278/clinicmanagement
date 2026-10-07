import { supabase } from './supabase';
import {
  InventoryItem,
  Prescription,
  PrescriptionItem,
  Examination,
  Treatment,
  PatientActivityEvent,
  Patient,
  Appointment,
  Invoice,
} from './types';
import {
  isDemoMode,
  getDemoInventory,
  saveDemoInventoryItem,
  deleteDemoInventoryItem,
  getDemoExaminations,
  saveDemoExamination,
  deleteDemoExamination,
  getDemoTreatments,
  saveDemoTreatment,
  deleteDemoTreatment,
  getDemoPrescriptions,
  saveDemoPrescription,
  deleteDemoPrescription,
  getDemoPatients,
  getDemoAppointments,
  getDemoInvoices,
  isDemoRecord,
  cleanLegacyDemoData,
} from './demoData';
import { getActiveClinic } from './tenancy';
import { applyClinicFilter, isMissingClinicIdColumnError } from './tenancyQuery';

function isValidUuid(val?: string | null): boolean {
  return typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

/**
 * Purges any demo records that might be present in a clinic's storage
 */
export function purgeClinicDemoData(clinicId?: string): void {
  if (typeof window === 'undefined') return;
  cleanLegacyDemoData();
  const cId = clinicId || getActiveClinic()?.id;
  if (!cId) return;
  const keys = ['inventory', 'examinations', 'treatments', 'prescriptions', 'patients', 'appointments', 'invoices'];
  for (const k of keys) {
    try {
      localStorage.removeItem(`dentivista_clinic_${cId}_${k}`);
    } catch {
      // ignore
    }
  }
}

// ─── INVENTORY MODULE (DIRECT SUPABASE ONLY) ─────────────────────────
export async function getInventoryItems(clinicId?: string): Promise<InventoryItem[]> {
  if (isDemoMode()) {
    return getDemoInventory();
  }

  const cId = clinicId || getActiveClinic()?.id || 'clinic-dentivista-01';

  let query = supabase.from('inventory_items').select('*');
  query = applyClinicFilter(query, cId);
  let { data, error } = await query.order('name');

  if (error && isMissingClinicIdColumnError(error)) {
    const fallback = await supabase.from('inventory_items').select('*').order('name');
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    console.error('Supabase inventory_items fetch error:', error);
    throw new Error(`Database error loading inventory: ${error.message}`);
  }

  return (data || []).filter((i) => !isDemoRecord(i)) as InventoryItem[];
}

export async function saveInventoryItem(
  item: Partial<InventoryItem> & { name: string },
  clinicId?: string
): Promise<InventoryItem> {
  if (isDemoMode()) {
    return saveDemoInventoryItem(item);
  }

  const cId = clinicId || item.clinic_id || getActiveClinic()?.id || 'clinic-dentivista-01';
  const isEdit = !!item.id && isValidUuid(item.id);
  const now = new Date().toISOString();

  const payload: any = {
    clinic_id: cId,
    name: item.name.trim(),
    category: item.category || 'Dental Materials',
    sku: item.sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
    batch_number: item.batch_number || null,
    quantity: Number(item.quantity) || 0,
    unit: item.unit || 'pcs',
    min_stock_level: Number(item.min_stock_level) || 5,
    cost_price: Number(item.cost_price) || 0,
    sale_price: item.sale_price !== null && item.sale_price !== undefined ? Number(item.sale_price) : null,
    expiry_date: item.expiry_date || null,
    supplier: item.supplier || null,
    location: item.location || null,
    notes: item.notes || null,
    updated_at: now,
  };

  if (isEdit) {
    let { data, error } = await supabase
      .from('inventory_items')
      .update(payload)
      .eq('id', item.id)
      .eq('clinic_id', cId)
      .select()
      .single();

    if (error && isMissingClinicIdColumnError(error)) {
      const { clinic_id: _c, ...legacyPayload } = payload;
      const res = await supabase
        .from('inventory_items')
        .update(legacyPayload)
        .eq('id', item.id)
        .select()
        .single();
      data = res.data;
      error = res.error;
    }

    if (error) {
      console.error('Supabase inventory_items update error:', error);
      throw new Error(`Database error updating inventory: ${error.message}`);
    }
    return data as InventoryItem;
  } else {
    payload.created_at = item.created_at || now;
    if (item.id && isValidUuid(item.id)) {
      payload.id = item.id;
    }
    let { data, error } = await supabase
      .from('inventory_items')
      .insert(payload)
      .select()
      .single();

    if (error && isMissingClinicIdColumnError(error)) {
      const { clinic_id: _c, ...legacyPayload } = payload;
      const res = await supabase
        .from('inventory_items')
        .insert(legacyPayload)
        .select()
        .single();
      data = res.data;
      error = res.error;
    }

    if (error) {
      console.error('Supabase inventory_items insert error:', error);
      throw new Error(`Database error creating inventory item: ${error.message}`);
    }
    return data as InventoryItem;
  }
}

export async function deleteInventoryItem(id: string, clinicId?: string): Promise<boolean> {
  if (isDemoMode()) {
    deleteDemoInventoryItem(id);
    return true;
  }
  const cId = clinicId || getActiveClinic()?.id || 'clinic-dentivista-01';
  let { error } = await supabase.from('inventory_items').delete().eq('id', id).eq('clinic_id', cId);
  if (error && isMissingClinicIdColumnError(error)) {
    const res = await supabase.from('inventory_items').delete().eq('id', id);
    error = res.error;
  }
  if (error) {
    console.error('Supabase inventory_items delete error:', error);
    throw new Error(`Database error deleting inventory item: ${error.message}`);
  }
  return true;
}

export async function adjustInventoryStock(id: string, delta: number, clinicId?: string): Promise<InventoryItem | null> {
  const cId = clinicId || getActiveClinic()?.id || 'clinic-dentivista-01';
  const items = await getInventoryItems(cId);
  const item = items.find((i) => i.id === id);
  if (!item) return null;
  const newQty = Math.max(0, Number(item.quantity) + delta);
  return saveInventoryItem({ ...item, quantity: newQty }, cId);
}

// ─── EXAMINATIONS & DENTAL CHART (DIRECT SUPABASE ONLY) ─────────────
export async function getExaminations(patientId?: string, clinicId?: string): Promise<Examination[]> {
  if (isDemoMode()) {
    const demo = getDemoExaminations();
    if (patientId) {
      return demo.filter((e) => e.patient_id === patientId);
    }
    return demo;
  }

  const cId = clinicId || getActiveClinic()?.id || 'clinic-dentivista-01';

  let query = supabase
    .from('examinations')
    .select('*, patient:patients(*), doctor:staff(*)');
  query = applyClinicFilter(query, cId);
  if (patientId) {
    query = query.eq('patient_id', patientId);
  }
  let { data, error } = await query.order('examination_date', { ascending: false });

  if (error && isMissingClinicIdColumnError(error)) {
    let fallbackQuery = supabase
      .from('examinations')
      .select('*, patient:patients(*), doctor:staff(*)');
    if (patientId) fallbackQuery = fallbackQuery.eq('patient_id', patientId);
    const fallback = await fallbackQuery.order('examination_date', { ascending: false });
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    console.error('Supabase examinations fetch error:', error);
    throw new Error(`Database error loading examinations: ${error.message}`);
  }

  return (data || []).filter((e) => !isDemoRecord(e)) as Examination[];
}

export async function saveExamination(
  exam: Partial<Examination> & { patient_id: string },
  clinicId?: string
): Promise<Examination> {
  if (isDemoMode()) {
    return saveDemoExamination(exam);
  }

  const cId = clinicId || exam.clinic_id || getActiveClinic()?.id || 'clinic-dentivista-01';
  const isEdit = !!exam.id && isValidUuid(exam.id);
  const now = new Date().toISOString();

  const payload: any = {
    clinic_id: cId,
    patient_id: exam.patient_id,
    doctor_id: isValidUuid(exam.doctor_id) ? exam.doctor_id : null,
    examination_date: exam.examination_date || now.split('T')[0],
    dentition_type: exam.dentition_type || 'adult',
    chief_complaint: exam.chief_complaint || null,
    gingival_condition: exam.gingival_condition || null,
    plaque_level: exam.plaque_level || null,
    soft_tissue_notes: exam.soft_tissue_notes || null,
    teeth_findings: exam.teeth_findings || {},
    clinical_notes: exam.clinical_notes || null,
    treatment_plan_notes: exam.treatment_plan_notes || null,
  };

  if (isEdit) {
    let { data, error } = await supabase
      .from('examinations')
      .update(payload)
      .eq('id', exam.id)
      .eq('clinic_id', cId)
      .select('*, patient:patients(*), doctor:staff(*)')
      .single();

    if (error && isMissingClinicIdColumnError(error)) {
      const { clinic_id: _c, ...legacyPayload } = payload;
      const res = await supabase
        .from('examinations')
        .update(legacyPayload)
        .eq('id', exam.id)
        .select('*, patient:patients(*), doctor:staff(*)')
        .single();
      data = res.data;
      error = res.error;
    }

    if (error) {
      console.error('Supabase examinations update error:', error);
      throw new Error(`Database error updating examination: ${error.message}`);
    }
    return data as Examination;
  } else {
    payload.created_at = exam.created_at || now;
    if (exam.id && isValidUuid(exam.id)) {
      payload.id = exam.id;
    }
    let { data, error } = await supabase
      .from('examinations')
      .insert(payload)
      .select('*, patient:patients(*), doctor:staff(*)')
      .single();

    if (error && isMissingClinicIdColumnError(error)) {
      const { clinic_id: _c, ...legacyPayload } = payload;
      const res = await supabase
        .from('examinations')
        .insert(legacyPayload)
        .select('*, patient:patients(*), doctor:staff(*)')
        .single();
      data = res.data;
      error = res.error;
    }

    if (error) {
      console.error('Supabase examinations insert error:', error);
      throw new Error(`Database error creating examination: ${error.message}`);
    }
    return data as Examination;
  }
}

export async function deleteExamination(id: string, clinicId?: string): Promise<boolean> {
  if (isDemoMode()) {
    deleteDemoExamination(id);
    return true;
  }
  const cId = clinicId || getActiveClinic()?.id || 'clinic-dentivista-01';
  let { error } = await supabase.from('examinations').delete().eq('id', id).eq('clinic_id', cId);
  if (error && isMissingClinicIdColumnError(error)) {
    const res = await supabase.from('examinations').delete().eq('id', id);
    error = res.error;
  }
  if (error) {
    console.error('Supabase examinations delete error:', error);
    throw new Error(`Database error deleting examination: ${error.message}`);
  }
  return true;
}

// ─── TREATMENTS MODULE (DIRECT SUPABASE ONLY) ────────────────────────
export async function getTreatments(patientId?: string, clinicId?: string): Promise<Treatment[]> {
  if (isDemoMode()) {
    const demo = getDemoTreatments();
    if (patientId) {
      return demo.filter((t) => t.patient_id === patientId);
    }
    return demo;
  }

  const cId = clinicId || getActiveClinic()?.id || 'clinic-dentivista-01';

  let query = supabase
    .from('treatments')
    .select('*, patient:patients(*), doctor:staff(*)');
  query = applyClinicFilter(query, cId);
  if (patientId) {
    query = query.eq('patient_id', patientId);
  }
  let { data, error } = await query.order('treatment_date', { ascending: false });

  if (error && isMissingClinicIdColumnError(error)) {
    let fallbackQuery = supabase
      .from('treatments')
      .select('*, patient:patients(*), doctor:staff(*)');
    if (patientId) fallbackQuery = fallbackQuery.eq('patient_id', patientId);
    const fallback = await fallbackQuery.order('treatment_date', { ascending: false });
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    console.error('Supabase treatments fetch error:', error);
    throw new Error(`Database error loading treatments: ${error.message}`);
  }

  return (data || []).filter((t) => !isDemoRecord(t)) as Treatment[];
}

export async function saveTreatment(
  treatment: Partial<Treatment> & { patient_id: string; procedure_name: string },
  clinicId?: string
): Promise<Treatment> {
  if (isDemoMode()) {
    return saveDemoTreatment(treatment);
  }

  const cId = clinicId || treatment.clinic_id || getActiveClinic()?.id || 'clinic-dentivista-01';
  const isEdit = !!treatment.id && isValidUuid(treatment.id);
  const now = new Date().toISOString();

  const payload: any = {
    clinic_id: cId,
    patient_id: treatment.patient_id,
    doctor_id: isValidUuid(treatment.doctor_id) ? treatment.doctor_id : null,
    treatment_date: treatment.treatment_date || now.split('T')[0],
    tooth_number: treatment.tooth_number || null,
    procedure_name: treatment.procedure_name.trim(),
    cost: Number(treatment.cost) || 0,
    status: treatment.status || 'planned',
    notes: treatment.notes || null,
    invoice_id: isValidUuid(treatment.invoice_id) ? treatment.invoice_id : null,
  };

  if (isEdit) {
    let { data, error } = await supabase
      .from('treatments')
      .update(payload)
      .eq('id', treatment.id)
      .eq('clinic_id', cId)
      .select('*, patient:patients(*), doctor:staff(*)')
      .single();

    if (error && isMissingClinicIdColumnError(error)) {
      const { clinic_id: _c, ...legacyPayload } = payload;
      const res = await supabase
        .from('treatments')
        .update(legacyPayload)
        .eq('id', treatment.id)
        .select('*, patient:patients(*), doctor:staff(*)')
        .single();
      data = res.data;
      error = res.error;
    }

    if (error) {
      console.error('Supabase treatments update error:', error);
      throw new Error(`Database error updating treatment: ${error.message}`);
    }
    return data as Treatment;
  } else {
    payload.created_at = treatment.created_at || now;
    if (treatment.id && isValidUuid(treatment.id)) {
      payload.id = treatment.id;
    }
    let { data, error } = await supabase
      .from('treatments')
      .insert(payload)
      .select('*, patient:patients(*), doctor:staff(*)')
      .single();

    if (error && isMissingClinicIdColumnError(error)) {
      const { clinic_id: _c, ...legacyPayload } = payload;
      const res = await supabase
        .from('treatments')
        .insert(legacyPayload)
        .select('*, patient:patients(*), doctor:staff(*)')
        .single();
      data = res.data;
      error = res.error;
    }

    if (error) {
      console.error('Supabase treatments insert error:', error);
      throw new Error(`Database error creating treatment: ${error.message}`);
    }
    return data as Treatment;
  }
}

export async function deleteTreatment(id: string, clinicId?: string): Promise<boolean> {
  if (isDemoMode()) {
    deleteDemoTreatment(id);
    return true;
  }
  const cId = clinicId || getActiveClinic()?.id || 'clinic-dentivista-01';
  let { error } = await supabase.from('treatments').delete().eq('id', id).eq('clinic_id', cId);
  if (error && isMissingClinicIdColumnError(error)) {
    const res = await supabase.from('treatments').delete().eq('id', id);
    error = res.error;
  }
  if (error) {
    console.error('Supabase treatments delete error:', error);
    throw new Error(`Database error deleting treatment: ${error.message}`);
  }
  return true;
}

// ─── PRESCRIPTIONS MODULE (DIRECT SUPABASE ONLY) ─────────────────────
export async function getPrescriptions(patientId?: string, clinicId?: string): Promise<Prescription[]> {
  if (isDemoMode()) {
    const demo = getDemoPrescriptions();
    if (patientId) {
      return demo.filter((p) => p.patient_id === patientId);
    }
    return demo;
  }

  const cId = clinicId || getActiveClinic()?.id || 'clinic-dentivista-01';

  let query = supabase
    .from('prescriptions')
    .select('*, patient:patients(*), doctor:staff(*), items:prescription_items(*)');
  query = applyClinicFilter(query, cId);
  if (patientId) {
    query = query.eq('patient_id', patientId);
  }
  let { data, error } = await query.order('prescription_date', { ascending: false });

  if (error && isMissingClinicIdColumnError(error)) {
    let fallbackQuery = supabase
      .from('prescriptions')
      .select('*, patient:patients(*), doctor:staff(*), items:prescription_items(*)');
    if (patientId) fallbackQuery = fallbackQuery.eq('patient_id', patientId);
    const fallback = await fallbackQuery.order('prescription_date', { ascending: false });
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    console.error('Supabase prescriptions fetch error:', error);
    throw new Error(`Database error loading prescriptions: ${error.message}`);
  }

  return (data || []).filter((p) => !isDemoRecord(p)) as Prescription[];
}

export async function savePrescription(
  rx: Partial<Prescription> & { patient_id: string },
  items: Omit<PrescriptionItem, 'id' | 'prescription_id'>[],
  clinicId?: string
): Promise<Prescription> {
  if (isDemoMode()) {
    return saveDemoPrescription(rx, items);
  }

  const cId = clinicId || rx.clinic_id || getActiveClinic()?.id || 'clinic-dentivista-01';
  const now = new Date().toISOString();
  const isEdit = !!rx.id && isValidUuid(rx.id);

  const payload: any = {
    clinic_id: cId,
    patient_id: rx.patient_id,
    doctor_id: isValidUuid(rx.doctor_id) ? rx.doctor_id : null,
    prescription_date: rx.prescription_date || now.split('T')[0],
    diagnosis: rx.diagnosis || null,
    clinical_notes: rx.clinical_notes || null,
    advice: rx.advice || null,
    follow_up_date: rx.follow_up_date || null,
  };

  let savedRx: any = null;

  if (isEdit) {
    let { data, error } = await supabase
      .from('prescriptions')
      .update(payload)
      .eq('id', rx.id)
      .eq('clinic_id', cId)
      .select('*, patient:patients(*), doctor:staff(*)')
      .single();

    if (error && isMissingClinicIdColumnError(error)) {
      const { clinic_id: _c, ...legacyPayload } = payload;
      const res = await supabase
        .from('prescriptions')
        .update(legacyPayload)
        .eq('id', rx.id)
        .select('*, patient:patients(*), doctor:staff(*)')
        .single();
      data = res.data;
      error = res.error;
    }

    if (error) {
      console.error('Supabase prescriptions update error:', error);
      throw new Error(`Database error updating prescription: ${error.message}`);
    }
    savedRx = data;
    await supabase.from('prescription_items').delete().eq('prescription_id', rx.id);
  } else {
    payload.created_at = rx.created_at || now;
    if (rx.id && isValidUuid(rx.id)) {
      payload.id = rx.id;
    }
    let { data, error } = await supabase
      .from('prescriptions')
      .insert(payload)
      .select('*, patient:patients(*), doctor:staff(*)')
      .single();

    if (error && isMissingClinicIdColumnError(error)) {
      const { clinic_id: _c, ...legacyPayload } = payload;
      const res = await supabase
        .from('prescriptions')
        .insert(legacyPayload)
        .select('*, patient:patients(*), doctor:staff(*)')
        .single();
      data = res.data;
      error = res.error;
    }

    if (error) {
      console.error('Supabase prescriptions insert error:', error);
      throw new Error(`Database error creating prescription: ${error.message}`);
    }
    savedRx = data;
  }

  // Insert prescription line items
  if (items.length > 0 && savedRx?.id) {
    const formattedItems = items.map((it) => ({
      prescription_id: savedRx.id,
      medicine_name: it.medicine_name.trim(),
      dosage: it.dosage.trim(),
      frequency: it.frequency.trim(),
      duration: it.duration.trim(),
      instructions: it.instructions?.trim() || null,
      quantity: it.quantity?.trim() || null,
    }));
    const { data: insertedItems, error: itemsErr } = await supabase
      .from('prescription_items')
      .insert(formattedItems)
      .select();
    if (itemsErr) {
      console.error('Supabase prescription_items insert error:', itemsErr);
    } else {
      savedRx.items = insertedItems;
    }
  }

  return savedRx as Prescription;
}

export async function deletePrescription(id: string, clinicId?: string): Promise<boolean> {
  if (isDemoMode()) {
    deleteDemoPrescription(id);
    return true;
  }
  const cId = clinicId || getActiveClinic()?.id || 'clinic-dentivista-01';
  let { error } = await supabase.from('prescriptions').delete().eq('id', id).eq('clinic_id', cId);
  if (error && isMissingClinicIdColumnError(error)) {
    const res = await supabase.from('prescriptions').delete().eq('id', id);
    error = res.error;
  }
  if (error) {
    console.error('Supabase prescriptions delete error:', error);
    throw new Error(`Database error deleting prescription: ${error.message}`);
  }
  return true;
}

// ─── PATIENT 360 DOSSIER: TIMELINE AGGREGATOR (DIRECT SUPABASE ONLY) ───
export interface PatientDossierData {
  patient: Patient;
  appointments: Appointment[];
  examinations: Examination[];
  treatments: Treatment[];
  prescriptions: Prescription[];
  invoices: Invoice[];
  timeline: PatientActivityEvent[];
}

export async function getPatientDossier(patientId: string, clinicId?: string): Promise<PatientDossierData | null> {
  const cId = clinicId || getActiveClinic()?.id || 'clinic-dentivista-01';

  if (isDemoMode()) {
    const patient = getDemoPatients().find((p) => p.id === patientId);
    if (!patient) return null;

    const appointments = getDemoAppointments().filter((a) => a.patient_id === patientId);
    const invoices = getDemoInvoices().filter((i) => i.patient_id === patientId);
    const examinations = await getExaminations(patientId, cId);
    const treatments = await getTreatments(patientId, cId);
    const prescriptions = await getPrescriptions(patientId, cId);

    const timeline: PatientActivityEvent[] = [];

    appointments.forEach((apt) => {
      timeline.push({
        id: `act-apt-${apt.id}`,
        type: 'appointment',
        date: apt.appointment_date + (apt.appointment_time ? `T${apt.appointment_time}` : ''),
        title: `Appointment: ${apt.procedure || 'Clinical Visit'}`,
        subtitle: apt.appointment_time ? `Time: ${apt.appointment_time}` : undefined,
        details: apt.notes || undefined,
        status: apt.status,
        doctorName: apt.doctor?.name,
        badgeColor:
          apt.status === 'completed'
            ? '#166534'
            : apt.status === 'scheduled'
            ? '#1d4ed8'
            : '#dc2626',
        rawRecord: apt,
      });
    });

    examinations.forEach((exam) => {
      const toothCount = Object.keys(exam.teeth_findings || {}).length;
      timeline.push({
        id: `act-exam-${exam.id}`,
        type: 'examination',
        date: exam.examination_date,
        title: `Dental Examination (${exam.dentition_type === 'child' ? 'Pediatric' : 'Adult'})`,
        subtitle: toothCount > 0 ? `${toothCount} teeth charted with findings` : 'Routine visual exam',
        details: exam.clinical_notes || exam.chief_complaint || undefined,
        doctorName: exam.doctor?.name,
        badgeColor: '#0891b2',
        rawRecord: exam,
      });
    });

    treatments.forEach((trt) => {
      timeline.push({
        id: `act-trt-${trt.id}`,
        type: 'treatment',
        date: trt.treatment_date,
        title: `Treatment: ${trt.procedure_name}`,
        subtitle: trt.tooth_number ? `Tooth: #${trt.tooth_number}` : undefined,
        details: trt.notes || undefined,
        amount: trt.cost,
        status: trt.status,
        doctorName: trt.doctor?.name,
        badgeColor:
          trt.status === 'completed'
            ? '#166534'
            : trt.status === 'in_progress'
            ? '#d97706'
            : '#4b5563',
        rawRecord: trt,
      });
    });

    prescriptions.forEach((rx) => {
      const itemCount = rx.items?.length || 0;
      timeline.push({
        id: `act-rx-${rx.id}`,
        type: 'prescription',
        date: rx.prescription_date,
        title: `Prescription: ${rx.diagnosis || 'Clinical Regimen'}`,
        subtitle: `${itemCount} medication${itemCount === 1 ? '' : 's'} prescribed`,
        details: rx.notes || undefined,
        doctorName: rx.doctor?.name,
        badgeColor: '#7c3aed',
        rawRecord: rx,
      });
    });

    invoices.forEach((inv) => {
      timeline.push({
        id: `act-inv-${inv.id}`,
        type: 'invoice',
        date: inv.created_at || inv.issue_date,
        title: `Invoice: ${inv.invoice_number}`,
        subtitle: `Total: Rs. ${Number(inv.total).toLocaleString()} • ${inv.payment_status.toUpperCase()}`,
        amount: Number(inv.total),
        status: inv.payment_status,
        badgeColor:
          inv.payment_status === 'paid'
            ? '#166534'
            : inv.payment_status === 'partial'
            ? '#d97706'
            : '#dc2626',
        rawRecord: inv,
      });
    });

    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      patient,
      appointments,
      examinations,
      treatments,
      prescriptions,
      invoices,
      timeline,
    };
  }

  // 1. Fetch Patient details from Supabase
  let query = supabase.from('patients').select('*').eq('id', patientId);
  query = applyClinicFilter(query, cId);
  let { data: patientData, error: patientErr } = await query.maybeSingle();

  if (patientErr && isMissingClinicIdColumnError(patientErr)) {
    const fallback = await supabase.from('patients').select('*').eq('id', patientId).maybeSingle();
    patientData = fallback.data;
  }

  if (!patientData) {
    return null;
  }
  const patient = patientData as Patient;

  // 2. Fetch Appointments
  let appointments: Appointment[] = [];
  try {
    let aptQuery = supabase
      .from('appointments')
      .select('*, doctor:staff!appointments_doctor_id_fkey(*)')
      .eq('patient_id', patientId);
    aptQuery = applyClinicFilter(aptQuery, cId);
    let { data: apts, error: aptErr } = await aptQuery.order('appointment_date', { ascending: false });

    if (aptErr && isMissingClinicIdColumnError(aptErr)) {
      const fallback = await supabase
        .from('appointments')
        .select('*, doctor:staff!appointments_doctor_id_fkey(*)')
        .eq('patient_id', patientId)
        .order('appointment_date', { ascending: false });
      apts = fallback.data;
      aptErr = fallback.error;
    }

    if (aptErr) {
      const fallbackNoDoc = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', patientId)
        .order('appointment_date', { ascending: false });
      if (fallbackNoDoc.data) {
        apts = fallbackNoDoc.data;
      }
    }

    if (apts) appointments = apts as Appointment[];
  } catch (err) {
    console.error('Error fetching appointments for dossier:', err);
  }

  // 3. Fetch Invoices
  let invoices: Invoice[] = [];
  try {
    let invQuery = supabase
      .from('invoices')
      .select('*, invoice_items(*), doctor:staff!invoices_doctor_id_fkey(*)')
      .eq('patient_id', patientId);
    invQuery = applyClinicFilter(invQuery, cId);
    let { data: invs, error: invErr } = await invQuery.order('created_at', { ascending: false });

    if (invErr && isMissingClinicIdColumnError(invErr)) {
      const fallback = await supabase
        .from('invoices')
        .select('*, invoice_items(*), doctor:staff!invoices_doctor_id_fkey(*)')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });
      invs = fallback.data;
      invErr = fallback.error;
    }

    if (invErr) {
      const fallbackNoDoc = await supabase
        .from('invoices')
        .select('*, invoice_items(*)')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });
      if (fallbackNoDoc.data) {
        invs = fallbackNoDoc.data;
      }
    }

    if (invs) invoices = invs as Invoice[];
  } catch (err) {
    console.error('Error fetching invoices for dossier:', err);
  }

  // 4. Fetch Examinations, Treatments & Prescriptions directly from Supabase
  const [examinations, treatments, prescriptions] = await Promise.all([
    getExaminations(patientId, cId).catch(() => []),
    getTreatments(patientId, cId).catch(() => []),
    getPrescriptions(patientId, cId).catch(() => []),
  ]);

  // 5. Assemble Timeline
  const timeline: PatientActivityEvent[] = [];

  appointments.forEach((apt) => {
    timeline.push({
      id: `act-apt-${apt.id}`,
      type: 'appointment',
      date: apt.appointment_date + (apt.appointment_time ? `T${apt.appointment_time}` : ''),
      title: `Appointment: ${apt.procedure || 'Clinical Visit'}`,
      subtitle: apt.appointment_time ? `Time: ${apt.appointment_time}` : undefined,
      details: apt.notes || undefined,
      status: apt.status,
      doctorName: apt.doctor?.name,
      badgeColor:
        apt.status === 'completed'
          ? '#166534'
          : apt.status === 'scheduled'
          ? '#1d4ed8'
          : '#dc2626',
      rawRecord: apt,
    });
  });

  examinations.forEach((exam) => {
    const toothCount = Object.keys(exam.teeth_findings || {}).length;
    timeline.push({
      id: `act-exam-${exam.id}`,
      type: 'examination',
      date: exam.examination_date,
      title: `Dental Examination (${exam.dentition_type === 'child' ? 'Pediatric' : 'Adult'})`,
      subtitle: `${toothCount} teeth charted with findings`,
      details: exam.chief_complaint ? `Chief Complaint: ${exam.chief_complaint}` : exam.clinical_notes || undefined,
      doctorName: exam.doctor?.name,
      badgeColor: '#7c3aed',
      rawRecord: exam,
    });
  });

  treatments.forEach((trt) => {
    timeline.push({
      id: `act-trt-${trt.id}`,
      type: 'treatment',
      date: trt.treatment_date,
      title: `Treatment: ${trt.procedure_name}`,
      subtitle: trt.tooth_number ? `Tooth: #${trt.tooth_number}` : undefined,
      details: trt.notes ? `${trt.notes} (Fee: Rs. ${Number(trt.cost).toLocaleString()})` : `Fee: Rs. ${Number(trt.cost).toLocaleString()}`,
      status: trt.status,
      doctorName: trt.doctor?.name,
      badgeColor:
        trt.status === 'completed'
          ? '#166534'
          : trt.status === 'in_progress'
          ? '#d97706'
          : '#0284c7',
      rawRecord: trt,
    });
  });

  prescriptions.forEach((rx) => {
    const itemCount = rx.items?.length || 0;
    timeline.push({
      id: `act-rx-${rx.id}`,
      type: 'prescription',
      date: rx.prescription_date,
      title: `Prescription: ${rx.diagnosis || 'Clinical Prescription'}`,
      subtitle: `${itemCount} medication${itemCount === 1 ? '' : 's'} prescribed`,
      details: rx.clinical_notes || rx.advice || undefined,
      doctorName: rx.doctor?.name,
      badgeColor: '#059669',
      rawRecord: rx,
    });
  });

  invoices.forEach((inv) => {
    timeline.push({
      id: `act-inv-${inv.id}`,
      type: 'invoice',
      date: inv.created_at || inv.issue_date,
      title: `Invoice: ${inv.invoice_number}`,
      subtitle: `Total: Rs. ${Number(inv.total).toLocaleString()} • ${inv.payment_status.toUpperCase()}`,
      amount: Number(inv.total),
      status: inv.payment_status,
      badgeColor:
        inv.payment_status === 'paid'
          ? '#166534'
          : inv.payment_status === 'partial'
          ? '#d97706'
          : '#dc2626',
      rawRecord: inv,
    });
  });

  timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    patient,
    appointments,
    examinations,
    treatments,
    prescriptions,
    invoices,
    timeline,
  };
}
