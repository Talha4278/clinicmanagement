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

// ─── INITIAL SEED DATA (EMPTY - REAL DATA ONLY) ──────────────────────
const SEED_INVENTORY: InventoryItem[] = [];
const SEED_EXAMINATIONS: Examination[] = [];
const SEED_TREATMENTS: Treatment[] = [];
const SEED_PRESCRIPTIONS: (Prescription & { items: PrescriptionItem[] })[] = [];

function getClinicStorageKey(key: string): string {
  const clinic = getActiveClinic();
  const clinicId = clinic?.id || 'default';
  return `dentivista_clinic_${clinicId}_${key}`;
}

// Safely access clinic-isolated localStorage
function getClinicLocal<T>(key: string, defaultVal: T): T {
  try {
    const scopedKey = getClinicStorageKey(key);
    const raw = localStorage.getItem(scopedKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((item) => !isDemoRecord(item)) as unknown as T;
      }
      return parsed;
    }
    // Also check un-scoped key for clean user-created items if scoped key is empty
    const legacyRaw = localStorage.getItem(`dentivista_${key}`);
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter((item) => !isDemoRecord(item));
        if (cleaned.length > 0) {
          localStorage.setItem(scopedKey, JSON.stringify(cleaned));
          return cleaned as unknown as T;
        }
      }
    }
    return defaultVal;
  } catch {
    return defaultVal;
  }
}

function setClinicLocal<T>(key: string, val: T): void {
  try {
    const scopedKey = getClinicStorageKey(key);
    if (Array.isArray(val)) {
      const sanitized = val.filter((item) => !isDemoRecord(item));
      localStorage.setItem(scopedKey, JSON.stringify(sanitized));
    } else {
      localStorage.setItem(scopedKey, JSON.stringify(val));
    }
  } catch (e) {
    console.error('localStorage error:', e);
  }
}

/**
 * Purges any demo records that might be present in a clinic's storage
 */
export function purgeClinicDemoData(clinicId?: string): void {
  if (typeof window === 'undefined') return;
  cleanLegacyDemoData();
  const cId = clinicId || getActiveClinic()?.id;
  if (!cId) return;
  const keys = ['inventory', 'examinations', 'treatments', 'prescriptions'];
  for (const k of keys) {
    const scopedKey = `dentivista_clinic_${cId}_${k}`;
    try {
      const raw = localStorage.getItem(scopedKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter((item) => !isDemoRecord(item));
          localStorage.setItem(scopedKey, JSON.stringify(cleaned));
        }
      }
    } catch {
      // ignore
    }
  }
}

function isValidUuid(val?: string | null): boolean {
  return typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

// ─── INVENTORY CRUD ──────────────────────────────────────────────────
export async function getInventoryItems(): Promise<InventoryItem[]> {
  if (isDemoMode()) {
    return getDemoInventory();
  }

  // Real clinic - try Supabase
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .order('name');
    if (!error && Array.isArray(data)) {
      // Supabase returned valid array (even if empty 0 items for new clinic)
      return (data as InventoryItem[]).filter((i) => !isDemoRecord(i));
    }
  } catch (err) {
    console.warn('Supabase inventory_items fetch failed, falling back to clinic local', err);
  }

  // Fallback to clinic-isolated local storage (clean slate for new clinic)
  const local = getClinicLocal<InventoryItem[]>('inventory', SEED_INVENTORY);
  return local.filter((item) => !isDemoRecord(item));
}

export async function saveInventoryItem(item: Partial<InventoryItem> & { name: string }): Promise<InventoryItem> {
  if (isDemoMode()) {
    return saveDemoInventoryItem(item);
  }

  const isEdit = !!item.id;
  const now = new Date().toISOString();

  const payload: InventoryItem = {
    id: item.id || `inv-${Date.now()}`,
    name: item.name.trim(),
    category: item.category || 'Dental Materials',
    sku: item.sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
    batch_number: item.batch_number || null,
    quantity: Number(item.quantity) || 0,
    unit: item.unit || 'pcs',
    min_stock_level: Number(item.min_stock_level) || 5,
    cost_price: Number(item.cost_price) || 0,
    sale_price: item.sale_price ? Number(item.sale_price) : null,
    expiry_date: item.expiry_date || null,
    supplier: item.supplier || null,
    location: item.location || null,
    notes: item.notes || null,
    created_at: item.created_at || now,
    updated_at: now,
  };

  try {
    if (isEdit && isValidUuid(payload.id)) {
      const { data, error } = await supabase
        .from('inventory_items')
        .update(payload)
        .eq('id', payload.id)
        .select()
        .single();
      if (!error && data) {
        updateClinicLocalInventory(data as InventoryItem);
        return data as InventoryItem;
      }
    } else {
      const { id: _ignore, ...insertPayload } = payload;
      const { data, error } = await supabase
        .from('inventory_items')
        .insert(isValidUuid(payload.id) ? payload : insertPayload)
        .select()
        .single();
      if (!error && data) {
        updateClinicLocalInventory(data as InventoryItem);
        return data as InventoryItem;
      }
    }
  } catch {
    // ignore supabase error and use local
  }

  updateClinicLocalInventory(payload);
  return payload;
}

