'use strict';

module.exports = {
  async up(queryInterface) {
    // Drop the column default first — it casts to the ENUM type and blocks the ALTER
    await queryInterface.sequelize.query(
      `ALTER TABLE ubicaciones ALTER COLUMN tipo DROP DEFAULT`
    );
    // Change tipo from ENUM to VARCHAR so the admin can define custom location types
    await queryInterface.sequelize.query(`
      ALTER TABLE ubicaciones
      ALTER COLUMN tipo TYPE VARCHAR(100)
      USING tipo::text
    `);
    // Restore a plain-text default
    await queryInterface.sequelize.query(
      `ALTER TABLE ubicaciones ALTER COLUMN tipo SET DEFAULT 'otro'`
    );
    // Now safe to drop the orphaned ENUM type
    await queryInterface.sequelize.query(
      `DROP TYPE IF EXISTS "enum_ubicaciones_tipo"`
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_ubicaciones_tipo"
          AS ENUM('aula','deposito','laboratorio','otro');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE ubicaciones
      ALTER COLUMN tipo TYPE "enum_ubicaciones_tipo"
      USING CASE WHEN tipo IN ('aula','deposito','laboratorio','otro')
                 THEN tipo::"enum_ubicaciones_tipo"
                 ELSE 'otro'::"enum_ubicaciones_tipo"
            END
    `);
  },
};
