import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  EstadoConversacion,
  EtapaConversacion,
  ModoConversacion,
} from './whatsapp.enums';

@Entity('conversacion')
export class Conversacion {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id_conversacion' })
  id_conversacion: number;

  @Column({ type: 'int', name: 'id_contacto' })
  id_contacto: number;

  @Column({ type: 'int', name: 'id_instancia' })
  id_instancia: number;

  @Column({
    type: 'enum',
    enum: EstadoConversacion,
    enumName: 'whatsapp_estado_conversacion_enum',
    default: EstadoConversacion.ABIERTA,
    name: 'estado',
  })
  estado: EstadoConversacion;

  @Column({
    type: 'enum',
    enum: ModoConversacion,
    enumName: 'whatsapp_modo_conversacion_enum',
    default: ModoConversacion.HUMANO,
    name: 'modo',
  })
  modo: ModoConversacion;

  @Column({
    type: 'enum',
    enum: EtapaConversacion,
    enumName: 'whatsapp_etapa_conversacion_enum',
    default: EtapaConversacion.NUEVO,
    name: 'etapa',
  })
  etapa: EtapaConversacion;

  @Column({ type: 'int', nullable: true, name: 'asignado_a' })
  asignado_a: number | null;

  @Column({ type: 'int', default: 0, name: 'no_leidos' })
  no_leidos: number;

  @Column({ type: 'text', nullable: true, name: 'resumen_ia' })
  resumen_ia: string | null;

  @Column({ type: 'timestamp', nullable: true, name: 'ultimo_mensaje_at' })
  ultimo_mensaje_at: Date | null;

  @Column({
    type: 'varchar',
    length: 120,
    nullable: true,
    name: 'id_pedido_shopify',
  })
  id_pedido_shopify: string | null;

  @Column({
    type: 'varchar',
    length: 40,
    nullable: true,
    name: 'numero_pedido',
  })
  numero_pedido: string | null;

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
}
