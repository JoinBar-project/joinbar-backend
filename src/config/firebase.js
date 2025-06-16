const path = require('path'); 

require('dotenv').config();

const admin = require('firebase-admin');
const { getStorage } = require('firebase-admin/storage');

const serviceAccount = require(path.resolve(__dirname, '../../firebaseKey.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});

const bucket = getStorage().bucket();

module.exports = bucket;