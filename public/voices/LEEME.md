# Voces grabadas

El juego está preparado para usar grabaciones profesionales de cada personaje.
Mientras no haya archivos, se usa la voz en español del navegador (si el
jugador la activa en Configuración) y siempre se muestra el texto en pantalla.

## Cómo agregar grabaciones

1. Grabá cada frase en `.mp3`, `.ogg` o `.wav` (mono, 44.1 kHz, sin silencios largos).
2. Guardalas en una carpeta por personaje, por ejemplo `public/voices/tano/truco_1.mp3`.
3. Declaralas en `manifest.json` usando el id del personaje y la clave de la frase:

```json
{
  "version": 1,
  "characters": {
    "tano": {
      "truco": ["tano/truco_1.mp3", "tano/truco_2.mp3"],
      "quiero": ["tano/quiero_1.mp3"],
      "no_quiero": ["tano/no_quiero_1.mp3"]
    }
  }
}
```

Si una frase tiene varias grabaciones, se elige una al azar para no repetir.
Las frases que no tengan grabación siguen usando la voz del navegador.

## Ids de personajes

`tano`, `pibe`, `abuela`, `cordobes`, `campeon`, `rulo`, `profe`, `flaco`, `rosa`, `lucia`, `ramon`

## Claves de frases

`truco`, `retruco`, `vale_cuatro`, `envido`, `real_envido`, `falta_envido`,
`flor`, `contraflor`, `contraflor_al_resto`, `me_achico`, `quiero`,
`quiero_dudoso`, `no_quiero`, `son_buenas`, `tengo`, `mejores`, `mazo`,
`gana_baza`, `carta_brava`, `gana_mano`, `no_te_animas`, `pierde_mano`,
`victoria`, `derrota`, `saludo`

Las claves `tengo` y `mejores` incluyen un número (los tantos del envido);
para grabarlas conviene usar frases genéricas como "Tengo estos" o
"Son mejores".
