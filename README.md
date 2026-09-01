# app-celu

App de teléfono hecha con **Expo + React Native + TypeScript**, organizada con
**Clean Architecture**.

## Cómo correrla

```bash
npm install
npm start
```

Después escaneá el QR con la app **Expo Go** en tu celular, o apretá `a` para
abrir el emulador de Android / `w` para web.

## Estructura (Clean Architecture)

```
src/
├── domain/                  # Reglas de negocio puras. No importa nada de React ni Expo.
│   ├── entities/            # Objetos de negocio (User)
│   ├── repositories/        # Puertos: interfaces que el dominio define
│   └── usecases/            # Casos de uso (GetWelcomeMessage)
│
├── data/                    # Implementa los puertos del dominio
│   ├── datasources/         # De dónde salen los datos (memoria, API, storage…)
│   └── repositories/        # Implementación concreta de los repositorios
│
├── core/                    # Infraestructura transversal
│   ├── di/                  # Composition root: arma las dependencias
│   └── navigation/          # Stack de navegación y tipado de rutas
│
└── presentation/            # UI
    └── screens/
        ├── welcome/         # Pantalla "Bienvenido Facu" + su ViewModel
        └── not-implemented/ # Pantalla "Función sin implementar"
```

### Regla de dependencias

Las flechas de dependencia apuntan siempre **hacia adentro**:

```
presentation ─► domain ◄─ data
       core (di) ─► conecta todo
```

`domain` no conoce a nadie. `data` y `presentation` dependen de `domain` a
través de interfaces. `core/di` es el único lugar que conoce las
implementaciones concretas.

## Flujo de la pantalla de inicio

1. `WelcomeScreen` usa el hook `useWelcomeViewModel`.
2. El ViewModel pide `container.getWelcomeMessage.execute()`.
3. El caso de uso llama a `UserRepository.getCurrentUser()`.
4. `UserRepositoryImpl` delega en `InMemoryUserLocalDataSource`, que hoy
   devuelve un usuario fijo llamado *Facu*.
5. El caso de uso arma el string `"Bienvenido Facu"` y la pantalla lo muestra.
6. El botón navega a `NotImplemented`, que solo muestra un cartel.
