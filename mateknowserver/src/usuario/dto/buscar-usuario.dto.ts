import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class BuscarUsuarioDto {
  @IsEmail({}, { message: 'Debe ser un email válido' })
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  nombre?: string;
}