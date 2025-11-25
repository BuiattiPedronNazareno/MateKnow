# MateKnow 🎓🧠

> **Refuerza tus conocimientos universitarios a través de la competitividad y el juego.**

<video src="Mateknow Demo.mp4" controls width="100%"></video>

## 🌐 Despliegue en Vivo (Demo)

El proyecto se encuentra desplegado y operativo en **Render**. Puedes acceder a la aplicación en el siguiente enlace:

🚀 **[https://mateknow-frontend-ulxo.onrender.com/](https://mateknow-frontend-ulxo.onrender.com/)**

---

## 📖 Sobre el Proyecto

**MateKnow** es una plataforma web diseñada para gamificar la experiencia educativa en el nivel universitario. Su objetivo principal es motivar a los estudiantes a reforzar los conocimientos de sus asignaturas mediante una competencia sana y herramientas interactivas.

A diferencia de las plataformas de estudio tradicionales, MateKnow pone el foco en la competitividad intelectual, permitiendo a los alumnos medirse con sus pares y a los profesores gestionar el aprendizaje de una forma dinámica.

## 🚀 Innovación y Propósito

### ¿Por qué MateKnow?
En la actualidad, está comprobado que la gamificación es una estrategia clave para aumentar el compromiso y mejorar la retención de conocimientos. MateKnow nace para responder a una tendencia global, adaptándola al contexto universitario (con un enfoque inicial en Argentina).

Nuestra propuesta de valor se diferencia por:

* **Ranking Competitivo:** Un sistema de clasificación local por asignatura que impulsa la superación personal.
* **Flexibilidad de Ejercicios:** Soporte para ejercicios teóricos, matemáticos (LaTeX) y de programación.
* **Comunidad Activa:** Fomenta la interacción entre alumnos y profesores, permitiendo incluso que los alumnos propongan sus propios desafíos.

## ✨ Funcionalidades Principales

### 👨‍🎓 Para Alumnos
* **Modo Versus:** Compite en tiempo real contra otros compañeros para resolver ejercicios (implementado con WebSockets).
* **Resolución de Ejercicios:** Acceso a desafíos de programación (con editor de código integrado) y ejercicios teóricos.
* **Ranking en Tiempo Real:** Visualiza tu posición en la tabla de clasificación de cada materia.
* **Progreso:** Seguimiento de intentos, aciertos y mejoras.

### 👨‍🏫 Para Profesores
* **Gestión de Clases:** Creación y administración de asignaturas y matriculación de alumnos.
* **Creación de Contenido:** Herramientas para diseñar ejercicios personalizados, incluyendo soporte para fórmulas matemáticas y casos de prueba de código.
* **Moderación:** Capacidad de aprobar ejercicios propuestos por los alumnos para integrarlos al banco de preguntas de la cátedra.
* **Analytics:** Monitoreo del desempeño general de la clase.

## 🛠️ Stack Tecnológico

El proyecto está construido utilizando una arquitectura moderna de microservicios (monorepo structure) para asegurar escalabilidad y rendimiento en tiempo real.

### Infraestructura
* **Cloud Provider:** Render (Frontend & Backend)

### Cliente (`/mateknowclient`)
* **Framework:** Next.js (React)
* **Lenguaje:** TypeScript
* **Estilos:** Tailwind CSS / CSS Modules
* **Gestión de Paquetes:** Bun

### Servidor (`/mateknowserver`)
* **Framework:** NestJS
* **Lenguaje:** TypeScript
* **Base de Datos:** PostgreSQL (vía Supabase)
* **Real-time:** WebSockets (NestJS Gateways) para el modo Versus y Notificaciones.
* **Autenticación:** JWT / Supabase Auth

---

## 💻 Instalación y Despliegue local

Este proyecto utiliza **Bun** como gestor de paquetes principal.

### Prerrequisitos
* **Bun** instalado:

    curl -fsSL https://bun.sh/install | bash

* Una instancia de **Supabase** o **PostgreSQL** local configurada.

### 1. Clonar el repositorio

    git clone https://github.com/tu-usuario/MateKnow.git
    cd MateKnow

### 2. Configurar el Backend (Server)

    cd mateknowserver
    bun install

    # Configura tus variables de entorno
    cp .env.example .env
    # Rellena los datos de conexión a la BD y claves JWT en el archivo .env

    # Ejecutar en modo desarrollo
    bun run start:dev

### 3. Configurar el Frontend (Client)

    cd ../mateknowclient
    bun install

    # Configura tus variables de entorno
    cp .env.example .env.local

    # Ejecutar el servidor de desarrollo
    bun run dev


### ARCHIVO: mateknowserver/.env.example (Backend)
```
# Configuración de Supabase
SUPABASE_URL=[https://tu-proyecto.supabase.co](https://tu-proyecto.supabase.co)
SUPABASE_ANON_KEY=tu_clave_anon_publica_aqui
SUPABASE_SERVICE_ROLE_KEY=tu_clave_service_role_secreta_aqui

# Configuración del Servidor
PORT=4000

# Configuración de Redis
REDIS_HOST=tu-host-redis (ej: redis-12345.c1.us-east-1-2.ec2.cloud.redislabs.com)
REDIS_PORT=10259
REDIS_PASSWORD=tu_password_redis_aqui
```

### ARCHIVO: mateknowclient/.env.example (Frontend)

```
# Configuración de Supabase (Cliente)
NEXT_PUBLIC_SUPABASE_URL=[https://tu-proyecto.supabase.co](https://tu-proyecto.supabase.co)
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anon_publica_aqui

# URL de la API (Backend)
# Usar http://localhost:4000 para desarrollo local
# Usar la URL de Render para producción
NEXT_PUBLIC_API_URL=http://localhost:4000
```
Abra [http://localhost:3000](http://localhost:3000) en su navegador para ver la aplicación.

---

## 🤝 Contribución

¡Las contribuciones son bienvenidas! Si tienes una idea para mejorar el sistema de ranking, nuevos tipos de ejercicios o mejoras en la interfaz:

1.  Haz un **Fork** del proyecto.
2.  Crea tu rama de funcionalidad (`git checkout -b feature/AmazingFeature`).
3.  Haz **Commit** de tus cambios (`git commit -m 'Add some AmazingFeature'`).
4.  Haz **Push** a la rama (`git push origin feature/AmazingFeature`).
5.  Abre un **Pull Request**.

---

## 📝 Licencia

Distribuido bajo la licencia MIT.

<p align="center">
  Hecho con ❤️ por el equipo de MateKnow (Valen, Pedro, Joaco, Lucas, Simon)
</p>