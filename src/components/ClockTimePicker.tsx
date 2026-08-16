import React, { useState, useRef, useEffect } from 'react';
import { Clock, ChevronDown, Check } from 'lucide-react';

interface ClockTimePickerProps {
  value: string; // e.g. "14:30" or "09:00"
  onChange: (time: string) => void;
  className?: string;
  disabled?: boolean;
}

const PRESET_TIMES = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '14:00', '14:30', '15:00',
  '15:30', '16:00', '16:30', '17:00', '17:30', '18:00',
];

const OUTER_HOURS = [
  { val: '12', label: '12', num: 12 },
  { val: '01', label: '1', num: 1 },
  { val: '02', label: '2', num: 2 },
  { val: '03', label: '3', num: 3 },
  { val: '04', label: '4', num: 4 },
  { val: '05', label: '5', num: 5 },
  { val: '06', label: '6', num: 6 },
  { val: '07', label: '7', num: 7 },
  { val: '08', label: '8', num: 8 },
  { val: '09', label: '9', num: 9 },
  { val: '10', label: '10', num: 10 },
  { val: '11', label: '11', num: 11 },
];

const INNER_HOURS = [
  { val: '00', label: '00', num: 12 },
  { val: '13', label: '13', num: 1 },
  { val: '14', label: '14', num: 2 },
  { val: '15', label: '15', num: 3 },
  { val: '16', label: '16', num: 4 },
  { val: '17', label: '17', num: 5 },
  { val: '18', label: '18', num: 6 },
  { val: '19', label: '19', num: 7 },
  { val: '20', label: '20', num: 8 },
  { val: '21', label: '21', num: 9 },
  { val: '22', label: '22', num: 10 },
  { val: '23', label: '23', num: 11 },
];

const MINUTE_MARKS = [
  { val: '00', label: '00', num: 0 },
  { val: '05', label: '05', num: 5 },
  { val: '10', label: '10', num: 10 },
  { val: '15', label: '15', num: 15 },
  { val: '20', label: '20', num: 20 },
  { val: '25', label: '25', num: 25 },
  { val: '30', label: '30', num: 30 },
  { val: '35', label: '35', num: 35 },
  { val: '40', label: '40', num: 40 },
  { val: '45', label: '45', num: 45 },
  { val: '50', label: '50', num: 50 },
  { val: '55', label: '55', num: 55 },
];

