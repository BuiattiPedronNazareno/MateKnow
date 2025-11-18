import { IsString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';

export class RespuestaParcialDto {
  @IsString()
  @IsNotEmpty()
  registroId: string;

  // mapa ejercicioId => respuesta (puede ser opcionId u otro formato según tipo)
  @IsObject()
  respuestas: Record<string, any>;

  @IsOptional()
  @IsString()
  actividadId?: string;
}