function updateClinicLocalInventory(item: InventoryItem) {
  if (isDemoRecord(item)) return;
  const current = getClinicLocal<InventoryItem[]>('inventory', SEED_INVENTORY);
  const idx = current.findIndex((i) => i.id === item.id);
  let updated: InventoryItem[];
  if (idx >= 0) {
    updated = [...current];
    updated[idx] = item;
  } else {
    updated = [item, ...current];
  }
  setClinicLocal('inventory', updated);
}

export async function deleteInventoryItem(id: string): Promise<boolean> {
  if (isDemoMode()) {
    deleteDemoInventoryItem(id);
    return true;
  }
  try {
    if (isValidUuid(id)) {
      await supabase.from('inventory_items').delete().eq('id', id);
    }
  } catch {
    // proceed
  }
  const current = getClinicLocal<InventoryItem[]>('inventory', SEED_INVENTORY);
  setClinicLocal('inventory', current.filter((i) => i.id !== id));
  return true;
}

export async function adjustInventoryStock(id: string, delta: number, _reason?: string): Promise<InventoryItem | null> {
  const items = await getInventoryItems();
  const item = items.find((i) => i.id === id);
  if (!item) return null;
  const newQty = Math.max(0, Number(item.quantity) + delta);
  return saveInventoryItem({ ...item, quantity: newQty });
}

// ─── EXAMINATIONS & DENTAL CHART CRUD ────────────────────────────────
export async function getExaminations(patientId?: string): Promise<Examination[]> {
  if (isDemoMode()) {
    const demo = getDemoExaminations();
    if (patientId) {
      return demo.filter((e) => e.patient_id === patientId);
    }
    return demo;
  }

  try {
    let query = supabase
      .from('examinations')
      .select('*, patient:patients(*), doctor:staff(*)');
    if (patientId) {
      query = query.eq('patient_id', patientId);
    }
    const { data, error } = await query.order('examination_date', { ascending: false });
    if (!error && Array.isArray(data)) {
      return (data as Examination[]).filter((e) => !isDemoRecord(e));
    }
  } catch {
    // fallback
  }

  const local = getClinicLocal<Examination[]>('examinations', SEED_EXAMINATIONS).filter(
    (e) => !isDemoRecord(e)
  );
  if (patientId) {
    return local.filter((e) => e.patient_id === patientId);
  }
  return local;
}

export async function saveExamination(exam: Partial<Examination> & { patient_id: string }): Promise<Examination> {
  if (isDemoMode()) {
    return saveDemoExamination(exam);
  }

  const isEdit = !!exam.id;
  const now = new Date().toISOString();

  const payload: Examination = {
    id: exam.id || `exam-${Date.now()}`,
    patient_id: exam.patient_id,
    doctor_id: exam.doctor_id || null,
    examination_date: exam.examination_date || now.split('T')[0],
    dentition_type: exam.dentition_type || 'adult',
    chief_complaint: exam.chief_complaint || null,
    gingival_condition: exam.gingival_condition || null,
    plaque_level: exam.plaque_level || null,
    soft_tissue_notes: exam.soft_tissue_notes || null,
    teeth_findings: exam.teeth_findings || {},
    clinical_notes: exam.clinical_notes || null,
    treatment_plan_notes: exam.treatment_plan_notes || null,
    created_at: exam.created_at || now,
  };

  try {
    const dbPayload = {
      ...payload,
      doctor_id: isValidUuid(payload.doctor_id) ? payload.doctor_id : null,
    };
    if (isEdit && isValidUuid(payload.id)) {
      const { data, error } = await supabase
        .from('examinations')
        .update(dbPayload)
        .eq('id', payload.id)
        .select()
        .single();
      if (!error && data) {
        updateClinicLocalExam(data as Examination);
        return data as Examination;
      }
    } else {
      const { id: _ignore, ...insertPayload } = dbPayload;
      const { data, error } = await supabase
        .from('examinations')
        .insert(isValidUuid(payload.id) ? dbPayload : insertPayload)
        .select()
        .single();
      if (!error && data) {
        updateClinicLocalExam(data as Examination);
        return data as Examination;
      }
    }
  } catch {
    // ignore
  }

  updateClinicLocalExam(payload);
  return payload;
}

