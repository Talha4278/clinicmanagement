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
  getDemoExaminations,
  getDemoTreatments,
  getDemoPrescriptions,
  getDemoPatients,
  getDemoAppointments,
  getDemoInvoices,
} from './demoData';

// ─── INITIAL SEED DATA (EMPTY - REAL DATA ONLY) ──────────────────────
const SEED_INVENTORY: InventoryItem[] = [];
const SEED_EXAMINATIONS: Examination[] = [];
const SEED_TREATMENTS: Treatment[] = [];
const SEED_PRESCRIPTIONS: (Prescription & { items: PrescriptionItem[] })[] = [];

// Helper to safely access localStorage
function getLocal<T>(key: string, defaultVal: T): T {
  try {
    const raw = localStorage.getItem(`dentivista_${key}`);
    return raw ? JSON.parse(raw) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function setLocal<T>(key: string, val: T): void {
  try {
    localStorage.setItem(`dentivista_${key}`, JSON.stringify(val));
  } catch (e) {
    console.error('localStorage error:', e);
  }
}

// ─── INVENTORY CRUD ──────────────────────────────────────────────────
export async function getInventoryItems(): Promise<InventoryItem[]> {
  if (isDemoMode()) {
    const demo = getLocal<InventoryItem[]>('inventory', null);
    if (demo && demo.length > 0) return demo;
    return getDemoInventory();
  }

  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .order('name');
    if (!error && data && data.length > 0) {
      return data as InventoryItem[];
    }
  } catch (err) {
    console.warn('Supabase inventory_items fetch failed, falling back to local', err);
  }

  // Fallback to local storage (only actual user-created items)
  const local = getLocal<InventoryItem[]>('inventory', []).filter(
    (item) => !['inv-1', 'inv-2', 'inv-3', 'inv-4', 'inv-5', 'inv-6'].includes(item.id)
  );
  return local;
}

export async function saveInventoryItem(item: Partial<InventoryItem> & { name: string }): Promise<InventoryItem> {
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
    if (isEdit) {
      const { data, error } = await supabase
        .from('inventory_items')
        .update(payload)
        .eq('id', payload.id)
        .select()
        .single();
      if (!error && data) {
        updateLocalInventory(data as InventoryItem);
        return data as InventoryItem;
      }
    } else {
      const { data, error } = await supabase
        .from('inventory_items')
        .insert(payload)
        .select()
        .single();
      if (!error && data) {
        updateLocalInventory(data as InventoryItem);
        return data as InventoryItem;
      }
    }
  } catch {
    // ignore supabase error and use local
  }

  updateLocalInventory(payload);
  return payload;
}

function updateLocalInventory(item: InventoryItem) {
  const current = getLocal<InventoryItem[]>('inventory', SEED_INVENTORY);
  const idx = current.findIndex((i) => i.id === item.id);
  let updated: InventoryItem[];
  if (idx >= 0) {
    updated = [...current];
    updated[idx] = item;
  } else {
    updated = [item, ...current];
  }
  setLocal('inventory', updated);
}

export async function deleteInventoryItem(id: string): Promise<boolean> {
  try {
    await supabase.from('inventory_items').delete().eq('id', id);
  } catch {
    // proceed
  }
  const current = getLocal<InventoryItem[]>('inventory', SEED_INVENTORY);
  setLocal('inventory', current.filter((i) => i.id !== id));
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
    const demo = getLocal<Examination[]>('examinations', null) || getDemoExaminations();
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
    if (!error && data && data.length > 0) {
      return data as Examination[];
    }
  } catch {
    // fallback
  }

  const local = getLocal<Examination[]>('examinations', []).filter(
    (e) => !['exam-1'].includes(e.id)
  );
  if (patientId) {
    return local.filter((e) => e.patient_id === patientId);
  }
  return local;
}

export async function saveExamination(exam: Partial<Examination> & { patient_id: string }): Promise<Examination> {
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
    if (isEdit) {
      const { data, error } = await supabase
        .from('examinations')
        .update(payload)
        .eq('id', payload.id)
        .select()
        .single();
      if (!error && data) {
        updateLocalExam(data as Examination);
        return data as Examination;
      }
    } else {
      const { data, error } = await supabase
        .from('examinations')
        .insert(payload)
        .select()
        .single();
      if (!error && data) {
        updateLocalExam(data as Examination);
        return data as Examination;
      }
    }
  } catch {
    // ignore
  }

  updateLocalExam(payload);
  return payload;
}

