import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuario } from '../../user/entity/usuario.entity';

export enum TipoToken {
  RECUPERAR_CONTRASENA = 'RECUPERAR_CONTRASENA',
}

export enum EstadoToken {
  ACTIVO = 'ACTIVO',
  EXPIRADO = 'EXPIRADO',
  USADO = 'USADO',
}

@Entity('token')
export class Token {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id_token' })
  id_token: number;

  @ManyToOne(() => Usuario, (usuario) => usuario.tokens, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_usuario' })
  usuario: Usuario;

  @Column({ type: 'varchar', length: 8, nullable: false, name: 'token' })
  token: string;

  @Column({ type: 'enum', enum: TipoToken, nullable: false, name: 'tipo' })
  tipo: TipoToken;

  @Column({
    type: 'enum',
    enum: EstadoToken,
    default: EstadoToken.ACTIVO,
    name: 'estado',
  })
  estado: EstadoToken;

  @Column({ type: 'timestamp', nullable: false, name: 'fecha_expiracion' })
  fecha_expiracion: Date;

  @Column({ type: 'int', default: 5, name: 'intentos_restantes' })
  intentos_restantes: number;

  @CreateDateColumn({
    type: 'timestamp',
    name: 'fecha_creacion',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fecha_creacion: Date;
}
