'use client';

import { useState } from 'react';
import Timer from './Timer';

interface Question {
  id: string;
  enunciado: string;
  opciones: string[];
  respuestaCorrecta: number;
  categoria: string;
}

interface SelectionPhaseProps {
  questions: Question[];
  lobbyId: string;
  yourTurn: boolean;
  currentTurn: string;
  mySelections: string[];
  opponentSelections: number;
  onSelectQuestion: (questionId: string) => void;
  opponent: {
    nombre: string;
    apellido: string;
  };
}

export default function SelectionPhase({
  questions,
  lobbyId,
  yourTurn,
  currentTurn,
  mySelections,
  opponentSelections,
  onSelectQuestion,
  opponent,
}: SelectionPhaseProps) {
  const [selectedForPreview, setSelectedForPreview] = useState<string | null>(null);

  const handleQuestionClick = (questionId: string) => {
    if (!yourTurn) {
      return;
    }

    if (mySelections.includes(questionId)) {
      return;
    }

    if (mySelections.length >= 5) {
      return;
    }

    onSelectQuestion(questionId);
  };

  const isQuestionDisabled = (questionId: string) => {
    return mySelections.includes(questionId) || !yourTurn || mySelections.length >= 5;
  };

  const selectedQuestion = questions.find((q) => q.id === selectedForPreview);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              🎯 Fase de Selección
            </h2>
            <p className="text-gray-600 mt-1">
              Selecciona 5 preguntas para que <span className="font-semibold">{opponent.nombre}</span> responda
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-purple-600">
              {mySelections.length}/5
            </p>
            <p className="text-sm text-gray-600">Seleccionadas</p>
          </div>
        </div>

        {/* Timer de turno */}
        <Timer initialTime={20} startTime={new Date()} />
      </div>

      {/* Indicador de turno */}
      <div
        className={`rounded-xl p-4 text-center font-semibold ${
          yourTurn
            ? 'bg-green-100 text-green-800 border-2 border-green-500'
            : 'bg-gray-100 text-gray-600 border-2 border-gray-300'
        }`}
      >
        {yourTurn ? (
          <>✅ Es tu turno - Selecciona una pregunta</>
        ) : (
          <>⏳ Esperando a {opponent.nombre}... ({opponentSelections}/5)</>
        )}
      </div>

      {/* Grid de preguntas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {questions.map((question) => {
          const isSelected = mySelections.includes(question.id);
          const isDisabled = isQuestionDisabled(question.id);

          return (
            <button
              key={question.id}
              onClick={() => handleQuestionClick(question.id)}
              onMouseEnter={() => setSelectedForPreview(question.id)}
              onMouseLeave={() => setSelectedForPreview(null)}
              disabled={isDisabled}
              className={`
                relative p-4 rounded-xl border-2 text-left transition-all
                ${
                  isSelected
                    ? 'bg-purple-100 border-purple-500 cursor-not-allowed'
                    : isDisabled
                      ? 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-50'
                      : 'bg-white border-gray-200 hover:border-purple-400 hover:shadow-lg cursor-pointer transform hover:scale-105'
                }
              `}
            >
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <span className="bg-purple-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    ✓ Elegida
                  </span>
                </div>
              )}
              
              <div className="text-xs font-semibold text-purple-600 mb-2">
                {question.categoria}
              </div>
              <div className="text-sm font-medium text-gray-800 line-clamp-2">
                {question.enunciado}
              </div>
              <div className="mt-2 text-xs text-gray-500">
                {question.id.toUpperCase()}
              </div>
            </button>
          );
        })}
      </div>

      {/* Preview de pregunta */}
      {selectedQuestion && (
        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-purple-300">
          <div className="flex items-start justify-between mb-4">
            <div>
              <span className="text-xs font-semibold text-purple-600 bg-purple-100 px-2 py-1 rounded">
                {selectedQuestion.categoria}
              </span>
            </div>
            <span className="text-sm text-gray-500">{selectedQuestion.id.toUpperCase()}</span>
          </div>
          
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            {selectedQuestion.enunciado}
          </h3>
          
          <div className="space-y-2">
            {selectedQuestion.opciones.map((opcion, index) => (
              <div
                key={index}
                className="p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <span className="font-semibold text-gray-600 mr-2">
                  {String.fromCharCode(65 + index)}.
                </span>
                {opcion}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}