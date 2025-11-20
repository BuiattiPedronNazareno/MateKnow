'use client';

import { useState, useEffect } from 'react';
import Timer from './Timer';

interface Question {
  id: string;
  enunciado: string;
  opciones: string[];
  respuestaCorrecta: number;
  categoria: string;
}

interface AnsweringPhaseProps {
  questions: Question[];
  lobbyId: string;
  onAnswerQuestion: (questionId: string, selectedOption: number, timeSeconds: number) => void;
  answeredQuestions: string[];
  totalPoints: number;
  answeringStartedAt: Date;
  opponent: {
    nombre: string;
    apellido: string;
  };
  opponentProgress: number;
}

export default function AnsweringPhase({
  questions,
  lobbyId,
  onAnswerQuestion,
  answeredQuestions,
  totalPoints,
  answeringStartedAt,
  opponent,
  opponentProgress,
}: AnsweringPhaseProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());

  const currentQuestion = questions[currentQuestionIndex];
  const isAnswered = answeredQuestions.includes(currentQuestion?.id);

  useEffect(() => {
    // Reset cuando cambia la pregunta
    setSelectedOption(null);
    setQuestionStartTime(Date.now());
  }, [currentQuestionIndex]);

  const handleOptionSelect = (optionIndex: number) => {
    if (isAnswered) return;
    setSelectedOption(optionIndex);
  };

  const handleSubmitAnswer = () => {
    if (selectedOption === null || isAnswered) return;

    const timeSeconds = Math.floor((Date.now() - questionStartTime) / 1000);
    onAnswerQuestion(currentQuestion.id, selectedOption, timeSeconds);

    // Pasar a la siguiente pregunta
    if (currentQuestionIndex < questions.length - 1) {
      setTimeout(() => {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      }, 500);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  if (!currentQuestion) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-purple-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Cargando preguntas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              ⚡ Fase de Respuestas
            </h2>
            <p className="text-gray-600 mt-1">
              Responde las preguntas seleccionadas por {opponent.nombre}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-blue-600">
              {totalPoints}
            </p>
            <p className="text-sm text-gray-600">Puntos</p>
          </div>
        </div>

        {/* Timer global */}
        <Timer
          initialTime={90}
          startTime={answeringStartedAt}
          onTimeUp={() => console.log('⏰ Tiempo agotado!')}
        />

        {/* Progreso */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-sm text-gray-600">Tu progreso</p>
            <p className="text-xl font-bold text-blue-600">
              {answeredQuestions.length}/{questions.length}
            </p>
          </div>
          <div className="bg-purple-50 rounded-lg p-3">
            <p className="text-sm text-gray-600">{opponent.nombre}</p>
            <p className="text-xl font-bold text-purple-600">
              {opponentProgress}/{questions.length}
            </p>
          </div>
        </div>
      </div>

      {/* Navegación de preguntas */}
      <div className="flex items-center justify-center gap-2">
        {questions.map((q, index) => (
          <button
            key={q.id}
            onClick={() => setCurrentQuestionIndex(index)}
            className={`
              w-10 h-10 rounded-lg font-bold transition-all
              ${
                index === currentQuestionIndex
                  ? 'bg-purple-500 text-white scale-110'
                  : answeredQuestions.includes(q.id)
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }
            `}
          >
            {index + 1}
          </button>
        ))}
      </div>

      {/* Pregunta actual */}
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center justify-between mb-6">
          <span className="text-sm font-semibold text-purple-600 bg-purple-100 px-3 py-1 rounded-full">
            {currentQuestion.categoria}
          </span>
          <span className="text-sm text-gray-500">
            Pregunta {currentQuestionIndex + 1} de {questions.length}
          </span>
        </div>

        <h3 className="text-2xl font-bold text-gray-800 mb-8">
          {currentQuestion.enunciado}
        </h3>

        {/* Opciones */}
        <div className="space-y-3 mb-8">
          {currentQuestion.opciones.map((opcion, index) => (
            <button
              key={index}
              onClick={() => handleOptionSelect(index)}
              disabled={isAnswered}
              className={`
                w-full p-4 rounded-xl border-2 text-left transition-all
                ${
                  selectedOption === index
                    ? 'bg-purple-100 border-purple-500 shadow-md'
                    : isAnswered
                      ? 'bg-gray-100 border-gray-300 cursor-not-allowed'
                      : 'bg-white border-gray-200 hover:border-purple-300 hover:shadow-md cursor-pointer'
                }
              `}
            >
              <div className="flex items-center">
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center font-bold mr-4
                    ${
                      selectedOption === index
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }
                  `}
                >
                  {String.fromCharCode(65 + index)}
                </div>
                <span className="text-lg">{opcion}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Botones de acción */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePreviousQuestion}
            disabled={currentQuestionIndex === 0}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            ← Anterior
          </button>

          {isAnswered ? (
            <div className="flex items-center gap-2 text-green-600 font-semibold">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Respondida
            </div>
          ) : (
            <button
              onClick={handleSubmitAnswer}
              disabled={selectedOption === null}
              className="px-8 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl font-bold hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
            >
              Confirmar respuesta
            </button>
          )}

          <button
            onClick={handleNextQuestion}
            disabled={currentQuestionIndex === questions.length - 1}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Siguiente →
          </button>
        </div>
      </div>
    </div>
  );
}