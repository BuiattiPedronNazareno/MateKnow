'use client';

import { useRouter } from 'next/navigation';

interface ResultsModalProps {
  youWon: boolean;
  isDraw: boolean;
  winner: {
    userId: string;
    nombre: string;
    apellido: string;
    points: number;
  } | null;
  player1: {
    userId: string;
    nombre: string;
    apellido: string;
    totalPoints: number;
    correctAnswers: number;
    answers: any[];
  };
  player2: {
    userId: string;
    nombre: string;
    apellido: string;
    totalPoints: number;
    correctAnswers: number;
    answers: any[];
  };
  currentUserId: string;
}

export default function ResultsModal({
  youWon,
  isDraw,
  winner,
  player1,
  player2,
  currentUserId,
}: ResultsModalProps) {
  const router = useRouter();

  const currentPlayer = player1.userId === currentUserId ? player1 : player2;
  const opponent = player1.userId === currentUserId ? player2 : player1;

  const handlePlayAgain = () => {
    router.push('/versus');
  };

  const handleGoHome = () => {
    router.push('/');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header con resultado */}
        <div
          className={`p-8 text-center ${
            isDraw
              ? 'bg-gradient-to-r from-yellow-400 to-orange-400'
              : youWon
                ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                : 'bg-gradient-to-r from-red-400 to-pink-500'
          }`}
        >
          <div className="text-6xl mb-4">
            {isDraw ? '🤝' : youWon ? '🏆' : '😔'}
          </div>
          <h2 className="text-4xl font-bold text-white mb-2">
            {isDraw ? '¡Empate!' : youWon ? '¡Victoria!' : '¡Derrota!'}
          </h2>
          {!isDraw && winner && (
            <p className="text-xl text-white/90">
              {youWon ? '¡Felicidades!' : `${winner.nombre} ganó esta ronda`}
            </p>
          )}
        </div>

        {/* Comparación de puntajes */}
        <div className="p-8">
          <div className="grid grid-cols-2 gap-6 mb-8">
            {/* Tu puntaje */}
            <div
              className={`rounded-xl p-6 text-center ${
                youWon
                  ? 'bg-green-50 border-2 border-green-500'
                  : 'bg-gray-50 border-2 border-gray-300'
              }`}
            >
              <p className="text-sm font-semibold text-gray-600 mb-2">
                🎮 Tú
              </p>
              <p className="text-lg font-semibold text-gray-800 mb-1">
                {currentPlayer.nombre} {currentPlayer.apellido}
              </p>
              <p className="text-4xl font-bold text-purple-600 mb-2">
                {currentPlayer.totalPoints}
              </p>
              <p className="text-sm text-gray-600">
                ✅ {currentPlayer.correctAnswers}/5 correctas
              </p>
            </div>

            {/* Puntaje del oponente */}
            <div
              className={`rounded-xl p-6 text-center ${
                !youWon && !isDraw
                  ? 'bg-green-50 border-2 border-green-500'
                  : 'bg-gray-50 border-2 border-gray-300'
              }`}
            >
              <p className="text-sm font-semibold text-gray-600 mb-2">
                👤 Oponente
              </p>
              <p className="text-lg font-semibold text-gray-800 mb-1">
                {opponent.nombre} {opponent.apellido}
              </p>
              <p className="text-4xl font-bold text-blue-600 mb-2">
                {opponent.totalPoints}
              </p>
              <p className="text-sm text-gray-600">
                ✅ {opponent.correctAnswers}/5 correctas
              </p>
            </div>
          </div>

          {/* Detalles de respuestas */}
          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              📊 Detalles de tus respuestas
            </h3>
            <div className="space-y-2">
              {currentPlayer.answers.map((answer, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    answer.isCorrect
                      ? 'bg-green-100 border border-green-300'
                      : 'bg-red-100 border border-red-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {answer.isCorrect ? '✅' : '❌'}
                    </span>
                    <div>
                      <p className="font-semibold text-gray-800">
                        Pregunta {index + 1}
                      </p>
                      <p className="text-sm text-gray-600">
                        Tiempo: {answer.timeSeconds}s
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-800">
                      +{answer.points}
                    </p>
                    <p className="text-xs text-gray-600">puntos</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Estadísticas adicionales */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">
                {Math.round(
                  currentPlayer.answers.reduce((sum, a) => sum + a.timeSeconds, 0) /
                    currentPlayer.answers.length
                )}s
              </p>
              <p className="text-xs text-gray-600 mt-1">Tiempo promedio</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-600">
                {Math.round((currentPlayer.correctAnswers / 5) * 100)}%
              </p>
              <p className="text-xs text-gray-600 mt-1">Precisión</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">
                {Math.max(...currentPlayer.answers.map((a) => a.points))}
              </p>
              <p className="text-xs text-gray-600 mt-1">Mejor puntuación</p>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-4">
            <button
              onClick={handlePlayAgain}
              className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg"
            >
              🔄 Jugar de nuevo
            </button>
            <button
              onClick={handleGoHome}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-4 rounded-xl transition-colors"
            >
              🏠 Volver al inicio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}