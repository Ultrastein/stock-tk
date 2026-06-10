/**
 * Firebase Admin SDK — inicialización lazy.
 * Las credenciales se leen desde variables de entorno (.env):
 *
 *   FIREBASE_PROJECT_ID=tu-project-id
 *   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxx@tu-project.iam.gserviceaccount.com
 *   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
 *
 * Obtener credenciales:
 *   Firebase Console → Project Settings → Service Accounts → Generate new private key
 *   El JSON descargado tiene "project_id", "client_email" y "private_key".
 */
const admin = require('firebase-admin');

let initialized = false;

/**
 * Devuelve la instancia de firebase-admin, inicializándola la primera vez.
 * @throws {Error} si faltan las variables de entorno de Firebase.
 */
function getAdmin() {
  if (initialized) return admin;

  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey  = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase Admin no configurado. ' +
      'Agregá FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY en .env'
    );
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      // Las claves en .env tienen "\n" literales — las convertimos a saltos reales
      privateKey: privateKey.replace(/\\n/g, '\n'),
    }),
  });

  initialized = true;
  return admin;
}

module.exports = { getAdmin };
