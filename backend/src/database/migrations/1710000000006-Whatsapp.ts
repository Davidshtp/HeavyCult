import { MigrationInterface, QueryRunner } from 'typeorm';

export class Whatsapp1710000000006 implements MigrationInterface {
  name = 'Whatsapp1710000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."whatsapp_proveedor_enum" AS ENUM(
        'EVOLUTION_BAILEYS',
        'WHATSAPP_CLOUD'
      )`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."whatsapp_estado_instancia_enum" AS ENUM(
        'DESCONECTADA',
        'CONECTANDO',
        'QR',
        'CONECTADA',
        'ERROR'
      )`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."whatsapp_origen_contacto_enum" AS ENUM(
        'ORGANICO',
        'ANUNCIO',
        'IMPORTADO'
      )`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."whatsapp_estado_conversacion_enum" AS ENUM(
        'ABIERTA',
        'PENDIENTE',
        'CERRADA'
      )`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."whatsapp_modo_conversacion_enum" AS ENUM(
        'IA',
        'HUMANO',
        'PAUSADA'
      )`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."whatsapp_etapa_conversacion_enum" AS ENUM(
        'NUEVO',
        'INTERESADO',
        'COTIZANDO',
        'DATOS',
        'CONFIRMADO',
        'PEDIDO_CREADO',
        'PERDIDO'
      )`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."whatsapp_direccion_mensaje_enum" AS ENUM(
        'ENTRANTE',
        'SALIENTE'
      )`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."whatsapp_origen_mensaje_enum" AS ENUM(
        'CLIENTE',
        'IA',
        'AGENTE',
        'SISTEMA'
      )`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."whatsapp_tipo_mensaje_enum" AS ENUM(
        'TEXTO',
        'IMAGEN',
        'AUDIO',
        'VIDEO',
        'DOCUMENTO',
        'UBICACION',
        'OTRO'
      )`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."whatsapp_estado_mensaje_enum" AS ENUM(
        'PENDIENTE',
        'ENVIADO',
        'ENTREGADO',
        'LEIDO',
        'FALLIDO'
      )`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."whatsapp_estado_evento_enum" AS ENUM(
        'PENDIENTE',
        'PROCESANDO',
        'PROCESADO',
        'FALLIDO'
      )`,
    );

    await queryRunner.query(`
      CREATE TABLE "whatsapp_instancia" (
        "id_instancia" SERIAL NOT NULL,
        "proveedor" "whatsapp_proveedor_enum" NOT NULL DEFAULT 'EVOLUTION_BAILEYS',
        "nombre" character varying(80) NOT NULL,
        "id_externo" character varying(120) NOT NULL,
        "id_integracion" integer,
        "estado" "whatsapp_estado_instancia_enum" NOT NULL DEFAULT 'DESCONECTADA',
        "numero" character varying(30),
        "qr_base64" text,
        "qr_code" text,
        "qr_expira_at" TIMESTAMP,
        "webhook_secret_cifrado" text NOT NULL,
        "config" jsonb,
        "fecha_creacion" TIMESTAMP NOT NULL DEFAULT now(),
        "fecha_actualizacion" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_whatsapp_instancia" PRIMARY KEY ("id_instancia"),
        CONSTRAINT "UQ_whatsapp_instancia_nombre" UNIQUE ("nombre"),
        CONSTRAINT "FK_whatsapp_instancia_integracion" FOREIGN KEY ("id_integracion")
          REFERENCES "integracion"("id_integracion") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "contacto" (
        "id_contacto" SERIAL NOT NULL,
        "telefono_e164" character varying(30) NOT NULL,
        "wa_id" character varying(80),
        "jid" character varying(120),
        "nombre" character varying(120),
        "apellido" character varying(120),
        "email" character varying(160),
        "documento" character varying(40),
        "direccion" character varying(200),
        "departamento_id" character varying(2),
        "municipio_id" character varying(5),
        "origen" "whatsapp_origen_contacto_enum" NOT NULL DEFAULT 'ORGANICO',
        "notas" text,
        "fecha_creacion" TIMESTAMP NOT NULL DEFAULT now(),
        "fecha_actualizacion" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_contacto" PRIMARY KEY ("id_contacto"),
        CONSTRAINT "UQ_contacto_telefono_e164" UNIQUE ("telefono_e164")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "conversacion" (
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
      CREATE UNIQUE INDEX "UQ_conversacion_abierta"
        ON "conversacion" ("id_contacto", "id_instancia")
        WHERE "estado" <> 'CERRADA'
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_conversacion_instancia_ultimo"
        ON "conversacion" ("id_instancia", "ultimo_mensaje_at" DESC)
    `);

    await queryRunner.query(`
      CREATE TABLE "mensaje" (
        "id_mensaje" SERIAL NOT NULL,
        "id_conversacion" integer NOT NULL,
        "id_instancia" integer NOT NULL,
        "wa_message_id" character varying(120),
        "direccion" "whatsapp_direccion_mensaje_enum" NOT NULL,
        "origen" "whatsapp_origen_mensaje_enum" NOT NULL,
        "tipo" "whatsapp_tipo_mensaje_enum" NOT NULL DEFAULT 'TEXTO',
        "contenido" text,
        "media_url" text,
        "estado" "whatsapp_estado_mensaje_enum" NOT NULL DEFAULT 'PENDIENTE',
        "metadata" jsonb,
        "fecha_creacion" TIMESTAMP NOT NULL DEFAULT now(),
        "fecha_actualizacion" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_mensaje" PRIMARY KEY ("id_mensaje"),
        CONSTRAINT "FK_mensaje_conversacion" FOREIGN KEY ("id_conversacion")
          REFERENCES "conversacion"("id_conversacion") ON DELETE CASCADE,
        CONSTRAINT "FK_mensaje_instancia" FOREIGN KEY ("id_instancia")
          REFERENCES "whatsapp_instancia"("id_instancia") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_mensaje_instancia_wa"
        ON "mensaje" ("id_instancia", "wa_message_id")
        WHERE "wa_message_id" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_mensaje_conversacion"
        ON "mensaje" ("id_conversacion", "id_mensaje" DESC)
    `);

    await queryRunner.query(`
      CREATE TABLE "evento_whatsapp" (
        "id_evento" SERIAL NOT NULL,
        "id_instancia" integer NOT NULL,
        "id_evento_externo" character varying(200) NOT NULL,
        "tipo" character varying(60) NOT NULL,
        "payload" jsonb NOT NULL,
        "estado" "whatsapp_estado_evento_enum" NOT NULL DEFAULT 'PENDIENTE',
        "intentos" integer NOT NULL DEFAULT 0,
        "error" text,
        "fecha_creacion" TIMESTAMP NOT NULL DEFAULT now(),
        "fecha_procesado" TIMESTAMP,
        CONSTRAINT "PK_evento_whatsapp" PRIMARY KEY ("id_evento"),
        CONSTRAINT "UQ_evento_whatsapp_externo" UNIQUE ("id_instancia", "id_evento_externo"),
        CONSTRAINT "FK_evento_whatsapp_instancia" FOREIGN KEY ("id_instancia")
          REFERENCES "whatsapp_instancia"("id_instancia") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "evento_whatsapp"`);
    await queryRunner.query(`DROP TABLE "mensaje"`);
    await queryRunner.query(`DROP TABLE "conversacion"`);
    await queryRunner.query(`DROP TABLE "contacto"`);
    await queryRunner.query(`DROP TABLE "whatsapp_instancia"`);

    await queryRunner.query(`DROP TYPE "public"."whatsapp_estado_evento_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."whatsapp_estado_mensaje_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."whatsapp_tipo_mensaje_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."whatsapp_origen_mensaje_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."whatsapp_direccion_mensaje_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."whatsapp_etapa_conversacion_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."whatsapp_modo_conversacion_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."whatsapp_estado_conversacion_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."whatsapp_origen_contacto_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."whatsapp_estado_instancia_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."whatsapp_proveedor_enum"`);
  }
}
