import { IsOptional, IsString } from 'class-validator';

export class UpdateTipoEjercicioDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;
}
