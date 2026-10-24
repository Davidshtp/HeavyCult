import { MigrationInterface, QueryRunner } from 'typeorm';

export class RepararConversacionWhatsapp1710000000007
  implements MigrationInterface
{
  name = 'RepararConversacionWhatsapp1710000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "conversacion" (
        "id_conversacion" SERIAL NOT NULL,
        "id_contacto" integer NOT NULL,
        "id_instancia" integer NOT NULL,
        "estado" "whatsapp_estado_conversacion_enum" NOT NULL DEFAULT 'ABIERTA',
        "modo" "whatsapp_modo_conversacion_enum" NOT NULL DEFAULT 'HUMANO',
        "etapa" "whatsapp_etapa_conversacion_enum" NOT NULL DEFAULT 'NUEVO',
        "asignado_a" integer,
        "no_leidos" integer NOT NULL DEFAULT 0,
        "resumen_ia" text,
        "ultimo_mensaje_at" TIMESTAMP,
        "id_pedido_shopify" character varying(120),
        "numero_pedido" character varying(40),
        "fecha_creacion" TIMESTAMP NOT NULL DEFAULT now(),
        "fecha_actualizacion" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_conversacion" PRIMARY KEY ("id_conversacion"),
        CONSTRAINT "FK_conversacion_contacto" FOREIGN KEY ("id_contacto")
          REFERENCES "contacto"("id_contacto") ON DELETE CASCADE,
        CONSTRAINT "FK_conversacion_instancia" FOREIGN KEY ("id_instancia")
          REFERENCES "whatsapp_instancia"("id_instancia") ON DELETE CASCADE,
        CONSTRAINT "FK_conversacion_usuario" FOREIGN KEY ("asignado_a")
          REFERENCES "usuario"("id_usuario") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_conversacion_abierta"
        ON "conversacion" ("id_contacto", "id_instancia")
        WHERE "estado" <> 'CERRADA'
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_conversacion_instancia_ultimo"
        ON "conversacion" ("id_instancia", "ultimo_mensaje_at" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_conversacion_instancia_ultimo"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "UQ_conversacion_abierta"',
    );
    await queryRunner.query('DROP TABLE IF EXISTS "conversacion"');
  }
}
