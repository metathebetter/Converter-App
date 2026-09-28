const TIMEZONE_OPTIONS = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'New York (ET)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PT)' },
  { value: 'America/Chicago', label: 'Chicago (CT)' },
  { value: 'America/Sao_Paulo', label: 'São Paulo' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Africa/Cairo', label: 'Cairo (EET)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZDT)' }
];

function getTimeZoneOffsetMinutes(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'shortOffset',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(date);
  const zoneName = parts.find(part => part.type === 'timeZoneName')?.value || 'UTC';

  if (!zoneName || zoneName === 'UTC' || zoneName === 'GMT') {
    return 0;
  }

  const match = zoneName.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/i);
  if (!match) {
    return 0;
  }

  const sign = match[1] === '-' ? -1 : 1;
  const hours = Number(match[2]) || 0;
  const minutes = Number(match[3]) || 0;
  return sign * (hours * 60 + minutes);
}

function parseDateTimeLocal(value) {
  if (!value) return null;
  const [datePart, timePart] = value.split('T');
  if (!datePart || !timePart) return null;

  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);

  return new Date(Date.UTC(year, month - 1, day, hour, minute));
}

function formatDateTimeLocalForTimeZone(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(date);
  const map = {};
  parts.forEach(part => {
    if (part.type !== 'literal') {
      map[part.type] = part.value;
    }
  });

  const year = map.year || '0000';
  const month = map.month || '01';
  const day = map.day || '01';
  const hour = map.hour || '00';
  const minute = map.minute || '00';
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function formatDateTimeForDisplay(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(date);
  const map = {};
  parts.forEach(part => {
    if (part.type !== 'literal') {
      map[part.type] = part.value;
    }
  });

  const year = map.year || '0000';
  const month = map.month || '01';
  const day = map.day || '01';
  const hour = map.hour || '00';
  const minute = map.minute || '00';
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function convertTimeZoneValue(fromZone, toZone, value) {
  const sourceDate = parseDateTimeLocal(value);
  if (!sourceDate) {
    throw new Error('Invalid date/time');
  }

  const sourceOffset = getTimeZoneOffsetMinutes(sourceDate, fromZone);
  const utcDate = new Date(sourceDate.getTime() - (sourceOffset * 60 * 1000));
  const targetOffset = getTimeZoneOffsetMinutes(utcDate, toZone);
  const targetDate = new Date(utcDate.getTime() + (targetOffset * 60 * 1000));

  return {
    source: formatDateTimeForDisplay(sourceDate, fromZone),
    target: formatDateTimeForDisplay(targetDate, toZone),
    targetDate
  };
}
