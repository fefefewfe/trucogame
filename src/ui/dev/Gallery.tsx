import { createDeck, parseCardId } from '../../engine/cards';
import { Avatar, type Expression } from '../art/Avatar';
import { CardBack, CardFace, type CardBackStyle } from '../art/CardFace';
import { CHARACTERS } from '../../game/characters';

const EXPRESSIONS: Expression[] = ['neutral', 'happy', 'laugh', 'angry', 'surprised', 'smug', 'sad', 'thinking'];
const BACKS: CardBackStyle[] = ['clasico', 'azul', 'celeste', 'premium', 'fileteado', 'paño'];

/** Galería de desarrollo: muestra todas las cartas y personajes. Se abre con ?galeria */
export function Gallery() {
  const deck = createDeck();
  const zoom = new URLSearchParams(window.location.search).get('zoom');
  if (zoom) {
    return (
      <div style={{ padding: 16, background: '#0d3a27', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {zoom.split(',').map((id) => (
          <div key={id} style={{ width: 300, height: 465 }}>
            <CardFace card={parseCardId(id)} />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div style={{ padding: 16, background: '#0d3a27', minHeight: '100vh', overflow: 'auto', height: '100vh' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 110px)', gap: 10 }}>
        {deck.map((c) => (
          <div key={c.id} style={{ width: 110, height: 170 }}>
            <CardFace card={c} />
          </div>
        ))}
        {BACKS.map((b) => (
          <div key={b} style={{ width: 110, height: 170 }}>
            <CardBack style={b} />
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 110px)', gap: 10, marginTop: 20 }}>
        {CHARACTERS.flatMap((ch) =>
          EXPRESSIONS.map((e) => <Avatar key={ch.id + e} look={ch.look} expression={e} size={110} animated={false} />),
        )}
      </div>
    </div>
  );
}
