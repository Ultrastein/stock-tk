/**
 * seed-admin.js
 * Crea (o actualiza) el usuario administrador inicial.
 *
 * Uso:
 *   node scripts/seed-admin.js
 *
 * Variables de entorno (lee backend/.env automáticamente):
 *   ADMIN_EMAIL    — email del admin  (default: admin@escuela.com)
 *   ADMIN_PASSWORD — contraseña       (default: Admin1234!)
 *   ADMIN_NOMBRE   — nombre completo  (default: Administrador)
 */

require('dotenv').config();
const bcrypt    = require('bcryptjs');
const sequelize = require('../src/config/database');

// ── Credenciales (editables por CLI o .env) ───────────────────────────────────
const EMAIL    = process.env.ADMIN_EMAIL    || 'admin@escuela.com';
const PASSWORD = process.env.ADMIN_PASSWORD || 'Admin1234!';
const NOMBRE   = process.env.ADMIN_NOMBRE   || 'Administrador';

async function main() {
  try {
    await sequelize.authenticate();
    console.log('✔ Conectado a PostgreSQL');

    const hash = await bcrypt.hash(PASSWORD, 10);

    const [result] = await sequelize.query(
      `INSERT INTO usuarios (id, email, nombre, password_hash, rol, activo, created_at, updated_at)
       VALUES (gen_random_uuid(), :email, :nombre, :hash, 'admin', true, NOW(), NOW())
       ON CONFLICT (email)
       DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         nombre        = EXCLUDED.nombre,
         rol           = 'admin',
         activo        = true,
         updated_at    = NOW()
       RETURNING id, email, nombre, rol;`,
      {
        replacements: { email: EMAIL, nombre: NOMBRE, hash },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    console.log('\n✅ Usuario admin listo:');
    console.log('   Email     :', result.email);
    console.log('   Nombre    :', result.nombre);
    console.log('   Rol       :', result.rol);
    console.log('   ID        :', result.id);
    console.log('\n🔑 Contraseña:', PASSWORD);
    console.log('   (Cambiala apenas ingreses al sistema)\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.message.includes('ECONNREFUSED')) {
      console.error('   → PostgreSQL no está corriendo o la conexión fue rechazada.');
      console.error('   → Verificá que el backend/.env tenga DB_HOST, DB_USER, DB_PASSWORD correctos.');
    }
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
