import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class FinalizarIntentoDto {
  @IsString()
  @IsNotEmpty()
  registroId: string;

  @IsOptional()
  @IsNumber()
  tiempoSegundos?: number;
}
