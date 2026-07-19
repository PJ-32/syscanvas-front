export interface Canvas {
  codCanvas: number;
  nomCanvas: string;
  desCanvas?: string;
  fecCreacion: string;
  fecModificacion?: string;
  editable: boolean;
  codPyto?: number;
  codPersona?: number;
  totalTareas?: number;
  tareasCompletadas?: number;
  porcentajeProgreso?: number;
  totalComentarios?: number;
  etapasPersonalizadas?: any[];
  estado?: {
    codEstado: number;
    nomEstado: string;
    desEstado: string;
    vigente: number;
  };
  tipoCanvas?: {
    tipCanvas: string;
    desTipCanvas: string;
    vigente: number;
  };
}
