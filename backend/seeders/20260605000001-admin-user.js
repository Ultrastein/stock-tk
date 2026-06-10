'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface) {
    const existing = await queryInterface.rawSelect(
      'usuarios',
      { where: { email: 'admin@stock-tk.com' } },
      ['id']
    );
    if (existing) return; // already seeded

    await queryInterface.bulkInsert('usuarios', [{
      id:            uuidv4(),
      email:         'admin@stock-tk.com',
      // Contraseña: Admin2026!  — cambiala después del primer login
      password_hash: '$2a$10$MW15ebMbgSbEKNITKNF7WePfZBusqbyufX1IzqjBZrZYeP65vM0IG',
      nombre:        'Administrador',
      rol:           'admin',
      activo:        true,
      firebase_uid:  null,
      created_at:    new Date(),
      updated_at:    new Date(),
      deleted_at:    null,
    }]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('usuarios', { email: 'admin@stock-tk.com' });
  },
};
