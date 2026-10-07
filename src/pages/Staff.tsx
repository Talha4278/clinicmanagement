import React, { useEffect, useState } from 'react';
import { Plus, UserCheck, UserX, X, AlertCircle, Shield, Eye, EyeOff, Sparkles, Lock, ArrowUpRight, CheckCircle2, Landmark, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Staff as StaffType, StaffRole, SubscriptionPlan } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';
import { checkSeatLimit, PLAN_SPECS, updateClinicPlan, getTenantStaff, saveTenantStaff, saveTenantStaffMember } from '../lib/tenancy';
import { isDemoMode, DEMO_STAFF_MEMBERS } from '../lib/demoData';

const roleColors: Record<StaffRole, string> = {
  admin: 'bg-red-50 text-red-700',
  receptionist: 'bg-blue-50 text-blue-700',
  doctor: 'bg-purple-50 text-purple-700',
};

export default function Staff() {
  const { staff: currentStaff, activeClinic } = useAuth();
  const isAdmin = currentStaff?.role === 'admin';
  const [staffList, setStaffList] = useState<StaffType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editStaff, setEditStaff] = useState<StaffType | null>(null);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', role: 'receptionist' as StaffRole, specialization: '', password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Plan Management Modal State
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>(activeClinic?.plan || 'pro');
  const [planBillingCycle, setPlanBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [planSuccessNotice, setPlanSuccessNotice] = useState<string | null>(null);

  const activeStaff = staffList.filter(s => s.active);
  const inactiveStaff = staffList.filter(s => !s.active);
  const seatInfo = checkSeatLimit(activeStaff.length, activeClinic?.id);

  useEffect(() => { fetchStaff(); }, [activeClinic?.id]);

  async function fetchStaff() {
    setLoading(true);
    if (isDemoMode()) {
      setStaffList(DEMO_STAFF_MEMBERS);
      setLoading(false);
      return;
    }

    const clinicId = activeClinic?.id || 'clinic-dentivista-01';
    let remoteStaff: StaffType[] = [];
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('created_at');

      if (data && !error) {
        remoteStaff = data;
      }
    } catch (e) {
      console.warn('Could not fetch staff from Supabase:', e);
    }

    // Merge with local tenant staff for this clinic (avoiding duplicates)
    const localStaff = getTenantStaff(clinicId);
    const staffMap = new Map<string, StaffType>();

    // 1. Add locally registered staff members (e.g. from signup or previous additions)
    localStaff.forEach((s) => {
      const key = s.email.toLowerCase();
      staffMap.set(key, s);
    });

    // 2. Overlay remote Supabase staff members (DB is authoritative)
    remoteStaff.forEach((s) => {
      const key = s.email.toLowerCase();
      staffMap.set(key, s);
    });

    // 3. Ensure currently authenticated staff member (e.g. newly signed up admin) is present
    if (currentStaff && (!currentStaff.clinic_id || currentStaff.clinic_id === clinicId)) {
      const currentKey = currentStaff.email.toLowerCase();
      if (!staffMap.has(currentKey)) {
        staffMap.set(currentKey, currentStaff);
      }
    }

    setStaffList(Array.from(staffMap.values()));
    setLoading(false);
  }

  function openEdit(s: StaffType) {
    if (!isAdmin) return;
    setEditStaff(s);
    setForm({
      name: s.name,
      email: s.email,
      phone: s.phone ?? '',
      role: s.role,
      specialization: s.specialization ?? '',
      password: '',
    });
    setShowPassword(false);
    setError('');
    setShowForm(true);
  }

  function openAdd() {
    if (!isAdmin) return;
    if (!seatInfo.allowed) {
      alert(
        `Staff Account Limit Reached!\n\nYour clinic "${seatInfo.clinicName}" is subscribed to the ${seatInfo.plan.toUpperCase()} tier, which allows a maximum of ${seatInfo.maxSeats} active staff accounts (${seatInfo.currentCount} currently active).\n\nPlease upgrade your subscription to add more team members.`
      );
      return;
    }
    setEditStaff(null);
    setForm({ name: '', email: '', phone: '', role: 'receptionist', specialization: '', password: '' });
    setShowPassword(false);
    setError('');
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    if (!form.name.trim() || !form.email.trim()) {
      setError('Name and email are required');
      return;
    }
    if (!editStaff && form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (editStaff && form.password && form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setSaving(true);
    setError('');

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      role: form.role,
      specialization: form.specialization.trim() || null,
    };

    if (editStaff) {
      const { error } = await supabase.from('staff').update(payload).eq('id', editStaff.id);
      if (error) {
        console.warn('Supabase staff update warning:', error.message);
      }

      // Update in local tenant store
      const updatedStaff: StaffType = {
        ...editStaff,
        ...payload,
      };
      saveTenantStaffMember(updatedStaff, form.password || undefined);

      const emailChanged = payload.email !== editStaff.email;
      const passwordChanged = !!form.password;

      if (emailChanged || passwordChanged) {
        if (!editStaff.user_id) {
          setError('Cannot update login details: this staff member has no login account');
          setSaving(false);
          return;
        }

        const isSelf = editStaff.user_id === currentStaff?.user_id;

        if (isSelf) {
          const authUpdates: { email?: string; password?: string } = {};
          if (emailChanged) authUpdates.email = payload.email;
          if (passwordChanged) authUpdates.password = form.password;
          const { error: authError } = await supabase.auth.updateUser(authUpdates);
          if (authError) { setError(authError.message); setSaving(false); return; }
        } else {
          const body: { user_id: string; email?: string; password?: string } = {
            user_id: editStaff.user_id,
          };
          if (emailChanged) body.email = payload.email;
          if (passwordChanged) body.password = form.password;

          const { data: fnData, error: fnError } = await supabase.functions.invoke('update-staff-password', {
            body,
          });
          if (fnError) {
            setError(fnError.message || 'Failed to update login details. Redeploy the update-staff-password function if needed.');
            setSaving(false);
            return;
          }
          if (fnData?.error) {
            setError(fnData.error);
            setSaving(false);
            return;
          }
        }
      }
    } else {
      // Adding new staff member with their respective role (doctor, receptionist, admin)
      const clinicId = activeClinic?.id || 'clinic-dentivista-01';
      let authUserId: string | null = null;

      // 1. Attempt Supabase Auth Sign Up
      try {
        const { data: { session: adminSession } } = await supabase.auth.getSession();
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: {
            data: {
              name: form.name.trim(),
              clinic_id: clinicId,
              clinic_name: activeClinic?.name,
              role: form.role,
              phone: form.phone.trim() || undefined,
              specialization: form.specialization.trim() || undefined,
            },
          },
        });

        if (authError) {
          console.warn('Supabase auth signup notice for staff member:', authError.message);
        }

        if (authData?.user) {
          authUserId = authData.user.id;
        }

        // Restore admin session (signUp may switch context)
        if (adminSession) {
          await supabase.auth.setSession({
            access_token: adminSession.access_token,
            refresh_token: adminSession.refresh_token,
          });
        }
      } catch (authErr) {
        console.warn('Supabase auth notice for staff member:', authErr);
      }

      // 2. Insert into Supabase staff table with respective role and clinic_id
      let dbStaffId: string | null = null;
      try {
        const staffInsertPayload: any = {
          ...payload,
          clinic_id: clinicId,
          active: true,
        };
        if (authUserId) {
          staffInsertPayload.user_id = authUserId;
        }

        const { data: insertedData, error: insertError } = await supabase
          .from('staff')
          .insert(staffInsertPayload)
          .select()
          .maybeSingle();

        if (insertError) {
          console.warn('Supabase staff table insert notice:', insertError.message);
        } else if (insertedData) {
          dbStaffId = insertedData.id;
        }
      } catch (dbErr) {
        console.warn('Database staff insert notice:', dbErr);
      }

      // 3. Register in local tenant credentials and local staff storage
      const newStaffRecord: StaffType = {
        id: dbStaffId || `staff-${Date.now()}`,
        user_id: authUserId || `user-${Date.now()}`,
        clinic_id: clinicId,
        name: form.name.trim(),
        role: form.role,
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        specialization: form.specialization.trim() || null,
        active: true,
        created_at: new Date().toISOString(),
      };
      saveTenantStaffMember(newStaffRecord, form.password);
    }

    await fetchStaff();
    setShowForm(false);
    setSaving(false);
  }

  async function toggleActive(s: StaffType) {
    if (!isAdmin || s.id === currentStaff?.id) return;
    try {
      await supabase.from('staff').update({ active: !s.active }).eq('id', s.id);
    } catch {}
    const updated = { ...s, active: !s.active };
    saveTenantStaff(updated);
    setStaffList(prev => prev.map(st => st.id === s.id ? updated : st));
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-2xl text-gray-900">Staff Management</h2>
          <p className="text-sm text-gray-500 mt-0.5">{activeStaff.length} active staff members</p>
        </div>
        {isAdmin && (
          <button
            onClick={openAdd}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all ${
              seatInfo.allowed ? 'hover:opacity-90' : 'opacity-80'
            }`}
            style={{ background: seatInfo.allowed ? '#3c5e27' : '#5c7a48' }}
          >
            <Plus size={16} /> Add Staff
          </button>
        )}
      </div>

      {/* Clinic Plan & Seat Allocation Bar */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 card-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold flex-shrink-0">
            <Sparkles size={18} className="text-emerald-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-bold text-gray-900 text-sm">{seatInfo.clinicName}</p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wide">
                {seatInfo.plan} Plan
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Seat License: {seatInfo.currentCount} of {seatInfo.maxSeats} staff accounts active ({seatInfo.remainingSeats} available)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="w-32 bg-gray-100 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                seatInfo.currentCount >= seatInfo.maxSeats ? 'bg-amber-500' : 'bg-emerald-600'
              }`}
              style={{ width: `${Math.min(100, (seatInfo.currentCount / seatInfo.maxSeats) * 100)}%` }}
            />
          </div>
          {seatInfo.currentCount >= seatInfo.maxSeats ? (
            <span className="text-xs font-bold text-amber-700 flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
              <Lock size={12} /> Limit Reached
            </span>
          ) : (
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
              {seatInfo.remainingSeats} Seats Free
            </span>
          )}
          {isAdmin && (
            <button
              onClick={() => {
                setSelectedPlan(activeClinic?.plan || 'pro');
                setShowPlanModal(true);
              }}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200 transition-all flex items-center gap-1"
            >
              <span>Manage Tier</span>
              <ArrowUpRight size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Role summary */}
      <div className="grid grid-cols-3 gap-4">
        {(['admin', 'receptionist', 'doctor'] as StaffRole[]).map(role => {
          const count = activeStaff.filter(s => s.role === role).length;
          return (
            <div key={role} className="bg-white rounded-2xl card-shadow p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield size={16} className="text-gray-400" />
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${roleColors[role]}`}>{role}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{count}</p>
              <p className="text-xs text-gray-400 mt-0.5">Active {role}s</p>
            </div>
          );
        })}
      </div>

      {/* Active staff */}
      <div className="bg-white rounded-2xl card-shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Active Staff</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {loading ? (
            <div className="px-6 py-10 text-center text-gray-400 text-sm">Loading...</div>
          ) : activeStaff.length === 0 ? (
            <div className="px-6 py-10 text-center text-gray-400 text-sm">No active staff members</div>
          ) : (
            activeStaff.map(s => (
              <div key={s.id} className="flex items-center gap-4 px-6 py-4 table-row-hover">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                  style={{ background: '#4a7530' }}
                >
                  {s.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                    {s.id === currentStaff?.id && (
                      <span className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded">You</span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${roleColors[s.role]}`}>
                      {s.role}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{s.email}</p>
                  {s.specialization && <p className="text-xs text-gray-400">{s.specialization}</p>}
                  {s.phone && <p className="text-xs text-gray-400">{s.phone}</p>}
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => openEdit(s)}
                      className="text-xs font-medium text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Edit
                    </button>
                    {s.id !== currentStaff?.id && (
                      <button
                        onClick={() => toggleActive(s)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Deactivate"
                      >
                        <UserX size={16} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Inactive staff */}
      {inactiveStaff.length > 0 && (
        <div className="bg-white rounded-2xl card-shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-gray-400">Inactive Staff</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {inactiveStaff.map(s => (
              <div key={s.id} className="flex items-center gap-4 px-6 py-4 opacity-60">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold flex-shrink-0">
                  {s.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-500 line-through">{s.name}</p>
                  <p className="text-xs text-gray-400">{s.email}</p>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => toggleActive(s)}
                    className="flex items-center gap-1.5 text-xs font-medium text-green-700 px-3 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 transition-colors"
                  >
                    <UserCheck size={14} /> Activate
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Staff Form Modal (admin only) */}
      {isAdmin && showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h3 className="font-semibold text-lg text-gray-900">
                {editStaff ? 'Edit Staff Member' : 'Add Staff Member'}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Dr. John Smith"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-green-600/20 focus:border-green-700 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="staff@dentivista.com"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-green-600/20 focus:border-green-700 transition-all"
                />
                {editStaff && (
                  <p className="text-xs text-gray-400 mt-1.5">Changing email also updates their login email</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {editStaff ? 'Password' : 'Password *'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder={editStaff ? 'Leave blank to keep current password' : 'Minimum 6 characters'}
                    required={!editStaff}
                    minLength={editStaff ? undefined : 6}
                    className="w-full px-4 py-2.5 pr-11 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-green-600/20 focus:border-green-700 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {editStaff && (
                  <p className="text-xs text-gray-400 mt-1.5">Leave blank to keep the current password</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Role *</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as StaffRole })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-green-600/20 focus:border-green-700 transition-all"
                  >
                    <option value="admin">Admin</option>
                    <option value="receptionist">Receptionist</option>
                    <option value="doctor">Doctor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+92 300..."
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-green-600/20 focus:border-green-700 transition-all"
                  />
                </div>
              </div>
              {form.role === 'doctor' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Specialization</label>
                  <input
                    type="text"
                    value={form.specialization}
                    onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                    placeholder="e.g. Orthodontics, Endodontics..."
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-green-600/20 focus:border-green-700 transition-all"
                  />
                </div>
              )}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 text-sm text-gray-600 hover:text-gray-800 rounded-xl hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 text-sm font-semibold text-white rounded-xl hover:opacity-90 disabled:opacity-60 transition-all"
                  style={{ background: '#3c5e27' }}
                >
                  {saving ? 'Saving...' : editStaff ? 'Save Changes' : 'Add Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Plan Tier Management Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 card-shadow border border-gray-100 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowPlanModal(false)}
              className="absolute top-5 right-5 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-800 flex items-center justify-center font-bold">
                <Sparkles size={20} className="text-sky-700" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Manage Clinic Subscription Tier</h3>
                <p className="text-xs text-gray-500">
                  Select the tier that fits your practice capacity and team size
                </p>
              </div>
            </div>

            {/* Billing Cycle Switch */}
            <div className="flex items-center justify-between bg-gray-50 p-2.5 rounded-2xl mb-5 border border-gray-100">
              <span className="text-xs font-semibold text-gray-700">Billing Cadence</span>
              <div className="inline-flex items-center bg-white p-1 rounded-xl shadow-xs border border-gray-200 text-xs">
                <button
                  type="button"
                  onClick={() => setPlanBillingCycle('monthly')}
                  className={`px-3 py-1 rounded-lg font-medium transition-all ${
                    planBillingCycle === 'monthly' ? 'bg-gray-900 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setPlanBillingCycle('annual')}
                  className={`px-3 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                    planBillingCycle === 'annual' ? 'bg-[#0284c7] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <span>Annual</span>
                  <span className="text-[10px] bg-emerald-400 text-emerald-950 font-bold px-1.5 py-0.2 rounded-md">Save 17%</span>
                </button>
              </div>
            </div>

            {/* Plan Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              {(['starter', 'pro', 'enterprise'] as SubscriptionPlan[]).map((p) => {
                const spec = PLAN_SPECS[p];
                const isSelected = selectedPlan === p;
                const isCurrent = (activeClinic?.plan || 'pro') === p;
                const price = planBillingCycle === 'annual' ? spec.annual_price : spec.price;

                return (
                  <div
                    key={p}
                    onClick={() => setSelectedPlan(p)}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all text-left relative flex flex-col justify-between ${
                      isSelected
                        ? 'border-sky-600 bg-sky-50/70 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    {spec.badge && (
                      <span
                        className={`absolute -top-2.5 right-3 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          p === 'starter'
                            ? 'bg-emerald-600 text-white'
                            : p === 'pro'
                            ? 'bg-[#0284c7] text-white'
                            : 'bg-indigo-600 text-white'
                        }`}
                      >
                        {spec.badge}
                      </span>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-bold text-sm text-gray-900 capitalize">{p}</p>
                        {isCurrent && (
                          <span className="text-[9px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-md">Current</span>
                        )}
                      </div>
                      <p className="text-base font-extrabold text-sky-950">{price}</p>
                      <p className="text-[11px] font-semibold text-emerald-700 mt-0.5">{spec.highlight}</p>
                      <p className="text-xs text-gray-500 mt-2 font-medium">
                        • {spec.max_seats} Active Staff Seats<br />
                        • {spec.max_sessions} Simultaneous Logins
                      </p>
                    </div>

                    <p className="text-[11px] text-gray-600 mt-3 pt-3 border-t border-gray-100 leading-snug">
                      {spec.description}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Direct Bank Payment Details for Local Pakistan Clinics */}
            <div className="mb-5 p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-emerald-800" />
                  <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                    Direct Bank, NayaPay & Raast Settlement (Pakistan Local Clinics)
                  </h4>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900">
                  Verification Active Mode
                </span>
              </div>
              <p className="text-[11px] text-emerald-900/90 leading-relaxed">
                While global credit/debit card processing is coming soon, local Pakistani clinics can transfer subscription payments directly via NayaPay, UBL, Raast, JazzCash, or EasyPaisa:
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-medium text-emerald-950 bg-white/90 p-3 rounded-xl border border-emerald-100">
                <div>
                  <span className="text-gray-500 text-[10px] block">Bank Names</span>
                  <span className="font-bold">NayaPay / UBL (United Bank Limited)</span>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] block">Account Title</span>
                  <span className="font-bold">Talha Sarfraz Malik</span>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] block">IBAN (UBL)</span>
                  <span className="font-mono text-[11px] font-bold select-all">PK66 UNIL 0109 0003 6725 1495</span>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] block">Raast / NayaPay / EasyPaisa / JazzCash</span>
                  <span className="font-mono text-[11px] font-bold select-all">0334 634278</span>
                </div>
              </div>

              {/* QR Code Images */}
              <div className="pt-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 block mb-1.5">
                  Scan & Pay QR Codes (NayaPay & UBL Digital)
                </span>
                <div className="grid grid-cols-2 gap-3 max-w-sm">
                  <div className="bg-white p-2 rounded-xl border border-emerald-200 text-center space-y-1">
                    <img src="/payments/nayapay_qr.jpg" alt="NayaPay QR Code" className="w-full h-32 object-contain rounded-lg" />
                    <span className="text-[10px] font-bold text-gray-700 block">NayaPay QR</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-emerald-200 text-center space-y-1">
                    <img src="/payments/ubl_qr.jpg" alt="UBL Digital QR Code" className="w-full h-32 object-contain rounded-lg" />
                    <span className="text-[10px] font-bold text-gray-700 block">UBL Bank QR</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-emerald-200/60">
                <span className="text-[10px] text-emerald-800 italic">
                  Instant subscription activation upon sending receipt screenshot to <strong>03093622732</strong>.
                </span>
                <a
                  href={`https://wa.me/923093622732?text=${encodeURIComponent(
                    `Hi, I have transferred the subscription payment for ${activeClinic?.name || 'my clinic'} for the ${PLAN_SPECS[selectedPlan].name} (${planBillingCycle} billing). Here is my bank transfer receipt screenshot.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs"
                >
                  <MessageSquare size={14} />
                  <span>Send Receipt on WhatsApp (03093622732)</span>
                </a>
              </div>
            </div>

            {/* Success message */}
            {planSuccessNotice && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                <span>{planSuccessNotice}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-gray-500">
                100% data export & privacy guarantee on all tiers.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPlanModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!activeClinic?.id) return;
                    const ok = updateClinicPlan(activeClinic.id, selectedPlan);
                    if (ok) {
                      setPlanSuccessNotice(`Successfully switched to ${PLAN_SPECS[selectedPlan].name}!`);
                      setTimeout(() => {
                        setPlanSuccessNotice(null);
                        setShowPlanModal(false);
                      }, 1200);
                    }
                  }}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-95 shadow-md flex items-center gap-1.5"
                  style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' }}
                >
                  <Sparkles size={14} />
                  <span>Update Plan Tier</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
