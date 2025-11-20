import { IsOptional, IsArray } from 'class-validator';

export class FinalizarIntentoDto {
  @IsOptional()
  @IsArray()
  respuestas?: any[]; 
}