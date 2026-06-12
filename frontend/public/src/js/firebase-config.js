/**
 * firebase-config.js
 * Configuración del cliente Firebase — proyecto stock-tk.
 * Usa el SDK modular (tree-shakeable) — NO requiere CDN ni window._firebaseAuth.
 */
import { initializeApp }     from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'

const firebaseConfig = {
  apiKey:            "AIzaSyARqf6ejfh8mYLxTc93gAk03O57AUJHAKI",
  authDomain:        "stock-tk.firebaseapp.com",
  projectId:         "stock-tk",
  storageBucket:     "stock-tk.firebasestorage.app",
  messagingSenderId: "991341465836",
  appId:             "1:991341465836:web:471bee26fc1703d0bfd5c9",
  measurementId:     "G-ERS6EE9FSQ",
}

const app  = initializeApp(firebaseConfig)
const auth = getAuth(app)

export {
  auth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
}
