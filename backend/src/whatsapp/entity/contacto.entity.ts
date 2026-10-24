import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrigenContacto } from './whatsapp.enums';

@Entity('contacto')
export class Contacto {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id_contacto' })
  id_contacto: number;

  @Column({
    type: 'varchar',
    length: 30,
    unique: true,
    name: 'telefono_e164',
  })
  telefono_e164: string;

  @Column({ type: 'varchar', length: 80, nullable: true, name: 'wa_id' })
  wa_id: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true, name: 'jid' })
  jid: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true, name: 'nombre' })
  nombre: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true, name: 'apellido' })
  apellido: string | null;

  @Column({ type: 'varchar', length: 160, nullable: true, name: 'email' })
  email: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true, name: 'documento' })
  documento: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'direccion' })
  direccion: string | null;

  @Column({
    type: 'varchar',
    length: 2,
    nullable: true,
    name: 'departamento_id',
  })
  departamento_id: string | null;

  @Column({ type: 'varchar', length: 5, nullable: true, name: 'municipio_id' })
  municipio_id: string | null;

  @Column({
    type: 'enum',
    enum: OrigenContacto,
    enumName: 'whatsapp_origen_contacto_enum',
    default: OrigenContacto.ORGANICO,
    name: 'origen',
  })
  origen: OrigenContacto;

  @Column({ type: 'text', nullable: true, name: 'notas' })
  notas: string | null;

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
