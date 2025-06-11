const { formatToTaiwanTime } = require('../utils/dateFormatter');

function withTaiwanTime(req, res, next) {
  const originalJson = res.json;

  res.json = function (data) {
    const formatted = formatToTaiwanTime(data);
    return originalJson.call(this, formatted);
  };

  next();
}

module.exports = withTaiwanTime;