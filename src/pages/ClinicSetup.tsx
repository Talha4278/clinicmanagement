import React, { useState, useEffect } from 'react';
import {
  Building2, Save, Upload, RefreshCw, CheckCircle2,
  Phone, Mail, MapPin, Globe, FileText, Image as ImageIcon,
  Stethoscope, Shield, Sparkles, HeartPulse, Activity,
  Plus, Trash2, Edit2, Check, X, Search, UserPlus, AlertCircle,
  UserCheck, UserX, Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  useClinicSettings,
  DEFAULT_CLINIC_SETTINGS,
  DEFAULT_PROCEDURES,
} from '../lib/clinicSettings';
import { ClinicSettings, Staff } from '../lib/types';
import {
  isDemoMode,
  getDemoStaff,
  saveDemoStaff,
  deleteDemoStaff,
  toggleDemoStaff,
} from '../lib/demoData';

const PRESET_ICONS = [
  { id: 'stethoscope', label: 'Stethoscope', icon: Stethoscope },
  { id: 'heartpulse', label: 'Heart Pulse', icon: HeartPulse },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'shield', label: 'Shield Care', icon: Shield },
  { id: 'sparkles', label: 'Aesthetics', icon: Sparkles },
  { id: 'building', label: 'Clinic', icon: Building2 },
];

