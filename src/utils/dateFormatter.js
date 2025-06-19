const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

const tz = 'Asia/Taipei';

function formatToTaiwanTime(data) {
  if (Array.isArray(data)) {
    return data.map(formatToTaiwanTime);
  }

  if (data && typeof data === 'object') {
    const result = {};
    for (const key in data) {
      const value = data[key];

      const isDateObject =
        Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime());

      const isISODateString =
        typeof value === 'string' && dayjs(value).isValid() && value.includes('T');

      if (isDateObject || isISODateString) {
        result[key] = dayjs.utc(value).tz(tz).format('YYYY-MM-DD HH:mm:ss');
      } else if (typeof value === 'object') {
        result[key] = formatToTaiwanTime(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  return data;
}

module.exports = {
  dayjs,
  tz,
  formatToTaiwanTime,
};
