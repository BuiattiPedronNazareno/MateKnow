export interface PlayerSession {
  userId: string;
  socketId: string;
  nombre: string;
  apellido: string;
  email: string;
  isSearching: boolean;
  currentLobbyId?: string;
  currentClaseId?: string;  // NUEVO: Clase donde está buscando partida
  connectedAt: Date;
}