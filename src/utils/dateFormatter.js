const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

const tz = 'Asia/Taipei';

const allowedFields = ['startDate', 'endDate', 'createdAt', 'modifyAt'];

function formatToTaiwanTime(data) {
  if (Array.isArray(data)) {
    return data.map(formatToTaiwanTime);
  }

  if (data && typeof data === 'object') {
    const result = {};
    for (const key in data) {
      const value = data[key];

      if (allowedFields.includes(key) && (value instanceof Date || (typeof value === 'string' && dayjs(value).isValid()))) {
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
  formatToTaiwanTime,
};