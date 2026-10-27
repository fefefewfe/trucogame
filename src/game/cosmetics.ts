import type { CardBackStyle, DeckStyle } from '../ui/art/CardFace';

export type CosmeticKind = 'mesa' | 'paño' | 'reverso' | 'baraja' | 'marco' | 'festejo' | 'frases';

export interface Cosmetic {
  id: string;
  kind: CosmeticKind;
  name: string;
  description: string;
  price: number;
}

export interface TableTheme {
  id: string;
  wood: string;
  woodDark: string;
  woodLight: string;
  wall: string;
  wallDark: string;
  lamp: string;
  trim: string;
  ambient: 'bar' | 'club' | 'campo' | 'noche' | 'lujo' | 'cafe' | 'parrilla' | 'patio' | 'torneo';
}

export const TABLES: Record<string, TableTheme> = {
  bodegon: { id: 'bodegon', wood: '#7a4a24', woodDark: '#3e2210', woodLight: '#b07a44', wall: '#5a2a1c', wallDark: '#1f0d07', lamp: '#ffcc6e', trim: '#d9a54a', ambient: 'bar' },
  club: { id: 'club', wood: '#6a4a2a', woodDark: '#2e1d0e', woodLight: '#a17a4c', wall: '#1d3a5f', wallDark: '#0a1424', lamp: '#fff0c8', trim: '#e0e0e0', ambient: 'club' },
  campo: { id: 'campo', wood: '#8a6238', woodDark: '#43301a', woodLight: '#c49a62', wall: '#6b4a2c', wallDark: '#24170b', lamp: '#ffb85a', trim: '#c9a46a', ambient: 'campo' },
  nocturna: { id: 'nocturna', wood: '#2c2340', woodDark: '#110c1c', woodLight: '#54447a', wall: '#1a1036', wallDark: '#07040f', lamp: '#9e7bff', trim: '#5fd4ff', ambient: 'noche' },
  premium: { id: 'premium', wood: '#2a160a', woodDark: '#0e0703', woodLight: '#5a3518', wall: '#14100c', wallDark: '#050403', lamp: '#ffd98a', trim: '#e2b54a', ambient: 'lujo' },
  // Escenarios del modo historia
  cafe: { id: 'cafe', wood: '#5e3820', woodDark: '#2a160b', woodLight: '#93603a', wall: '#3d2a1e', wallDark: '#140c07', lamp: '#ffd28a', trim: '#c9a46a', ambient: 'cafe' },
  parrilla: { id: 'parrilla', wood: '#7b4a2a', woodDark: '#341c0c', woodLight: '#b47a48', wall: '#6a2e1c', wallDark: '#230d06', lamp: '#ffb05a', trim: '#e07a3a', ambient: 'parrilla' },
  patio: { id: 'patio', wood: '#8c6a44', woodDark: '#3f2c17', woodLight: '#c4a070', wall: '#3b4a2a', wallDark: '#121a0b', lamp: '#fff2c0', trim: '#8fbf5a', ambient: 'patio' },
  torneo: { id: 'torneo', wood: '#3a2416', woodDark: '#160c06', woodLight: '#6a4428', wall: '#1b2440', wallDark: '#060a16', lamp: '#ffffff', trim: '#74acdf', ambient: 'torneo' },
};

export const CLOTHS: Record<string, { felt: string; feltDark: string; line: string }> = {
  verde: { felt: '#1d6b47', feltDark: '#0b3a25', line: '#e8c35a' },
  azul: { felt: '#1f4f8f', feltDark: '#0b2148', line: '#e8c35a' },
  rojo: { felt: '#8f2430', feltDark: '#430b12', line: '#f2d27a' },
  negro: { felt: '#262626', feltDark: '#0a0a0a', line: '#c9a24a' },
  celeste: { felt: '#3d7fb8', feltDark: '#173c5e', line: '#ffffff' },
};

