import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import {
  BCRYPT_SALT_ROUNDS,
  LOGIN_BLOCK_MINUTES,
  MAX_LOGIN_ATTEMPTS,
} from '../config/constants';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { EstadoUsuario, RolUsuario, Usuario } from './entity/usuario.entity';

export interface ActualizarPerfilCampos {
  nombre?: string;
  apellido?: string;
  correo?: string;
  telefono?: string | null;
}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    private readonly configService: ConfigService,
  ) {}

  async findUserByEmail(correo: string): Promise<Usuario | null> {
    return this.usuarioRepository.findOne({ where: { correo } });
  }

  async findById(idUsuario: number): Promise<Usuario> {
    const usuario = await this.usuarioRepository.findOne({
      where: { id_usuario: idUsuario },
    });
    if (!usuario) {
      throw new NotFoundException('El usuario no existe.');
    }
    return usuario;
  }

  async findAll(): Promise<Usuario[]> {
    return this.usuarioRepository.find({
      order: { fecha_registro: 'DESC' },
    });
  }

  async create(dto: CreateUsuarioDto): Promise<Usuario> {
    const existe = await this.findUserByEmail(dto.correo);
    if (existe) {
      throw new ConflictException('Ya existe un usuario con ese correo.');
    }

    const usuario = this.usuarioRepository.create({
      nombre: dto.nombre,
      apellido: dto.apellido,
      correo: dto.correo,
      contrasena: await this.hashedPassword(dto.contrasena),
      telefono: dto.telefono,
      rol: dto.rol as RolUsuario,
      estado: EstadoUsuario.ACTIVO,
    });

    return this.usuarioRepository.save(usuario);
  }

  async cambiarEstado(
    idUsuario: number,
    estado: EstadoUsuario,
  ): Promise<Usuario> {
    const usuario = await this.findById(idUsuario);
    usuario.estado = estado;
    return this.usuarioRepository.save(usuario);
  }

  async actualizarPerfil(
    idUsuario: number,
    campos: ActualizarPerfilCampos,
  ): Promise<Usuario> {
    if (campos.correo !== undefined) {
      const existente = await this.findUserByEmail(campos.correo);
      if (existente && existente.id_usuario !== idUsuario) {
        throw new ConflictException('Ya existe un usuario con ese correo.');
      }
    }

    const usuario = await this.findById(idUsuario);

    if (campos.nombre !== undefined) usuario.nombre = campos.nombre;
    if (campos.apellido !== undefined) usuario.apellido = campos.apellido;
    if (campos.correo !== undefined) usuario.correo = campos.correo;
    if (campos.telefono !== undefined) usuario.telefono = campos.telefono;

    return this.usuarioRepository.save(usuario);
  }

  async guardarUrlImagen(
    idUsuario: number,
    urlImagen: string | null,
  ): Promise<Usuario> {
    const usuario = await this.findById(idUsuario);
    usuario.url_imagen = urlImagen;
    return this.usuarioRepository.save(usuario);
  }

  async registrarAccesoExitoso(usuario: Usuario): Promise<void> {
    usuario.ultimo_acceso = new Date();
    usuario.intentos_fallidos = 0;
    usuario.bloqueado_hasta = undefined;
    await this.usuarioRepository.save(usuario);
  }

  async registrarIntentoFallido(usuario: Usuario): Promise<Usuario> {
    const maxIntentos = this.configService.get<number>(MAX_LOGIN_ATTEMPTS) ?? 5;

    usuario.intentos_fallidos = (usuario.intentos_fallidos || 0) + 1;

    if (usuario.intentos_fallidos >= maxIntentos) {
      const bloqueoMin =
        this.configService.get<number>(LOGIN_BLOCK_MINUTES) ?? 15;
      usuario.bloqueado_hasta = new Date(Date.now() + bloqueoMin * 60 * 1000);
      usuario.intentos_fallidos = 0;
    }

    return this.usuarioRepository.save(usuario);
  }

  async actualizarContrasena(idUsuario: number, hash: string): Promise<void> {
    const usuario = await this.findById(idUsuario);
    usuario.contrasena = hash;
    await this.usuarioRepository.save(usuario);
  }

  hashedPassword(contrasena: string): Promise<string> {
    const saltRounds = this.configService.get<number>(BCRYPT_SALT_ROUNDS) ?? 10;
    return bcrypt.hash(contrasena, saltRounds);
  }
}
