import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const notificacionService = {
  getMisNotificaciones: async (token: string) => {
    const response = await axios.get(`${API_URL}/notificacion`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  marcarLeida: async (id: string, token: string) => {
    const response = await axios.patch(`${API_URL}/notificacion/${id}/leer`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  marcarTodasLeidas: async (token: string) => {
    const response = await axios.patch(`${API_URL}/notificacion/marcar-todas`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  eliminarTodas: async (token: string) => {
    const response = await axios.delete(`${API_URL}/notificacion/eliminar-todas`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
};
