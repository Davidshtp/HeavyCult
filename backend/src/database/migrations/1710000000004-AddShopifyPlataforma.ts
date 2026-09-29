import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShopifyPlataforma1710000000004 implements MigrationInterface {
  name = 'AddShopifyPlataforma1710000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."integracion_plataforma_enum" ADD VALUE 'SHOPIFY'`,
    );
  }

  public async down(): Promise<void> {
    // PostgreSQL no permite eliminar valores de un tipo ENUM de forma directa.
  }
}
