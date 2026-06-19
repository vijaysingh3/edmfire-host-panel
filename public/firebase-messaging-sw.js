/* eslint-disable no-undef */
// Firebase Cloud Messaging service worker
importScripts('https://www.gstatic.com/firebasejs/12.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.13.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: self.__FIREBASE_API_KEY || '',
  authDomain: self.__FIREBASE_AUTH_DOMAIN || '',
  projectId: self.__FIREBASE_PROJECT_ID || '',
  storageBucket: self.__FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: self.__FIREBASE_MESSAGING_SENDER_ID || '',
  appId: self.__FIREBASE_APP_ID || '',
  measurementId: self.__FIREBASE_MEASUREMENT_ID || '',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'EDMFIRE';
  const options = {
    body: payload.notification?.body || '',
    icon: '/logo.png',
    badge: '/logo.png',
  };
  self.registration.showNotification(title, options);
});