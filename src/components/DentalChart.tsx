import { useState, useEffect } from 'react';
import {
  ADULT_TEETH_UPPER_RIGHT,
  ADULT_TEETH_UPPER_LEFT,
  ADULT_TEETH_LOWER_LEFT,
  ADULT_TEETH_LOWER_RIGHT,
  CHILD_TEETH_UPPER_RIGHT,
  CHILD_TEETH_UPPER_LEFT,
  CHILD_TEETH_LOWER_LEFT,
  CHILD_TEETH_LOWER_RIGHT,
  FINDINGS_CONFIG,
  TOOTH_SURFACES,
  ToothInfo,
  FDI_TO_UNIVERSAL_MAP,
  getToothDisplayName,
} from '../lib/dentalData';
import {
  DentitionType,
  ToothCondition,
  ToothFinding,
  ToothSurface,
  ToothNotation,
} from '../lib/types';
import { useClinicSettings } from '../lib/clinicSettings';
import { X, Check, Info, ShieldCheck, Stethoscope, Sparkles } from 'lucide-react';

interface DentalChartProps {
  dentitionType: DentitionType;
  onChangeDentitionType?: (type: DentitionType) => void;
  teethFindings: Record<number, ToothCondition>;
  onChangeTeethFindings?: (findings: Record<number, ToothCondition>) => void;
  readOnly?: boolean;
  onQuickTreatment?: (toothNum: number, toothName: string, suggestedProcedure: string) => void;
  notation?: ToothNotation;
}