function updateClinicLocalExam(exam: Examination) {
  if (isDemoRecord(exam)) return;
  const current = getClinicLocal<Examination[]>('examinations', SEED_EXAMINATIONS);
  const idx = current.findIndex((e) => e.id === exam.id);
  let updated: Examination[];
  if (idx >= 0) {
    updated = [...current];
    updated[idx] = exam;
  } else {
    updated = [exam, ...current];
  }
  setClinicLocal('examinations', updated);
}

export async function deleteExamination(id: string): Promise<boolean> {
  if (isDemoMode()) {
    deleteDemoExamination(id);
    return true;
  }
  try {
    if (isValidUuid(id)) {
      await supabase.from('examinations').delete().eq('id', id);
    }
  } catch {
    // ignore
  }
  const current = getClinicLocal<Examination[]>('examinations', SEED_EXAMINATIONS);
  setClinicLocal('examinations', current.filter((e) => e.id !== id));
  return true;
}

// ─── TREATMENTS CRUD ─────────────────────────────────────────────────
export async function getTreatments(patientId?: string): Promise<Treatment[]> {
  if (isDemoMode()) {
    const demo = getDemoTreatments();
    if (patientId) {
      return demo.filter((t) => t.patient_id === patientId);
    }
    return demo;
  }

  try {
    let query = supabase
      .from('treatments')
      .select('*, patient:patients(*), doctor:staff(*)');
    if (patientId) {
      query = query.eq('patient_id', patientId);
    }
    const { data, error } = await query.order('treatment_date', { ascending: false });
    if (!error && Array.isArray(data)) {
      return (data as Treatment[]).filter((t) => !isDemoRecord(t));
    }
  } catch {
    // fallback
  }

  const local = getClinicLocal<Treatment[]>('treatments', SEED_TREATMENTS).filter(
    (t) => !isDemoRecord(t)
  );
  if (patientId) {
    return local.filter((t) => t.patient_id === patientId);
  }
  return local;
}

export async function saveTreatment(treatment: Partial<Treatment> & { patient_id: string; procedure_name: string }): Promise<Treatment> {
  if (isDemoMode()) {
    return saveDemoTreatment(treatment);
  }

  const isEdit = !!treatment.id;
  const now = new Date().toISOString();

  const payload: Treatment = {
    id: treatment.id || `trt-${Date.now()}`,
    patient_id: treatment.patient_id,
    doctor_id: treatment.doctor_id || null,
    treatment_date: treatment.treatment_date || now.split('T')[0],
    tooth_number: treatment.tooth_number || null,
    procedure_name: treatment.procedure_name.trim(),
    cost: Number(treatment.cost) || 0,
    status: treatment.status || 'planned',
    notes: treatment.notes || null,
    invoice_id: treatment.invoice_id || null,
    created_at: treatment.created_at || now,
  };

  try {
    const dbPayload = {
      ...payload,
      doctor_id: isValidUuid(payload.doctor_id) ? payload.doctor_id : null,
    };
    if (isEdit && isValidUuid(payload.id)) {
      const { data, error } = await supabase
        .from('treatments')
        .update(dbPayload)
        .eq('id', payload.id)
        .select()
        .single();
      if (!error && data) {
        updateClinicLocalTreatment(data as Treatment);
        return data as Treatment;
      }
    } else {
      const { id: _ignore, ...insertPayload } = dbPayload;
      const { data, error } = await supabase
        .from('treatments')
        .insert(isValidUuid(payload.id) ? dbPayload : insertPayload)
        .select()
        .single();
      if (!error && data) {
        updateClinicLocalTreatment(data as Treatment);
        return data as Treatment;
      }
    }
  } catch {
    // ignore
  }

  updateClinicLocalTreatment(payload);
  return payload;
}

function updateClinicLocalTreatment(trt: Treatment) {
  if (isDemoRecord(trt)) return;
  const current = getClinicLocal<Treatment[]>('treatments', SEED_TREATMENTS);
  const idx = current.findIndex((t) => t.id === trt.id);
  let updated: Treatment[];
  if (idx >= 0) {
    updated = [...current];
    updated[idx] = trt;
  } else {
    updated = [trt, ...current];
  }
  setClinicLocal('treatments', updated);
}

