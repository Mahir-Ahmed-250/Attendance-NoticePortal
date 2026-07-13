export function parseTimeToMinutes(timeStr: string): number | null {
  if (!timeStr) return null;
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
}

export function calculateWorkingHours(
  checkIn?: string,
  checkOut?: string,
): number | null {
  if (!checkIn || !checkOut || checkIn === "-" || checkOut === "-") return null;

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

export function getEffectiveStatus(record: any, dateStr?: string): string {
    const hasIn = record.checkInTime && record.checkInTime !== "-" && record.checkInTime.trim() !== "";
    const hasOut = record.checkOutTime && record.checkOutTime !== "-" && record.checkOutTime.trim() !== "";
    
    let isFriday = false;
    if (dateStr) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const parsedDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        isFriday = parsedDate.getDay() === 5;
      } else {
        const parsedDate = new Date(dateStr);
        isFriday = parsedDate.getDay() === 5;
      }
    }

    // 1. If there's exactly one punch (either checkIn but no checkOut, or checkOut but no checkIn),
    // then it's a Finger Punch Missing, even on weekends/holidays.
    if ((hasIn && !hasOut) || (!hasIn && hasOut)) {
      return "Finger Punch Missing";
    }

    // Ignore "Daily allowance" as a status from absentOrLeave
    const rawAbsentOrLeave = record.absentOrLeave || "";
    const isDailyAllowance = rawAbsentOrLeave.toLowerCase().includes("daily allowance");
    const cleanAbsentOrLeave = isDailyAllowance ? "" : rawAbsentOrLeave.trim();

    // 2. Absent/Leave -> absentOrLeave column != "-" (excluding Daily allowance)
    if (cleanAbsentOrLeave && cleanAbsentOrLeave !== "-" && cleanAbsentOrLeave !== "") {
      return cleanAbsentOrLeave;
    }

    // 3. If no InTime and no OutTime -> Weekend (if Friday) else Absent
    if (!hasIn && !hasOut) {
      return isFriday ? "Weekend" : "Absent";
    }

    // 4. Calculate Hours
    let hours = calculateWorkingHours(record.checkInTime, record.checkOutTime);
    
    if (hours === null && record.workingHour && record.workingHour !== "-" && record.workingHour.trim() !== "") {
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

    // 5. Priority Status by W.Hour
    if (hours !== null) {
      if (hours < 6) return "< 6hr";
      if (hours < 10) return "< 10hrs";
    }

    // 6. Check for Late/Early only if hours are 10+ or null
    const isLate = record.lateEntry && record.lateEntry !== "-" && record.lateEntry !== "0" && record.lateEntry.trim() !== "";
    const isEarly = record.earlyLeave && record.earlyLeave !== "-" && record.earlyLeave !== "0" && record.earlyLeave.trim() !== "";

    if (isLate) return "Late Entry";
    if (isEarly) return "Early Leave";

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
