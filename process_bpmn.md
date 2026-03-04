# Proceso de Elaboración de RifaMax

Este documento detalla el proceso seguido para el desarrollo del sitio web y el flujo lógico de la aplicación (BPMN).

## 1. Proceso de Desarrollo (AI & Usuario)

Este diagrama representa los pasos técnicos tomados para construir la plataforma desde cero.

```mermaid
graph TD
    Start((Inicio del Proyecto)) --> Requirements[Definición de Requerimientos y Diseño Visual]
    Requirements --> DesignTokens[Configuración de Tokens CSS Inter, Gradients, Glassmorphism]
    DesignTokens --> HTMLBase[Creación de Pantallas Base HTML Index, Dashboard, Create, Raffle]
    HTMLBase --> DataLayer[Implementación de Capa de Datos Mock DB & Firebase Config]
    DataLayer --> AuthLogic[Desarrollo de Flujo de Autenticación 3 Pasos]
    AuthLogic --> FeatureDev[Implementación de Lógica de Creación de Rifas con Live Preview]
    FeatureDev --> TicketSystem[Desarrollo de Selección y Compra de Boletos]
    TicketSystem --> Refinement[Refinamiento de UI/UX Cambio de Login a Manual]
    Refinement --> End((Sitio Web Listo))

    subgraph "Capas de Desarrollo"
        Requirements
        DesignTokens
        HTMLBase
        DataLayer
        AuthLogic
        FeatureDev
        TicketSystem
        Refinement
    end
```

## 2. Proceso de Negocio (Flujo de la Aplicación)

Este diagrama sigue el estándar BPMN para mostrar cómo interactúa un usuario con el sistema.

```mermaid
flowchart TD
    %% Inicio
    Start([Inicio]) --> Acceso{¿Tiene Sesión?}
    
    %% Autenticación
    Acceso -- No --> InputName[Ingresar Nombre y Email]
    InputName --> InputPhone[Ingresar Teléfono]
    InputPhone --> VerifyCode[Verificar Código OTP Demo]
    VerifyCode --> Welcome[Bienvenida al Dashboard]
    
    Acceso -- Sí --> Welcome
    
    %% Dashboard / Acciones
    Welcome --> Option{¿Qué desea hacer?}
    
    %% Crear Rifa
    Option -- Crear Rifa --> RaffleForm[Llenar Datos: Nombre, Boletos, Precio, Fecha]
    RaffleForm --> LivePreview[Ver Vista Previa en Tiempo Real]
    LivePreview --> SaveRaffle[Guardar Rifa en DB LocalStorage]
    SaveRaffle --> ShareLink[Obtener Enlace para Compartir]
    ShareLink --> Welcome
    
    %% Comprar Boletos
    Option -- Participar --> ViewRaffle[Ver Detalle de Rifa]
    ViewRaffle --> SelectTickets[Seleccionar Boletos Disponibles]
    SelectTickets --> ConfirmPurchase[Confirmar Compra]
    ConfirmPurchase --> UpdateDB[Actualizar Estado de Boletos]
    UpdateDB --> ShowConfirmation[Mostrar Ticket de Compra]
    ShowConfirmation --> Welcome
    
    %% Finalizar
    Option -- Realizar Sorteo --> CheckSold{¿Hay boletos vendidos?}
    CheckSold -- No --> ErrorToast[Mostrar Error]
    ErrorToast --> Welcome
    CheckSold -- Sí --> RandomDraw[Generar Ganador Aleatorio]
    RandomDraw --> AnnounceWinner[Anunciar Ganador y Notificar]
    AnnounceWinner --> End([Fin del Proceso])
```

## Resumen de Tecnologías Utilizadas
- **Core**: HTML5, Vanilla JavaScript.
- **Styling**: CSS Moderno (Variables CSS, Flexbox, Grid).
- **Persistencia**: LocalStorage (Simulando Firebase Firestore en modo Demo).
- **Iconografía**: Emojis y SF Symbols style.
