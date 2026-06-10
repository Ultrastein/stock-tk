/**
 * firebase-config.js
 * Configuración del cliente Firebase — proyecto stock-tk.
 * Expone window._firebaseAuth para que auth.js lo use.
 * El SDK compat se carga antes en index.html via CDN.
 */
(function () {
  const firebaseConfig = {
    apiKey:            "AIzaSyARqf6ejfh8mYLxTc93gAk03O57AUJHAKI",
    authDomain:        "stock-tk.firebaseapp.com",
    projectId:         "stock-tk",
    storageBucket:     "stock-tk.firebasestorage.app",
    messagingSenderId: "991341465836",
    appId:             "1:991341465836:web:471bee26fc1703d0bfd5c9",
    measurementId:     "G-ERS6EE9FSQ",
  };

  if (typeof firebase === 'undefined') {
    console.error('[firebase-config] Firebase SDK no cargado. Verificá index.html.');
    window._firebaseAuth = null;
    return;
  }

  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    window._firebaseAuth = firebase.auth();
    console.info('[firebase-config] Firebase Auth inicializado ✓ (proyecto: stock-tk)');
  } catch (e) {
    console.error('[firebase-config] Error al inicializar Firebase:', e);
    window._firebaseAuth = null;
  }
})();
