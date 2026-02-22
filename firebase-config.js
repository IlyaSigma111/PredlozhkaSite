// Firebase конфигурация - для CDN подключения
const firebaseConfig = {
  apiKey: "AIzaSyCMDSrRdyHBcdt3ZIHoD15626yAnsJ1ekM",
  authDomain: "predlozhkasite.firebaseapp.com",
  databaseURL: "https://predlozhkasite-default-rtdb.firebaseio.com",
  projectId: "predlozhkasite",
  storageBucket: "predlozhkasite.firebasestorage.app",
  messagingSenderId: "644835235198",
  appId: "1:644835235198:web:f82ac87d9831df90eb0f2f"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
