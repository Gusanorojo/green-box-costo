# GREEN BOX Costos

Aplicacion para calcular costos de fabricacion y precio de venta de Green Box.

## Modos de uso

- Abriendo `GREEN BOX.html`: funciona localmente en tu navegador.
- Corriendo `server.js`: guarda y lee los datos desde Neon PostgreSQL.

## Configuracion con Neon

1. Copiar `.env.example` como `.env`.
2. Pegar la cadena de conexion de Neon en `DATABASE_URL`.
3. Opcional: completar `GREEN_BOX_WRITE_KEY` si queres que la app sea publica para leer, pero pida clave para editar.
4. Instalar dependencias con `npm install`.
5. Iniciar con `npm start`.

La app queda disponible en:

```text
http://localhost:3000
```

Al abrirla desde ese servidor, el indicador superior cambia a `Conectado a Neon`.
