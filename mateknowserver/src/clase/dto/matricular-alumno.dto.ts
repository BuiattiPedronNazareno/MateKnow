import { IsNotEmpty, IsUUID } from 'class-validator';

export class MatricularAlumnoDto {
  @IsUUID('4', { message: 'El ID del usuario debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El ID del usuario es obligatorio' })
  usuarioId: string;
}