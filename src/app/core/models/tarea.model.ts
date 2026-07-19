export interface Tarea {
  codTarea?: number;
  nomTarea: string;
  desTarea?: string;
  fecCreacion?: string;
  fecModificacion?: string;
  numTarea?: number;
  vigente: number; // 1 = Pendiente, 0 = Completada
  codEtapa: number;
  codCanvas: number;
  codPersona?: number;
  etapa?: {
    codEtapa: number;
    nomEtapa?: string;
    numEtapa?: number;
    codCanvas?: number;
    vigente?: number;
  };
}
