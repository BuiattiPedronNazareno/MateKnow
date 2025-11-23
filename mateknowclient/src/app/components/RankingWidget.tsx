"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  Typography,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Chip,
  useTheme,
  alpha,
  CircularProgress,
} from "@mui/material";
import { EmojiEventsRounded, PersonRounded } from "@mui/icons-material";
import { io, Socket } from "socket.io-client";
import { actividadService } from "../services/actividadService";
import { authService } from "../services/authService";

interface RankingUser {
  usuario: {
    id: string;
    nombre: string;
    apellido: string;
    email: string;
    alias?: string;
  };
  puntaje: number;
}

interface RankingWidgetProps {
  backendUrl?: string;
  claseId?: string;
}

export default function RankingWidget({
  backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
  claseId,
}: RankingWidgetProps) {
  const theme = useTheme();
  const [tabIndex, setTabIndex] = useState(0);
  const [rankingData, setRankingData] = useState<RankingUser[]>([]);
  const [versusRankingData, setVersusRankingData] = useState<RankingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };

  // Helper para mostrar Nombre si no hay Alias (Soluciona el problema de nombres en blanco)
  const getDisplayName = (usuario: RankingUser["usuario"]) => {
    if (usuario.alias && usuario.alias.trim() !== "") {
      return usuario.alias;
    }
    return `${usuario.nombre} ${usuario.apellido}`;
  };

  // Fetch initial data
  useEffect(() => {
    const fetchRanking = async () => {
      try {
        setLoading(true);
        let data;
        let versusData;
        if (claseId) {
          data = await actividadService.getClaseRanking(claseId);
          versusData = await actividadService.getClaseVersusRanking(claseId);
        } else {
          data = await actividadService.getGlobalRanking();
          versusData = await actividadService.getGlobalVersusRanking();
        }
        setRankingData(data);
        setVersusRankingData(versusData);
      } catch (error) {
        console.error("Error fetching ranking:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRanking();
  }, [claseId]);

  // Socket connection
  useEffect(() => {
    const token = authService.getToken();
    if (!token) return;

    const newSocket = io(`${backendUrl}/ranking`, {
      transports: ["websocket"],
      query: { token },
    });

    newSocket.on("connect", () => {
      console.log("Connected to Ranking Socket");
    });

    newSocket.on("ranking_update", (payload: any) => {
      console.log("Ranking update received:", payload);

      if (claseId && payload.claseId !== claseId) {
        return;
      }

      const fetchRanking = async () => {
        try {
          if (payload.type === "versus") {
            if (claseId) {
              const versusData =
                await actividadService.getClaseVersusRanking(claseId);
              setVersusRankingData(versusData);
            } else {
              const versusData =
                await actividadService.getGlobalVersusRanking();
              setVersusRankingData(versusData);
            }
          } else if (payload.type === "actividad") {
            if (claseId) {
              const data = await actividadService.getClaseRanking(claseId);
              setRankingData(data);
            } else {
              const data = await actividadService.getGlobalRanking();
              setRankingData(data);
            }
          } else {
            // Fallback
            if (claseId) {
              const data = await actividadService.getClaseRanking(claseId);
              const versusData =
                await actividadService.getClaseVersusRanking(claseId);
              setRankingData(data);
              setVersusRankingData(versusData);
            } else {
              const data = await actividadService.getGlobalRanking();
              const versusData =
                await actividadService.getGlobalVersusRanking();
              setRankingData(data);
              setVersusRankingData(versusData);
            }
          }
        } catch (error) {
          console.error("Error updating ranking:", error);
        }
      };
      fetchRanking();
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [backendUrl, claseId]);

  return (
    <Card
      elevation={3}
      sx={{
        mt: 3,
        borderRadius: 4,
        overflow: "hidden",
        background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
        boxShadow: `0 8px 24px ${alpha(theme.palette.common.black, 0.05)}`,
      }}
    >
      <Box
        sx={{
          p: 3,
          background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center", // Centrado
          position: "relative", // Necesario para posicionar la pill absoluta
        }}
      >
        <Typography
          variant="h6"
          fontWeight="bold"
          sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
        >
          {claseId ? "Clasificación de Clase" : "Clasificación Global"}
        </Typography>
        
        <Chip
          label="Temporada 1"
          size="small"
          sx={{
            bgcolor: "rgba(255,255,255,0.2)",
            color: "white",
            fontWeight: "bold",
            backdropFilter: "blur(4px)",
            position: "absolute", // Posicionamiento absoluto
            right: 50, // AUMENTADO: Antes era 20, ahora 50 para alejarlo del borde curvo
          }}
        />
      </Box>

      <Tabs
        value={tabIndex}
        onChange={handleTabChange}
        variant="fullWidth"
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          "& .MuiTab-root": {
            py: 2,
            fontWeight: "bold",
            fontSize: "0.95rem",
            transition: "all 0.2s",
            "&.Mui-selected": {
              color: theme.palette.primary.main,
              bgcolor: alpha(theme.palette.primary.main, 0.05),
            },
          },
        }}
      >
        <Tab label="Actividades" />
        <Tab label="Versus" />
      </Tabs>

      <Box sx={{ minHeight: 300, position: "relative" }}>
        {tabIndex === 0 && (
          <Box>
            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 6 }}>
                <CircularProgress size={40} thickness={4} />
              </Box>
            ) : (
              <List disablePadding sx={{ pb: 2 }}>
                {rankingData.map((item, index) => {
                  const isTop3 = index < 3;
                  const medalColor =
                    index === 0
                      ? "#FFD700"
                      : index === 1
                        ? "#C0C0C0"
                        : "#CD7F32";
                  
                  // Calcular inicial para el avatar (fallback)
                  const inicialName = item.usuario.alias?.[0] || item.usuario.nombre?.[0];

                  return (
                    <ListItem
                      key={item.usuario.id}
                      divider={index !== rankingData.length - 1}
                      sx={{
                        py: 2,
                        px: 3,
                        transition: "all 0.2s",
                        "&:hover": {
                          bgcolor: alpha(theme.palette.primary.main, 0.02),
                          transform: "translateX(4px)",
                        },
                      }}
                    >
                      <ListItemAvatar sx={{ minWidth: 50 }}>
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: "900",
                            color: isTop3
                              ? medalColor
                              : theme.palette.text.secondary,
                            fontSize: isTop3 ? "1.4rem" : "1.1rem",
                            textShadow: isTop3
                              ? `0 2px 4px ${alpha(medalColor, 0.3)}`
                              : "none",
                          }}
                        >
                          {isTop3 ? (
                            <EmojiEventsRounded sx={{ fontSize: 32 }} />
                          ) : (
                            `#${index + 1}`
                          )}
                        </Box>
                      </ListItemAvatar>

                      <ListItemAvatar>
                        <Avatar
                          sx={{
                            bgcolor: isTop3
                              ? alpha(medalColor, 0.1)
                              : alpha(theme.palette.primary.main, 0.1),
                            color: isTop3
                              ? medalColor
                              : theme.palette.primary.main,
                            fontWeight: "bold",
                            border: isTop3 ? `2px solid ${medalColor}` : "none",
                          }}
                        >
                          {inicialName || <PersonRounded />}
                        </Avatar>
                      </ListItemAvatar>

                      <ListItemText
                        primary={
                          <Typography
                            variant="subtitle1"
                            fontWeight="bold"
                            noWrap
                          >
                            {/* Uso del helper para mostrar nombre */}
                            {getDisplayName(item.usuario)}
                          </Typography>
                        }
                        sx={{ mr: 2 }}
                      />

                      <Chip
                        label={`${item.puntaje} pts`}
                        color={isTop3 ? "primary" : "default"}
                        variant={isTop3 ? "filled" : "outlined"}
                        sx={{
                          fontWeight: "bold",
                          minWidth: 80,
                          height: 32,
                          background: isTop3
                            ? `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`
                            : undefined,
                          boxShadow: isTop3
                            ? "0 4px 12px rgba(0,0,0,0.15)"
                            : "none",
                        }}
                      />
                    </ListItem>
                  );
                })}
                {rankingData.length === 0 && (
                  <Box
                    sx={{ p: 6, textAlign: "center", color: "text.secondary" }}
                  >
                    <EmojiEventsRounded
                      sx={{
                        fontSize: 60,
                        color: "text.disabled",
                        mb: 2,
                        opacity: 0.5,
                      }}
                    />
                    <Typography variant="h6" color="text.secondary">
                      Aún no hay clasificaciones
                    </Typography>
                    <Typography variant="body2" color="text.disabled">
                      ¡Sé el primero en completar una actividad!
                    </Typography>
                  </Box>
                )}
              </List>
            )}
          </Box>
        )}

        {tabIndex === 1 && (
          <Box sx={{ minHeight: 300 }}>
            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 6 }}>
                <CircularProgress size={40} thickness={4} />
              </Box>
            ) : (
              <List disablePadding sx={{ pb: 2 }}>
                {versusRankingData.map((item, index) => {
                  const isTop3 = index < 3;
                  const medalColor =
                    index === 0
                      ? "#FFD700"
                      : index === 1
                        ? "#C0C0C0"
                        : "#CD7F32";
                  
                  // Calcular inicial para el avatar (fallback)
                  const inicialName = item.usuario.alias?.[0] || item.usuario.nombre?.[0];

                  return (
                    <ListItem
                      key={item.usuario.id}
                      divider={index !== versusRankingData.length - 1}
                      sx={{
                        py: 2,
                        px: 3,
                        transition: "all 0.2s",
                        "&:hover": {
                          bgcolor: alpha(theme.palette.primary.main, 0.02),
                          transform: "translateX(4px)",
                        },
                      }}
                    >
                      <ListItemAvatar sx={{ minWidth: 50 }}>
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: "900",
                            color: isTop3
                              ? medalColor
                              : theme.palette.text.secondary,
                            fontSize: isTop3 ? "1.4rem" : "1.1rem",
                            textShadow: isTop3
                              ? `0 2px 4px ${alpha(medalColor, 0.3)}`
                              : "none",
                          }}
                        >
                          {isTop3 ? (
                            <EmojiEventsRounded sx={{ fontSize: 32 }} />
                          ) : (
                            `#${index + 1}`
                          )}
                        </Box>
                      </ListItemAvatar>

                      <ListItemAvatar>
                        <Avatar
                          sx={{
                            bgcolor: isTop3
                              ? alpha(medalColor, 0.1)
                              : alpha(theme.palette.primary.main, 0.1),
                            color: isTop3
                              ? medalColor
                              : theme.palette.primary.main,
                            fontWeight: "bold",
                            border: isTop3 ? `2px solid ${medalColor}` : "none",
                          }}
                        >
                          {inicialName || <PersonRounded />}
                        </Avatar>
                      </ListItemAvatar>

                      <ListItemText
                        primary={
                          <Typography
                            variant="subtitle1"
                            fontWeight="bold"
                            noWrap
                          >
                             {/* Uso del helper para mostrar nombre */}
                            {getDisplayName(item.usuario)}
                          </Typography>
                        }
                        sx={{ mr: 2 }}
                      />

                      <Chip
                        label={`${item.puntaje} pts`}
                        color={isTop3 ? "primary" : "default"}
                        variant={isTop3 ? "filled" : "outlined"}
                        sx={{
                          fontWeight: "bold",
                          minWidth: 80,
                          height: 32,
                          background: isTop3
                            ? `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`
                            : undefined,
                          boxShadow: isTop3
                            ? "0 4px 12px rgba(0,0,0,0.15)"
                            : "none",
                        }}
                      />
                    </ListItem>
                  );
                })}
                {versusRankingData.length === 0 && (
                  <Box
                    sx={{ p: 6, textAlign: "center", color: "text.secondary" }}
                  >
                    <Typography variant="body1">
                      No hay datos de ranking versus aún
                    </Typography>
                  </Box>
                )}
              </List>
            )}
          </Box>
        )}
      </Box>
    </Card>
  );
}