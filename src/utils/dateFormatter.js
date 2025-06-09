const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

const tz = 'Asia/Taipei';

const allowedFields = ['startDate', 'endDate', 'createdAt', 'modifyAt'];