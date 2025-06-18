function convertBigIntToString(obj) {
  if (Array.isArray(obj)) {
    return obj.map(convertBigIntToString);
  }

  if (obj && typeof obj === 'object') {
    const result = {};
    for (const key in obj) {
      const value = obj[key];
      if (typeof value === 'bigint') {
        result[key] = value.toString();
      } else if (typeof value === 'object') {
        result[key] = convertBigIntToString(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  return obj;
}

function formatBigIntResponse(req, res, next) {
  const oldJson = res.json;
  res.json = function (data) {
    try{
      const converted = convertBigIntToString(data);
      oldJson.call(this, converted);
    }catch{
      oldJson.call(this, {
        error: '格式轉換失敗',
        detail: err.message
      });
    }    
  };
  next();
}

module.exports = formatBigIntResponse;