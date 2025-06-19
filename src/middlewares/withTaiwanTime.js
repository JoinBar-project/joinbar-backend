const { formatToTaiwanTime } = require('../utils/dateFormatter');

function withTaiwanTime(req, res, next) {
  const originalJson = res.json;

  res.json = function (data) {
    console.log('🌀 middleware 發動，格式化前:\n', JSON.stringify(data, null, 2));

    const formatted = formatToTaiwanTime(data);

    console.log('✅ 格式化後:\n', JSON.stringify(formatted, null, 2));

    return originalJson.call(this, formatted);
  };

  next();
}

module.exports = withTaiwanTime;