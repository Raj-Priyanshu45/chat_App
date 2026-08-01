const parseDateValue = (value) => {
  if (!value) return null;

  if (typeof value === 'string') {
    return new Date(value);
  }

  if (Array.isArray(value) && value.length >= 6) {
    return new Date(value[0], value[1] - 1, value[2], value[3], value[4], value[5]);
  }

  if (typeof value === 'object' && value !== null) {
    const { year, monthValue, dayOfMonth, hour, minute, second } = value;
    if (typeof year === 'number' && typeof monthValue === 'number' && typeof dayOfMonth === 'number') {
      return new Date(year, monthValue - 1, dayOfMonth, hour || 0, minute || 0, second || 0);
    }
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatTime = (value) => {
  const date = parseDateValue(value);
  if (!date) return '';

  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
};

// Converts whatever shape the backend sent (array, object, or string) back into
// a plain "YYYY-MM-DDTHH:mm:ss.SSSSSS" string with no timezone — this is the
// only format Spring's @RequestParam LocalDateTime will parse without a 400.
export const toBackendTimestamp = (value) => {
  if (!value) return null;

  const pad = (n) => String(n).padStart(2, '0');

  if (typeof value === 'string') {
    return value.replace('Z', '');
  }

  if (Array.isArray(value) && value.length >= 6) {
    const [year, month, day, hour, minute, second, nano = 0] = value;
    const micros = String(Math.floor(nano / 1000)).padStart(6, '0');
    return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}.${micros}`;
  }

  if (typeof value === 'object') {
    const { year, monthValue, dayOfMonth, hour, minute, second, nano = 0 } = value;
    if (typeof year === 'number' && typeof monthValue === 'number') {
      const micros = String(Math.floor(nano / 1000)).padStart(6, '0');
      return `${year}-${pad(monthValue)}-${pad(dayOfMonth)}T${pad(hour)}:${pad(minute)}:${pad(second)}.${micros}`;
    }
  }

  return null;
};