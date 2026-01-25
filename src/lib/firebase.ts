import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { initializeApp } from 'firebase/app';

// TODO: Replace with your Firebase project configuration
// You can copy these values from the Firebase Console -> Project Settings
const firebaseConfig = {
    apiKey: 'AIzaSyAYqSmclW-tieeGIenPNFWWkGmn7fPRVMA',
    authDomain: 'danush-billing.firebaseapp.com',
    projectId: 'danush-billing',
    storageBucket: 'danush-billing.firebasestorage.app',
    messagingSenderId: '95075767607',
    appId: '1:95075767607:web:ffade1f7af09a8b39776b2',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
