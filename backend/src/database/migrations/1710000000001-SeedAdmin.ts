import * as bcrypt from 'bcrypt';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedAdmin1710000000001 implements MigrationInterface {
  name = 'SeedAdmin1710000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
      console.warn(
        '[SeedAdmin] Omitido: faltan ADMIN_EMAIL o ADMIN_PASSWORD en el entorno.',
      );
      return;
    }

    const rows = (await queryRunner.query(
      'SELECT id_usuario FROM usuario WHERE correo = $1',
      [email],
    )) as unknown[];
    if (Array.isArray(rows) && rows.length > 0) {
      console.log(
        '[SeedAdmin] El usuario administrador ya existe. Sin cambios.',
      );
      return;
    }

    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const hash = await bcrypt.hash(password, saltRounds);

    await queryRunner.query(
      `INSERT INTO usuario
        (nombre, apellido, correo, contrasena, telefono, rol, estado)
       VALUES ($1, $2, $3, $4, $5, 'ADMIN', 'ACTIVO')`,
      [
        process.env.ADMIN_NOMBRE || 'Administrador',
        process.env.ADMIN_APELLIDO || '',
        email,
        hash,
        process.env.ADMIN_TELEFONO || '',
      ],
    );
    console.log('[SeedAdmin] Usuario administrador creado correctamente.');
  }

  public async down(): Promise<void> {
    // No aplica: el admin se elimina manualmente si es necesario.
  }
}
