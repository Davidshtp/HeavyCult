import { Exclude } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Token } from '../../token/entity/token.entity';

export enum RolUsuario {
  ADMIN = 'ADMIN',
  EMPLEADO = 'EMPLEADO',
}

export enum EstadoUsuario {
  ACTIVO = 'ACTIVO',
  INACTIVO = 'INACTIVO',
  BLOQUEADO = 'BLOQUEADO',
}

@Entity('usuario')
export class Usuario {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id_usuario' })
  id_usuario: number;

  @Column({ type: 'varchar', length: 120, nullable: false, name: 'nombre' })
  nombre: string;

  @Column({ type: 'varchar', length: 120, nullable: false, name: 'apellido' })
  apellido: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
    unique: true,
    name: 'correo',
  })
  correo: string;

  @Exclude()
  @Column({ type: 'varchar', length: 255, nullable: false, name: 'contrasena' })
  contrasena: string;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'telefono' })
  telefono?: string | null;

  @Column({
    type: 'enum',
    enum: RolUsuario,
    nullable: false,
    name: 'rol',
  })
  rol: RolUsuario;

  @Column({
    type: 'enum',
    enum: EstadoUsuario,
    default: EstadoUsuario.ACTIVO,
    name: 'estado',
  })
  estado: EstadoUsuario;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'url_imagen' })
  url_imagen?: string | null;

  @CreateDateColumn({
    type: 'timestamp',
    name: 'fecha_registro',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fecha_registro: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'ultimo_acceso' })
  ultimo_acceso?: Date;

  @Column({ type: 'int', default: 0, name: 'intentos_fallidos' })
  intentos_fallidos: number;

  @Column({ type: 'timestamp', nullable: true, name: 'bloqueado_hasta' })
  bloqueado_hasta?: Date;

  @OneToMany(() => Token, (token) => token.usuario)
  tokens: Token[];
}