export async function deleteTreatment(id: string): Promise<boolean> {
  if (isDemoMode()) {
    deleteDemoTreatment(id);
    return true;
  }
  try {
    if (isValidUuid(id)) {
      await supabase.from('treatments').delete().eq('id', id);
    }
  } catch {
    // ignore
  }
  const current = getClinicLocal<Treatment[]>('treatments', SEED_TREATMENTS);
  setClinicLocal('treatments', current.filter((t) => t.id !== id));
  return true;
}

// ─── PRESCRIPTIONS CRUD ──────────────────────────────────────────────
export async function getPrescriptions(patientId?: string): Promise<Prescription[]> {
  if (isDemoMode()) {
    const demo = getDemoPrescriptions();
    if (patientId) {
      return demo.filter((p) => p.patient_id === patientId);
    }
    return demo;
  }

  try {
    let query = supabase
      .from('prescriptions')
      .select('*, patient:patients(*), doctor:staff(*), items:prescription_items(*)');
    if (patientId) {
      query = query.eq('patient_id', patientId);
    }
    const { data, error } = await query.order('prescription_date', { ascending: false });
    if (!error && Array.isArray(data)) {
      return (data as Prescription[]).filter((p) => !isDemoRecord(p));
    }
  } catch {
    // fallback
  }

  const local = getClinicLocal<Prescription[]>('prescriptions', SEED_PRESCRIPTIONS).filter(
    (p) => !isDemoRecord(p)
  );
  if (patientId) {
    return local.filter((p) => p.patient_id === patientId);
  }
  return local;
}

export async function savePrescription(
  rx: Partial<Prescription> & { patient_id: string },
  items: Omit<PrescriptionItem, 'id' | 'prescription_id'>[]
): Promise<Prescription> {
  if (isDemoMode()) {
    return saveDemoPrescription(rx, items);
  }

  const rxId = rx.id || `rx-${Date.now()}`;
  const now = new Date().toISOString();

  const formattedItems: PrescriptionItem[] = items.map((it, idx) => ({
    id: `rxi-${Date.now()}-${idx}`,
    prescription_id: rxId,
    medicine_name: it.medicine_name.trim(),
    dosage: it.dosage.trim(),
    frequency: it.frequency.trim(),
    duration: it.duration.trim(),
    instructions: it.instructions?.trim() || '',
    quantity: it.quantity?.trim() || '',
  }));

  const payload: Prescription = {
    id: rxId,
    patient_id: rx.patient_id,
    doctor_id: rx.doctor_id || null,
    prescription_date: rx.prescription_date || now.split('T')[0],
    diagnosis: rx.diagnosis || null,
    clinical_notes: rx.clinical_notes || null,
    advice: rx.advice || null,
    follow_up_date: rx.follow_up_date || null,
    created_at: rx.created_at || now,
    items: formattedItems,
  };

  try {
    const { items: _items, ...rxOnly } = payload;
    const dbPayload = {
      ...rxOnly,
      doctor_id: isValidUuid(rxOnly.doctor_id) ? rxOnly.doctor_id : null,
    };
    if (isValidUuid(rxId)) {
      const { error: rxErr } = await supabase.from('prescriptions').upsert(dbPayload);
      if (!rxErr) {
        await supabase.from('prescription_items').delete().eq('prescription_id', rxId);
        await supabase.from('prescription_items').insert(formattedItems);
      }
    } else {
      const { id: _ignore, ...insertPayload } = dbPayload;
      const { data: createdRx, error: rxErr } = await supabase.from('prescriptions').insert(insertPayload).select().single();
      if (!rxErr && createdRx) {
        const finalItems = items.map((it) => ({
          prescription_id: createdRx.id,
          medicine_name: it.medicine_name,
          dosage: it.dosage,
          frequency: it.frequency,
          duration: it.duration,
          instructions: it.instructions,
          quantity: it.quantity,
        }));
        await supabase.from('prescription_items').insert(finalItems);
      }
    }
  } catch {
    // fallback
  }

  updateClinicLocalPrescription(payload);
  return payload;
}

function updateClinicLocalPrescription(payload: Prescription) {
  if (isDemoRecord(payload)) return;
  const current = getClinicLocal<Prescription[]>('prescriptions', SEED_PRESCRIPTIONS);
  const idx = current.findIndex((p) => p.id === payload.id);
  let updated: Prescription[];
  if (idx >= 0) {
    updated = [...current];
    updated[idx] = payload;
  } else {
    updated = [payload, ...current];
  }
  setClinicLocal('prescriptions', updated);
}

