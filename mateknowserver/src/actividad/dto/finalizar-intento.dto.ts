import { IsOptional, IsArray, IsNumber } from 'class-validator';

export class FinalizarIntentoDto {
  @IsOptional()
  @IsArray()
  respuestas?: any[];

  @IsOptional()
  @IsNumber()
  tiempoSegundos?: number;
}