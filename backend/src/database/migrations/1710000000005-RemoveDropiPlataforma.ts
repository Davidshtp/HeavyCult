import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveDropiPlataforma1710000000005 implements MigrationInterface {
  name = 'RemoveDropiPlataforma1710000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "integracion" WHERE "plataforma" = 'DROPI'`,
    );

    const enumName = 'integracion_plataforma_enum';
    const nuevoNombre = `${enumName}_sin_dropi`;
    const valores = [
      'META_ADS',
      'TIKTOK',
      'WHATSAPP',
      'SHOPIFY',
      'SERVIENTREGA',
      'INTER_RAPIDISIMO',
      'COORDINADORA',
      'ENVIA',
    ]
      .map((v) => `'${v}'`)
      .join(', ');

    await queryRunner.query(
      `CREATE TYPE "public"."${nuevoNombre}" AS ENUM(${valores})`,
    );
    await queryRunner.query(
      `ALTER TABLE "integracion" ALTER COLUMN "plataforma" TYPE "public"."${nuevoNombre}" USING "plataforma"::text::"public"."${nuevoNombre}"`,
    );
    await queryRunner.query(`DROP TYPE "public"."${enumName}"`);
    await queryRunner.query(
      `ALTER TYPE "public"."${nuevoNombre}" RENAME TO "${enumName}"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const enumName = 'integracion_plataforma_enum';
    const nuevoNombre = `${enumName}_con_dropi`;
    const valores = [
      'META_ADS',
      'TIKTOK',
      'WHATSAPP',
      'DROPI',
      'SHOPIFY',
      'SERVIENTREGA',
      'INTER_RAPIDISIMO',
      'COORDINADORA',
      'ENVIA',
    ]
      .map((v) => `'${v}'`)
      .join(', ');

    await queryRunner.query(
      `CREATE TYPE "public"."${nuevoNombre}" AS ENUM(${valores})`,
    );
    await queryRunner.query(
      `ALTER TABLE "integracion" ALTER COLUMN "plataforma" TYPE "public"."${nuevoNombre}" USING "plataforma"::text::"public"."${nuevoNombre}"`,
    );
    await queryRunner.query(`DROP TYPE "public"."${enumName}"`);
    await queryRunner.query(
      `ALTER TYPE "public"."${nuevoNombre}" RENAME TO "${enumName}"`,
    );
  }
}
