# GREEN BOX Costos

Aplicacion para calcular costos de fabricacion y precio de venta de Green Box.

## Que incluye

- Hardware.
- Impresion 3D con gramos, costo de filamento, horas de impresion y electricidad por box.
- Insumos.
- Mano de obra.
- Packaging.
- Merma y garantia.
- Costos fijos mensuales.
- Costos mensuales en ARS/USD con tipo de cambio manual.
- Lista de compras enlazada a Hardware, Insumos, Packaging y filamento.
- Precio, rentabilidad, simulador y punto de equilibrio.
- Persistencia en Neon PostgreSQL cuando se ejecuta con `server.js`.

## Modos de uso

- Abriendo `index.html`: funciona localmente y guarda datos en ese navegador.
- Corriendo `server.js`: guarda y lee los datos desde Neon PostgreSQL.

## Configuracion con Neon

1. Copiar `.env.example` como `.env`.
2. Pegar la cadena de conexion de Neon en `DATABASE_URL`.
3. Definir `GREEN_BOX_WRITE_KEY` antes de publicar: limita las ediciones a quien tenga esa clave.
4. Instalar dependencias con `npm install`.
5. Iniciar con `npm start`.

La app queda disponible en:

```text
http://localhost:3000
```

Al abrirla desde ese servidor, el indicador superior cambia a `Conectado a Neon`.

## Seguridad de datos

La app conserva una copia local en `localStorage` y usa Neon como fuente compartida cuando esta configurado `DATABASE_URL`.

Antes de consolidar datos locales con Neon, el codigo crea respaldos locales en claves internas:

- `greenBoxCostManager.legacyV1Backup`
- `greenBoxCostManager.hardwareRecoveryBackup`
- `greenBoxCostManager.cloudMergeBackup`

No ejecutar `localStorage.clear()` si hay datos reales.

## Render

El archivo `render.yaml` prepara un servicio web Node para Render sin secretos:

- Build command: `npm install`
- Start command: `npm start`
- Variables que se cargan manualmente en Render:
  - `DATABASE_URL`
  - `GREEN_BOX_WRITE_KEY`

Los valores reales no deben escribirse en GitHub. Sin `GREEN_BOX_WRITE_KEY`, cualquier visitante puede editar los datos compartidos.

## Notion

Cuando Render entregue la URL publica, se puede insertar en Notion con un bloque `Embed` / `Incrustar`.
El servidor permite embeber la app desde dominios de Notion mediante `Content-Security-Policy`.