function updateLocalExam(exam: Examination) {
  const current = getLocal<Examination[]>('examinations', SEED_EXAMINATIONS);
  const idx = current.findIndex((e) => e.id === exam.id);
  let updated: Examination[];
  if (idx >= 0) {
    updated = [...current];
    updated[idx] = exam;
  } else {
    updated = [exam, ...current];
  }
  setLocal('examinations', updated);
}

export async function deleteExamination(id: string): Promise<boolean> {
  try {
    await supabase.from('examinations').delete().eq('id', id);
  } catch {
    // ignore
  }
  const current = getLocal<Examination[]>('examinations', SEED_EXAMINATIONS);
  setLocal('examinations', current.filter((e) => e.id !== id));
  return true;
}

// ─── TREATMENTS CRUD ─────────────────────────────────────────────────
export async function getTreatments(patientId?: string): Promise<Treatment[]> {
  if (isDemoMode()) {
    const demo = getLocal<Treatment[]>('treatments', null) || getDemoTreatments();
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
    if (!error && data && data.length > 0) {
      return data as Treatment[];
    }
  } catch {
    // fallback
  }

  const local = getLocal<Treatment[]>('treatments', []).filter(
    (t) => !['trt-1', 'trt-2', 'trt-3'].includes(t.id)
  );
  if (patientId) {
    return local.filter((t) => t.patient_id === patientId);
  }
  return local;
}

export async function saveTreatment(treatment: Partial<Treatment> & { patient_id: string; procedure_name: string }): Promise<Treatment> {
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
    if (isEdit) {
      const { data, error } = await supabase
        .from('treatments')
        .update(payload)
        .eq('id', payload.id)
        .select()
        .single();
      if (!error && data) {
        updateLocalTreatment(data as Treatment);
        return data as Treatment;
      }
    } else {
      const { data, error } = await supabase
        .from('treatments')
        .insert(payload)
        .select()
        .single();
      if (!error && data) {
        updateLocalTreatment(data as Treatment);
        return data as Treatment;
      }
    }
  } catch {
    // ignore
  }

  updateLocalTreatment(payload);
  return payload;
}

function updateLocalTreatment(trt: Treatment) {
  const current = getLocal<Treatment[]>('treatments', SEED_TREATMENTS);
  const idx = current.findIndex((t) => t.id === trt.id);
  let updated: Treatment[];
  if (idx >= 0) {
    updated = [...current];
    updated[idx] = trt;
  } else {
    updated = [trt, ...current];
  }
  setLocal('treatments', updated);
}

export async function deleteTreatment(id: string): Promise<boolean> {
  try {
    await supabase.from('treatments').delete().eq('id', id);
  } catch {
    // ignore
  }
  const current = getLocal<Treatment[]>('treatments', SEED_TREATMENTS);
  setLocal('treatments', current.filter((t) => t.id !== id));
  return true;
}

// ─── PRESCRIPTIONS CRUD ──────────────────────────────────────────────
export async function getPrescriptions(patientId?: string): Promise<Prescription[]> {
  if (isDemoMode()) {
    const demo = getLocal<Prescription[]>('prescriptions', null) || getDemoPrescriptions();
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
    if (!error && data && data.length > 0) {
      return data as Prescription[];
    }
  } catch {
    // fallback
  }

  const local = getLocal<Prescription[]>('prescriptions', []).filter(
    (p) => !['rx-1'].includes(p.id)
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
    const { error: rxErr } = await supabase.from('prescriptions').upsert(payload);
    if (!rxErr) {
      await supabase.from('prescription_items').delete().eq('prescription_id', rxId);
      await supabase.from('prescription_items').insert(formattedItems);
    }
  } catch {
    // fallback
  }

  const current = getLocal<Prescription[]>('prescriptions', SEED_PRESCRIPTIONS);
  const idx = current.findIndex((p) => p.id === rxId);
  let updated: Prescription[];
  if (idx >= 0) {
    updated = [...current];
    updated[idx] = payload;
  } else {
    updated = [payload, ...current];
  }
  setLocal('prescriptions', updated);
  return payload;
}

export async function deletePrescription(id: string): Promise<boolean> {
  try {
    await supabase.from('prescription_items').delete().eq('prescription_id', id);
    await supabase.from('prescriptions').delete().eq('id', id);
  } catch {
    // fallback
  }
  const current = getLocal<Prescription[]>('prescriptions', SEED_PRESCRIPTIONS);
  setLocal('prescriptions', current.filter((p) => p.id !== id));
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
