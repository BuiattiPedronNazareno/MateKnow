export interface PlayerSession {
  userId: string;           // UUID del usuario en la BD
  socketId: string;         // ID único del socket conectado
  nombre: string;           // Nombre del jugador
  apellido: string;         // Apellido del jugador
  email: string;            // Email del jugador
  isSearching: boolean;     // ¿Está buscando partida?
  currentLobbyId?: string;  // ID de la lobby actual (si está en una)
  connectedAt: Date;        // Timestamp de conexión
}

