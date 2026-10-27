import type { Personality } from '../ai/profiles';
import type { AvatarLook } from '../ui/art/Avatar';

export type PhraseKey =
  | 'truco'
  | 'retruco'
  | 'vale_cuatro'
  | 'envido'
  | 'real_envido'
  | 'falta_envido'
  | 'flor'
  | 'contraflor'
  | 'contraflor_al_resto'
  | 'me_achico'
  | 'quiero'
  | 'quiero_dudoso'
  | 'no_quiero'
  | 'son_buenas'
  | 'tengo'
  | 'mejores'
  | 'mazo'
  | 'gana_baza'
  | 'carta_brava'
  | 'gana_mano'
  | 'no_te_animas'
  | 'pierde_mano'
  | 'victoria'
  | 'derrota'
  | 'saludo';

export interface VoiceProfile {
  pitch: number;
  rate: number;
  female?: boolean;
}

export interface Character {
  id: string;
  name: string;
  tagline: string;
  bio: string;
  origin: string;
  look: AvatarLook;
  personality: Personality;
  voice: VoiceProfile;
  phrases: Partial<Record<PhraseKey, string[]>>;
  /** Cómo se consigue para usarlo como avatar propio. */
  unlock: { kind: 'inicial' } | { kind: 'historia'; stage: number } | { kind: 'tienda'; price: number };
}

export const DEFAULT_PHRASES: Record<PhraseKey, string[]> = {
  truco: ['¡Truco!', '¡Truco, nomás!', '¡Te canto truco!', '¡Truco! A ver qué hacés.'],
  retruco: ['¡Retruco, papá!', '¡Quiero retruco!', '¡Retruco! Andá preparando los puntos.'],
  vale_cuatro: ['¡Quiero vale cuatro!', '¡Vale cuatro!', '¡Vale cuatro, y que sea lo que sea!'],
  envido: ['¡Envido!', '¡Envido, che!', 'Envido...'],
  real_envido: ['¡Real envido!', '¡Real envido, papá!'],
  falta_envido: ['¡Falta envido!', '¡Falta envido! A todo o nada.'],
  flor: ['¡Flor!', '¡Flor, señores!', '¡Tengo flor!'],
  contraflor: ['¡Contraflor!', '¡Contraflor, querido!'],
  contraflor_al_resto: ['¡Contraflor al resto!'],
  me_achico: ['Con flor me achico.', 'Me achico, me achico...'],
  quiero: ['¡Quiero!', '¡Quiero, papá!', '¡Obvio que quiero!', '¡Quiero, vamos!'],
  quiero_dudoso: ['Quiero...', 'Y bueno, quiero.', 'Dale... quiero.'],
  no_quiero: ['¡No quiero!', 'No quiero, andá nomás.', 'Paso. No quiero.', 'Ni loco. No quiero.'],
  son_buenas: ['Son buenas.', 'Son buenas, son buenas...', 'Buenas son.'],
  tengo: ['Tengo {n}.', '{n}.', '{n} tengo.'],
  mejores: ['¡{n} son mejores!', '{n}, son mejores.'],
  mazo: ['¡Al mazo!', 'Me voy al mazo.', 'Al mazo. Esta no es para mí.'],
  gana_baza: ['¡Tomá!', '¡Esa no la tenías!', '¡Ahí está!', '¡Y esta!'],
  carta_brava: ['¡Mirá lo que te guardé!', '¡Tomá esta!', '¡A ver qué hacés con esta!'],
  gana_mano: ['¡Qué linda mano!', '¡Adentro!', '¡Esa es mía!'],
  no_te_animas: ['¡No te animás!', '¡Arrugaste!', '¡Te tenía estudiado!'],
  pierde_mano: ['Uh... bien jugado.', 'La próxima es mía.', '¡Qué suerte que tenés!'],
  victoria: ['¡Hasta acá llegaste!', '¡Otra para la colección!', '¡Ganamos!'],
  derrota: ['Bien jugado. Quiero la revancha.', 'Me ganaste esta, pero no la guerra.'],
  saludo: ['¿Arrancamos?', 'Dale, que se enfría el café.', 'Repartí, que hoy estoy con suerte.'],
};

