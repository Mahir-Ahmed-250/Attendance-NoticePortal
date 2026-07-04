export function calculateWorkingHours(
  checkIn?: string,
  checkOut?: string,
): number | null {
  if (!checkIn || !checkOut || checkIn === "-" || checkOut === "-") return null;

  const parseTimeToMinutes = (timeStr: string): number | null => {
    const clean = timeStr.trim();
    const ampmMatch = clean.match(/^(\d+):(\d+)(?::\d+)?\s*(AM|PM)$/i);
    if (ampmMatch) {
      let hr = parseInt(ampmMatch[1], 10);
      const min = parseInt(ampmMatch[2], 10);
      const ampm = ampmMatch[3].toUpperCase();
      if (ampm === "PM" && hr < 12) hr += 12;
      if (ampm === "AM" && hr === 12) hr = 0;
      return hr * 60 + min;
    }
    const hhmmMatch = clean.match(/^(\d+):(\d+)(?::\d+)?$/);
    if (hhmmMatch) {
      const hr = parseInt(hhmmMatch[1], 10);
      const min = parseInt(hhmmMatch[2], 10);
      return hr * 60 + min;
    }
    return null;
  };

  const start = parseTimeToMinutes(checkIn);
  const end = parseTimeToMinutes(checkOut);

  if (start === null || end === null) return null;

  let diff = end - start;
  if (diff < 0) {
    // Over midnight
    diff += 24 * 60;
  }
  return diff / 60;
}

export function getEffectiveStatus(record: any): string {
    const hasIn = record.checkInTime && record.checkInTime !== "-" && record.checkInTime.trim() !== "";
    const hasOut = record.checkOutTime && record.checkOutTime !== "-" && record.checkOutTime.trim() !== "";
    
    // Ignore "Daily allowance" as a status from absentOrLeave
    const rawAbsentOrLeave = record.absentOrLeave || "";
    const isDailyAllowance = rawAbsentOrLeave.toLowerCase().includes("daily allowance");
    const cleanAbsentOrLeave = isDailyAllowance ? "" : rawAbsentOrLeave.trim();

    // 1. WEEKEND/Holiday or normal day with IN but NO OUT -> Finger Punch Missing
    if (hasIn && !hasOut) {
      return "Finger Punch Missing";
    }

    // 2. Absent/Leave -> absentOrLeave column != "-" (excluding Daily allowance)
    if (cleanAbsentOrLeave && cleanAbsentOrLeave !== "-" && cleanAbsentOrLeave !== "") {
      return cleanAbsentOrLeave;
    }

    // 3. If no InTime and no OutTime -> Absent
    if (!hasIn && !hasOut) {
      return "Absent";
    }

    // 4. W.Hour < 10hrs -> < 10hrs
    let hours = calculateWorkingHours(record.checkInTime, record.checkOutTime);
    
    if (hours === null && record.workingHour && record.workingHour !== "-" && record.workingHour.trim() !== "") {
       // Try parsing "8h 30m" or "08:30"
       const hMatch = record.workingHour.match(/(\d+)h/);
       if (hMatch) {
         hours = parseInt(hMatch[1]);
       } else {
         const hhmmMatch = record.workingHour.match(/^(\d+):(\d+)/);
         if (hhmmMatch) {
           hours = parseInt(hhmmMatch[1]) + parseInt(hhmmMatch[2]) / 60;
         }
       }
    }

    if (hours !== null && hours < 6) {
       return "< 6hrs";
    }

    const isLate = record.lateEntry && record.lateEntry !== "-" && record.lateEntry !== "0" && record.lateEntry.trim() !== "";
    const isEarly = record.earlyLeave && record.earlyLeave !== "-" && record.earlyLeave !== "0" && record.earlyLeave.trim() !== "";

    if ((isLate || isEarly) && hours !== null && hours < 10) {
       return "< 10hrs";
    }

    // 5. If lateEntry column has minutes -> Late Entry
    if (isLate) {
      return "Late Entry";
    }

    // 6. If earlyLeave column has minutes -> Early Leave
    if (isEarly) {
      return "Early Leave";
    }

    return record.status || "Present";
}

export const formatDateLong = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = d.getDate();
      const year = d.getFullYear();
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      return `${day} ${monthNames[d.getMonth()]} ${year}`;
    } catch {
      return dateStr;
    }
  }
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  return `${day} ${monthNames[monthIdx]} ${year}`;
};
