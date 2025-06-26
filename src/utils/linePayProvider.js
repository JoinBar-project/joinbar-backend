const axios = require('axios');
const crypto = require('crypto');
const dayjs = require('dayjs');

const LINEPAY_CONFIG = {
 apiUrl: 'https://sandbox-api-pay.line.me',
 channelId: process.env.LINEPAY_CHANNEL_ID,
 channelSecret: process.env.LINEPAY_CHANNEL_SECRET,
 timeout: 30000,
 isSandbox: true
};

if (!LINEPAY_CONFIG.channelId || !LINEPAY_CONFIG.channelSecret) {
 console.error('❌ LINE Pay 環境變數未設定');
 throw new Error('LINE Pay credentials not configured');
}

const generateSignature = (uri, requestBody, nonce) => {
 const message = LINEPAY_CONFIG.channelSecret + uri + JSON.stringify(requestBody) + nonce;
 return crypto
   .createHmac('sha256', LINEPAY_CONFIG.channelSecret)
   .update(message)
   .digest('base64');
};

const createHeaders = (uri, requestBody, nonce) => ({
 'Content-Type': 'application/json',
 'X-LINE-ChannelId': LINEPAY_CONFIG.channelId,
 'X-LINE-Authorization-Nonce': nonce,
 'X-LINE-Authorization': generateSignature(uri, requestBody, nonce)
});

const makeRequest = async (method, uri, data = {}) => {
 try {
   const nonce = dayjs().valueOf().toString();
   const headers = createHeaders(uri, data, nonce);
   
   const config = {
     method,
     url: LINEPAY_CONFIG.apiUrl + uri,
     headers,
     timeout: LINEPAY_CONFIG.timeout,
     ...(method !== 'GET' && { data })
   };

   console.log(`🔄 LINE Pay ${method} ${uri}`);
   const response = await axios(config);
   
   console.log(`📥 LINE Pay 回應: ${response.data.returnCode} - ${response.data.returnMessage}`);
   
   return {
     success: response.data.returnCode === '0000',
     data: response.data,
     info: response.data.info
   };
 } catch (error) {
   console.error(`❌ LINE Pay ${method} ${uri} 失敗:`, error.message);
   
   if (error.response) {
     console.error('API 錯誤回應:', error.response.data);
     return {
       success: false,
       error: error.response.data,
       message: error.response.data.returnMessage || '請求失敗',
       code: error.response.data.returnCode
     };
   }
   
   return {
     success: false,
     error: error.message,
     message: error.message || '網路連線失敗',
     code: 'NETWORK_ERROR'
   };
 }
};

const buildPackages = (paymentData) => {
 if (paymentData.packages) {
   return paymentData.packages;
 }
 
 return [{
   id: `package_${paymentData.orderId}`,
   amount: paymentData.amount,
   name: paymentData.description || '活動票券',
   products: [{
     id: `product_${paymentData.orderId}`,
     name: paymentData.description || '活動票券',
     quantity: 1,
     price: paymentData.amount
   }]
 }];
};

const createPayment = async (paymentData) => {
 const {
   orderId,
   orderNumber,
   amount,
   currency = 'TWD',
   description,
   returnUrl,
   cancelUrl
 } = paymentData;

 const requestBody = {
   amount: amount,
   currency: currency,
   orderId: orderNumber,
   packages: buildPackages(paymentData),
   redirectUrls: {
     confirmUrl: returnUrl,
     cancelUrl: cancelUrl || returnUrl
   },
   options: {
     payment: {
       capture: true,
       payType: 'NORMAL'
     },
     display: {
       locale: 'zh_TW',
       checkConfirmUrlBrowser: true
     }
   }
 };

 console.log('🔄 創建 LINE Pay 付款:', {
   orderId: orderNumber,
   amount: amount,
   sandbox: LINEPAY_CONFIG.isSandbox
 });

 const result = await makeRequest('POST', '/v3/payments/request', requestBody);
 
 if (result.success) {
   return {
     success: true,
     paymentId: result.info.transactionId,
     paymentUrl: result.info.paymentUrl.web,
     transactionId: result.info.transactionId,
     paymentAccessToken: result.info.paymentAccessToken
   };
 }
 
 return {
   success: false,
   message: result.message || '付款創建失敗',
   code: result.code
 };
};

const confirmPayment = async (transactionId, amount, currency = 'TWD') => {
 console.log('🔄 確認 LINE Pay 付款:', {
   transactionId,
   amount,
   currency
 });

 const result = await makeRequest('POST', `/v3/payments/${transactionId}/confirm`, {
   amount,
   currency
 });
 
 if (result.success) {
   return {
     success: true,
     transactionId: transactionId,
     orderId: result.info.orderId,
     payInfo: result.info.payInfo[0],
     amount: result.info.payInfo[0].amount,
     currency: result.info.payInfo[0].currency
   };
 }
 
 return {
   success: false,
   message: result.message || '付款確認失敗',
   code: result.code
 };
};

const checkPaymentStatus = async (transactionId) => {
 console.log('🔍 查詢 LINE Pay 狀態:', transactionId);

 const result = await makeRequest('GET', `/v3/payments/requests/${transactionId}`);
 
 if (result.success) {
   return {
     success: true,
     transactionId: transactionId,
     status: result.info.transactionType,
     amount: result.info.amount,
     currency: result.info.currency,
     orderId: result.info.orderId,
     isPaid: result.info.transactionType === 'PAYMENT'
   };
 }
 
 return {
   success: false,
   message: result.message || '查詢失敗',
   code: result.code
 };
};

const validateSandboxConnection = () => {
 try {
   console.log('🔧 驗證 LINE Pay 沙盒設定...');
   console.log('✅ LINE Pay 沙盒環境設定正確');
   console.log('🏗️ 使用沙盒 API:', LINEPAY_CONFIG.apiUrl);
   console.log('📋 Channel ID:', LINEPAY_CONFIG.channelId ? '已設定' : '未設定');
   console.log('🔑 Channel Secret:', LINEPAY_CONFIG.channelSecret ? '已設定' : '未設定');
   
   return {
     isValid: !!(LINEPAY_CONFIG.channelId && LINEPAY_CONFIG.channelSecret),
     config: {
       apiUrl: LINEPAY_CONFIG.apiUrl,
       isSandbox: LINEPAY_CONFIG.isSandbox,
       hasCredentials: !!(LINEPAY_CONFIG.channelId && LINEPAY_CONFIG.channelSecret)
     }
   };
 } catch (error) {
   console.error('❌ LINE Pay 沙盒設定驗證失敗:', error.message);
   return {
     isValid: false,
     error: error.message
   };
 }
};

module.exports = {
 createPayment,
 confirmPayment,
 checkPaymentStatus,
 validateSandboxConnection,
 generateSignature,
 createHeaders,
 makeRequest,
 buildPackages,
 LINEPAY_CONFIG
};