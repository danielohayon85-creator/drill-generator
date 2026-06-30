'use strict';
// מפתחות Firebase — אלו ערכי תצורה ציבוריים (לא סודיים), בטוחים לחשיפה בקוד לקוח.
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAuShxxF6I0KiB-FWO4Fr9xkpDDuAihV1E',
  authDomain: 'drillgen-d3619.firebaseapp.com',
  projectId: 'drillgen-d3619',
  storageBucket: 'drillgen-d3619.firebasestorage.app',
  messagingSenderId: '424325201995',
  appId: '1:424325201995:web:91d2d96277b4db58dc8dce',
};

// כתובות מייל שיוצגו כאדמין בממשק (תצוגה בלבד — האבטחה האמיתית היא ב-Firestore rules / admins collection)
const ADMIN_EMAILS = ['danielohayon85@gmail.com'];
