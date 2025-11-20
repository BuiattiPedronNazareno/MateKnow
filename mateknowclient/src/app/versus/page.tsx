'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import versusService from '../services/versusService';

export default function VersusLobbyPage() {
  const router = useRouter();
  const [isSearching, setIsSearching] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Obtener usuario del localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }

    // Conectar al WebSocket
    try {
      const socket = versusService.connect();
      
      // Evento: Conexión exitosa
      socket.on('connected', (data) => {
        console.log('✅ Conectado al servidor:', data);
        setIsConnecting(false);
        setError(null);
      });

      // Evento: Error
      socket.on('error', (err) => {
        console.error('Error del servidor:', err);
        setError(err.message || 'Error desconocido');
        setIsSearching(false);
      });

      // Evento: Buscando partida
      socket.on('searching', (data) => {
        console.log('🔍 Buscando partida:', data);
        setIsSearching(true);
      });

      // Evento: Búsqueda cancelada
      socket.on('search-cancelled', (data) => {
        console.log('❌ Búsqueda cancelada:', data);
        setIsSearching(false);
      });

      // Evento: Partida encontrada
      socket.on('match-found', (data) => {
        console.log('🎯 Partida encontrada:', data);
        setIsSearching(false);
        
        // Redirigir a la página de la partida
        router.push(`/versus/${data.lobbyId}`);
      });

    } catch (err: any) {
      console.error('Error conectando:', err);
      setError(err.message);
      setIsConnecting(false);
    }

    // Cleanup al desmontar
    return () => {
      if (isSearching) {
        versusService.cancelSearch();
      }
    };
  }, [router, isSearching]);

  const handleSearchMatch = () => {
    try {
      setError(null);
      versusService.searchMatch();
      setIsSearching(true);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCancelSearch = () => {
    try {
      versusService.cancelSearch();
      setIsSearching(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (isConnecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-white mx-auto mb-4"></div>
          <p className="text-white text-xl font-semibold">Conectando al servidor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            ⚔️ Modo Versus
          </h1>
          <p className="text-xl text-purple-100">
            Desafía a otro jugador en un duelo matemático 1v1
          </p>
        </div>

        {/* Información del usuario */}
        {user && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 mb-8 text-white">
            <p className="text-lg">
              👤 <span className="font-semibold">{user.nombre} {user.apellido}</span>
            </p>
            <p className="text-sm text-purple-100 mt-1">
              📧 {user.email}
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/20 border-2 border-red-500 rounded-xl p-6 mb-8 text-white">
            <p className="font-semibold">❌ Error:</p>
            <p>{error}</p>
          </div>
        )}

        {/* Card principal */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-8">
            <h2 className="text-3xl font-bold text-white text-center">
              {isSearching ? '🔍 Buscando oponente...' : '🎮 ¿Listo para jugar?'}
            </h2>
          </div>

          <div className="p-8">
            {/* Reglas del juego */}
            <div className="bg-gray-50 rounded-xl p-6 mb-8">
              <h3 className="text-xl font-bold text-gray-800 mb-4">📋 Cómo jugar:</h3>
              <ol className="space-y-2 text-gray-700">
                <li className="flex items-start">
                  <span className="font-bold mr-2">1️⃣</span>
                  <span>Encuentra un oponente automáticamente</span>
                </li>
                <li className="flex items-start">
                  <span className="font-bold mr-2">2️⃣</span>
                  <span>Por turnos, cada uno selecciona 5 preguntas para el rival</span>
                </li>
                <li className="flex items-start">
                  <span className="font-bold mr-2">3️⃣</span>
                  <span>Ambos responden las 5 preguntas asignadas en 90 segundos</span>
                </li>
                <li className="flex items-start">
                  <span className="font-bold mr-2">4️⃣</span>
                  <span>Gana quien obtenga más puntos (respuestas rápidas dan bonus)</span>
                </li>
              </ol>
            </div>

            {/* Estadísticas (placeholder) */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-green-600">-</p>
                <p className="text-sm text-gray-600 mt-1">Victorias</p>
              </div>
              <div className="bg-red-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-red-600">-</p>
                <p className="text-sm text-gray-600 mt-1">Derrotas</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-blue-600">-</p>
                <p className="text-sm text-gray-600 mt-1">Empates</p>
              </div>
            </div>

            {/* Botón principal */}
            <div className="text-center">
              {isSearching ? (
                <div>
                  <div className="animate-pulse mb-4">
                    <div className="h-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"></div>
                  </div>
                  <p className="text-gray-600 mb-4">
                    Esperando a otro jugador...
                  </p>
                  <button
                    onClick={handleCancelSearch}
                    className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-8 rounded-xl transition-colors"
                  >
                    Cancelar búsqueda
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleSearchMatch}
                  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-bold py-4 px-12 rounded-xl text-xl transition-all transform hover:scale-105 shadow-lg"
                >
                  🎮 Buscar Partida
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Volver */}
        <div className="text-center mt-8">
          <button
            onClick={() => router.push('/')}
            className="text-white hover:text-purple-200 transition-colors"
          >
            ← Volver al inicio
          </button>
        </div>
      </div>
    </div>
  );
}