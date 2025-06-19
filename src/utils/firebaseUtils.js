const bucket = require('../config/firebase');


function getPublicImageUrl(filePath) {
  return `https://storage.googleapis.com/${bucket.name}/${filePath}`;
}

/**
 * 上傳圖片（Buffer）到 Firebase
 * @param {Buffer} fileBuffer 
 * @param {string} mimeType 
 * @param {string} filename
 * @returns {string} imageUrl
 */

async function uploadImage(fileBuffer, mimeType, filename) {
  const filePath = `events/${Date.now()}-${filename}`;
  const blob = bucket.file(filePath);
  const blobStream = blob.createWriteStream({
    metadata: { contentType: mimeType },
  });

  await new Promise((resolve, reject) => {
    blobStream.on('error', reject);
    blobStream.on('finish', resolve);
    blobStream.end(fileBuffer);
  });

  await blob.makePublic();
  return getPublicImageUrl(filePath);
}

function extractStoragePath(imageUrl) {
  const baseUrl = `https://storage.googleapis.com/${bucket.name}/`;
  if (imageUrl.startsWith(baseUrl)) {
    return imageUrl.replace(baseUrl, '');
  }
  return null;
}

async function deleteImageByUrl(imageUrl) {
  const filePath = extractStoragePath(imageUrl);
  if (!filePath) return;
  try {
    await bucket.file(filePath).delete();
    console.log(`✅ 圖片已刪除: ${filePath}`);
  } catch (error) {
    console.error(`❌ 圖片刪除失敗: ${filePath}`, error.message);
  }
}

module.exports = {
  uploadImage,
  deleteImageByUrl,
  extractStoragePath,
  getPublicImageUrl,
};