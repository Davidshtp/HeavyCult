import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  DireccionMensaje,
  EstadoMensaje,
  OrigenMensaje,
  TipoMensaje,
} from './whatsapp.enums';

@Entity('mensaje')
export class Mensaje {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id_mensaje' })
  id_mensaje: number;

  @Column({ type: 'int', name: 'id_conversacion' })
  id_conversacion: number;

  @Column({ type: 'int', name: 'id_instancia' })
  id_instancia: number;

  @Column({
    type: 'varchar',
    length: 120,
    nullable: true,
    name: 'wa_message_id',
  })
  wa_message_id: string | null;

  @Column({
    type: 'enum',
    enum: DireccionMensaje,
    enumName: 'whatsapp_direccion_mensaje_enum',
    name: 'direccion',
  })
  direccion: DireccionMensaje;

  @Column({
    type: 'enum',
    enum: OrigenMensaje,
    enumName: 'whatsapp_origen_mensaje_enum',
    name: 'origen',
  })
  origen: OrigenMensaje;

  @Column({
    type: 'enum',
    enum: TipoMensaje,
    enumName: 'whatsapp_tipo_mensaje_enum',
    default: TipoMensaje.TEXTO,
    name: 'tipo',
  })
  tipo: TipoMensaje;

  @Column({ type: 'text', nullable: true, name: 'contenido' })
  contenido: string | null;

  @Column({ type: 'text', nullable: true, name: 'media_url' })
  media_url: string | null;

  @Column({
    type: 'enum',
    enum: EstadoMensaje,
    enumName: 'whatsapp_estado_mensaje_enum',
    default: EstadoMensaje.PENDIENTE,
    name: 'estado',
  })
  estado: EstadoMensaje;

  @Column({ type: 'jsonb', nullable: true, name: 'metadata' })
  metadata: Record<string, unknown> | null;

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
