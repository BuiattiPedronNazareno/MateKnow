import { IsNotEmpty, IsUUID } from 'class-validator';

export class RespuestaParcialDto {
  @IsUUID()
  ejercicioId: string;
  
  // Esto permite strings (IDs), números, objetos o booleanos sin lanzar error 400.
  @IsNotEmpty() 
  respuesta: any; 
}