export async function deletePrescription(id: string): Promise<boolean> {
  if (isDemoMode()) {
    deleteDemoPrescription(id);
    return true;
  }
  try {
    if (isValidUuid(id)) {
      await supabase.from('prescription_items').delete().eq('prescription_id', id);
      await supabase.from('prescriptions').delete().eq('id', id);
    }
  } catch {
    // fallback
  }
  const current = getClinicLocal<Prescription[]>('prescriptions', SEED_PRESCRIPTIONS);
  setClinicLocal('prescriptions', current.filter((p) => p.id !== id));
  return true;
}

// ─── PATIENT 360 DOSSIER: RESEARCH & TIMELINE AGGREGATOR ─────────────
export interface PatientDossierData {
  patient: Patient;
  appointments: Appointment[];
  examinations: Examination[];
  treatments: Treatment[];
  prescriptions: Prescription[];
  invoices: Invoice[];
  timeline: PatientActivityEvent[];
}

export async function getPatientDossier(patientId: string): Promise<PatientDossierData | null> {
  if (isDemoMode()) {
    const patient = getDemoPatients().find((p) => p.id === patientId);
    if (!patient) return null;

    const appointments = getDemoAppointments().filter((a) => a.patient_id === patientId);
    const invoices = getDemoInvoices().filter((i) => i.patient_id === patientId);
    const examinations = await getExaminations(patientId);
    const treatments = await getTreatments(patientId);
    const prescriptions = await getPrescriptions(patientId);

    const timeline: PatientActivityEvent[] = [];

    // Appointments events
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

    // Examination events
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

    // Treatment events
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

    // Prescription events
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

    // Invoice events
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

  // 1. Fetch Patient details
  const { data: patientData } = await supabase
    .from('patients')
    .select('*')
    .eq('id', patientId)
    .single();

  if (!patientData) return null;
  const patient = patientData as Patient;

  // 2. Fetch Appointments
  let appointments: Appointment[] = [];
  try {
    const { data: apts } = await supabase
      .from('appointments')
      .select('*, doctor:staff!appointments_doctor_id_fkey(*)')
      .eq('patient_id', patientId)
      .order('appointment_date', { ascending: false });
    if (apts) appointments = apts as Appointment[];
  } catch {
    // ignore
  }

  // 3. Fetch Invoices
  let invoices: Invoice[] = [];
  try {
    const { data: invs } = await supabase
      .from('invoices')
      .select('*, invoice_items(*), doctor:staff!invoices_doctor_id_fkey(*)')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });
    if (invs) invoices = invs as Invoice[];
  } catch {
    // ignore
  }

  // 4. Fetch Examinations
  const examinations = await getExaminations(patientId);

  // 5. Fetch Treatments
  const treatments = await getTreatments(patientId);

  // 6. Fetch Prescriptions
  const prescriptions = await getPrescriptions(patientId);

  // 7. Assemble Unified Chronological Timeline for Research
  const timeline: PatientActivityEvent[] = [];

  // Appointments events
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

  // Examination events
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

  // Treatment events
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
          ? '#059669'
          : trt.status === 'in_progress'
          ? '#d97706'
          : '#4f46e5',
      rawRecord: trt,
    });
  });

  // Prescription events
  prescriptions.forEach((rx) => {
    const medList = (rx.items || []).map((m) => m.medicine_name).join(', ');
    timeline.push({
      id: `act-rx-${rx.id}`,
      type: 'prescription',
      date: rx.prescription_date,
      title: `Prescription Issued`,
      subtitle: medList ? `${rx.items?.length} Medications: ${medList}` : undefined,
      details: rx.diagnosis ? `Diagnosis: ${rx.diagnosis}` : rx.advice || undefined,
      doctorName: rx.doctor?.name,
      badgeColor: '#0284c7',
      rawRecord: rx,
    });
  });

  // Invoice events
  invoices.forEach((inv) => {
    timeline.push({
      id: `act-inv-${inv.id}`,
      type: 'invoice',
      date: inv.created_at,
      title: `Invoice ${inv.invoice_number}`,
      subtitle: `Total: Rs. ${Number(inv.total).toLocaleString()} (${inv.payment_method})`,
      details: inv.notes || undefined,
      status: inv.payment_status,
      badgeColor:
        inv.payment_status === 'paid'
          ? '#16a34a'
          : inv.payment_status === 'partial'
          ? '#2563eb'
          : '#ca8a04',
      rawRecord: inv,
    });
  });

  // Sort timeline chronologically (latest first)
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
