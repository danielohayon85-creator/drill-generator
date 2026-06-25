'use strict';
// מפתחות Firebase — אלו ערכי תצורה ציבוריים (לא סודיים), בטוחים לחשיפה בקוד לקוח.
// יש למלא לאחר יצירת הפרויקט ב-https://console.firebase.google.com
const FIREBASE_CONFIG = {
  apiKey: 'REPLACE_ME',
  authDomain: 'REPLACE_ME.firebaseapp.com',
  projectId: 'REPLACE_ME',
  storageBucket: 'REPLACE_ME.appspot.com',
  messagingSenderId: 'REPLACE_ME',
  appId: 'REPLACE_ME',
};

// כתובות מייל שיוצגו כאדמין בממשק (תצוגה בלבד — האבטחה האמיתית היא ב-Firestore rules / admins collection)
const ADMIN_EMAILS = ['danielohayon85@gmail.com'];