export default function ClinicSetup() {
  const { settings, updateSettings } = useClinicSettings();
  const [form, setForm] = useState<ClinicSettings>({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('Clinic settings successfully updated!');
  const [selectedPresetIcon, setSelectedPresetIcon] = useState('stethoscope');

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'profile' | 'procedures' | 'doctors'>('profile');

  // Procedures State
  const [newProcedureName, setNewProcedureName] = useState('');
  const [editingProcedureIndex, setEditingProcedureIndex] = useState<number | null>(null);
  const [editingProcedureValue, setEditingProcedureValue] = useState('');
  const [procedureSearch, setProcedureSearch] = useState('');

  // Real Database Attending Doctors State
  const [doctors, setDoctors] = useState<Staff[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [showAddDoctorForm, setShowAddDoctorForm] = useState(false);
  const [savingDoctor, setSavingDoctor] = useState(false);
  const [newDoctor, setNewDoctor] = useState({
    name: '',
    specialization: '',
    phone: '',
    email: '',
  });
  const [editingDoctorId, setEditingDoctorId] = useState<string | null>(null);
  const [editingDoctorForm, setEditingDoctorForm] = useState<Staff | null>(null);
  const [doctorSearch, setDoctorSearch] = useState('');

  // Sync settings state if updated externally
  useEffect(() => {
    setForm(settings);
  }, [settings]);

  // Load real doctors from database
  useEffect(() => {
    fetchDoctors();
  }, []);

  async function fetchDoctors() {
    setLoadingDoctors(true);
    try {
      if (isDemoMode()) {
        const staff = getDemoStaff();
        setDoctors(staff.filter((s) => s.role === 'doctor'));
      } else {
        const { data, error } = await supabase
          .from('staff')
          .select('*')
          .eq('role', 'doctor')
          .order('name');
        if (!error && data) {
          setDoctors(data);
        }
      }
    } catch (err) {
      console.error('Error fetching attending doctors:', err);
    } finally {
      setLoadingDoctors(false);
    }
  }

  function notifySuccess(msg: string) {
    setSuccessMessage(msg);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('File size must be under 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setForm({ ...form, logo_url: event.target.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
  }

  function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clinic_name.trim()) {
      alert('Clinic Name is required');
      return;
    }
    updateSettings(form);
    notifySuccess('Clinic profile and invoice branding saved successfully!');
  }

  function handleResetAll() {
    if (confirm('Reset clinic profile to default branding?')) {
      setForm({ ...DEFAULT_CLINIC_SETTINGS });
      updateSettings({ ...DEFAULT_CLINIC_SETTINGS });
      notifySuccess('Clinic profile restored to default values.');
    }
  }

  // ─── PROCEDURES MANAGEMENT ──────────────────────────────────────────
  const currentProcedures = form.procedures && form.procedures.length > 0
    ? form.procedures
    : DEFAULT_PROCEDURES;

  function handleAddProcedure(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newProcedureName.trim();
    if (!trimmed) return;

    if (currentProcedures.some((p) => p.toLowerCase() === trimmed.toLowerCase())) {
      alert('This procedure already exists in the catalog.');
      return;
    }

    const updatedProcedures = [...currentProcedures, trimmed];
    const updatedForm = { ...form, procedures: updatedProcedures };
    setForm(updatedForm);
    updateSettings(updatedForm);
    setNewProcedureName('');
    notifySuccess(`Procedure "${trimmed}" added successfully!`);
  }

  function handleStartEditProcedure(index: number, currentVal: string) {
    setEditingProcedureIndex(index);
    setEditingProcedureValue(currentVal);
  }

  function handleSaveEditProcedure(index: number) {
    const trimmed = editingProcedureValue.trim();
    if (!trimmed) {
      alert('Procedure name cannot be empty');
      return;
    }

    const duplicate = currentProcedures.some(
      (p, i) => i !== index && p.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      alert('Another procedure already has this name.');
      return;
    }

    const updatedProcedures = [...currentProcedures];
    updatedProcedures[index] = trimmed;
    const updatedForm = { ...form, procedures: updatedProcedures };
    setForm(updatedForm);
    updateSettings(updatedForm);
    setEditingProcedureIndex(null);
    notifySuccess(`Procedure updated to "${trimmed}"`);
  }

  function handleRemoveProcedure(index: number, name: string) {
    if (confirm(`Remove procedure "${name}"? It will no longer appear in new appointment selections.`)) {
      const updatedProcedures = currentProcedures.filter((_, i) => i !== index);
      const updatedForm = { ...form, procedures: updatedProcedures };
      setForm(updatedForm);
      updateSettings(updatedForm);
      notifySuccess(`Procedure "${name}" removed.`);
    }
  }

  function handleResetProcedures() {
    if (confirm('Reset clinical procedures catalog to standard dental & aesthetic defaults?')) {
      const updatedForm = { ...form, procedures: DEFAULT_PROCEDURES };
      setForm(updatedForm);
      updateSettings(updatedForm);
      notifySuccess('Procedures catalog reset to standard defaults.');
    }
  }

  // ─── ATTENDING DOCTORS MANAGEMENT (REAL DATABASE) ───────────────────
  async function handleAddDoctor(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = newDoctor.name.trim();
    if (!trimmedName) {
      alert('Doctor Name is required.');
      return;
    }

    setSavingDoctor(true);
    const formattedName = trimmedName.startsWith('Dr') ? trimmedName : `Dr. ${trimmedName.replace(/^Dr\.?\s*/i, '')}`;
    const emailToUse = newDoctor.email.trim() || `dr.${trimmedName.toLowerCase().replace(/[^a-z0-9]/g, '')}@clinic.local`;

    try {
      if (isDemoMode()) {
        saveDemoStaff({
          name: formattedName,
          role: 'doctor',
          specialization: newDoctor.specialization.trim() || 'General Dental Practitioner',
          phone: newDoctor.phone.trim() || null,
          email: emailToUse,
          active: true,
        });
      } else {
        const { error } = await supabase.from('staff').insert({
          name: formattedName,
          role: 'doctor',
          specialization: newDoctor.specialization.trim() || 'General Dental Practitioner',
          phone: newDoctor.phone.trim() || null,
          email: emailToUse,
          active: true,
        });

        if (error) {
          alert(`Error adding doctor to database: ${error.message}`);
          setSavingDoctor(false);
          return;
        }
      }

      await fetchDoctors();
      setNewDoctor({ name: '', specialization: '', phone: '', email: '' });
      setShowAddDoctorForm(false);
      notifySuccess(`Doctor ${formattedName} added to database!`);
    } catch (err: any) {
      alert(`Error saving doctor: ${err?.message || err}`);
    } finally {
      setSavingDoctor(false);
    }
  }

  function handleStartEditDoctor(doc: Staff) {
    setEditingDoctorId(doc.id);
    setEditingDoctorForm({ ...doc });
  }

  async function handleSaveEditDoctor() {
    if (!editingDoctorForm || !editingDoctorForm.name.trim()) {
      alert('Doctor Name is required.');
      return;
    }

    setSavingDoctor(true);
    const formattedName = editingDoctorForm.name.trim();

    try {
      if (isDemoMode()) {
        saveDemoStaff({
          id: editingDoctorId || undefined,
          name: formattedName,
          role: 'doctor',
          specialization: editingDoctorForm.specialization?.trim() || null,
          phone: editingDoctorForm.phone?.trim() || null,
          email: editingDoctorForm.email?.trim() || `dr.${formattedName.toLowerCase().replace(/[^a-z0-9]/g, '')}@clinic.local`,
          active: editingDoctorForm.active,
        });
      } else {
        const { error } = await supabase
          .from('staff')
          .update({
            name: formattedName,
            specialization: editingDoctorForm.specialization?.trim() || null,
            phone: editingDoctorForm.phone?.trim() || null,
            email: editingDoctorForm.email?.trim() || undefined,
            active: editingDoctorForm.active,
          })
          .eq('id', editingDoctorId);

        if (error) {
          alert(`Error updating doctor in database: ${error.message}`);
          setSavingDoctor(false);
          return;
        }
      }

      await fetchDoctors();
      setEditingDoctorId(null);
      setEditingDoctorForm(null);
      notifySuccess(`Doctor ${formattedName} updated successfully in database!`);
    } catch (err: any) {
      alert(`Error updating doctor: ${err?.message || err}`);
    } finally {
      setSavingDoctor(false);
    }
  }

  async function handleToggleDoctorActive(doc: Staff) {
    try {
      if (isDemoMode()) {
        toggleDemoStaff(doc.id);
      } else {
        const { error } = await supabase
          .from('staff')
          .update({ active: !doc.active })
          .eq('id', doc.id);

        if (error) {
          alert(`Error toggling doctor status: ${error.message}`);
          return;
        }
      }
      await fetchDoctors();
    } catch (err: any) {
      console.error('Error toggling doctor status:', err);
    }
  }

  async function handleRemoveDoctor(doc: Staff) {
    if (!confirm(`Are you sure you want to remove ${doc.name} from the attending doctors list?`)) {
      return;
    }

    try {
      if (isDemoMode()) {
        deleteDemoStaff(doc.id);
        notifySuccess(`Doctor ${doc.name} removed.`);
      } else {
        const { error } = await supabase.from('staff').delete().eq('id', doc.id);
        if (error) {
          // If foreign key constraint blocks deletion, deactivate instead
          await supabase.from('staff').update({ active: false }).eq('id', doc.id);
          notifySuccess(`Doctor ${doc.name} has clinical records in database and was deactivated.`);
        } else {
          notifySuccess(`Doctor ${doc.name} removed from database.`);
        }
      }
      await fetchDoctors();
    } catch (err: any) {
      alert(`Error removing doctor: ${err?.message || err}`);
    }
  }

  // Filtered views
  const filteredProcedures = currentProcedures.filter((p) =>
    p.toLowerCase().includes(procedureSearch.toLowerCase())
  );

  const filteredDoctors = doctors.filter(
    (d) =>
      d.name.toLowerCase().includes(doctorSearch.toLowerCase()) ||
      (d.specialization && d.specialization.toLowerCase().includes(doctorSearch.toLowerCase())) ||
      (d.phone && d.phone.includes(doctorSearch))
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-gray-900 flex items-center gap-2.5">
            <Building2 className="text-emerald-700" size={26} />
            Clinic Setup & Clinical Configuration
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Configure clinic profile branding, clinical procedures catalog, and attending doctors directory
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetAll}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors shadow-xs"
          >
            <RefreshCw size={13} /> Reset Branding
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {savedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-sm font-semibold shadow-xs animate-in fade-in duration-200">
          <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Modern Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200/80 pb-3 flex-wrap">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'profile'
              ? 'bg-emerald-800 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 bg-white border border-gray-200'
          }`}
        >
          <Building2 size={15} />
          Clinic Identity & Branding
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('procedures')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'procedures'
              ? 'bg-emerald-800 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 bg-white border border-gray-200'
          }`}
        >
          <Activity size={15} />
          Procedures & Services
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              activeTab === 'procedures' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            {currentProcedures.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('doctors')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'doctors'
              ? 'bg-emerald-800 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 bg-white border border-gray-200'
          }`}
        >
          <Stethoscope size={15} />
          Attending Doctors
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              activeTab === 'doctors' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            {doctors.length}
          </span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: CLINIC PROFILE & IDENTITY                                   */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Form Panel (7 cols) */}
          <form
            onSubmit={handleSaveProfile}
            className="lg:col-span-7 bg-white p-6 rounded-3xl border border-gray-100 card-shadow space-y-5"
          >
            <div className="border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                Clinic Identity & Branding
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                These details will automatically appear on all invoices, receipts, and prescription slips.
              </p>
            </div>

            {/* Clinic Name & Tagline */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Clinic Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.clinic_name}
                  onChange={(e) => setForm({ ...form, clinic_name: e.target.value })}
                  placeholder="e.g. Dentivista"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Tagline / Specialization
                </label>
                <input
                  type="text"
                  value={form.tagline}
                  onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                  placeholder="e.g. Dental & Aesthetics"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900"
                />
              </div>
            </div>

            {/* Logo / Icon Upload & Select */}
            <div className="space-y-3 bg-gray-50/80 p-4 rounded-2xl border border-gray-200/80">
              <label className="block text-xs font-semibold text-gray-700 uppercase">
                Clinic Icon / Logo
              </label>

              <div className="flex items-center gap-4">
                {/* Preview Avatar */}
                <div className="w-16 h-16 rounded-2xl bg-emerald-700 text-white flex items-center justify-center overflow-hidden border-2 border-emerald-600/50 shadow-md flex-shrink-0">
                  {form.logo_url ? (
                    <img
                      src={form.logo_url}
                      alt="Clinic Logo"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Stethoscope size={30} />
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-100 transition-colors flex items-center gap-1.5 shadow-xs">
                      <Upload size={13} /> Upload Image (PNG/JPG)
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                    {form.logo_url && (
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, logo_url: '' })}
                        className="text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1"
                      >
                        Remove Logo
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ImageIcon size={12} className="text-gray-400" />
                    <input
                      type="url"
                      value={form.logo_url || ''}
                      onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                      placeholder="Or paste image URL (https://...)"
                      className="w-full px-2.5 py-1 bg-white rounded-lg border border-gray-200 text-[11px] text-gray-800 focus:ring-1 focus:ring-emerald-600"
                    />
                  </div>
                </div>
              </div>

              {/* Quick Icon Selector when no custom image */}
              {!form.logo_url && (
                <div className="pt-2 border-t border-gray-200">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase block mb-1.5">
                    Or pick a clinic badge style:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_ICONS.map((p) => {
                      const IconComp = p.icon;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedPresetIcon(p.id)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                            selectedPresetIcon === p.id
                              ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          <IconComp size={13} /> {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Contact Details */}
            <div className="border-t border-gray-100 pt-4">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
                Official Contact & Address
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Contact Phone / Mobile *
                  </label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="+92 300 0000000"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Clinic Email Address *
                  </label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="clinic@dentivista.com"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Clinic Full Address *
                  </label>
                  <div className="relative">
                    <MapPin size={14} className="absolute left-3 top-3 text-gray-400" />
                    <textarea
                      rows={2}
                      required
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      placeholder="Floor, Plaza, Street, City..."
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900 resize-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Website / Portal
                  </label>
                  <div className="relative">
                    <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={form.website || ''}
                      onChange={(e) => setForm({ ...form, website: e.target.value })}
                      placeholder="www.yourclinic.com"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Tax / License Registration #
                  </label>
                  <input
                    type="text"
                    value={form.tax_number || ''}
                    onChange={(e) => setForm({ ...form, tax_number: e.target.value })}
                    placeholder="e.g. NTN-8921-D"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 text-gray-900"
                  />
                </div>
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-xs font-bold transition-all hover:opacity-90 shadow-md"
                style={{ background: '#3c5e27' }}
              >
                <Save size={15} /> Save Clinic Identity
              </button>
            </div>
          </form>

          {/* Live Preview Panel (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white p-5 rounded-3xl border border-gray-100 card-shadow space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={14} className="text-emerald-700" />
                  Live Invoice Header Preview
                </h4>
                <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
                  Synchronized
                </span>
              </div>

              {/* Rendered mini invoice preview */}
              <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm text-white">
                {/* Header */}
                <div className="p-4" style={{ background: '#3c5e27' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                        {form.logo_url ? (
                          <img src={form.logo_url} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                          <Stethoscope className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div>
                        <h5 className="font-display font-bold text-lg text-white leading-tight">
                          {form.clinic_name || 'Clinic Name'}
                        </h5>
                        <p className="text-white/80 text-[11px]">
                          {form.tagline || 'Specialization'}
                        </p>
                        <p className="text-white/60 text-[10px] mt-0.5 line-clamp-1">
                          {form.address || 'Clinic Address'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] uppercase tracking-wider text-white/50 block">Invoice</span>
                      <span className="font-mono text-xs font-bold text-white">INV-0042</span>
                    </div>
                  </div>
                </div>

                {/* Sample Body */}
                <div className="bg-white p-4 text-gray-800 space-y-2 text-xs">
                  <div className="flex justify-between border-b border-gray-100 pb-2 text-[11px] text-gray-500">
                    <span>Contact: {form.phone}</span>
                    <span>Email: {form.email}</span>
                  </div>
                  <div className="py-2 text-[11px] text-gray-400 italic text-center">
                    Invoice line items and patient charges will render here...
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-slate-50 px-4 py-2.5 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-500">
                  <span>{form.clinic_name} · All Rights Reserved</span>
                  <span className="font-semibold text-gray-700">{form.phone}</span>
                </div>
              </div>
            </div>

            {/* Live Prescription Header Preview */}
            <div className="bg-white p-5 rounded-3xl border border-gray-100 card-shadow space-y-3">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2">
                <Stethoscope size={14} className="text-emerald-700" />
                Live Prescription Slip Preview
              </h4>

              <div className="p-4 border-2 border-emerald-800/80 rounded-2xl bg-white text-gray-900 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white overflow-hidden"
                      style={{ background: '#3c5e27' }}
                    >
                      {form.logo_url ? (
                        <img src={form.logo_url} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <Stethoscope size={16} />
                      )}
                    </div>
                    <div>
                      <h5 className="font-display font-bold text-base text-gray-900 leading-none">
                        {form.clinic_name}
                      </h5>
                      <p className="text-[10px] text-emerald-800 font-semibold uppercase tracking-wider mt-0.5">
                        {form.tagline}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-[10px] text-gray-500">
                    <p>{form.phone}</p>
                    <p>{form.email}</p>
                  </div>
                </div>

                <p className="text-[10px] text-gray-500 border-t border-gray-100 pt-1.5">
                  {form.address} {form.website ? `· ${form.website}` : ''}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: PROCEDURES & SERVICES MANAGEMENT                           */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'procedures' && (
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-gray-100 card-shadow space-y-6">
          {/* Header & Reset Button */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Activity className="text-emerald-700" size={18} />
                Clinical Procedures Catalog
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Add, edit, or remove procedure names used during appointment booking, treatment planning, and invoicing.
              </p>
            </div>

            <button
              type="button"
              onClick={handleResetProcedures}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors"
            >
              <RefreshCw size={12} /> Reset to Standard Procedures
            </button>
          </div>

          {/* Add Procedure Form & Search Bar */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Add New Procedure Form (8 cols) */}
            <form onSubmit={handleAddProcedure} className="md:col-span-8 flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={newProcedureName}
                  onChange={(e) => setNewProcedureName(e.target.value)}
                  placeholder="Enter new procedure name (e.g. Dental Veneers, Wisdom Tooth Extraction...)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 text-gray-900 font-medium"
                />
              </div>
              <button
                type="submit"
                disabled={!newProcedureName.trim()}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 shadow-sm"
                style={{ background: '#3c5e27' }}
              >
                <Plus size={15} /> Add Procedure
              </button>
            </form>

            {/* Search Filter (4 cols) */}
            <div className="md:col-span-4 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={procedureSearch}
                onChange={(e) => setProcedureSearch(e.target.value)}
                placeholder="Search procedures..."
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-200 text-xs bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-600/20"
              />
            </div>
          </div>

          {/* Procedures List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-500 font-semibold px-2">
              <span>{filteredProcedures.length} Procedures Available</span>
              {procedureSearch && (
                <button
                  type="button"
                  onClick={() => setProcedureSearch('')}
                  className="text-emerald-700 hover:underline"
                >
                  Clear search
                </button>
              )}
            </div>

            {filteredProcedures.length === 0 ? (
              <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-100 text-gray-400 text-xs space-y-2">
                <AlertCircle size={24} className="mx-auto text-gray-300" />
                <p className="font-semibold text-gray-600">No procedures found</p>
                <p>Click "Add Procedure" above or reset to standard dental procedures.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {currentProcedures.map((procName, idx) => {
                  if (
                    procedureSearch &&
                    !procName.toLowerCase().includes(procedureSearch.toLowerCase())
                  ) {
                    return null;
                  }

                  const isEditing = editingProcedureIndex === idx;

                  return (
                    <div
                      key={`${procName}-${idx}`}
                      className="p-3 bg-gray-50/80 hover:bg-white rounded-2xl border border-gray-200 flex items-center justify-between gap-2 transition-all hover:shadow-xs group"
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-2 w-full">
                          <input
                            type="text"
                            value={editingProcedureValue}
                            onChange={(e) => setEditingProcedureValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEditProcedure(idx);
                              if (e.key === 'Escape') setEditingProcedureIndex(null);
                            }}
                            autoFocus
                            className="flex-1 px-3 py-1.5 rounded-lg border border-emerald-500 text-xs text-gray-900 font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEditProcedure(idx)}
                            className="p-1.5 rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 transition-colors shadow-xs"
                            title="Save procedure name"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingProcedureIndex(null)}
                            className="p-1.5 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                            title="Cancel"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                              {idx + 1}
                            </span>
                            <span className="text-xs font-semibold text-gray-900 truncate">
                              {procName}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => handleStartEditProcedure(idx, procName)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-800 hover:bg-emerald-50 transition-colors"
                              title="Edit procedure name"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveProcedure(idx, procName)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Remove procedure"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: ATTENDING DOCTORS MANAGEMENT (DATABASE DRIVEN)              */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'doctors' && (
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-gray-100 card-shadow space-y-6">
          {/* Header & Reset Button */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Stethoscope className="text-emerald-700" size={18} />
                Attending Doctors & Specialists Directory
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Add, edit, or remove attending doctors in your clinic database. Doctors appear directly in appointment booking and clinical notes.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchDoctors}
                disabled={loadingDoctors}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <RefreshCw size={12} className={loadingDoctors ? 'animate-spin' : ''} /> Refresh
              </button>

              <button
                type="button"
                onClick={() => setShowAddDoctorForm(!showAddDoctorForm)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-white text-xs font-bold transition-all shadow-xs"
                style={{ background: '#3c5e27' }}
              >
                <UserPlus size={13} /> {showAddDoctorForm ? 'Close Form' : 'Add New Doctor'}
              </button>
            </div>
          </div>

          {/* Add Doctor Quick Form */}
          {showAddDoctorForm && (
            <form
              onSubmit={handleAddDoctor}
              className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-4 animate-in fade-in duration-200"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                  <UserPlus size={14} className="text-emerald-700" />
                  New Attending Doctor Details
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddDoctorForm(false)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Doctor Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newDoctor.name}
                    onChange={(e) => setNewDoctor({ ...newDoctor, name: e.target.value })}
                    placeholder="e.g. Dr. Usman Tariq"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs bg-white focus:ring-2 focus:ring-emerald-600/20 text-gray-900 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Specialization / Title
                  </label>
                  <input
                    type="text"
                    value={newDoctor.specialization}
                    onChange={(e) => setNewDoctor({ ...newDoctor, specialization: e.target.value })}
                    placeholder="e.g. Orthodontist / Dental Surgeon"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs bg-white focus:ring-2 focus:ring-emerald-600/20 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Phone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={newDoctor.phone}
                    onChange={(e) => setNewDoctor({ ...newDoctor, phone: e.target.value })}
                    placeholder="e.g. +92 300 1234567"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs bg-white focus:ring-2 focus:ring-emerald-600/20 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={newDoctor.email}
                    onChange={(e) => setNewDoctor({ ...newDoctor, email: e.target.value })}
                    placeholder="doctor@dentivista.com"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs bg-white focus:ring-2 focus:ring-emerald-600/20 text-gray-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddDoctorForm(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-gray-300 text-gray-700 text-xs font-medium hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingDoctor}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50"
                  style={{ background: '#3c5e27' }}
                >
                  {savingDoctor ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save Doctor
                </button>
              </div>
            </form>
          )}

          {/* Search bar & count */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-gray-500 font-semibold self-start sm:self-center">
              {filteredDoctors.length} Attending Doctors in Clinic Database
            </span>

            <div className="relative w-full sm:w-72">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={doctorSearch}
                onChange={(e) => setDoctorSearch(e.target.value)}
                placeholder="Search doctors by name or specialty..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-gray-200 text-xs bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-600/20"
              />
            </div>
          </div>

          {/* Doctors Grid */}
          {loadingDoctors ? (
            <div className="p-12 text-center text-gray-400 text-xs flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin text-emerald-700" />
              <span>Loading doctors from database...</span>
            </div>
          ) : filteredDoctors.length === 0 ? (
            <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-100 text-gray-400 text-xs space-y-2">
              <AlertCircle size={24} className="mx-auto text-gray-300" />
              <p className="font-semibold text-gray-600">No attending doctors found</p>
              <p>Click "Add New Doctor" above to register doctors in your clinic database.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDoctors.map((doc) => {
                const isEditing = editingDoctorId === doc.id;

                if (isEditing && editingDoctorForm) {
                  return (
                    <div
                      key={doc.id}
                      className="p-4 rounded-2xl bg-white border-2 border-emerald-600 shadow-md space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                        <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                          Edit Doctor
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDoctorId(null);
                            setEditingDoctorForm(null);
                          }}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">
                            Doctor Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={editingDoctorForm.name}
                            onChange={(e) =>
                              setEditingDoctorForm({ ...editingDoctorForm, name: e.target.value })
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 font-semibold text-gray-900"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">
                            Specialization
                          </label>
                          <input
                            type="text"
                            value={editingDoctorForm.specialization || ''}
                            onChange={(e) =>
                              setEditingDoctorForm({
                                ...editingDoctorForm,
                                specialization: e.target.value,
                              })
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 text-gray-800"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">
                            Phone / WhatsApp
                          </label>
                          <input
                            type="text"
                            value={editingDoctorForm.phone || ''}
                            onChange={(e) =>
                              setEditingDoctorForm({ ...editingDoctorForm, phone: e.target.value })
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 text-gray-800"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">
                            Email Address
                          </label>
                          <input
                            type="email"
                            value={editingDoctorForm.email || ''}
                            onChange={(e) =>
                              setEditingDoctorForm({ ...editingDoctorForm, email: e.target.value })
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 text-gray-800"
                          />
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editingDoctorForm.active !== false}
                              onChange={(e) =>
                                setEditingDoctorForm({
                                  ...editingDoctorForm,
                                  active: e.target.checked,
                                })
                              }
                              className="rounded text-emerald-600 focus:ring-emerald-500"
                            />
                            Active for scheduling
                          </label>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDoctorId(null);
                            setEditingDoctorForm(null);
                          }}
                          className="px-3 py-1 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveEditDoctor}
                          disabled={savingDoctor}
                          className="flex items-center gap-1 px-3 py-1 rounded-lg text-white text-xs font-bold shadow-xs disabled:opacity-50"
                          style={{ background: '#3c5e27' }}
                        >
                          {savingDoctor ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Save
                        </button>
                      </div>
                    </div>
                  );
                }

                const isActive = doc.active !== false;

                return (
                  <div
                    key={doc.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isActive
                        ? 'bg-white border-gray-200 hover:border-emerald-300 hover:shadow-xs'
                        : 'bg-gray-50/80 border-gray-200/60 opacity-70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-xs"
                          style={{ background: isActive ? '#3c5e27' : '#6b7280' }}
                        >
                          {doc.name.replace(/^Dr\.?\s*/i, '').charAt(0).toUpperCase() || 'D'}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-gray-900 leading-tight">
                            {doc.name}
                          </h4>
                          <p className="text-[11px] text-emerald-800 font-semibold mt-0.5">
                            {doc.specialization || 'Attending Doctor'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleStartEditDoctor(doc)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-800 hover:bg-emerald-50 transition-colors"
                          title="Edit doctor details"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveDoctor(doc)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Remove doctor"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-gray-100 space-y-1 text-[11px] text-gray-500">
                      {doc.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone size={11} className="text-gray-400" />
                          <span>{doc.phone}</span>
                        </div>
                      )}
                      {doc.email && (
                        <div className="flex items-center gap-1.5">
                          <Mail size={11} className="text-gray-400" />
                          <span className="truncate">{doc.email}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleToggleDoctorActive(doc)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold transition-colors ${
                          isActive
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {isActive ? (
                          <>
                            <UserCheck size={11} /> Active
                          </>
                        ) : (
                          <>
                            <UserX size={11} /> Inactive
                          </>
                        )}
                      </button>

                      <span className="text-[10px] text-gray-400 font-mono">
                        {doc.id.slice(0, 8)}...
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
