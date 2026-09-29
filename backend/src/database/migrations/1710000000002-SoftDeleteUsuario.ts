import { MigrationInterface, QueryRunner } from 'typeorm';

export class SoftDeleteUsuario1710000000002 implements MigrationInterface {
  name = 'SoftDeleteUsuario1710000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "usuario" ADD COLUMN "deleted_at" TIMESTAMP NULL`,
    );

    // El correo vuelve a estar disponible al eliminar de forma suave.
    await queryRunner.query(`DROP INDEX "public"."IDX_usuario_correo"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_usuario_correo_activo"
         ON "usuario" ("correo")
       WHERE "deleted_at" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_usuario_correo_activo"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_usuario_correo" ON "usuario" ("correo")`,
    );
    await queryRunner.query(`ALTER TABLE "usuario" DROP COLUMN "deleted_at"`);
  }
}
