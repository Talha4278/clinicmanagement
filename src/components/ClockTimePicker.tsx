import React, { useState, useEffect } from 'react';

interface ClockTimePickerProps {
  value: string; // "HH:mm" 24-hour format, e.g. "14:30" or "09:00"
  onChange: (time: string) => void;
  className?: string;
  disabled?: boolean;
}

export const ClockTimePicker: React.FC<ClockTimePickerProps> = ({
  value,
  onChange,
  className = '',
  disabled = false,
}) => {
  // Parse incoming 24h "HH:mm" time string into 12h parts
  const parse24To12 = (val: string) => {
    const parts = (val || '10:00').split(':');
    let h24 = parseInt(parts[0], 10);
    let m = parseInt(parts[1], 10);
    if (isNaN(h24) || h24 < 0 || h24 > 23) h24 = 10;
    if (isNaN(m) || m < 0 || m > 59) m = 0;

    const period: 'AM' | 'PM' = h24 >= 12 ? 'PM' : 'AM';
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;

    return {
      h12Str: String(h12),
      mStr: String(m).padStart(2, '0'),
      period,
      h24,
      m,
    };
  };

  const initial = parse24To12(value);
  const [hourInput, setHourInput] = useState<string>(initial.h12Str);
  const [minuteInput, setMinuteInput] = useState<string>(initial.mStr);
  const [period, setPeriod] = useState<'AM' | 'PM'>(initial.period);

  // Sync internal state when external `value` prop changes
  useEffect(() => {
    const parsed = parse24To12(value);
    setHourInput(parsed.h12Str);
    setMinuteInput(parsed.mStr);
    setPeriod(parsed.period);
  }, [value]);

  // Compute 24h string from 12h components and trigger onChange
  const emitChange = (h12Val: number, mVal: number, pVal: 'AM' | 'PM') => {
    let h24: number;
    if (pVal === 'PM') {
      h24 = h12Val === 12 ? 12 : h12Val + 12;
    } else {
      h24 = h12Val === 12 ? 0 : h12Val;
    }
    const hStr = String(h24).padStart(2, '0');
    const mStr = String(mVal).padStart(2, '0');
    onChange(`${hStr}:${mStr}`);
  };

  // Hour manual change
  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (raw === '') {
      setHourInput('');
      return;
    }

    let num = parseInt(raw, 10);
    let nextPeriod = period;

    // Smart 24h auto-detect: if user types e.g. 14, convert to 2 PM
    if (num > 12 && num <= 23) {
      nextPeriod = 'PM';
      num = num - 12;
      setPeriod('PM');
    } else if (num > 12) {
      num = 12;
    }

    setHourInput(String(num));

    const currentM = parseInt(minuteInput, 10) || 0;
    emitChange(num === 0 ? 12 : num, currentM, nextPeriod);
  };

  const handleHourBlur = () => {
    let num = parseInt(hourInput, 10);
    if (isNaN(num) || num <= 0) {
      num = 10;
    } else if (num > 12) {
      num = 12;
    }
    setHourInput(String(num));
    const currentM = parseInt(minuteInput, 10) || 0;
    emitChange(num, currentM, period);
  };

  // Minute manual change
  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (raw === '') {
      setMinuteInput('');
      return;
    }

    let num = parseInt(raw, 10);
    if (num > 59) num = 59;

    setMinuteInput(raw.length > 2 ? String(num).padStart(2, '0') : raw);

    const currentH12 = parseInt(hourInput, 10) || 10;
    emitChange(currentH12, num, period);
  };

  const handleMinuteBlur = () => {
    let num = parseInt(minuteInput, 10);
    if (isNaN(num) || num < 0) {
      num = 0;
    } else if (num > 59) {
      num = 59;
    }
    const formatted = String(num).padStart(2, '0');
    setMinuteInput(formatted);
    const currentH12 = parseInt(hourInput, 10) || 10;
    emitChange(currentH12, num, period);
  };

  // Toggle AM / PM
  const handlePeriodToggle = (newPeriod: 'AM' | 'PM') => {
    if (disabled || period === newPeriod) return;
    setPeriod(newPeriod);
    const currentH12 = parseInt(hourInput, 10) || 10;
    const currentM = parseInt(minuteInput, 10) || 0;
    emitChange(currentH12, currentM, newPeriod);
  };

  return (
    <div className={`p-3 rounded-2xl bg-slate-50/80 border border-gray-200/90 ${className}`}>
      {/* Manual Hour, Minute, and AM/PM Row */}
      <div className="flex items-center gap-2">
        {/* Hour Input Box */}
        <div className="flex-1">
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 text-center">
            Hour (1-12)
          </label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              disabled={disabled}
              placeholder="10"
              maxLength={2}
              value={hourInput}
              onChange={handleHourChange}
              onBlur={handleHourBlur}
              className="w-full text-center text-lg font-bold text-gray-900 py-2 px-1 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 bg-white transition-all shadow-2xs"
            />
          </div>
        </div>

        {/* Colon Separator */}
        <div className="text-xl font-bold text-gray-400 pt-4 select-none">:</div>

        {/* Minute Input Box */}
        <div className="flex-1">
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 text-center">
            Minute (00-59)
          </label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              disabled={disabled}
              placeholder="00"
              maxLength={2}
              value={minuteInput}
              onChange={handleMinuteChange}
              onBlur={handleMinuteBlur}
              className="w-full text-center text-lg font-bold text-gray-900 py-2 px-1 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 bg-white transition-all shadow-2xs"
            />
          </div>
        </div>

        {/* AM / PM Segmented Switcher */}
        <div className="pt-4 flex-shrink-0">
          <div className="flex p-0.5 bg-gray-200 rounded-xl border border-gray-300">
            <button
              type="button"
              disabled={disabled}
              onClick={() => handlePeriodToggle('AM')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all ${
                period === 'AM'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              AM
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => handlePeriodToggle('PM')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all ${
                period === 'PM'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              PM
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClockTimePicker;
