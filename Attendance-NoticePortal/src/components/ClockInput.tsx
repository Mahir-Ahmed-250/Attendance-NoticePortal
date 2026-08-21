import React, { useState, useRef, useEffect } from 'react';
import { Clock, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ClockInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  id?: string;
}

export default function ClockInput({ value, onChange, placeholder = "e.g. 09:00 AM", id }: ClockInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'hour' | 'minute'>('hour'); // Toggle between hour and minute view
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current value
  const parseTime = (timeStr: string) => {
    const trimmed = (timeStr || "").trim();
    if (!trimmed) {
      return { hour: "09", minute: "00", period: "AM" };
    }
    
    // 12-hour match: e.g. "09:30 AM" or "9:00 PM"
    const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match12) {
      const h = parseInt(match12[1], 10);
      const m = match12[2];
      const p = match12[3].toUpperCase();
      return {
        hour: String(h).padStart(2, '0'),
        minute: m,
        period: p
      };
    }

    // 24-hour match: e.g. "14:30" or "09:00"
    const match24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
    if (match24) {
      let h = parseInt(match24[1], 10);
      const m = match24[2];
      const p = h >= 12 ? "PM" : "AM";
      if (h > 12) h -= 12;
      if (h === 0) h = 12;
      return {
        hour: String(h).padStart(2, '0'),
        minute: m,
        period: p
      };
    }

    return { hour: "09", minute: "00", period: "AM" };
  };

  const { hour, minute, period } = parseTime(value);

  const updateTime = (newHour: string, newMinute: string, newPeriod: string) => {
    onChange(`${newHour}:${newMinute} ${newPeriod}`);
  };

  // Switch mode to minute after selecting hour for smooth flow
  const handleSelectHour = (h: string) => {
    updateTime(h, minute, period);
    setTimeout(() => {
      setMode('minute');
    }, 200); // short delay for visual feedback
  };

  const handleSelectMinute = (m: string) => {
    updateTime(hour, m, period);
  };

  // 12 Hour positions (1 to 12)
  const hourPositions = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  
  // Minute values corresponding to positions 12, 1, 2, 3... (multiples of 5)
  const minutePositions = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

  // Hand angle calculation
  const getHandRotation = () => {
    if (mode === 'hour') {
      const h = parseInt(hour, 10);
      return (h % 12) * 30; // 360 / 12 = 30 deg per hour
    } else {
      const m = parseInt(minute, 10);
      return m * 6; // 360 / 60 = 6 deg per minute
    }
  };

  return (
    <div className="relative inline-block w-full text-slate-800" ref={containerRef} id={id}>
      {/* Visual Input Trigger */}
      <div 
        onClick={() => {
          setIsOpen(!isOpen);
          setMode('hour'); // Default to hours on open
        }}
        className="w-full flex items-center justify-between px-3.5 py-2.5 border border-slate-200 hover:border-slate-300 rounded-xl text-xs bg-white font-mono cursor-pointer transition-all shadow-2xs hover:shadow-xs active:scale-[0.99]"
      >
        <div className="flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-indigo-500 shrink-0" />
          <span className="text-slate-700 font-extrabold text-sm tracking-wide">
            {value || placeholder}
          </span>
        </div>
        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }} />
      </div>

      {/* Centered Responsive Modal with Blur Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
            {/* Dark blur backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
              onClick={() => setIsOpen(false)}
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative w-full max-w-[320px] bg-white border border-slate-200 rounded-3xl shadow-2xl p-5 overflow-hidden z-10"
            >
              {/* Header: Visual Time Display */}
              <div className="flex flex-col items-center gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Round Clock
                  </span>
                  
                  {/* AM/PM Pill Toggle */}
                  <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/60">
                    <button
                      type="button"
                      onClick={() => updateTime(hour, minute, "AM")}
                      className={`px-2.5 py-1 text-[10px] font-black rounded-md transition-all ${
                        period === "AM" 
                          ? "bg-white text-indigo-600 shadow-xs" 
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      AM
                    </button>
                    <button
                      type="button"
                      onClick={() => updateTime(hour, minute, "PM")}
                      className={`px-2.5 py-1 text-[10px] font-black rounded-md transition-all ${
                        period === "PM" 
                          ? "bg-white text-indigo-600 shadow-xs" 
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      PM
                    </button>
                  </div>
                </div>

                {/* Jumbo Digital Clock Selector */}
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-2xl w-full justify-center">
                  <button
                    type="button"
                    onClick={() => setMode('hour')}
                    className={`text-2xl font-black font-mono transition-all px-2.5 py-0.5 rounded-lg ${
                      mode === 'hour' 
                        ? "text-indigo-600 bg-indigo-50/80 scale-105" 
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    {hour}
                  </button>
                  <span className="text-2xl font-black text-slate-300 animate-pulse">:</span>
                  <button
                    type="button"
                    onClick={() => setMode('minute')}
                    className={`text-2xl font-black font-mono transition-all px-2.5 py-0.5 rounded-lg ${
                      mode === 'minute' 
                        ? "text-indigo-600 bg-indigo-50/80 scale-105" 
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    {minute}
                  </button>
                  <span className="text-sm font-extrabold text-slate-500 ml-2 uppercase font-mono">{period}</span>
                </div>
              </div>

              {/* Selector Labels */}
              <div className="flex justify-center gap-4 py-2">
                <button
                  type="button"
                  onClick={() => setMode('hour')}
                  className={`text-xs font-bold transition-all px-3 py-1 rounded-full ${
                    mode === 'hour' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  Hours
                </button>
                <button
                  type="button"
                  onClick={() => setMode('minute')}
                  className={`text-xs font-bold transition-all px-3 py-1 rounded-full ${
                    mode === 'minute' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  Minutes
                </button>
              </div>

              {/* Interactive Analog Dial */}
              <div className="flex justify-center items-center py-3 relative">
                <div className="relative w-44 h-44 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center shadow-inner">
                  {/* Inner decorative clock face circle */}
                  <div className="absolute inset-2.5 rounded-full border border-dashed border-slate-200/50" />
                  
                  {/* Clock Center Pin */}
                  <div className="absolute w-2.5 h-2.5 bg-indigo-600 rounded-full z-20 shadow-xs" />

                  {/* Clock Hand line */}
                  <motion.div
                    className="absolute bottom-1/2 left-1/2 w-0.5 origin-bottom bg-indigo-500 z-10"
                    style={{
                      height: '38%',
                      transformOrigin: 'bottom center',
                      x: '-50%',
                    }}
                    animate={{ rotate: getHandRotation() }}
                    transition={{ type: "spring", stiffness: 120, damping: 15 }}
                  >
                    {/* Dial Pointer head */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-indigo-600 border-2 border-white shadow-md flex items-center justify-center" />
                  </motion.div>

                  {/* Hour / Minute Numbers layout */}
                  {mode === 'hour' ? (
                    // Hours 1 to 12
                    hourPositions.map((h) => {
                      // Position calculations
                      const displayHour = String(h).padStart(2, '0');
                      const isActive = hour === displayHour;
                      // Clock angle: 12 is at 0 deg, 1 is 30 deg, 2 is 60 deg, etc.
                      const angleRad = (h * 30 * Math.PI) / 180;
                      const left = `${50 + Math.sin(angleRad) * 36}%`;
                      const top = `${50 - Math.cos(angleRad) * 36}%`;

                      return (
                        <button
                          key={`hour-${h}`}
                          type="button"
                          onClick={() => handleSelectHour(displayHour)}
                          style={{ left, top }}
                          className={`absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full text-xs font-black font-mono flex items-center justify-center transition-all duration-150 z-20 ${
                            isActive 
                              ? 'text-white scale-110' 
                              : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:scale-105'
                          }`}
                        >
                          {h}
                        </button>
                      );
                    })
                  ) : (
                    // Minutes (00 to 55 in multiples of 5)
                    minutePositions.map((m, index) => {
                      const isActive = minute === m;
                      // angle corresponding to positions 12, 1, 2, 3...
                      const angleRad = (index * 30 * Math.PI) / 180;
                      const left = `${50 + Math.sin(angleRad) * 36}%`;
                      const top = `${50 - Math.cos(angleRad) * 36}%`;

                      return (
                        <button
                          key={`minute-${m}`}
                          type="button"
                          onClick={() => handleSelectMinute(m)}
                          style={{ left, top }}
                          className={`absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full text-[11px] font-black font-mono flex items-center justify-center transition-all duration-150 z-20 ${
                            isActive 
                              ? 'text-white scale-110' 
                              : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:scale-105'
                          }`}
                        >
                          {m}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Fine tuning minute adjuster */}
              <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl mb-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fine Tune Minute</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      let currentMin = parseInt(minute, 10);
                      currentMin = (currentMin - 1 + 60) % 60;
                      handleSelectMinute(String(currentMin).padStart(2, '0'));
                    }}
                    className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:border-slate-300 active:bg-slate-50 flex items-center justify-center font-black font-mono text-slate-600 transition-all text-xs shadow-3xs"
                  >
                    -1
                  </button>
                  <span className="text-xs font-bold text-indigo-600 font-mono w-5 text-center">{minute}m</span>
                  <button
                    type="button"
                    onClick={() => {
                      let currentMin = parseInt(minute, 10);
                      currentMin = (currentMin + 1) % 60;
                      handleSelectMinute(String(currentMin).padStart(2, '0'));
                    }}
                    className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:border-slate-300 active:bg-slate-50 flex items-center justify-center font-black font-mono text-slate-600 transition-all text-xs shadow-3xs"
                  >
                    +1
                  </button>
                </div>
              </div>

              {/* Done Button */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-full mt-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/10 active:scale-[0.98]"
              >
                <Check className="w-4 h-4" /> Done
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
