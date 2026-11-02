import { useEffect, useState, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, Users,
  Calendar, ChevronLeft, ChevronRight,
  BarChart3, PieChart, Download,
  CreditCard, Banknote, Building2, Stethoscope,
  X, AlertCircle, RefreshCw, Layers
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { isDemoMode, getDemoInvoices } from '../lib/demoData';
import { useAuth } from '../contexts/AuthContext';
import { applyClinicFilter, isMissingClinicIdColumnError } from '../lib/tenancyQuery';
import { InvoiceItem } from '../lib/types';

export type ReportGranularity = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface BucketItem {
  id: string;
  label: string;
  shortLabel: string;
  subLabel?: string;
  invoiced: number;
  revenue: number;
  pending: number;
  count: number;
  invoices: any[];
}

interface DoctorStat {
  doctorId?: string;
  doctorName: string;
  totalBilled: number;
  totalCollected: number;
  count: number;
  collectionRate: number;
  sharePercent: number;
  invoices: any[];
}

interface ProcedureStat {
  category: string;
  description: string;
  count: number;
  revenue: number;
  sharePercent: number;
}

interface PaymentMethodStat {
  method: string;
  label: string;
  amount: number;
  count: number;
  sharePercent: number;
}

interface DrillDownFilter {
  type: 'bucket' | 'doctor' | 'procedure' | 'payment_method' | 'all';
  key: string;
  title: string;
  subtitle?: string;
}

export default function Reports() {
  const { activeClinic } = useAuth();
  const currency = (activeClinic?.currency_symbol || 'AED').trim();

  // Timeframe & Navigation
  const [granularity, setGranularity] = useState<ReportGranularity>('monthly');
  const [refDate, setRefDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);

  // Invoices for the active timeframe
  const [periodInvoices, setPeriodInvoices] = useState<any[]>([]);

  // Interactive selection & drill-down state
  const [selectedBucketId, setSelectedBucketId] = useState<string | null>(null);
  const [drillDown, setDrillDown] = useState<DrillDownFilter | null>(null);
  const [drillDownTab, setDrillDownTab] = useState<'invoices' | 'procedures' | 'doctors' | 'payments'>('invoices');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewInvoice, setViewInvoice] = useState<any | null>(null);

  // Date range computation based on granularity and refDate
  const dateRange = useMemo(() => {
    const d = new Date(refDate);
    if (granularity === 'daily') {
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
      return {
        start,
        end,
        label: d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }),
        shortLabel: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      };
    } else if (granularity === 'weekly') {
      // Monday of current week
      const day = d.getDay();
      const diffToMonday = (day === 0 ? -6 : 1) - day;
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diffToMonday, 0, 0, 0, 0);
      const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999);
      return {
        start,
        end,
        label: `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
        shortLabel: `Week of ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      };
    } else if (granularity === 'monthly') {
      const start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
      return {
        start,
        end,
        label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        shortLabel: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      };
    } else {
      // Yearly
      const start = new Date(d.getFullYear(), 0, 1, 0, 0, 0, 0);
      const end = new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999);
      return {
        start,
        end,
        label: `Full Year ${d.getFullYear()}`,
        shortLabel: `${d.getFullYear()}`,
      };
    }
  }, [granularity, refDate]);

  // Navigate dates
  function navigatePeriod(direction: 'prev' | 'next') {
    const d = new Date(refDate);
    const step = direction === 'next' ? 1 : -1;
    if (granularity === 'daily') {
      d.setDate(d.getDate() + step);
    } else if (granularity === 'weekly') {
      d.setDate(d.getDate() + step * 7);
    } else if (granularity === 'monthly') {
      d.setMonth(d.getMonth() + step);
    } else {
      d.setFullYear(d.getFullYear() + step);
    }
    setRefDate(d);
    setSelectedBucketId(null);
    setDrillDown(null);
  }

  function resetToCurrent() {
    setRefDate(new Date());
    setSelectedBucketId(null);
    setDrillDown(null);
  }

  // Load Invoices
  useEffect(() => {
    fetchInvoices();
  }, [granularity, dateRange.start.getTime(), dateRange.end.getTime(), activeClinic?.id]);

  async function fetchInvoices() {
    setLoading(true);
    setSelectedBucketId(null);
    setDrillDown(null);

    const startIso = dateRange.start.toISOString();
    const endIso = dateRange.end.toISOString();

    if (isDemoMode()) {
      const demoInvoices = getDemoInvoices();
      const filtered = demoInvoices.filter(inv => {
        const rawDate = inv.created_at || inv.issue_date || '';
        const d = new Date(rawDate);
        return d >= dateRange.start && d <= dateRange.end;
      });
      setPeriodInvoices(filtered);
      setLoading(false);
      return;
    }

    const clinicId = activeClinic?.id || 'clinic-dentivista-01';

    try {
      let query = supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          total,
          paid_amount,
          payment_status,
          payment_method,
          notes,
          created_at,
          issue_date,
          due_date,
          patient:patients(id, name, phone, email),
          doctor:staff!invoices_doctor_id_fkey(id, name, clinic_id),
          invoice_items(id, description, quantity, unit_price, total)
        `)
        .gte('created_at', startIso)
        .lte('created_at', endIso)
        .order('created_at', { ascending: true });

      query = applyClinicFilter(query, clinicId);
      let res = await query;

      if (res.error && isMissingClinicIdColumnError(res.error)) {
        res = await supabase
          .from('invoices')
          .select(`
            id,
            invoice_number,
            total,
            paid_amount,
            payment_status,
            payment_method,
            notes,
            created_at,
            issue_date,
            due_date,
            patient:patients(id, name, phone, email),
            doctor:staff!invoices_doctor_id_fkey(id, name, clinic_id),
            invoice_items(id, description, quantity, unit_price, total)
          `)
          .gte('created_at', startIso)
          .lte('created_at', endIso)
          .order('created_at', { ascending: true });
      }

      if (res.data) {
        // Normalize items and patient data
        const normalized = res.data.map((inv: any) => ({
          ...inv,
          items: inv.invoice_items || inv.items || [],
        }));
        setPeriodInvoices(normalized);
      } else {
        setPeriodInvoices([]);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
      setPeriodInvoices([]);
    } finally {
      setLoading(false);
    }
  }

  // Summary Metrics
  const summary = useMemo(() => {
    let grossBilled = 0;
    let totalCollected = 0;
    let totalPending = 0;
    const patientSet = new Set<string>();

    periodInvoices.forEach(inv => {
      const tot = Number(inv.total) || 0;
      const paid = Number(
        inv.paid_amount !== undefined && inv.paid_amount !== null
          ? inv.paid_amount
          : inv.payment_status === 'paid'
          ? tot
          : 0
      );
      grossBilled += tot;
      totalCollected += paid;
      totalPending += Math.max(tot - paid, 0);

      const patId = inv.patient_id || inv.patient?.id || inv.patient?.name;
      if (patId) patientSet.add(patId);
    });

    const totalInvoices = periodInvoices.length;
    const collectionRate = grossBilled > 0 ? (totalCollected / grossBilled) * 100 : 0;
    const avgTransactionValue = totalInvoices > 0 ? totalCollected / totalInvoices : 0;

    return {
      grossBilled,
      totalCollected,
      totalPending,
      totalInvoices,
      uniquePatients: patientSet.size,
      collectionRate,
      avgTransactionValue,
    };
  }, [periodInvoices]);

  // Generate granular buckets for charts
  const buckets: BucketItem[] = useMemo(() => {
    if (granularity === 'daily') {
      // 2-hour interval slots: 08:00 to 20:00
      const slots = [
        { id: 'h08', label: '08:00 – 10:00', shortLabel: '8–10 AM', startH: 8, endH: 10 },
        { id: 'h10', label: '10:00 – 12:00', shortLabel: '10–12 PM', startH: 10, endH: 12 },
        { id: 'h12', label: '12:00 – 14:00', shortLabel: '12–2 PM', startH: 12, endH: 14 },
        { id: 'h14', label: '14:00 – 16:00', shortLabel: '2–4 PM', startH: 14, endH: 16 },
        { id: 'h16', label: '16:00 – 18:00', shortLabel: '4–6 PM', startH: 16, endH: 18 },
        { id: 'h18', label: '18:00 – 20:00', shortLabel: '6–8 PM', startH: 18, endH: 20 },
        { id: 'h20', label: '20:00+', shortLabel: '8 PM+', startH: 20, endH: 24 },
      ];

      return slots.map(slot => {
        const slotInvoices = periodInvoices.filter(inv => {
          const t = new Date(inv.created_at || inv.issue_date || '');
          const h = t.getHours();
          return h >= slot.startH && h < slot.endH;
        });

        const invoiced = slotInvoices.reduce((s, i) => s + (Number(i.total) || 0), 0);
        const revenue = slotInvoices.reduce((s, i) => {
          const paid = Number(
            i.paid_amount !== undefined && i.paid_amount !== null
              ? i.paid_amount
              : i.payment_status === 'paid'
              ? i.total
              : 0
          );
          return s + paid;
        }, 0);

        return {
          id: slot.id,
          label: slot.label,
          shortLabel: slot.shortLabel,
          invoiced,
          revenue,
          pending: Math.max(invoiced - revenue, 0),
          count: slotInvoices.length,
          invoices: slotInvoices,
        };
      });
    } else if (granularity === 'weekly') {
      // 7 days of the week (Monday to Sunday)
      const list: BucketItem[] = [];
      const cur = new Date(dateRange.start);

      for (let i = 0; i < 7; i++) {
        const dayDate = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + i);
        const dateStr = dayDate.toISOString().split('T')[0];
        const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'short' });
        const dayNum = dayDate.getDate();

        const dayInvoices = periodInvoices.filter(inv => {
          const dStr = (inv.created_at || inv.issue_date || '').split('T')[0];
          return dStr === dateStr;
        });

        const invoiced = dayInvoices.reduce((s, inv) => s + (Number(inv.total) || 0), 0);
        const revenue = dayInvoices.reduce((s, inv) => {
          const paid = Number(
            inv.paid_amount !== undefined && inv.paid_amount !== null
              ? inv.paid_amount
              : inv.payment_status === 'paid'
              ? inv.total
              : 0
          );
          return s + paid;
        }, 0);

        list.push({
          id: dateStr,
          label: dayDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
          shortLabel: `${dayName} ${dayNum}`,
          subLabel: dayName,
          invoiced,
          revenue,
          pending: Math.max(invoiced - revenue, 0),
          count: dayInvoices.length,
          invoices: dayInvoices,
        });
      }
      return list;
    } else if (granularity === 'monthly') {
      // All calendar days of current month
      const list: BucketItem[] = [];
      const totalDays = dateRange.end.getDate();

      for (let day = 1; day <= totalDays; day++) {
        const dayDate = new Date(dateRange.start.getFullYear(), dateRange.start.getMonth(), day);
        const dateStr = dayDate.toISOString().split('T')[0];
        const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'narrow' });

        const dayInvoices = periodInvoices.filter(inv => {
          const dStr = (inv.created_at || inv.issue_date || '').split('T')[0];
          return dStr === dateStr;
        });

        const invoiced = dayInvoices.reduce((s, inv) => s + (Number(inv.total) || 0), 0);
        const revenue = dayInvoices.reduce((s, inv) => {
          const paid = Number(
            inv.paid_amount !== undefined && inv.paid_amount !== null
              ? inv.paid_amount
              : inv.payment_status === 'paid'
              ? inv.total
              : 0
          );
          return s + paid;
        }, 0);

        list.push({
          id: dateStr,
          label: dayDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          shortLabel: `${day}`,
          subLabel: dayName,
          invoiced,
          revenue,
          pending: Math.max(invoiced - revenue, 0),
          count: dayInvoices.length,
          invoices: dayInvoices,
        });
      }
      return list;
    } else {
      // Yearly: 12 months (Jan to Dec)
      const list: BucketItem[] = [];
      const year = dateRange.start.getFullYear();

      for (let m = 0; m < 12; m++) {
        const monthDate = new Date(year, m, 1);
        const monthName = monthDate.toLocaleDateString('en-US', { month: 'short' });
        const fullMonth = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        const monthInvoices = periodInvoices.filter(inv => {
          const d = new Date(inv.created_at || inv.issue_date || '');
          return d.getFullYear() === year && d.getMonth() === m;
        });

        const invoiced = monthInvoices.reduce((s, inv) => s + (Number(inv.total) || 0), 0);
        const revenue = monthInvoices.reduce((s, inv) => {
          const paid = Number(
            inv.paid_amount !== undefined && inv.paid_amount !== null
              ? inv.paid_amount
              : inv.payment_status === 'paid'
              ? inv.total
              : 0
          );
          return s + paid;
        }, 0);

        list.push({
          id: `m-${m}`,
          label: fullMonth,
          shortLabel: monthName,
          subLabel: `Q${Math.floor(m / 3) + 1}`,
          invoiced,
          revenue,
          pending: Math.max(invoiced - revenue, 0),
          count: monthInvoices.length,
          invoices: monthInvoices,
        });
      }
      return list;
    }
  }, [granularity, periodInvoices, dateRange]);

  const maxBucketRevenue = useMemo(() => {
    return Math.max(...buckets.map(b => Math.max(b.revenue, b.invoiced)), 1);
  }, [buckets]);

  // Doctor Performance
  const doctorStats: DoctorStat[] = useMemo(() => {
    const map = new Map<string, { name: string; billed: number; collected: number; count: number; invoices: any[] }>();

    periodInvoices.forEach(inv => {
      const docName = inv.doctor?.name || 'Attending Surgeon';
      const key = docName;

      const existing = map.get(key) || { name: docName, billed: 0, collected: 0, count: 0, invoices: [] as any[] };
      const tot = Number(inv.total) || 0;
      const paid = Number(
        inv.paid_amount !== undefined && inv.paid_amount !== null
          ? inv.paid_amount
          : inv.payment_status === 'paid'
          ? tot
          : 0
      );

      existing.billed += tot;
      existing.collected += paid;
      existing.count += 1;
      existing.invoices.push(inv);
      map.set(key, existing);
    });

    const totalCollected = summary.totalCollected || 1;
    return Array.from(map.values())
      .map(doc => ({
        doctorId: doc.name,
        doctorName: doc.name,
        totalBilled: doc.billed,
        totalCollected: doc.collected,
        count: doc.count,
        collectionRate: doc.billed > 0 ? (doc.collected / doc.billed) * 100 : 0,
        sharePercent: (doc.collected / totalCollected) * 100,
        invoices: doc.invoices,
      }))
      .sort((a, b) => b.totalCollected - a.totalCollected);
  }, [periodInvoices, summary.totalCollected]);

  // Top Procedures Breakdown
  const procedureStats: ProcedureStat[] = useMemo(() => {
    const map = new Map<string, { count: number; revenue: number }>();

    periodInvoices.forEach(inv => {
      const items: InvoiceItem[] = inv.items || inv.invoice_items || [];
      if (items.length === 0) {
        const cat = 'General Dental Consultation';
        const cur = map.get(cat) || { count: 0, revenue: 0 };
        cur.count += 1;
        cur.revenue += Number(inv.total) || 0;
        map.set(cat, cur);
      } else {
        items.forEach(it => {
          const desc = it.description || 'Dental Procedure';
          const cur = map.get(desc) || { count: 0, revenue: 0 };
          cur.count += Number(it.quantity) || 1;
          cur.revenue += Number(it.total) || (Number(it.unit_price) * (Number(it.quantity) || 1)) || 0;
          map.set(desc, cur);
        });
      }
    });

    const totalRev = summary.grossBilled || 1;
    return Array.from(map.entries())
      .map(([description, data]) => {
        let category = 'Restorative & General';
        const dLower = description.toLowerCase();
        if (dLower.includes('rct') || dLower.includes('root canal') || dLower.includes('pulpotomy')) {
          category = 'Endodontics (RCT)';
        } else if (dLower.includes('implant') || dLower.includes('surgical') || dLower.includes('extraction')) {
          category = 'Oral Surgery & Implants';
        } else if (dLower.includes('ortho') || dLower.includes('braces') || dLower.includes('aligner') || dLower.includes('retainer')) {
          category = 'Orthodontics & Aligners';
        } else if (dLower.includes('crown') || dLower.includes('bridge') || dLower.includes('veneer') || dLower.includes('emax') || dLower.includes('zirconia')) {
          category = 'Prosthodontics & Aesthetics';
        } else if (dLower.includes('whitening') || dLower.includes('bleaching') || dLower.includes('smile')) {
          category = 'Cosmetic Dentistry';
        } else if (dLower.includes('scaling') || dLower.includes('cleaning') || dLower.includes('polishing') || dLower.includes('planing')) {
          category = 'Periodontics & Hygiene';
        }

        return {
          category,
          description,
          count: data.count,
          revenue: data.revenue,
          sharePercent: (data.revenue / totalRev) * 100,
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }, [periodInvoices, summary.grossBilled]);

  // Payment Methods Breakdown
  const paymentStats: PaymentMethodStat[] = useMemo(() => {
    const map = new Map<string, { amount: number; count: number }>();

    periodInvoices.forEach(inv => {
      const method = (inv.payment_method || 'cash').toLowerCase();
      const paid = Number(
        inv.paid_amount !== undefined && inv.paid_amount !== null
          ? inv.paid_amount
          : inv.payment_status === 'paid'
          ? inv.total
          : 0
      );

      const cur = map.get(method) || { amount: 0, count: 0 };
      cur.amount += paid;
      cur.count += 1;
      map.set(method, cur);
    });

    const labels: Record<string, string> = {
      card: 'Debit / Credit Card',
      cash: 'Cash In Hand',
      bank_transfer: 'Bank Transfer / Online',
      insurance: 'Dental Insurance',
      cheque: 'Bank Cheque',
    };

    const total = summary.totalCollected || 1;
    return Array.from(map.entries()).map(([method, data]) => ({
      method,
      label: labels[method] || method.toUpperCase(),
      amount: data.amount,
      count: data.count,
      sharePercent: (data.amount / total) * 100,
    })).sort((a, b) => b.amount - a.amount);
  }, [periodInvoices, summary.totalCollected]);

  // Active Invoices to show in drill-down inspector
  const filteredDrillDownInvoices = useMemo(() => {
    let list = periodInvoices;

    if (drillDown) {
      if (drillDown.type === 'bucket') {
        const b = buckets.find(b => b.id === drillDown.key);
        list = b ? b.invoices : [];
      } else if (drillDown.type === 'doctor') {
        list = list.filter(inv => (inv.doctor?.name || '') === drillDown.key);
      } else if (drillDown.type === 'procedure') {
        list = list.filter(inv => {
          const items: InvoiceItem[] = inv.items || inv.invoice_items || [];
          return items.some(it => it.description === drillDown.key);
        });
      } else if (drillDown.type === 'payment_method') {
        list = list.filter(inv => (inv.payment_method || '').toLowerCase() === drillDown.key.toLowerCase());
      }
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(inv =>
        (inv.invoice_number || '').toLowerCase().includes(term) ||
        (inv.patient?.name || '').toLowerCase().includes(term) ||
        (inv.patient?.phone || '').includes(term) ||
        (inv.doctor?.name || '').toLowerCase().includes(term)
      );
    }

    return list;
  }, [periodInvoices, drillDown, buckets, searchTerm]);

  // Drilldown sub-summary
  const drillDownSummary = useMemo(() => {
    let collected = 0;
    let billed = 0;
    filteredDrillDownInvoices.forEach(inv => {
      const tot = Number(inv.total) || 0;
      const paid = Number(
        inv.paid_amount !== undefined && inv.paid_amount !== null
          ? inv.paid_amount
          : inv.payment_status === 'paid'
          ? tot
          : 0
      );
      billed += tot;
      collected += paid;
    });
    return {
      billed,
      collected,
      pending: Math.max(billed - collected, 0),
      count: filteredDrillDownInvoices.length,
    };
  }, [filteredDrillDownInvoices]);

  // Tap on a bucket (bar in chart)
  function handleSelectBucket(bucket: BucketItem) {
    if (selectedBucketId === bucket.id && drillDown?.key === bucket.id) {
      setSelectedBucketId(null);
      setDrillDown(null);
    } else {
      setSelectedBucketId(bucket.id);
      setDrillDown({
        type: 'bucket',
        key: bucket.id,
        title: `${bucket.label} (${granularity.toUpperCase()} VIEW)`,
        subtitle: `${bucket.count} invoice(s) • Total Collected: ${currency} ${bucket.revenue.toLocaleString()}`,
      });
      setDrillDownTab('invoices');
    }
  }

  // Tap on a doctor
  function handleSelectDoctor(doctor: DoctorStat) {
    setDrillDown({
      type: 'doctor',
      key: doctor.doctorName,
      title: `${doctor.doctorName} — Clinical Ledger`,
      subtitle: `${doctor.count} invoice(s) • ${doctor.collectionRate.toFixed(1)}% Collection Rate`,
    });
    setSelectedBucketId(null);
    setDrillDownTab('invoices');
  }

  // Tap on a procedure
  function handleSelectProcedure(proc: ProcedureStat) {
    setDrillDown({
      type: 'procedure',
      key: proc.description,
      title: `${proc.description}`,
      subtitle: `${proc.count} procedures logged • ${currency} ${proc.revenue.toLocaleString()}`,
    });
    setSelectedBucketId(null);
    setDrillDownTab('invoices');
  }

  // Tap on a payment method
  function handleSelectPaymentMethod(pm: PaymentMethodStat) {
    setDrillDown({
      type: 'payment_method',
      key: pm.method,
      title: `${pm.label} Reconciliation`,
      subtitle: `${pm.count} transactions • ${currency} ${pm.amount.toLocaleString()}`,
    });
    setSelectedBucketId(null);
    setDrillDownTab('invoices');
  }

  // Export current view to CSV
  function exportToCsv() {
    const invoicesToExport = drillDown ? filteredDrillDownInvoices : periodInvoices;
    if (invoicesToExport.length === 0) return;

    const headers = ['Invoice #', 'Date', 'Patient Name', 'Phone', 'Doctor', 'Payment Method', 'Payment Status', 'Total Billed', 'Paid Amount', 'Balance Due'];
    const rows = invoicesToExport.map(inv => {
      const tot = Number(inv.total) || 0;
      const paid = Number(
        inv.paid_amount !== undefined && inv.paid_amount !== null
          ? inv.paid_amount
          : inv.payment_status === 'paid'
          ? tot
          : 0
      );
      const balance = Math.max(tot - paid, 0);
      return [
        `"${inv.invoice_number}"`,
        `"${(inv.created_at || inv.issue_date || '').split('T')[0]}"`,
        `"${inv.patient?.name || '—'}"`,
        `"${inv.patient?.phone || '—'}"`,
        `"${inv.doctor?.name || '—'}"`,
        `"${inv.payment_method || '—'}"`,
        `"${inv.payment_status || '—'}"`,
        tot,
        paid,
        balance,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `clinsyst_report_${granularity}_${dateRange.shortLabel.replace(/[\s,]+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Status badges
  const statusBadgeStyle: Record<string, string> = {
    paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    partial: 'bg-blue-50 text-blue-700 border-blue-200',
    cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ── HEADER & TIMEFRAME SELECTOR ────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="font-display font-bold text-2xl text-slate-900">Financial & Clinical Reports</h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200 uppercase tracking-wide">
              {granularity}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time multi-dimensional practice revenue, doctor productivity, and itemized clinical throughput.
          </p>
        </div>

        {/* Controls: Granularity tabs, date navigator, CSV export */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Granularity switch */}
          <div className="flex items-center bg-white rounded-xl border border-slate-200 p-1 shadow-xs">
            {(['daily', 'weekly', 'monthly', 'yearly'] as const).map(g => (
              <button
                key={g}
                onClick={() => {
                  setGranularity(g);
                  setSelectedBucketId(null);
                  setDrillDown(null);
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  granularity === g
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          {/* Date Range Navigation */}
          <div className="flex items-center bg-white rounded-xl border border-slate-200 p-1 shadow-xs">
            <button
              onClick={() => navigatePeriod('prev')}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Previous period"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="px-3 py-1 text-xs font-semibold text-slate-800 text-center min-w-[130px] sm:min-w-[160px]">
              {dateRange.label}
            </div>
            <button
              onClick={() => navigatePeriod('next')}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Next period"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Reset Today / Current */}
          <button
            onClick={resetToCurrent}
            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
          >
            <RefreshCw size={13} className="text-slate-400" />
            <span>Today</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={exportToCsv}
            disabled={periodInvoices.length === 0}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ── EXECUTIVE KPI METRIC CARDS ────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Revenue Collected */}
        <div
          onClick={() => {
            setDrillDown({
              type: 'all',
              key: 'paid',
              title: 'Collected Revenue Invoices',
              subtitle: `All settled invoices during ${dateRange.label}`,
            });
            setSelectedBucketId(null);
            setDrillDownTab('invoices');
          }}
          className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Collected Revenue</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="text-2xl font-bold font-display text-slate-900">
            {loading ? '—' : `${currency} ${summary.totalCollected.toLocaleString()}`}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
            <span className="font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              {summary.collectionRate.toFixed(1)}%
            </span>
            <span>Collection rate</span>
          </div>
        </div>

        {/* Card 2: Gross Clinical Invoiced */}
        <div
          onClick={() => {
            setDrillDown({
              type: 'all',
              key: 'all',
              title: `Complete Clinical Ledger (${dateRange.label})`,
              subtitle: `${summary.totalInvoices} total bills generated`,
            });
            setSelectedBucketId(null);
            setDrillDownTab('invoices');
          }}
          className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-sky-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Gross Invoiced</span>
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="text-2xl font-bold font-display text-slate-900">
            {loading ? '—' : `${currency} ${summary.grossBilled.toLocaleString()}`}
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">{summary.totalInvoices}</span>
            <span>invoices generated</span>
          </div>
        </div>

        {/* Card 3: Outstanding Unpaid */}
        <div
          onClick={() => {
            setDrillDown({
              type: 'all',
              key: 'pending',
              title: 'Outstanding Accounts Receivable',
              subtitle: `Uncollected balance across pending and partial invoices`,
            });
            setSelectedBucketId(null);
            setDrillDownTab('invoices');
          }}
          className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-amber-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Outstanding Due</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <TrendingDown size={18} />
            </div>
          </div>
          <div className="text-2xl font-bold font-display text-amber-900">
            {loading ? '—' : `${currency} ${summary.totalPending.toLocaleString()}`}
          </div>
          <div className="mt-2 text-xs text-amber-700 flex items-center gap-1">
            <AlertCircle size={13} />
            <span>Pending collection</span>
          </div>
        </div>

        {/* Card 4: Patients Treated & ATV */}
        <div
          onClick={() => {
            setDrillDown({
              type: 'all',
              key: 'patients',
              title: 'Patient Attendance & Throughput',
              subtitle: `${summary.uniquePatients} unique patients seen in this period`,
            });
            setSelectedBucketId(null);
            setDrillDownTab('invoices');
          }}
          className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-purple-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Patients & ATV</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users size={18} />
            </div>
          </div>
          <div className="text-2xl font-bold font-display text-slate-900">
            {loading ? '—' : summary.uniquePatients}
            <span className="text-sm font-normal text-slate-500 ml-1.5">patients</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            <span>Avg ticket: </span>
            <span className="font-semibold text-slate-800">
              {currency} {Math.round(summary.avgTransactionValue).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* ── PRIMARY INTERACTIVE CHART (TAP TO INSPECT) ──────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-sky-600" />
              <h3 className="font-display font-bold text-lg text-slate-900">
                {granularity === 'daily' && 'Hourly Revenue Flow (Tap hour to inspect)'}
                {granularity === 'weekly' && 'Daily Revenue Breakdown (Tap day to inspect)'}
                {granularity === 'monthly' && 'Full Month Day-by-Day Cadence (Tap day to inspect)'}
                {granularity === 'yearly' && 'Annual Month-by-Month Trend (Tap month to inspect)'}
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Tap any column or bar to filter the ledger and inspect itemized procedures and invoices.
            </p>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-sky-600" />
              <span className="text-slate-600 font-medium">Collected Revenue</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-400" />
              <span className="text-slate-600 font-medium">Pending Balance</span>
            </div>
          </div>
        </div>

        {/* Chart Visualization */}
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-2 text-slate-400">
            <div className="w-8 h-8 border-3 border-sky-600/20 border-t-sky-600 rounded-full animate-spin" />
            <span className="text-xs">Aggregating {granularity} clinical data...</span>
          </div>
        ) : buckets.length === 0 || periodInvoices.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Calendar size={32} className="text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-700">No invoice records for this {granularity} window</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Try switching timeframes or navigate backwards with the arrow buttons above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto pb-2">
            <div className="min-w-[620px] h-64 flex items-end gap-2 pt-6 px-2">
              {buckets.map(bucket => {
                const isSelected = selectedBucketId === bucket.id;
                const revHeight = Math.max((bucket.revenue / maxBucketRevenue) * 170, bucket.revenue > 0 ? 8 : 2);
                const pendingHeight = Math.max((bucket.pending / maxBucketRevenue) * 170, bucket.pending > 0 ? 6 : 0);

                return (
                  <div
                    key={bucket.id}
                    onClick={() => handleSelectBucket(bucket)}
                    className={`flex-1 flex flex-col items-center justify-end h-full group cursor-pointer transition-all ${
                      isSelected ? 'scale-102' : 'hover:opacity-95'
                    }`}
                  >
                    {/* Tooltip & Values */}
                    <div className="relative w-full flex flex-col items-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-2 z-20 pointer-events-none">
                        <div className="bg-slate-900 text-white text-[11px] rounded-lg px-2.5 py-1.5 shadow-xl whitespace-nowrap text-center">
                          <p className="font-bold">{bucket.label}</p>
                          <p className="text-emerald-400 font-semibold">{currency} {bucket.revenue.toLocaleString()} collected</p>
                          {bucket.pending > 0 && (
                            <p className="text-amber-300">{currency} {bucket.pending.toLocaleString()} pending</p>
                          )}
                          <p className="text-slate-400 text-[10px]">{bucket.count} invoice(s)</p>
                        </div>
                      </div>

                      {/* Stacked / Dual Bar */}
                      <div className={`w-full max-w-[42px] flex flex-col items-center justify-end rounded-t-lg transition-all ${
                        isSelected ? 'ring-2 ring-sky-500 ring-offset-2' : ''
                      }`}>
                        {bucket.pending > 0 && (
                          <div
                            style={{ height: `${pendingHeight}px` }}
                            className="w-full bg-amber-400 rounded-t-sm transition-all"
                            title={`Pending: ${currency} ${bucket.pending}`}
                          />
                        )}
                        <div
                          style={{ height: `${revHeight}px` }}
                          className={`w-full transition-all ${
                            bucket.revenue > 0
                              ? isSelected ? 'bg-sky-700' : 'bg-sky-600 group-hover:bg-sky-500'
                              : 'bg-slate-100'
                          } ${bucket.pending > 0 ? 'rounded-b-sm' : 'rounded-t-sm'}`}
                        />
                      </div>
                    </div>

                    {/* X-axis Label */}
                    <div className="mt-2 text-center">
                      <p className={`text-[11px] font-semibold truncate ${isSelected ? 'text-sky-600' : 'text-slate-700'}`}>
                        {bucket.shortLabel}
                      </p>
                      {bucket.subLabel && (
                        <p className="text-[10px] text-slate-400 truncate">{bucket.subLabel}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Active Selection Banner */}
        {drillDown && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-sky-50/60 p-3.5 rounded-xl border border-sky-100">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-600 animate-pulse" />
              <div>
                <p className="text-xs font-bold text-sky-950">{drillDown.title}</p>
                <p className="text-[11px] text-sky-800/80">{drillDown.subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedBucketId(null);
                  setDrillDown(null);
                }}
                className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg shadow-2xs hover:bg-slate-50 transition"
              >
                Clear Filter
              </button>
              <a
                href="#drilldown-inspector"
                className="px-3 py-1 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs transition"
              >
                Inspect {filteredDrillDownInvoices.length} Invoices ↓
              </a>
            </div>
          </div>
        )}
      </div>

      {/* ── MULTI-DIMENSIONAL DETAIL SECTIONS ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Doctor Productivity Matrix */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Stethoscope size={16} className="text-sky-600" />
              <h3 className="font-display font-bold text-base text-slate-900">Doctor Productivity</h3>
            </div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {doctorStats.length} Doctors
            </span>
          </div>

          {doctorStats.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">No doctor records in this timeframe</p>
          ) : (
            <div className="space-y-3.5 divide-y divide-slate-100">
              {doctorStats.map(doc => (
                <div
                  key={doc.doctorName}
                  onClick={() => handleSelectDoctor(doc)}
                  className="pt-3 first:pt-0 cursor-pointer group hover:bg-slate-50/60 p-2 rounded-xl transition"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-800 font-bold text-xs flex items-center justify-center flex-shrink-0">
                        {doc.doctorName.replace(/Dr\.\s*/i, '').charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate group-hover:text-sky-600 transition-colors">
                          {doc.doctorName}
                        </p>
                        <p className="text-[10px] text-slate-400">{doc.count} invoices • {doc.collectionRate.toFixed(0)}% paid</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-bold text-slate-900">{currency} {doc.totalCollected.toLocaleString()}</p>
                      <p className="text-[10px] text-slate-400">{doc.sharePercent.toFixed(1)}% of total</p>
                    </div>
                  </div>

                  {/* Progress share bar */}
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-sky-600 h-full rounded-full transition-all"
                      style={{ width: `${Math.min(doc.sharePercent, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. Top Clinical Procedures */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <PieChart size={16} className="text-purple-600" />
              <h3 className="font-display font-bold text-base text-slate-900">Treatment Procedures</h3>
            </div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Top Revenue</span>
          </div>

          {procedureStats.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">No procedure items found</p>
          ) : (
            <div className="space-y-3 divide-y divide-slate-100">
              {procedureStats.map(proc => (
                <div
                  key={proc.description}
                  onClick={() => handleSelectProcedure(proc)}
                  className="pt-2.5 first:pt-0 cursor-pointer group hover:bg-slate-50/60 p-2 rounded-xl transition"
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-slate-800 truncate max-w-[190px] group-hover:text-purple-600 transition-colors">
                      {proc.description}
                    </span>
                    <span className="font-bold text-slate-900 flex-shrink-0">
                      {currency} {proc.revenue.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span>{proc.category}</span>
                    <span>{proc.count} executed • {proc.sharePercent.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-purple-600 h-full rounded-full transition-all"
                      style={{ width: `${Math.min(proc.sharePercent, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. Payment Method Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CreditCard size={16} className="text-emerald-600" />
              <h3 className="font-display font-bold text-base text-slate-900">Settlement Channels</h3>
            </div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Reconciled</span>
          </div>

          {paymentStats.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">No transaction records</p>
          ) : (
            <div className="space-y-3">
              {paymentStats.map(pm => (
                <div
                  key={pm.method}
                  onClick={() => handleSelectPaymentMethod(pm)}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-emerald-50/50 hover:border-emerald-200 cursor-pointer transition"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-700">
                        {pm.method === 'card' && <CreditCard size={12} />}
                        {pm.method === 'cash' && <Banknote size={12} />}
                        {pm.method === 'bank_transfer' && <Building2 size={12} />}
                        {pm.method !== 'card' && pm.method !== 'cash' && pm.method !== 'bank_transfer' && <DollarSign size={12} />}
                      </div>
                      <span className="text-xs font-bold text-slate-900">{pm.label}</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-700">
                      {currency} {pm.amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>{pm.count} transactions</span>
                    <span>{pm.sharePercent.toFixed(1)}% share</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── DRILL-DOWN INSPECTOR (DEEP DIVE AT EACH LEVEL) ────────────────── */}
      <div id="drilldown-inspector" className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Inspector Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-sky-100 text-sky-700">
                <Layers size={16} />
              </span>
              <h3 className="font-display font-bold text-lg text-slate-900">
                {drillDown ? drillDown.title : `Complete ${granularity.toUpperCase()} Ledger Inspector`}
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {drillDown?.subtitle || `Viewing all ${periodInvoices.length} invoices generated in ${dateRange.label}`}
            </p>
          </div>

          {/* Quick Metrics of filtered view */}
          <div className="flex items-center gap-3">
            <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-right shadow-2xs">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Invoices</span>
              <span className="text-xs font-bold text-slate-900">{drillDownSummary.count}</span>
            </div>
            <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-right shadow-2xs">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Collected</span>
              <span className="text-xs font-bold text-emerald-600">{currency} {drillDownSummary.collected.toLocaleString()}</span>
            </div>
            {drillDownSummary.pending > 0 && (
              <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-right shadow-2xs">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Pending</span>
                <span className="text-xs font-bold text-amber-600">{currency} {drillDownSummary.pending.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Search bar & Tab navigation */}
        <div className="px-5 sm:px-6 py-3 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setDrillDownTab('invoices')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                drillDownTab === 'invoices'
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Invoices ({filteredDrillDownInvoices.length})
            </button>
            <button
              onClick={() => setDrillDownTab('procedures')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                drillDownTab === 'procedures'
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Procedures Breakdown
            </button>
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="Search patient, invoice #..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
            />
          </div>
        </div>

        {/* Tab 1: Invoices Table */}
        {drillDownTab === 'invoices' && (
          <div className="overflow-x-auto">
            {filteredDrillDownInvoices.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No matching invoices found in this drill-down selection.
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/40">
                    <th className="px-5 py-3">Invoice #</th>
                    <th className="px-5 py-3">Date & Time</th>
                    <th className="px-5 py-3">Patient</th>
                    <th className="px-5 py-3">Attending Doctor</th>
                    <th className="px-5 py-3">Procedures / Items</th>
                    <th className="px-5 py-3 text-right">Amount</th>
                    <th className="px-5 py-3 text-center">Status</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredDrillDownInvoices.map(inv => {
                    const dateObj = new Date(inv.created_at || inv.issue_date || '');
                    const dateDisplay = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    const timeDisplay = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                    const items: InvoiceItem[] = inv.items || inv.invoice_items || [];

                    return (
                      <tr key={inv.id || inv.invoice_number} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-3 font-mono font-bold text-sky-800">
                          {inv.invoice_number}
                        </td>
                        <td className="px-5 py-3 text-slate-500 whitespace-nowrap">
                          <div>{dateDisplay}</div>
                          <div className="text-[10px] text-slate-400">{timeDisplay}</div>
                        </td>
                        <td className="px-5 py-3">
                          <p className="font-semibold text-slate-900">{inv.patient?.name || 'Walk-in Patient'}</p>
                          <p className="text-[10px] text-slate-400">{inv.patient?.phone || '—'}</p>
                        </td>
                        <td className="px-5 py-3 text-slate-700">
                          {inv.doctor?.name || '—'}
                        </td>
                        <td className="px-5 py-3 max-w-[220px]">
                          {items.length > 0 ? (
                            <div className="truncate text-slate-600" title={items.map(it => it.description).join(', ')}>
                              {items[0].description}
                              {items.length > 1 && (
                                <span className="text-[10px] text-sky-600 font-semibold ml-1">
                                  +{items.length - 1} more
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">Clinical consultation</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right font-bold text-slate-900 whitespace-nowrap">
                          {currency} {(Number(inv.total) || 0).toLocaleString()}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            statusBadgeStyle[inv.payment_status] || 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {inv.payment_status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => setViewInvoice(inv)}
                            className="px-2.5 py-1 text-xs font-semibold text-sky-700 hover:text-sky-900 hover:bg-sky-50 rounded-lg transition"
                          >
                            View Slip
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 2: Procedures Breakdown */}
        {drillDownTab === 'procedures' && (
          <div className="p-5 sm:p-6">
            <h4 className="font-display font-bold text-sm text-slate-900 mb-3">Itemized Procedures in this Selection</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {procedureStats.map(proc => (
                <div key={proc.description} className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-900">{proc.description}</p>
                    <p className="text-[11px] text-slate-400">{proc.category} • {proc.count} item(s)</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-purple-700">{currency} {proc.revenue.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400">{proc.sharePercent.toFixed(1)}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── INVOICE SLIP PREVIEW MODAL ────────────────────────────────────── */}
      {viewInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => setViewInvoice(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            >
              <X size={18} />
            </button>

            {/* Slip Header */}
            <div className="border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-sky-600 text-white font-bold text-sm flex items-center justify-center">
                  C
                </span>
                <div>
                  <h3 className="font-display font-bold text-base text-slate-900">{activeClinic?.name || 'Clinsyst Dental Cloud'}</h3>
                  <p className="text-[11px] text-slate-400">Official Clinical Invoice Voucher</p>
                </div>
              </div>
            </div>

            {/* Invoice Meta */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-100 mb-4">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Invoice Number</span>
                <span className="font-mono font-bold text-slate-800">{viewInvoice.invoice_number}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Date & Time</span>
                <span className="font-medium text-slate-800">
                  {new Date(viewInvoice.created_at || viewInvoice.issue_date || '').toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Patient</span>
                <span className="font-bold text-slate-800">{viewInvoice.patient?.name || 'Walk-in'}</span>
                {viewInvoice.patient?.phone && (
                  <span className="text-[11px] text-slate-500 block">{viewInvoice.patient.phone}</span>
                )}
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Attending Doctor</span>
                <span className="font-bold text-slate-800">{viewInvoice.doctor?.name || 'Clinic Surgeon'}</span>
              </div>
            </div>

            {/* Line items */}
            <div className="mb-4">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Itemized Services</h4>
              <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
                {(viewInvoice.items || viewInvoice.invoice_items || []).map((it: any, i: number) => (
                  <div key={i} className="p-2.5 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-800">{it.description}</p>
                      <p className="text-[10px] text-slate-400">Qty: {it.quantity || 1} × {currency} {Number(it.unit_price || it.total || 0).toLocaleString()}</p>
                    </div>
                    <span className="font-bold text-slate-900">{currency} {Number(it.total || it.unit_price || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs text-slate-600 mb-5">
              <div className="flex justify-between">
                <span>Total Amount:</span>
                <span className="font-bold text-slate-900">{currency} {Number(viewInvoice.total || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Paid Amount:</span>
                <span className="font-bold text-emerald-600">
                  {currency} {Number(
                    viewInvoice.paid_amount !== undefined && viewInvoice.paid_amount !== null
                      ? viewInvoice.paid_amount
                      : viewInvoice.payment_status === 'paid'
                      ? viewInvoice.total
                      : 0
                  ).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Payment Mode:</span>
                <span className="font-semibold text-slate-800 capitalize">{viewInvoice.payment_method || 'Cash'}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment Status:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                  statusBadgeStyle[viewInvoice.payment_status] || 'bg-slate-100'
                }`}>
                  {viewInvoice.payment_status}
                </span>
              </div>
            </div>

            {viewInvoice.notes && (
              <p className="text-xs text-slate-500 bg-amber-50/50 p-2.5 rounded-lg border border-amber-100 mb-4">
                <strong>Notes:</strong> {viewInvoice.notes}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                Print Voucher
              </button>
              <button
                onClick={() => setViewInvoice(null)}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
