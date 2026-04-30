const { formatToTaiwanTime } = require('../utils/dateFormatter');

function formatApiResponse(req, res, next) {
  const originalJson = res.json;

  res.json = function (data) {
    try {
      const jsonString = JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      );
      const parsedData = JSON.parse(jsonString);
      const formatted = formatToTaiwanTime(parsedData);
      return originalJson.call(this, formatted);
    } catch (err) {
      console.error('🔥 formatApiResponse 錯誤:', err);
      return originalJson.call(this, { message: '資料格式化錯誤' });
    }
  };

  next();
}

module.exports = formatApiResponse;