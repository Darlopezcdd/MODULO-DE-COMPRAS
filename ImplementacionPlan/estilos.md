# Guía de Estilos - Universidad Técnica del Norte (UTN)

[cite_start]Este documento define los lineamientos visuales básicos extraídos del Manual de Imagen Institucional de la UTN[cite: 3, 4], estructurados para su fácil adopción en la fase de desarrollo e implementación de interfaces.

## 1. Colores Corporativos

[cite_start]Para mantener la coherencia institucional en los soportes digitales, se deben utilizar estrictamente los siguientes valores cromáticos[cite: 242, 243]:

| Color | Nombre | HEX | RGB | CMYK |
|---|---|---|---|---|
| **Rojo Institucional** | Pantone Rojo | `#d10a11` | `rgb(209, 10, 17)` | `C:0 M:100 Y:100 K:10` |
| **Gris Institucional** | Pantone Gris | `#706f6f` | `rgb(112, 111, 111)` | `C:0 M:0 Y:0 K:70` |
| **Blanco** | Blanco | `#ffffff` | `rgb(255, 255, 255)` | `C:0 M:0 Y:0 K:0` |

[cite_start]*(Valores extraídos de la carta de color CMYK y RGB del manual [cite: 269, 273, 274, 275, 276])*

### Implementación CSS / SCSS Recomendada
```css
:root {
  --utn-rojo: #d10a11;
  --utn-gris: #706f6f;
  --utn-blanco: #ffffff;
}