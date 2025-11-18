import { IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO para iniciar búsqueda de partida
 * No requiere body, la info viene del token JWT
 */
export class SearchMatchDto {
  // Vacío por ahora, el userId viene de req.user.id
  // Puedes agregar preferencias futuras aquí (ej: dificultad)
}