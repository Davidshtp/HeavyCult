import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EstadoInstanciaWhatsapp, ProveedorWhatsapp } from './whatsapp.enums';

@Entity('whatsapp_instancia')
export class WhatsappInstancia {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id_instancia' })
  id_instancia: number;

  @Column({
    type: 'enum',
    enum: ProveedorWhatsapp,
    enumName: 'whatsapp_proveedor_enum',
    default: ProveedorWhatsapp.EVOLUTION_BAILEYS,
    name: 'proveedor',
  })
  proveedor: ProveedorWhatsapp;

  @Column({ type: 'varchar', length: 80, unique: true, name: 'nombre' })
  nombre: string;

  @Column({ type: 'varchar', length: 120, name: 'id_externo' })
  id_externo: string;

  @Column({ type: 'int', nullable: true, name: 'id_integracion' })
  id_integracion: number | null;

  @Column({
    type: 'enum',
    enum: EstadoInstanciaWhatsapp,
    enumName: 'whatsapp_estado_instancia_enum',
    default: EstadoInstanciaWhatsapp.DESCONECTADA,
    name: 'estado',
  })
  estado: EstadoInstanciaWhatsapp;

  @Column({ type: 'varchar', length: 30, nullable: true, name: 'numero' })
  numero: string | null;

  @Column({ type: 'text', nullable: true, name: 'qr_base64' })
  qr_base64: string | null;

  @Column({ type: 'text', nullable: true, name: 'qr_code' })
  qr_code: string | null;

  @Column({ type: 'timestamp', nullable: true, name: 'qr_expira_at' })
  qr_expira_at: Date | null;

  @Column({ type: 'text', name: 'webhook_secret_cifrado' })
  webhook_secret_cifrado: string;

  @Column({ type: 'jsonb', nullable: true, name: 'config' })
  config: Record<string, string | boolean | number> | null;

  @CreateDateColumn({
    type: 'timestamp',
    name: 'fecha_creacion',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fecha_creacion: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    name: 'fecha_actualizacion',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fecha_actualizacion: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true, name: 'deleted_at' })
  deleted_at: Date | null;
}