export default function DentalChart({
  dentitionType,
  onChangeDentitionType,
  teethFindings,
  onChangeTeethFindings,
  readOnly = false,
  onQuickTreatment,
  notation,
}: DentalChartProps) {
  const { settings } = useClinicSettings();
  const [activeNotation, setActiveNotation] = useState<ToothNotation>(
    notation || settings.tooth_notation || 'fdi'
  );

  useEffect(() => {
    if (notation) {
      setActiveNotation(notation);
    } else if (settings.tooth_notation) {
      setActiveNotation(settings.tooth_notation);
    }
  }, [notation, settings.tooth_notation]);

  const [selectedTooth, setSelectedTooth] = useState<ToothInfo | null>(null);
  const [hoveredTooth, setHoveredTooth] = useState<ToothInfo | null>(null);

  // Upper & Lower rows depending on dentition
  const upperRight = dentitionType === 'adult' ? ADULT_TEETH_UPPER_RIGHT : CHILD_TEETH_UPPER_RIGHT;
  const upperLeft = dentitionType === 'adult' ? ADULT_TEETH_UPPER_LEFT : CHILD_TEETH_UPPER_LEFT;
  const lowerRight = dentitionType === 'adult' ? ADULT_TEETH_LOWER_RIGHT : CHILD_TEETH_LOWER_RIGHT;
  const lowerLeft = dentitionType === 'adult' ? ADULT_TEETH_LOWER_LEFT : CHILD_TEETH_LOWER_LEFT;

  // Compute summary stats
  const stats = {
    caries: 0,
    filling: 0,
    rct: 0,
    crown: 0,
    extraction: 0,
    implant: 0,
    missing: 0,
    sound: 0,
  };

  Object.values(teethFindings).forEach((cond) => {
    (cond.findings || []).forEach((f) => {
      if (stats[f] !== undefined) {
        stats[f]++;
      }
    });
  });

  function getCondition(num: number): ToothCondition | undefined {
    return teethFindings[num];
  }

  function handleToothClick(tooth: ToothInfo) {
    if (readOnly) return;
    setSelectedTooth(tooth);
  }

  function handleSaveToothCondition(num: number, condition: ToothCondition | null) {
    if (!onChangeTeethFindings) return;
    const next = { ...teethFindings };
    if (!condition || (condition.findings.length === 0 && !condition.notes)) {
      delete next[num];
    } else {
      next[num] = condition;
    }
    onChangeTeethFindings(next);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 card-shadow p-5 space-y-5">
      {/* Header & Dentition / Notation Switch */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Stethoscope className="text-emerald-700" size={18} />
              Interactive Dental Chart ({activeNotation === 'fdi' ? 'FDI Two-Digit 11–48' : 'Universal 1–32'})
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              {dentitionType === 'adult' ? 'Permanent 32 Teeth' : 'Primary 20 Teeth'}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Click on any tooth to record caries, fillings, root canals, crowns, implants, extractions, or surfaces.
          </p>
        </div>

        {/* Toggles: Dentition + Notation */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Notation Toggle */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
            <button
              type="button"
              onClick={() => setActiveNotation('fdi')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                activeNotation === 'fdi'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="FDI Two-Digit notation (Standard in UAE, GCC, UK, Europe, Southeast Asia)"
            >
              FDI (11–48)
            </button>
            <button
              type="button"
              onClick={() => setActiveNotation('universal')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                activeNotation === 'universal'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Universal numbering system (1–32 / A–T, US Standard)"
            >
              Universal (1–32)
            </button>
          </div>

          {/* Dentition Toggle */}
          {onChangeDentitionType && (
            <div className="flex items-center bg-gray-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => onChangeDentitionType('adult')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  dentitionType === 'adult'
                    ? 'bg-white text-emerald-800 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Adult (32)
              </button>
              <button
                type="button"
                onClick={() => onChangeDentitionType('child')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  dentitionType === 'child'
                    ? 'bg-white text-emerald-800 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Pediatric (20)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Summary Findings Badges */}
      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
        <span className="text-gray-400 font-medium mr-1 flex items-center gap-1">
          <Info size={13} /> Findings Summary:
        </span>
        {stats.caries > 0 && (
          <span className="px-2.5 py-1 rounded-full font-semibold bg-red-100 text-red-800 border border-red-200">
            {stats.caries} Caries
          </span>
        )}
        {stats.filling > 0 && (
          <span className="px-2.5 py-1 rounded-full font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            {stats.filling} Fillings
          </span>
        )}
        {stats.rct > 0 && (
          <span className="px-2.5 py-1 rounded-full font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            {stats.rct} RCT
          </span>
        )}
        {stats.crown > 0 && (
          <span className="px-2.5 py-1 rounded-full font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            {stats.crown} Crowns
          </span>
        )}
        {stats.extraction > 0 && (
          <span className="px-2.5 py-1 rounded-full font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            {stats.extraction} To Extract
          </span>
        )}
        {stats.implant > 0 && (
          <span className="px-2.5 py-1 rounded-full font-semibold bg-cyan-100 text-cyan-800 border border-cyan-200">
            {stats.implant} Implants
          </span>
        )}
        {stats.missing > 0 && (
          <span className="px-2.5 py-1 rounded-full font-semibold bg-gray-200 text-gray-800 border border-gray-300">
            {stats.missing} Missing
          </span>
        )}
        {Object.values(stats).reduce((a, b) => a + b, 0) === 0 && (
          <span className="px-2.5 py-1 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
            <ShieldCheck size={13} /> All Teeth Sound / Uncharted
          </span>
        )}
      </div>

      {/* Main Dental Chart Grid */}
      <div className="p-4 bg-slate-50/70 rounded-2xl border border-gray-200/80 overflow-x-auto">
        <div className="min-w-[660px] space-y-6">
          {/* Upper Arch Label */}
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase tracking-wider px-2">
            <span>Patient Right (UR)</span>
            <span className="bg-emerald-100/70 text-emerald-800 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
              Maxilla (Upper Arch)
            </span>
            <span>Patient Left (UL)</span>
          </div>

          {/* Upper Arch Teeth */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-2">
            {/* Upper Right Quadrant */}
            <div className="flex items-center gap-1 sm:gap-1.5 justify-end flex-1">
              {upperRight.map((tooth) => (
                <ToothItem
                  key={tooth.number}
                  tooth={tooth}
                  condition={getCondition(tooth.number)}
                  onClick={() => handleToothClick(tooth)}
                  onHover={(t) => setHoveredTooth(t)}
                  readOnly={readOnly}
                  notation={activeNotation}
                />
              ))}
            </div>

            {/* Midline Divider */}
            <div className="h-16 w-0.5 bg-emerald-600/30 flex flex-col justify-between items-center py-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              <span className="text-[9px] font-bold text-emerald-700">MID</span>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            </div>

            {/* Upper Left Quadrant */}
            <div className="flex items-center gap-1 sm:gap-1.5 justify-start flex-1">
              {upperLeft.map((tooth) => (
                <ToothItem
                  key={tooth.number}
                  tooth={tooth}
                  condition={getCondition(tooth.number)}
                  onClick={() => handleToothClick(tooth)}
                  onHover={(t) => setHoveredTooth(t)}
                  readOnly={readOnly}
                  notation={activeNotation}
                />
              ))}
            </div>
          </div>

          {/* Arch Separator Line */}
          <div className="relative flex items-center justify-center py-1">
            <div className="w-full border-t border-dashed border-gray-300" />
            <span className="absolute bg-white px-3 py-0.5 text-[10px] uppercase font-bold text-gray-400 rounded-full border border-gray-200">
              Occlusal Plane
            </span>
          </div>

          {/* Lower Arch Teeth */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-2">
            {/* Lower Right Quadrant */}
            <div className="flex items-center gap-1 sm:gap-1.5 justify-end flex-1">
              {lowerRight.map((tooth) => (
                <ToothItem
                  key={tooth.number}
                  tooth={tooth}
                  condition={getCondition(tooth.number)}
                  onClick={() => handleToothClick(tooth)}
                  onHover={(t) => setHoveredTooth(t)}
                  readOnly={readOnly}
                  notation={activeNotation}
                />
              ))}
            </div>

            {/* Midline Divider */}
            <div className="h-16 w-0.5 bg-emerald-600/30 flex flex-col justify-between items-center py-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              <span className="text-[9px] font-bold text-emerald-700">MID</span>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            </div>

            {/* Lower Left Quadrant */}
            <div className="flex items-center gap-1 sm:gap-1.5 justify-start flex-1">
              {lowerLeft.map((tooth) => (
                <ToothItem
                  key={tooth.number}
                  tooth={tooth}
                  condition={getCondition(tooth.number)}
                  onClick={() => handleToothClick(tooth)}
                  onHover={(t) => setHoveredTooth(t)}
                  readOnly={readOnly}
                  notation={activeNotation}
                />
              ))}
            </div>
          </div>

          {/* Lower Arch Label */}
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase tracking-wider px-2">
            <span>Patient Right (LR)</span>
            <span className="bg-emerald-100/70 text-emerald-800 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
              Mandible (Lower Arch)
            </span>
            <span>Patient Left (LL)</span>
          </div>
        </div>
      </div>

      {/* Hover Information Banner */}
      <div className="bg-gray-50 rounded-xl px-4 py-2.5 flex items-center justify-between min-h-[44px] text-xs">
        {hoveredTooth ? (
          <div className="flex items-center gap-2">
            <span className="font-bold text-emerald-800 text-sm">
              {getToothDisplayName(hoveredTooth.number, activeNotation, true)}
            </span>
            <span className="text-gray-800 font-medium">
              {hoveredTooth.name} ({hoveredTooth.quadrant})
            </span>
            {teethFindings[hoveredTooth.number]?.findings?.length ? (
              <div className="flex items-center gap-1 ml-2">
                {teethFindings[hoveredTooth.number].findings.map((f) => (
                  <span
                    key={f}
                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${FINDINGS_CONFIG[f].badgeClass}`}
                  >
                    {FINDINGS_CONFIG[f].label}
                  </span>
                ))}
                {teethFindings[hoveredTooth.number].surfaces?.length ? (
                  <span className="px-1.5 py-0.5 bg-gray-200 text-gray-700 rounded text-[10px] font-bold">
                    Surfaces: {teethFindings[hoveredTooth.number].surfaces?.join(', ')}
                  </span>
                ) : null}
              </div>
            ) : (
              <span className="text-emerald-600 font-medium ml-2">Sound / Healthy</span>
            )}
          </div>
        ) : (
          <p className="text-gray-400 italic">
            Hover over any tooth to view anatomical name & findings in {activeNotation.toUpperCase()} notation. Click tooth to edit condition.
          </p>
        )}
      </div>

      {/* Findings Legend */}
      <div className="pt-2 border-t border-gray-100">
        <p className="text-xs font-semibold text-gray-600 mb-2">Findings Legend:</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 text-[11px]">
          {Object.entries(FINDINGS_CONFIG).map(([key, cfg]) => (
            <div
              key={key}
              className="flex items-center gap-1.5 p-1.5 rounded-lg border bg-white shadow-xs"
              style={{ borderColor: cfg.borderColor }}
            >
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: cfg.color }}
              />
              <span className="font-medium text-gray-700 truncate">{cfg.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tooth Details & Condition Modal */}
      {selectedTooth && (
        <ToothDetailModal
          tooth={selectedTooth}
          condition={getCondition(selectedTooth.number)}
          notation={activeNotation}
          onClose={() => setSelectedTooth(null)}
          onSave={(cond) => {
            handleSaveToothCondition(selectedTooth.number, cond);
            setSelectedTooth(null);
          }}
          onQuickTreatment={(suggested) => {
            if (onQuickTreatment) {
              onQuickTreatment(selectedTooth.number, selectedTooth.name, suggested);
            }
          }}
        />
      )}
    </div>
  );
}

// ─── INDIVIDUAL TOOTH COMPONENT ───────────────────────────────────────
function ToothItem({
  tooth,
  condition,
  onClick,
  onHover,
  readOnly,
  notation = 'fdi',
}: {
  tooth: ToothInfo;
  condition?: ToothCondition;
  onClick: () => void;
  onHover: (t: ToothInfo | null) => void;
  readOnly?: boolean;
  notation?: ToothNotation;
}) {
  const findings = condition?.findings || [];
  const hasCaries = findings.includes('caries');
  const hasFilling = findings.includes('filling');
  const hasRCT = findings.includes('rct');
  const hasCrown = findings.includes('crown');
  const hasExtraction = findings.includes('extraction');
  const hasImplant = findings.includes('implant');
  const isMissing = findings.includes('missing');

  // Dominant color theme for tooth
  let toothBg = '#ffffff';
  let toothBorder = '#cbd5e1';
  let badgeColor = '#64748b';

  if (isMissing) {
    toothBg = '#f1f5f9';
    toothBorder = '#94a3b8';
    badgeColor = '#94a3b8';
  } else if (hasExtraction) {
    toothBg = '#ffe4e6';
    toothBorder = '#f43f5e';
    badgeColor = '#e11d48';
  } else if (hasImplant) {
    toothBg = '#ecfeff';
    toothBorder = '#06b6d4';
    badgeColor = '#0891b2';
  } else if (hasCrown) {
    toothBg = '#fef3c7';
    toothBorder = '#f59e0b';
    badgeColor = '#d97706';
  } else if (hasRCT) {
    toothBg = '#f3e8ff';
    toothBorder = '#a855f7';
    badgeColor = '#9333ea';
  } else if (hasCaries) {
    toothBg = '#fee2e2';
    toothBorder = '#ef4444';
    badgeColor = '#dc2626';
  } else if (hasFilling) {
    toothBg = '#e0f2fe';
    toothBorder = '#38bdf8';
    badgeColor = '#0284c7';
  }

  const displayNumber =
    notation === 'universal'
      ? FDI_TO_UNIVERSAL_MAP[tooth.number] ?? tooth.number
      : tooth.number;

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => onHover(tooth)}
      onMouseLeave={() => onHover(null)}
      disabled={readOnly}
      className={`group relative flex flex-col items-center justify-between w-9 sm:w-10 h-16 rounded-xl border transition-all select-none ${
        readOnly ? 'cursor-default' : 'cursor-pointer hover:shadow-md hover:scale-105 active:scale-95'
      }`}
      style={{
        backgroundColor: toothBg,
        borderColor: toothBorder,
        borderStyle: isMissing ? 'dashed' : 'solid',
        borderWidth: findings.length > 0 ? '2px' : '1px',
      }}
    >
      {/* Notation Tooth Number Badge */}
      <span
        className="text-[11px] font-bold px-1 rounded-t-lg w-full text-center mt-0.5 tracking-tight"
        style={{ color: badgeColor }}
        title={`${tooth.name} (${notation === 'universal' ? `Universal #${displayNumber}` : `FDI #${displayNumber}`})`}
      >
        {displayNumber}
      </span>

      {/* Anatomical Tooth SVG / Representation */}
      <div className="w-6 h-7 flex items-center justify-center relative">
        {isMissing ? (
          <span className="text-xs font-black text-gray-400">✕</span>
        ) : hasExtraction ? (
          <span className="text-xs font-black text-rose-600">EXT</span>
        ) : hasImplant ? (
          <div className="flex flex-col items-center justify-center">
            <span className="text-[10px] font-extrabold text-cyan-700">IMP</span>
            <div className="w-1.5 h-3 bg-cyan-600 rounded-sm" />
          </div>
        ) : (
          <svg viewBox="0 0 24 24" className="w-5 h-6 drop-shadow-xs">
            {/* Tooth Crown */}
            <path
              d={
                tooth.arch === 'Upper'
                  ? 'M5 18 C5 10, 7 4, 12 4 C17 4, 19 10, 19 18 C16 19, 14 18, 12 20 C10 18, 8 19, 5 18 Z'
                  : 'M5 6 C5 14, 7 20, 12 20 C17 20, 19 14, 19 6 C16 5, 14 6, 12 4 C10 6, 8 5, 5 6 Z'
              }
              fill={hasCrown ? '#fde047' : hasFilling ? '#93c5fd' : '#ffffff'}
              stroke={toothBorder}
              strokeWidth="1.5"
            />
            {/* Occlusal / Caries marker */}
            {hasCaries && (
              <circle cx="12" cy={tooth.arch === 'Upper' ? '12' : '12'} r="3" fill="#dc2626" />
            )}
            {/* RCT Canal Marker */}
            {hasRCT && (
              <line
                x1="12"
                y1={tooth.arch === 'Upper' ? '4' : '6'}
                x2="12"
                y2={tooth.arch === 'Upper' ? '18' : '18'}
                stroke="#9333ea"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            )}
          </svg>
        )}
      </div>

      {/* Surface/Condition small indicator dot */}
      <div className="flex items-center justify-center gap-0.5 mb-1 h-2">
        {findings.length === 0 ? (
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 opacity-60" />
        ) : (
          findings.slice(0, 3).map((f) => (
            <div
              key={f}
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: FINDINGS_CONFIG[f].color }}
            />
          ))
        )}
      </div>
    </button>
  );
}

// ─── TOOTH DETAIL & FINDINGS INSPECTOR MODAL ─────────────────────────
function ToothDetailModal({
  tooth,
  condition,
  notation = 'fdi',
  onClose,
  onSave,
  onQuickTreatment,
}: {
  tooth: ToothInfo;
  condition?: ToothCondition;
  notation?: ToothNotation;
  onClose: () => void;
  onSave: (cond: ToothCondition | null) => void;
  onQuickTreatment: (suggestedProcedure: string) => void;
}) {
  const [findings, setFindings] = useState<ToothFinding[]>(condition?.findings || []);
  const [surfaces, setSurfaces] = useState<ToothSurface[]>(condition?.surfaces || []);
  const [severity, setSeverity] = useState<'mild' | 'moderate' | 'severe'>(
    condition?.severity || 'moderate'
  );
  const [notes, setNotes] = useState(condition?.notes || '');

  function toggleFinding(f: ToothFinding) {
    if (f === 'sound') {
      setFindings(['sound']);
      setSurfaces([]);
      return;
    }
    const next = findings.filter((x) => x !== 'sound');
    if (next.includes(f)) {
      setFindings(next.filter((x) => x !== f));
    } else {
      setFindings([...next, f]);
    }
  }

  function toggleSurface(s: ToothSurface) {
    if (surfaces.includes(s)) {
      setSurfaces(surfaces.filter((x) => x !== s));
    } else {
      setSurfaces([...surfaces, s]);
    }
  }

  function handleSave() {
    if (findings.length === 0 && !notes.trim()) {
      onSave(null);
    } else {
      onSave({
        findings,
        surfaces: surfaces.length > 0 ? surfaces : undefined,
        severity,
        notes: notes.trim() || undefined,
      });
    }
  }

  function handleClear() {
    onSave(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-700 text-white font-bold text-base flex flex-col items-center justify-center shadow-xs">
              <span className="text-xs font-medium opacity-80 uppercase leading-none">
                {notation === 'universal' ? 'Univ' : 'FDI'}
              </span>
              <span className="text-sm font-black leading-tight">
                #{notation === 'universal' ? (FDI_TO_UNIVERSAL_MAP[tooth.number] ?? tooth.number) : tooth.number}
              </span>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 text-base leading-tight">
                {tooth.name}
              </h4>
              <p className="text-xs text-gray-500 mt-0.5">
                {notation === 'universal'
                  ? `Universal #${FDI_TO_UNIVERSAL_MAP[tooth.number]} (FDI #${tooth.number})`
                  : `FDI #${tooth.number} (Universal #${FDI_TO_UNIVERSAL_MAP[tooth.number] || 'N/A'})`} · {tooth.quadrant} Quadrant · {tooth.type} · {tooth.arch} Arch
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Findings Multi-Select */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Clinical Findings / Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(FINDINGS_CONFIG).map(([key, cfg]) => {
                const code = key as ToothFinding;
                const active = findings.includes(code);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleFinding(code)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium transition-all text-left ${
                      active
                        ? 'border-emerald-600 ring-2 ring-emerald-600/20 bg-emerald-50/50 text-emerald-900'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div
                        className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: cfg.color }}
                      />
                      <span className="truncate">{cfg.label}</span>
                    </div>
                    {active && <Check size={14} className="text-emerald-700 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tooth Surfaces Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Involved Tooth Surfaces
            </label>
            <div className="flex flex-wrap gap-2">
              {TOOTH_SURFACES.map((surf) => {
                const active = surfaces.includes(surf.code);
                return (
                  <button
                    key={surf.code}
                    type="button"
                    onClick={() => toggleSurface(surf.code)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      active
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {surf.code} — {surf.full}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Severity */}
          {findings.some((f) => ['caries', 'filling', 'rct'].includes(f)) && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Severity / Extent
              </label>
              <div className="flex items-center gap-2">
                {(['mild', 'moderate', 'severe'] as const).map((sev) => (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setSeverity(sev)}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-semibold capitalize border transition-all ${
                      severity === sev
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tooth Specific Clinical Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Specific Tooth Observation & Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g., Deep occlusal cavity, sensitivity to percussion, fracture line on mesial cusp..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 transition-all resize-none"
            />
          </div>

          {/* Quick Procedure Suggestion Shortcuts */}
          <div className="pt-2 border-t border-gray-100">
            <p className="text-[11px] font-semibold text-gray-500 mb-2 flex items-center gap-1">
              <Sparkles size={12} className="text-amber-500" />
              Quick Plan Procedure:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {findings.includes('caries') && (
                <button
                  type="button"
                  onClick={() => onQuickTreatment(`Composite Restoration (${getToothDisplayName(tooth.number, notation, false)})`)}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 font-medium"
                >
                  + Plan Composite Filling
                </button>
              )}
              {(findings.includes('caries') || findings.includes('rct')) && (
                <button
                  type="button"
                  onClick={() => onQuickTreatment(`Root Canal Treatment (${getToothDisplayName(tooth.number, notation, false)})`)}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 font-medium"
                >
                  + Plan RCT
                </button>
              )}
              {findings.includes('crown') || findings.includes('rct') ? (
                <button
                  type="button"
                  onClick={() => onQuickTreatment(`Ceramic/Zirconia Crown (${getToothDisplayName(tooth.number, notation, false)})`)}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 font-medium"
                >
                  + Plan Crown
                </button>
              ) : null}
              {findings.includes('extraction') && (
                <button
                  type="button"
                  onClick={() => onQuickTreatment(`Surgical Extraction (${getToothDisplayName(tooth.number, notation, false)})`)}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-medium"
                >
                  + Plan Extraction
                </button>
              )}
              {findings.includes('missing') && (
                <button
                  type="button"
                  onClick={() => onQuickTreatment(`Dental Implant Placement (${getToothDisplayName(tooth.number, notation, false)})`)}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-cyan-50 text-cyan-700 border border-cyan-200 hover:bg-cyan-100 font-medium"
                >
                  + Plan Implant
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1"
          >
            Clear Tooth
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-200/60 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-all shadow-xs"
            >
              Apply Findings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
