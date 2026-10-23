export interface Departamento {
  id: string;
  nombre: string;
}

export interface Municipio {
  id: string;
  departamento_id: string;
  nombre: string;
}
