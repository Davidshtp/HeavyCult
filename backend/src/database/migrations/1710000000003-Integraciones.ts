import { MigrationInterface, QueryRunner } from 'typeorm';

export class Integraciones1710000000003 implements MigrationInterface {
  name = 'Integraciones1710000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."integracion_plataforma_enum" AS ENUM(
        'META_ADS',
        'TIKTOK',
        'WHATSAPP',
        'DROPI',
        'SERVIENTREGA',
        'INTER_RAPIDISIMO',
        'COORDINADORA',
        'ENVIA'
      )`,
    );

    await queryRunner.query(`
      CREATE TABLE "integracion" (
        "id_integracion" SERIAL NOT NULL,
        "plataforma" "integracion_plataforma_enum" NOT NULL,
        "etiqueta" character varying(120) NOT NULL,
        "api_key_cifrada" text NOT NULL,
        "config" jsonb,
        "activo" boolean NOT NULL DEFAULT true,
        "fecha_creacion" TIMESTAMP NOT NULL DEFAULT now(),
        "ultima_prueba_ok" boolean,
        "mensaje_ultima_prueba" text,
        "fecha_ultima_prueba" TIMESTAMP,
        CONSTRAINT "PK_integracion_id_integracion" PRIMARY KEY ("id_integracion")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "integracion"`);
    await queryRunner.query(`DROP TYPE "public"."integracion_plataforma_enum"`);
  }
}
