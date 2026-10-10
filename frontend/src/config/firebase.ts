import { initializeApp } from "firebase/app";
import {
    getAuth,
    GoogleAuthProvider
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBzJSCIDM1iv7YpJS7T79gklxHzUfwhEqQ",
  authDomain: "syncdoc-46f83.firebaseapp.com",
  projectId: "syncdoc-46f83",
  storageBucket: "syncdoc-46f83.firebasestorage.app",
  messagingSenderId: "668513893539",
  appId: "1:668513893539:web:1687eb90fe1d61c56ad316",
  measurementId: "G-8FHEQRCCXE"
};

const app = initializeApp(
    firebaseConfig
);

export const auth = getAuth(app);

export const googleProvider =
    new GoogleAuthProvider();