# Baraja real escaneada (opcional)

El juego trae una baraja española dibujada en SVG con el patrón tradicional.
Si querés usar imágenes de una baraja real, copiá acá las 40 cartas y creá un
`manifest.json`. **Usá solo imágenes que puedas distribuir**: por ejemplo, la
baraja española clásica de 1889 en dominio público, o una baraja con licencia
Creative Commons (y respetá la atribución que pida).

## Nombres de archivo

Una imagen por carta con el formato `<número>-<palo>.<extensión>`:

- números: 1, 2, 3, 4, 5, 6, 7, 10, 11, 12
- palos: espada, basto, oro, copa

Ejemplos: `1-espada.png`, `7-oro.png`, `12-copa.png`.

Proporción recomendada: 2 de ancho por 3,1 de alto (por ejemplo 400 × 620 px).

## manifest.json

```json
{
  "formato": "png",
  "nombre": "Baraja española clásica",
  "licencia": "Dominio público",
  "fuente": "https://..."
}
```

Cuando el archivo existe, en Configuración aparece la opción para usar la
baraja real. Si falta alguna imagen, conviene quitar el manifest: el juego no
mezcla barajas.
