import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EstadoEventoWhatsapp } from './whatsapp.enums';

@Entity('evento_whatsapp')
export class EventoWhatsapp {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id_evento' })
  id_evento: number;

  @Column({ type: 'int', name: 'id_instancia' })
  id_instancia: number;

  @Column({
    type: 'varchar',
    length: 200,
    name: 'id_evento_externo',
  })
  id_evento_externo: string;

  @Column({ type: 'varchar', length: 60, name: 'tipo' })
  tipo: string;

  @Column({ type: 'jsonb', name: 'payload' })
  payload: Record<string, unknown>;

  @Column({
    type: 'enum',
    enum: EstadoEventoWhatsapp,
    enumName: 'whatsapp_estado_evento_enum',
    default: EstadoEventoWhatsapp.PENDIENTE,
    name: 'estado',
  })
  estado: EstadoEventoWhatsapp;

  @Column({ type: 'int', default: 0, name: 'intentos' })
  intentos: number;

  @Column({ type: 'text', nullable: true, name: 'error' })
  error: string | null;

  @CreateDateColumn({
    type: 'timestamp',
    name: 'fecha_creacion',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fecha_creacion: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'fecha_procesado' })
  fecha_procesado: Date | null;
}
