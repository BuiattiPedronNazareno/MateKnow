import { IsNotEmpty, IsString } from 'class-validator';

export class CreateTipoEjercicioDto {
  @IsNotEmpty()
  @IsString()
  key: string;

  @IsNotEmpty()
  @IsString()
  nombre: string;

  @IsString()
  descripcion?: string;
}
