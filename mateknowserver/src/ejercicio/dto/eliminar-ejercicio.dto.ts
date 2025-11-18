import { IsBoolean, IsOptional } from 'class-validator';

export class EliminarEjercicioDto {
  @IsBoolean({ message: 'eliminarActividadesAsociadas debe ser un booleano' })
  @IsOptional()
  eliminarActividadesAsociadas?: boolean = false;
}