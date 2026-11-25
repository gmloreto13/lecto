import type { ReaderDocument } from '../types/document'
import { buildFromText } from '../parsers/textParser'

const GUIDE = `# Bienvenida a Lecto

Lecto lee en voz alta tus documentos mientras resalta cada frase. Pulsa el botón de reproducir en la barra inferior y escucha esta guía.

Puedes cambiar la velocidad en cualquier momento. El cambio se aplica al instante: la frase actual vuelve a empezar con el nuevo ritmo. Prueba a 1,5× y luego a 2×, verás que la voz sigue siendo clara.

## Toca una frase

Toca cualquier frase del texto para ver sus acciones. Desde ahí puedes escuchar desde ese punto, guardarla como marcador o añadirle una nota. Las frases marcadas quedan subrayadas con el color que elijas.

Tus marcadores y notas aparecen en el panel de marcadores. Desde allí puedes saltar a cada uno, editar la nota o exportarlo todo como un archivo de texto.

## Busca en el documento

Usa la lupa de la parte superior para buscar una palabra o una expresión. La búsqueda no distingue mayúsculas ni acentos, así que «canción» y «cancion» encuentran lo mismo. Toca un resultado para ir directamente a esa frase.

## Temporizador de sueño

Si te gusta escuchar antes de dormir, abre el temporizador desde la barra de audio. Elige quince, treinta o sesenta minutos, o pide que la lectura se detenga al terminar el capítulo. La voz se detendrá sola.

## Tu progreso

En la sección de progreso verás cuántos minutos has escuchado hoy, tu racha de días seguidos y la actividad de la última semana. Puedes fijar una meta diaria para mantener el hábito.

## Pronunciación a tu medida

Algunas voces leen mal las siglas, los nombres propios o las abreviaturas. En Ajustes encontrarás un diccionario de pronunciación: escribe la palabra tal como aparece y cómo quieres que suene. Por ejemplo, puedes pedir que «Dr.» se lea como «doctor» o que «ONU» se lea como «o ene u».

## Llévala en tu móvil

Lecto funciona sin conexión una vez instalada. En el navegador de tu teléfono, elige «Añadir a la pantalla de inicio» y tendrás tu biblioteca siempre a mano, con tus documentos guardados en el propio dispositivo.

Eso es todo. Carga tu primer PDF, EPUB o archivo de texto y empieza a escuchar.`

const STORY = `# El faro de la isla Clara

Cuando Marina llegó a la isla, el faro llevaba tres años apagado. Nadie en el pueblo sabía decir con exactitud por qué. Algunos hablaban de una tormenta; otros, de un farero que se cansó de esperar barcos que ya no venían.

Ella había heredado la llave de una tía a la que apenas recordaba. La llave era de hierro, pesada y fría, y venía acompañada de una nota escrita con letra temblorosa: «La luz no es para los barcos. Es para quien la enciende».

El primer día subió los ciento doce escalones contándolos en voz baja. Arriba, el viento entraba por un cristal roto y movía las páginas de un cuaderno abierto sobre la mesa. Eran anotaciones diarias: la hora del amanecer, el color del mar, el número de gaviotas en la roca grande.

## La lista de cosas pequeñas

Marina empezó a escribir en el mismo cuaderno. Al principio anotaba solo lo práctico: comprar una bombilla, reparar el cristal, preguntar en el puerto por un electricista. Pero poco a poco las listas cambiaron.

«Hoy el mar estaba verde como una botella vieja». «Un niño me saludó desde el muelle». «He dormido sin despertarme por primera vez en meses».

Se dio cuenta de que llevaba días sin mirar el teléfono. La isla tenía su propio reloj, hecho de mareas y de la campana de la iglesia, que sonaba siempre cuatro minutos tarde.

## La noche de la luz

El electricista llegó un jueves, en la barca del correo. Era un hombre mayor, de manos grandes, que trabajó en silencio durante toda la tarde. Al terminar, le dio a Marina un interruptor sencillo, de los de antes.

—Le toca a usted —dijo.

Ella lo pulsó. Durante un segundo no pasó nada, y luego la lámpara empezó a girar despacio, lanzando sobre el agua un brazo de luz que iba y volvía. Desde el pueblo, alguien encendió y apagó las luces de su casa, como respondiendo.

Esa noche Marina escribió una sola línea en el cuaderno: «Ahora entiendo la nota».`

function make(id: string, text: string, author: string, hue: number): ReaderDocument {
  const { title, pages, chapters } = buildFromText(text, true, 'Ejemplo')
  return { id, title, author, format: 'sample', pages, chapters, totalPages: pages.length, complete: true, createdAt: 0, hue }
}

export const SAMPLE_DOCUMENTS: ReaderDocument[] = [
  make('sample_guide', GUIDE, 'Guía de Lecto', 22),
  make('sample_story', STORY, 'Relato de ejemplo', 200),
]