export const ClockTimePicker: React.FC<ClockTimePickerProps> = ({
  value,
  onChange,
  className = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'hours' | 'minutes'>('hours');
  
  // Helper to parse time string
  const parseTime = (val: string) => {
    const parts = (val || '09:00').split(':');
    let h = parseInt(parts[0], 10);
    let m = parseInt(parts[1], 10);
    if (isNaN(h) || h < 0 || h > 23) h = 9;
    if (isNaN(m) || m < 0 || m > 59) m = 0;
    return {
      hStr: String(h).padStart(2, '0'),
      mStr: String(m).padStart(2, '0'),
    };
  };

  const { hStr, mStr } = parseTime(value);
  const [selectedHour, setSelectedHour] = useState(hStr);
  const [selectedMinute, setSelectedMinute] = useState(mStr);
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const clockRef = useRef<HTMLDivElement>(null);

  // Sync state whenever prop value or popup open state changes
  useEffect(() => {
    const parsed = parseTime(value);
    setSelectedHour(parsed.hStr);
    setSelectedMinute(parsed.mStr);
  }, [value, isOpen]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const updateTime = (hVal: string, mVal: string) => {
    setSelectedHour(hVal);
    setSelectedMinute(mVal);
    onChange(`${hVal}:${mVal}`);
  };

  const handleHourSelect = (hVal: string) => {
    updateTime(hVal, selectedMinute);
    // Switch to minutes selection automatically
    setMode('minutes');
  };

  const handleMinuteSelect = (mVal: string) => {
    updateTime(selectedHour, mVal);
  };

  const handlePresetSelect = (time: string) => {
    const parts = time.split(':');
    setSelectedHour(parts[0]);
    setSelectedMinute(parts[1]);
    onChange(time);
    setIsOpen(false);
  };

  // Radial touch/drag calculation on clock face dial
  const handleClockFaceInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    if (!clockRef.current) return;
    const rect = clockRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    let rad = Math.atan2(dy, dx);
    let deg = (rad * 180) / Math.PI + 90;
    if (deg < 0) deg += 360;

    if (mode === 'hours') {
      let step = Math.round(deg / 30) % 12;
      let num = step === 0 ? 12 : step;

      let chosenHour = '';
      if (dist < 62) {
        // Inner ring (13..23, 00)
        chosenHour = num === 12 ? '00' : String(num + 12).padStart(2, '0');
      } else {
        // Outer ring (01..12)
        chosenHour = String(num).padStart(2, '0');
      }
      handleHourSelect(chosenHour);
    } else {
      let m = Math.round(deg / 6) % 60;
      let chosenMinute = String(m).padStart(2, '0');
      handleMinuteSelect(chosenMinute);
    }
  };

  // Compact dimensions for fitting inside modal (200x200 clock face box)
  const CENTER = 100;
  const R_OUTER = 76;
  const R_INNER = 48;
  const R_MINUTES = 74;

  const getPosition = (indexNum: number, radius: number) => {
    const angleDeg = (indexNum * 30) - 90;
    const angleRad = (angleDeg * Math.PI) / 180;
    const x = CENTER + radius * Math.cos(angleRad);
    const y = CENTER + radius * Math.sin(angleRad);
    return { x, y, angleDeg };
  };

  const getMinutePosition = (minuteNum: number, radius: number) => {
    const angleDeg = (minuteNum * 6) - 90;
    const angleRad = (angleDeg * Math.PI) / 180;
    const x = CENTER + radius * Math.cos(angleRad);
    const y = CENTER + radius * Math.sin(angleRad);
    return { x, y, angleDeg };
  };

  // Calculate pointer hand coordinates
  let pointerTargetX = CENTER;
  let pointerTargetY = CENTER - R_OUTER;

  if (mode === 'hours') {
    const hourInt = parseInt(selectedHour, 10);
    if (hourInt === 0 || (hourInt >= 13 && hourInt <= 23)) {
      const num = hourInt === 0 ? 12 : hourInt - 12;
      const pos = getPosition(num, R_INNER);
      pointerTargetX = pos.x;
      pointerTargetY = pos.y;
    } else {
      const num = hourInt;
      const pos = getPosition(num, R_OUTER);
      pointerTargetX = pos.x;
      pointerTargetY = pos.y;
    }
  } else {
    const minInt = parseInt(selectedMinute, 10);
    const pos = getMinutePosition(minInt, R_MINUTES);
    pointerTargetX = pos.x;
    pointerTargetY = pos.y;
  }

  return (
    <div ref={containerRef} className={`relative inline-block w-full ${className}`}>
      {/* Input Trigger Field - Clean White theme */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border bg-white text-gray-800 text-sm font-medium hover:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600/20 transition-all ${
          isOpen ? 'ring-2 ring-green-600/20 border-green-600' : 'border-gray-200'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-green-50 text-green-700 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
          <span className="font-semibold text-gray-900 text-base tracking-wide">
            {selectedHour}:{selectedMinute}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-md bg-green-50 text-green-700 border border-green-200 font-medium">
            24h
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-green-700' : ''}`} />
      </button>

      {/* Popover Clock Modal - Clean White Theme, Compact Size */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 left-0 sm:left-auto right-0 sm:right-auto sm:w-[260px] bg-white text-gray-900 rounded-2xl shadow-xl border border-gray-200 p-3 animate-in fade-in zoom-in-95 duration-150">
          
          {/* Header Display: White/Light theme */}
          <div className="bg-gray-50 rounded-xl p-2.5 mb-3 flex items-center justify-between border border-gray-200">
            <div className="flex items-center gap-1">
              {/* Hour Button */}
              <button
                type="button"
                onClick={() => setMode('hours')}
                className={`px-2.5 py-1 rounded-lg text-xl font-bold transition-all ${
                  mode === 'hours'
                    ? 'bg-green-700 text-white shadow-sm'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {selectedHour}
              </button>
              <span className="text-xl font-bold text-gray-400 animate-pulse">:</span>
              {/* Minute Button */}
              <button
                type="button"
                onClick={() => setMode('minutes')}
                className={`px-2.5 py-1 rounded-lg text-xl font-bold transition-all ${
                  mode === 'minutes'
                    ? 'bg-green-700 text-white shadow-sm'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {selectedMinute}
              </button>
            </div>

            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200">
                24h Clock
              </span>
              <span className="text-[10px] text-gray-500 mt-0.5 capitalize font-medium">
                Set {mode}
              </span>
            </div>
          </div>

          {/* Clock Face Area: Compact 200x200 px White Background */}
          <div className="flex justify-center my-1">
            <div
              ref={clockRef}
              onMouseDown={(e) => {
                // Only trigger drag if clicked on background svg/face
                if ((e.target as HTMLElement).tagName !== 'BUTTON') {
                  setIsDragging(true);
                  handleClockFaceInteraction(e);
                }
              }}
              onMouseMove={(e) => {
                if (isDragging) handleClockFaceInteraction(e);
              }}
              onMouseUp={() => setIsDragging(false)}
              onTouchStart={(e) => {
                if ((e.target as HTMLElement).tagName !== 'BUTTON') {
                  handleClockFaceInteraction(e);
                }
              }}
              onTouchMove={(e) => handleClockFaceInteraction(e)}
              className="relative w-[200px] h-[200px] bg-gray-50 rounded-full border border-gray-200 shadow-inner select-none cursor-pointer touch-none"
            >
              {/* SVG overlay for pointer hand */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                {/* Pointer Line */}
                <line
                  x1={CENTER}
                  y1={CENTER}
                  x2={pointerTargetX}
                  y2={pointerTargetY}
                  stroke="#15803d"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                {/* Center Pivot Node */}
                <circle cx={CENTER} cy={CENTER} r="3.5" fill="#15803d" />
                {/* Selection Circle Highlight */}
                <circle
                  cx={pointerTargetX}
                  cy={pointerTargetY}
                  r="14"
                  fill="#15803d"
                  fillOpacity="0.2"
                  stroke="#15803d"
                  strokeWidth="1.5"
                />
              </svg>

              {/* Hours Dial Mode */}
              {mode === 'hours' && (
                <>
                  {/* Outer Hours Ring (01 to 12) */}
                  {OUTER_HOURS.map((item) => {
                    const pos = getPosition(item.num, R_OUTER);
                    const isSelected = selectedHour === item.val;
                    return (
                      <button
                        key={`outer-${item.val}`}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleHourSelect(item.val);
                        }}
                        style={{
                          left: `${pos.x}px`,
                          top: `${pos.y}px`,
                          transform: 'translate(-50%, -50%)',
                        }}
                        className={`absolute z-20 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold transition-all ${
                          isSelected
                            ? 'bg-green-700 text-white font-bold scale-110 shadow-sm'
                            : 'text-gray-700 hover:bg-green-100 hover:text-green-800'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}

                  {/* Inner Hours Ring (13 to 23, 00) */}
                  {INNER_HOURS.map((item) => {
                    const pos = getPosition(item.num, R_INNER);
                    const isSelected = selectedHour === item.val;
                    return (
                      <button
                        key={`inner-${item.val}`}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleHourSelect(item.val);
                        }}
                        style={{
                          left: `${pos.x}px`,
                          top: `${pos.y}px`,
                          transform: 'translate(-50%, -50%)',
                        }}
                        className={`absolute z-20 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium transition-all ${
                          isSelected
                            ? 'bg-green-700 text-white font-bold scale-110 shadow-sm'
                            : 'text-gray-500 hover:bg-green-100 hover:text-green-800'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </>
              )}

              {/* Minutes Dial Mode */}
              {mode === 'minutes' && (
                <>
                  {MINUTE_MARKS.map((item) => {
                    const pos = getMinutePosition(item.num, R_MINUTES);
                    const isSelected = selectedMinute === item.val;
                    return (
                      <button
                        key={`min-${item.val}`}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMinuteSelect(item.val);
                        }}
                        style={{
                          left: `${pos.x}px`,
                          top: `${pos.y}px`,
                          transform: 'translate(-50%, -50%)',
                        }}
                        className={`absolute z-20 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold transition-all ${
                          isSelected
                            ? 'bg-green-700 text-white font-bold scale-110 shadow-sm'
                            : 'text-gray-700 hover:bg-green-100 hover:text-green-800'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          </div>

          {/* Quick Presets Section */}
          <div className="mt-2.5 pt-2 border-t border-gray-100">
            <span className="text-[10px] font-medium text-gray-500 block mb-1 tracking-wider uppercase">
              Quick Time Slots
            </span>
            <div className="grid grid-cols-6 gap-1 max-h-20 overflow-y-auto pr-0.5 custom-scrollbar">
              {PRESET_TIMES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handlePresetSelect(t)}
                  className={`py-0.5 text-[10px] rounded font-mono font-medium transition-all ${
                    value === t
                      ? 'bg-green-700 text-white font-bold'
                      : 'bg-gray-100 text-gray-700 hover:bg-green-50 hover:text-green-800 border border-gray-200/60'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Action Footer */}
          <div className="mt-2 flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-gray-500">Time:</span>
              <span className="text-[11px] font-mono font-bold text-green-700">
                {selectedHour}:{selectedMinute}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1 rounded-lg text-xs font-semibold bg-green-700 text-white hover:bg-green-800 shadow-sm transition-all flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClockTimePicker;
