const firebaseConfig = {
  apiKey: "AIzaSyBUU0NRCf26u3GelA-ROUN4wKZpE36wIKs",
  authDomain: "crypto-11302.firebaseapp.com",
  projectId: "crypto-11302",
  storageBucket: "crypto-11302.firebasestorage.app",
  messagingSenderId: "982949875276",
  appId: "1:982949875276:web:be3f164038529aa7bcaee9",
  measurementId: "G-HMYZW97DP3"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = firebase.auth();
