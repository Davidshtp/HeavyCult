import { Injectable } from '@nestjs/common';
import departamentos from './data/departamentos.json';
import municipios from './data/municipios.json';
import type { Departamento, Municipio } from './envios.types';

/**
 * Cobertura de envíos de Colombia (DIVIPOLA/DANE). Es un catálogo fijo que viaja
 * en el bundle: no hay tarifas ni precios, solo la geografía departamento →
 * municipio que el panel de pedidos usa para la dirección de envío.
 */
@Injectable()
export class EnviosService {
  private readonly departamentos: Departamento[] = departamentos;
  private readonly municipios: Municipio[] = municipios;

  listarDepartamentos(): Departamento[] {
    return this.departamentos;
  }

  listarMunicipios(departamentoId: string): Municipio[] {
    return this.municipios.filter(
      (municipio) => municipio.departamento_id === departamentoId,
    );
  }
}