export const CHARACTERS: Character[] = [
  {
    id: 'tano',
    name: 'El Tano',
    tagline: 'Cincuenta años de truco en el mismo bar',
    bio: 'Bigote de manubrio, camisa planchada y un carácter que se escucha desde la vereda. No miente casi nunca: cuando canta, tiene. Y cuando pierde, que Dios nos ayude.',
    origin: 'La Boca, Buenos Aires',
    personality: 'conservador',
    voice: { pitch: 0.75, rate: 0.95 },
    look: {
      skin: '#e8b48c',
      hair: '#c9c3ba',
      hairStyle: 'entradas',
      facial: 'bigotazo',
      hat: 'none',
      glasses: 'none',
      shirt: '#f1ead9',
      shirtStyle: 'chaleco',
      accent: '#7a2b1e',
      age: 'mayor',
      eyeColor: '#3d2a14',
    },
    phrases: {
      truco: ['¡Truco, y se acabó la joda!', '¡Truco! A ver si te la bancás.', '¡Truco, pibe!'],
      retruco: ['¡Retruco, pibe!', '¡Retruco, y no se habla más!'],
      vale_cuatro: ['¡Vale cuatro, y que se arme!'],
      quiero: ['¡Quiero, caramba!', '¡Quiero, pibe!', '¡Pero cómo no voy a querer!'],
      no_quiero: ['¡No quiero, andá a cantarle a otro!', 'No quiero. Paso.'],
      gana_baza: ['¡Tomá, pibe!', '¡Así se juega, querido!'],
      gana_mano: ['¡Cincuenta años jugando, pibe!', '¡Así se juega, querido!'],
      pierde_mano: ['¡Me cacho en diez!', '¡Qué mano de porquería!', '¡No puede ser!'],
      no_te_animas: ['¡Te achicaste, pibe!', '¡Arrugaste, pibe!'],
      victoria: ['¡Andá a practicar al club, pibe!', '¡Hasta acá llegaste!'],
      derrota: ['¡Esto es un robo! Bueno... bien jugado.', '¡Me cacho en diez! Mañana te espero.'],
      saludo: ['A ver qué traés, pibe.', 'Sentate, que te enseño.'],
    },
    unlock: { kind: 'historia', stage: 9 },
  },
  {
    id: 'pibe',
    name: 'El Pibe',
    tagline: 'Canta todo, se arriesga siempre',
    bio: 'Gorra para atrás, buzo de la escuela y una confianza que no le entra en el cuerpo. Canta truco con un cuatro de copas si te ve dudar. A veces le sale.',
    origin: 'Lanús, Buenos Aires',
    personality: 'agresivo',
    voice: { pitch: 1.2, rate: 1.12 },
    look: {
      skin: '#d9a07a',
      hair: '#2a1a0e',
      hairStyle: 'corto',
      facial: 'none',
      hat: 'gorraAtras',
      hatColor: '#1e3f8a',
      glasses: 'none',
      shirt: '#74acdf',
      shirtStyle: 'buzo',
      accent: '#2a5ea8',
      age: 'joven',
      eyeColor: '#4a3018',
    },
    phrases: {
      truco: ['¡TRUCO, PAPÁ!', '¡Truco, y no arrugues!', '¡Truquito, truquito!'],
      retruco: ['¡Retruco, amigo! ¿Qué onda?', '¡Retruco, papá!'],
      quiero: ['¡Obvio que quiero, amigo!', '¡De una, quiero!'],
      no_quiero: ['Naa, no quiero. Me la guardo.', 'Ni ahí. No quiero.'],
      gana_baza: ['¡Tomaaá!', '¡Fuaaa, qué carta!', '¡Esa no la tenías, eh!'],
      no_te_animas: ['¡No te animás, eh!', '¡Arrugaste, amigo!'],
      victoria: ['¡Re ganado! ¡Hasta acá llegaste!', '¡Aguante el truco, loco!'],
      derrota: ['Na, no puede ser... ¡revancha ya!', '¡Me robaste! Bueno, la próxima.'],
      saludo: ['¡Vamo\' arriba, a jugar!', 'Dale, que hoy estoy enchufado.'],
      pierde_mano: ['¡Uh, no!', '¡Qué suerte que tenés, amigo!'],
    },
    unlock: { kind: 'inicial' },
  },
  {
    id: 'abuela',
    name: 'La Abuela',
    tagline: 'Dulce como una medialuna, peligrosa como un siete de espada',
    bio: 'Te ceba un mate, te pregunta por tu familia y mientras tanto te lee la cara. Miente con una sonrisa que desarma a cualquiera.',
    origin: 'Barracas, Buenos Aires',
    personality: 'mentiroso',
    voice: { pitch: 1.25, rate: 0.88, female: true },
    look: {
      skin: '#f0c4a2',
      hair: '#d8d4cf',
      hairStyle: 'rodete',
      facial: 'none',
      hat: 'none',
      glasses: 'lentes',
      shirt: '#8e6bb0',
      shirtStyle: 'cardigan',
      accent: '#7d4f8f',
      age: 'mayor',
      feminine: true,
      earrings: true,
      eyeColor: '#4b6a8a',
    },
    phrases: {
      truco: ['Truco, querido.', 'Ay... ¿y si te canto truco?', 'Truco, mi amor.'],
      quiero: ['Quiero, tesoro.', 'Ay, bueno, quiero.'],
      no_quiero: ['No, querido, no quiero.', 'Mejor no, que me sube la presión.'],
      envido: ['Envido, corazón.', 'Envidito...'],
      gana_baza: ['Ay, ¿te gané? Perdón, nene.', 'Mirá lo que te guardé, querido.'],
      no_te_animas: ['Te tenía estudiado, querido.', 'Ay, si supieras lo que tenía...'],
      victoria: ['¿Querés un mate para el disgusto?', 'Setenta años jugando, nene.'],
      derrota: ['Muy bien, querido. Te ganaste unas galletitas.', 'Ay, me ganaste. ¡Qué orgullo!'],
      saludo: ['Sentate, querido. ¿Querés un mate?', 'Juguemos tranquilos, ¿sí?'],
    },
    unlock: { kind: 'historia', stage: 8 },
  },
  {
    id: 'cordobes',
    name: 'El Cordobés',
    tagline: 'Tonada, fernet y un chiste para cada mano',
    bio: 'Llega con un chiste y se va con tus puntos. Juega equilibrado, pero te distrae con la charla. Cuando gana, lo festeja toda la cuadra.',
    origin: 'Barrio Alberdi, Córdoba',
    personality: 'equilibrado',
    voice: { pitch: 1.0, rate: 0.98 },
    look: {
      skin: '#e2a982',
      hair: '#3a2414',
      hairStyle: 'rulos',
      facial: 'sombra',
      hat: 'none',
      glasses: 'none',
      shirt: '#4a8fd0',
      shirtStyle: 'camisa',
      accent: '#c9822a',
      age: 'adulto',
      eyeColor: '#3a2a12',
    },
    phrases: {
      truco: ['¡Trucooo, loco!', '¡Truco, hermano!', '¡Truco! ¡Mirá vo\'!'],
      quiero: ['¡Quiero, hermanooo!', '¡Y obvio que quiero, loco!'],
      no_quiero: ['¡Ni ahí, loco! No quiero.', 'Nooo, hermano, no quiero.'],
      gana_baza: ['¡Ahí tenés, hermanooo!', '¡Mirá vo\', qué carta!'],
      no_te_animas: ['¡No te animás, loco!', '¡Arrugaste, hermanooo!'],
      victoria: ['¡Esto se festeja con fernet, loco!', '¡Hasta acá llegaste, hermanooo!'],
      derrota: ['¡Uh, qué lo parió! Bien jugado, loco.', 'Me ganaste, hermano. Te debo un fernet.'],
      saludo: ['¿Qué hacé\', loco? ¿Jugamo\'?', 'Dale, que traje el fernet.'],
      pierde_mano: ['¡Ahhh, la pucha!', '¡Qué lo parió!'],
    },
    unlock: { kind: 'historia', stage: 5 },
  },
  {
    id: 'campeon',
    name: 'El Campeón',
    tagline: 'Nadie sabe su nombre. Todos conocen su récord.',
    bio: 'Tranquilo, de pocas palabras y con anteojos oscuros incluso de noche. Calcula cada carta que salió y casi nunca se equivoca. Es la última prueba.',
    origin: 'Desconocido',
    personality: 'experto',
    voice: { pitch: 0.82, rate: 0.86 },
    look: {
      skin: '#c98e68',
      hair: '#141414',
      hairStyle: 'peinado',
      facial: 'candado',
      hat: 'none',
      glasses: 'anteojosSol',
      shirt: '#1d1d22',
      shirtStyle: 'saco',
      accent: '#c9a24a',
      age: 'adulto',
    },
    phrases: {
      truco: ['Truco.', 'Truco. Pensalo bien.'],
      retruco: ['Retruco.'],
      vale_cuatro: ['Vale cuatro.'],
      quiero: ['Quiero.', 'Me parece bien. Quiero.'],
      no_quiero: ['No quiero.', 'Esta no.'],
      gana_baza: ['Era previsible.', 'Lo vi venir.'],
      no_te_animas: ['Sabia decisión.', 'Hiciste bien en no querer. O no.'],
      victoria: ['Buen intento. Hasta acá llegaste.', 'Fue un placer.'],
      derrota: ['Interesante. Me ganaste. Eso no pasa seguido.'],
      saludo: ['Juguemos.', 'Mostrame lo que sabés.'],
      pierde_mano: ['Hmm.', 'Bien.'],
    },
    unlock: { kind: 'historia', stage: 10 },
  },
  {
    id: 'rulo',
    name: 'El Rulo',
    tagline: 'El habitué del bar de la esquina',
    bio: 'Juega todas las tardes después del laburo. Buena gente, tira las cartas rápido y a veces se olvida qué salió.',
    origin: 'Villa Crespo, Buenos Aires',
    personality: 'equilibrado',
    voice: { pitch: 1.0, rate: 1.05 },
    look: {
      skin: '#eab48e',
      hair: '#6a3d1c',
      hairStyle: 'rulos',
      facial: 'bigote',
      hat: 'none',
      glasses: 'none',
      shirt: '#c0392b',
      shirtStyle: 'remera',
      accent: '#a0522d',
      age: 'adulto',
    },
    phrases: {
      saludo: ['¡Bienvenido al bar! ¿Un truquito?', 'Sentate, que el Gallego trae unos cafés.'],
      victoria: ['¡Volvé cuando quieras, eh!'],
      derrota: ['¡Bien ahí! Tenés pasta para esto.'],
    },
    unlock: { kind: 'inicial' },
  },
  {
    id: 'profe',
    name: 'El Profe',
    tagline: 'Profesor de matemática y presidente del club',
    bio: 'Cuenta las cartas en voz baja y anota todo en una libretita. Juega con cuidado y rara vez se manda.',
    origin: 'Club Social y Deportivo, Avellaneda',
    personality: 'conservador',
    voice: { pitch: 0.95, rate: 0.92 },
    look: {
      skin: '#f0c6a6',
      hair: '#5a4632',
      hairStyle: 'entradas',
      facial: 'barba',
      hat: 'none',
      glasses: 'lentes',
      shirt: '#6b7f5a',
      shirtStyle: 'saco',
      accent: '#3e6b4a',
      age: 'adulto',
    },
    phrases: {
      saludo: ['Estadísticamente, hoy gano yo.', 'Buenas tardes. ¿Repartimos?'],
      truco: ['Truco. Las probabilidades me acompañan.', '¡Truco!'],
      victoria: ['Los números no mienten.'],
      derrota: ['Hmm, un resultado improbable. Felicitaciones.'],
    },
    unlock: { kind: 'tienda', price: 600 },
  },
  {
    id: 'flaco',
    name: 'El Flaco',
    tagline: 'Parrillero de alma, truquero de corazón',
    bio: 'Da vuelta los chorizos con una mano y te canta retruco con la otra. Juega rápido y se tira de cabeza.',
    origin: 'Parrilla La Tranquera, Ituzaingó',
    personality: 'agresivo',
    voice: { pitch: 0.92, rate: 1.1 },
    look: {
      skin: '#d69a70',
      hair: '#1f140c',
      hairStyle: 'flequillo',
      facial: 'sombra',
      hat: 'vincha',
      hatColor: '#f2f2f2',
      glasses: 'none',
      shirt: '#2f2f2f',
      shirtStyle: 'remera',
      accent: '#b5562b',
      age: 'adulto',
    },
    phrases: {
      saludo: ['¿Jugamos mientras se hace el asado?', '¡Dale, que la parrilla no espera!'],
      truco: ['¡Truco, y pasame la sal!', '¡Truco!'],
      victoria: ['¡Ganador come primero!'],
      derrota: ['Bueno, te ganaste un choripán.'],
    },
    unlock: { kind: 'tienda', price: 600 },
  },
  {
    id: 'rosa',
    name: 'Doña Rosa',
    tagline: 'Dueña del café más antiguo de San Telmo',
    bio: 'Cuarenta años atendiendo el mostrador le enseñaron a leer a la gente. Canta envido con nada y te mira fijo hasta que te achicás.',
    origin: 'San Telmo, Buenos Aires',
    personality: 'mentiroso',
    voice: { pitch: 1.15, rate: 0.95, female: true },
    look: {
      skin: '#e9b796',
      hair: '#7a2e2e',
      hairStyle: 'largo',
      facial: 'none',
      hat: 'none',
      glasses: 'none',
      shirt: '#1f4e5f',
      shirtStyle: 'cardigan',
      accent: '#a63a3a',
      age: 'adulto',
      feminine: true,
      earrings: true,
      eyeColor: '#3a5a3a',
    },
    phrases: {
      saludo: ['Pasá, que el cortado va por la casa.', 'En este café se juega en serio, ¿eh?'],
      envido: ['Envido, querido. ¿Te animás?', '¡Envido!'],
      victoria: ['La casa siempre gana, corazón.'],
      derrota: ['Mirá vos... me ganaste en mi propio café.'],
    },
    unlock: { kind: 'tienda', price: 900 },
  },
  {
    id: 'lucia',
    name: 'Lucía',
    tagline: 'La mendocina que no le teme a nada',
    bio: 'Creció jugando en el patio de la casa de sus abuelos entre parrales. Agresiva y precisa: si te ve débil, te pasa por arriba.',
    origin: 'Maipú, Mendoza',
    personality: 'agresivo',
    voice: { pitch: 1.18, rate: 1.04, female: true },
    look: {
      skin: '#d9a17c',
      hair: '#2b1a10',
      hairStyle: 'largo',
      facial: 'none',
      hat: 'none',
      glasses: 'none',
      shirt: '#7b1e3a',
      shirtStyle: 'remera',
      accent: '#5f2a6b',
      age: 'joven',
      feminine: true,
      earrings: true,
    },
    phrases: {
      saludo: ['Acá en Mendoza se juega con vino y sin miedo.', '¿Vos sos el que viene ganando? A ver.'],
      truco: ['¡Truco! ¿Y ahora?', '¡Truco, che!'],
      victoria: ['¡Volvete a Buenos Aires!'],
      derrota: ['Bien jugado. Te ganaste un Malbec.'],
    },
    unlock: { kind: 'historia', stage: 6 },
  },
  {
    id: 'ramon',
    name: 'Don Ramón',
    tagline: 'El gaucho de la pulpería',
    bio: 'Habla poco y piensa mucho. Juega como en el campo: paciente, sin apuro, esperando el momento justo para dar el golpe.',
    origin: 'San Antonio de Areco',
    personality: 'experto',
    voice: { pitch: 0.7, rate: 0.85 },
    look: {
      skin: '#c88d63',
      hair: '#e0dcd6',
      hairStyle: 'corto',
      facial: 'barbaBlanca',
      hat: 'boina',
      hatColor: '#1d1d1d',
      glasses: 'none',
      shirt: '#8a3324',
      shirtStyle: 'poncho',
      accent: '#3f5a2e',
      age: 'mayor',
    },
    phrases: {
      saludo: ['Arrime nomás, amigo. La noche es larga.', 'Siéntese, que la ginebra está fresquita.'],
      truco: ['Truco, mi amigo.', 'Truco.'],
      victoria: ['Así es la vida en el campo, amigo.'],
      derrota: ['Me ganó en buena ley. Lo saludo.'],
    },
    unlock: { kind: 'historia', stage: 7 },
  },
];

export function getCharacter(id: string): Character {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[1];
}

const lastUsed = new Map<string, string>();

/** Elige una frase del personaje evitando repetir la última. */
export function pickPhrase(character: Character, key: PhraseKey, vars: Record<string, string | number> = {}): string {
  const own = character.phrases[key] ?? [];
  const pool = own.length > 0 && Math.random() < 0.8 ? [...own, ...DEFAULT_PHRASES[key].slice(0, 1)] : [...own, ...DEFAULT_PHRASES[key]];
  const memoKey = `${character.id}:${key}`;
  const prev = lastUsed.get(memoKey);
  const options = pool.length > 1 ? pool.filter((p) => p !== prev) : pool;
  const chosen = options[Math.floor(Math.random() * options.length)];
  lastUsed.set(memoKey, chosen);
  return chosen.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''));
}
