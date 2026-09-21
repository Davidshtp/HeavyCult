import { SetMetadata } from '@nestjs/common';
import { RolUsuario } from '../../user/entity/usuario.entity';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: RolUsuario[]) => SetMetadata(ROLES_KEY, roles);
