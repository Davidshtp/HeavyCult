import { Exclude } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum PlataformaIntegracion {
  META_ADS = 'META_ADS',
  TIKTOK = 'TIKTOK',
  WHATSAPP = 'WHATSAPP',
  SHOPIFY = 'SHOPIFY',
  SERVIENTREGA = 'SERVIENTREGA',
  INTER_RAPIDISIMO = 'INTER_RAPIDISIMO',
  COORDINADORA = 'COORDINADORA',
  ENVIA = 'ENVIA',
}

@Entity('integracion')
export class Integracion {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id_integracion' })
  id_integracion: number;

  @Column({
    type: 'enum',
    enum: PlataformaIntegracion,
    nullable: false,
    name: 'plataforma',
  })
  plataforma: PlataformaIntegracion;

  @Column({ type: 'varchar', length: 120, nullable: false, name: 'etiqueta' })
  etiqueta: string;

  @Exclude()
  @Column({ type: 'text', nullable: false, name: 'api_key_cifrada' })
  api_key_cifrada: string;

  @Column({ type: 'jsonb', nullable: true, name: 'config' })
  config: Record<string, string> | null;

  @Column({ type: 'boolean', default: true, name: 'activo' })
  activo: boolean;

  @CreateDateColumn({
    type: 'timestamp',
    name: 'fecha_creacion',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fecha_creacion: Date;

  @Column({ type: 'boolean', nullable: true, name: 'ultima_prueba_ok' })
  ultima_prueba_ok?: boolean | null;

  @Column({ type: 'text', nullable: true, name: 'mensaje_ultima_prueba' })
  mensaje_ultima_prueba?: string | null;

  @Column({ type: 'timestamp', nullable: true, name: 'fecha_ultima_prueba' })
  fecha_ultima_prueba?: Date | null;
}