export const COSMETICS: Cosmetic[] = [
  { id: 'mesa:bodegon', kind: 'mesa', name: 'Bodegón Clásico', description: 'Madera gastada y luz amarilla de bar de barrio.', price: 0 },
  { id: 'mesa:club', kind: 'mesa', name: 'Club Argentino', description: 'Mesa antigua del club, banderines y trofeos.', price: 300 },
  { id: 'mesa:campo', kind: 'mesa', name: 'Mesa de Campo', description: 'Madera rústica y ambiente de pulpería.', price: 450 },
  { id: 'mesa:nocturna', kind: 'mesa', name: 'Mesa Nocturna', description: 'Estética moderna en tonos azules y violetas.', price: 600 },
  { id: 'mesa:premium', kind: 'mesa', name: 'Mesa Premium', description: 'Madera oscura y detalles dorados.', price: 900 },
  { id: 'paño:verde', kind: 'paño', name: 'Paño verde', description: 'El de toda la vida.', price: 0 },
  { id: 'paño:azul', kind: 'paño', name: 'Paño azul', description: 'Elegante y sereno.', price: 150 },
  { id: 'paño:rojo', kind: 'paño', name: 'Paño rojo', description: 'Para los que cantan fuerte.', price: 150 },
  { id: 'paño:celeste', kind: 'paño', name: 'Paño celeste', description: 'Celeste y blanco.', price: 200 },
  { id: 'paño:negro', kind: 'paño', name: 'Paño negro', description: 'Sobrio, de casino.', price: 250 },
  { id: 'reverso:clasico', kind: 'reverso', name: 'Reverso clásico', description: 'Rojo con sol de mayo.', price: 0 },
  { id: 'reverso:azul', kind: 'reverso', name: 'Reverso azul', description: 'Azul noche con rombos dorados.', price: 100 },
  { id: 'reverso:paño', kind: 'reverso', name: 'Reverso verde', description: 'Verde paño con detalles dorados.', price: 200 },
  { id: 'reverso:celeste', kind: 'reverso', name: 'Reverso albiceleste', description: 'Franjas celestes y blancas.', price: 150 },
  { id: 'reverso:fileteado', kind: 'reverso', name: 'Reverso fileteado', description: 'Volutas al estilo del fileteado porteño.', price: 300 },
  { id: 'reverso:premium', kind: 'reverso', name: 'Reverso premium', description: 'Negro con filigrana dorada.', price: 400 },
  { id: 'baraja:clasica', kind: 'baraja', name: 'Baraja clásica', description: 'Papel crema y colores tradicionales.', price: 0 },
  { id: 'baraja:antigua', kind: 'baraja', name: 'Baraja antigua', description: 'Papel envejecido, tonos sepia.', price: 250 },
  { id: 'baraja:dorada', kind: 'baraja', name: 'Baraja dorada', description: 'Marcos dorados para las grandes noches.', price: 500 },
  { id: 'marco:madera', kind: 'marco', name: 'Marco de madera', description: 'Sencillo y cálido.', price: 0 },
  { id: 'marco:bronce', kind: 'marco', name: 'Marco de bronce', description: 'Para los que vienen subiendo.', price: 150 },
  { id: 'marco:plata', kind: 'marco', name: 'Marco de plata', description: 'Brillo de veterano.', price: 300 },
  { id: 'marco:fileteado', kind: 'marco', name: 'Marco fileteado', description: 'Colores de colectivo porteño.', price: 450 },
  { id: 'marco:oro', kind: 'marco', name: 'Marco de oro', description: 'Solo para los grandes.', price: 600 },
  { id: 'festejo:confeti', kind: 'festejo', name: 'Festejo: confeti', description: 'Lluvia de papelitos celestes y blancos.', price: 0 },
  { id: 'festejo:cartas', kind: 'festejo', name: 'Festejo: lluvia de cartas', description: 'Las cartas vuelan por el aire.', price: 400 },
  { id: 'festejo:fuegos', kind: 'festejo', name: 'Festejo: fuegos artificiales', description: 'Chispas doradas sobre la mesa.', price: 300 },
  { id: 'frases:basicas', kind: 'frases', name: 'Mensajes básicos', description: 'Los mensajes rápidos de siempre.', price: 0 },
  { id: 'frases:tangueras', kind: 'frases', name: 'Mensajes tangueros', description: 'Frases con aire de milonga para provocar con estilo.', price: 250 },
  { id: 'frases:futboleras', kind: 'frases', name: 'Mensajes futboleros', description: 'Para gritar cada baza como un gol.', price: 250 },
];

export const FREE_COSMETICS = COSMETICS.filter((c) => c.price === 0).map((c) => c.id);

export function cosmeticValue(id: string): string {
  return id.split(':')[1];
}

export const QUICK_MESSAGES: Record<string, string[]> = {
  basicas: ['Buena mano.', 'Dale, cantá.', 'Qué suerte.', 'Jajaja.', 'Bien jugado.', 'Otra partida.', 'Vamos compañero.', 'No te creo nada.'],
  tangueras: ['Esta noche me emborracho... de puntos.', 'Volver, con la frente marchita.', 'Cuesta abajo en mi rodada.', '¡Che, bandoneón!'],
  futboleras: ['¡Gooool!', '¡Vamos, vamos!', 'Esto es un baile.', '¡Y dale que va!'],
};

export const EMOTES = ['😂', '😎', '😱', '🤔', '👏', '🔥', '🧉', '😤'];

export type { CardBackStyle, DeckStyle };
