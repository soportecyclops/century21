# TasadorPro — Sistema de Tasaciones Inmobiliarias

Aplicación web profesional para generar cotizaciones de inmuebles (PH, Departamento, Casa) basada en el método de comparables con promedio ponderado.

## 🚀 Deploy en GitHub Pages

1. Creá un repositorio en GitHub (ej: `tasadorpro`)
2. Subí el archivo `index.html` a la raíz del repo
3. Andá a **Settings → Pages → Source: main branch / root**
4. Tu app estará disponible en: `https://TU_USUARIO.github.io/tasadorpro`

## ✨ Funcionalidades

- **Nueva Tasación** — Formulario paso a paso (5 pasos)
  - Datos generales del inmueble y del cliente
  - Carga de 4 a 6 comparables con descuento de negociación 10% automático
  - Ponderación de 10 factores (Ubicación, Calidad, Antigüedad, etc.)
  - Composición del valor por tipo de superficie (norma fija)
  - Resultado con valor/m² y valor total
- **Historial** — Todas las tasaciones guardadas (IndexedDB local)
- **Exportar Excel** — Planilla con 3 hojas: Datos, Comparables, Composición
- **Imprimir / PDF** — Vista web imprimible
- **Compartir Link** — URL con datos codificados para compartir
- **Configuración** — Datos de empresa y pesos de factores por defecto

## 📐 Metodología

- Descuento por negociación: **10% fijo** sobre precio de oferta
- Comparables: **mínimo 4, máximo 6**
- Homologación de superficies (norma fija):
  - Cubierta: 100%
  - Semicubierta: 50%
  - Descubierta: 20%
  - Balcón: 33%
- Moneda: **USD**
- Tipos de propiedad: PH, Departamento, Casa

## 🗄️ Almacenamiento

Los datos se guardan en `localStorage` del navegador. No se requiere backend.
Para multi-usuario real se recomienda integrar con Firebase o Supabase.

## 📁 Estructura

```
/
└── index.html    ← App completa (single file)
└── README.md     ← Este archivo
```
