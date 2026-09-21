import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearTablasIniciales1710000000000 implements MigrationInterface {
  name = 'CrearTablasIniciales1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."usuario_rol_enum" AS ENUM('ADMIN', 'EMPLEADO')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."usuario_estado_enum" AS ENUM('ACTIVO', 'INACTIVO', 'BLOQUEADO')`,
    );

    await queryRunner.query(`
      CREATE TABLE "usuario" (
        "id_usuario" SERIAL NOT NULL,
        "nombre" character varying(120) NOT NULL,
        "apellido" character varying(120) NOT NULL,
        "correo" character varying(255) NOT NULL,
        "contrasena" character varying(255) NOT NULL,
        "telefono" character varying(20),
        "rol" "usuario_rol_enum" NOT NULL,
        "estado" "usuario_estado_enum" NOT NULL DEFAULT 'ACTIVO',
        "url_imagen" character varying(500),
        "fecha_registro" TIMESTAMP NOT NULL DEFAULT now(),
        "ultimo_acceso" TIMESTAMP,
        "intentos_fallidos" integer NOT NULL DEFAULT 0,
        "bloqueado_hasta" TIMESTAMP,
        CONSTRAINT "PK_usuario_id_usuario" PRIMARY KEY ("id_usuario")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_usuario_correo" ON "usuario" ("correo")`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."token_tipo_enum" AS ENUM('RECUPERAR_CONTRASENA')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."token_estado_enum" AS ENUM('ACTIVO', 'EXPIRADO', 'USADO')`,
    );

    await queryRunner.query(`
      CREATE TABLE "token" (
        "id_token" SERIAL NOT NULL,
        "id_usuario" integer NOT NULL,
        "token" character varying(8) NOT NULL,
        "tipo" "token_tipo_enum" NOT NULL,
        "estado" "token_estado_enum" NOT NULL DEFAULT 'ACTIVO',
        "fecha_expiracion" TIMESTAMP NOT NULL,
        "intentos_restantes" integer NOT NULL DEFAULT 5,
        "fecha_creacion" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_token_id_token" PRIMARY KEY ("id_token"),
        CONSTRAINT "FK_token_id_usuario" FOREIGN KEY ("id_usuario")
          REFERENCES "usuario"("id_usuario") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "token"`);
    await queryRunner.query(`DROP TABLE "usuario"`);
    await queryRunner.query(`DROP TYPE "public"."token_estado_enum"`);
    await queryRunner.query(`DROP TYPE "public"."token_tipo_enum"`);
    await queryRunner.query(`DROP TYPE "public"."usuario_estado_enum"`);
    await queryRunner.query(`DROP TYPE "public"."usuario_rol_enum"`);
  }
}
