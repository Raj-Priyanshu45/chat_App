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
