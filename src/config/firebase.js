const path = require('path'); 
require('dotenv').config();
const admin = require('firebase-admin');
const serviceAccount = require(path.resolve(__dirname, '../../firebaseKey.json'));

// 檢查是否已初始化，避免重複初始化
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
}

const bucket = admin.storage().bucket();

module.exports = bucket;