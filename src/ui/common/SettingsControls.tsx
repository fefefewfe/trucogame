import { useEffect, useState } from 'react';
import { useSettings, type AnimationLevel, type BotSpeed } from '../../store/settings';
import { listSpanishVoices, onVoicesChanged, previewVoice, type VoiceOption } from '../../audio/voice';
import { sfx } from '../../audio/sfx';
import { getCharacter } from '../../game/characters';
import { useProfile } from '../../store/profile';
import { useRealDeckStore } from '../art/realDeck';
import { speechRecognitionSupported } from '../../audio/voiceCommands';

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="slider">
      <span className="slider-label">{label}</span>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(value * 100)}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        onPointerUp={() => sfx.click()}
        aria-label={label}
      />
      <span className="slider-value">{Math.round(value * 100)}</span>
    </label>
  );
}

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="segmented-row">
      <span className="slider-label">{label}</span>
      <div className="segmented" role="radiogroup" aria-label={label}>
        {options.map(([v, text]) => (
          <button
            key={v}
            role="radio"
            aria-checked={value === v}
            className={value === v ? 'on' : ''}
            onClick={() => {
              sfx.click();
              onChange(v);
            }}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange, hint }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="toggle-row">
      <span>
        <span className="slider-label">{label}</span>
        {hint && <small className="hint">{hint}</small>}
      </span>
      <button
        role="switch"
        aria-checked={value}
        className={`toggle ${value ? 'on' : ''}`}
        onClick={() => {
          sfx.click();
          onChange(!value);
        }}
      >
        <span />
      </button>
    </label>
  );
}

export function AudioControls() {
  const s = useSettings();
  return (
    <div className="controls-group">
      <Slider label="General" value={s.master} onChange={(v) => s.set({ master: v })} />
      <Slider label="Música" value={s.music} onChange={(v) => s.set({ music: v })} />
      <Slider label="Voces" value={s.voice} onChange={(v) => s.set({ voice: v })} />
      <Slider label="Efectos" value={s.sfx} onChange={(v) => s.set({ sfx: v })} />
      <Slider label="Ambiente" value={s.ambient} onChange={(v) => s.set({ ambient: v })} />
      <Toggle
        label="Voces de los personajes"
        value={s.speech}
        onChange={(v) => s.set({ speech: v })}
        hint="Los personajes dicen los cantos, las respuestas y los tantos en voz alta."
      />
      <VoicePicker />
    </div>
  );
}

function VoicePicker() {
  const s = useSettings();
  const characterId = useProfile((p) => p.characterId);
  const [voices, setVoices] = useState<VoiceOption[]>(() => listSpanishVoices());
  useEffect(() => onVoicesChanged(() => setVoices(listSpanishVoices())), []);
  if (voices.length === 0) {
    return <p className="hint">Tu navegador no tiene voces en español instaladas: las frases se muestran en globos. En Windows, Edge trae voces argentinas naturales; en Mac y iPhone, la voz "Diego".</p>;
  }
  const best = voices[0];
  return (
    <div className="voice-picker">
      <label className="text-field">
        <span>Voz</span>
        <select value={s.voiceName} onChange={(e) => s.set({ voiceName: e.target.value })} className="select">
          <option value="">Automática ({best.name})</option>
          {voices.map((v) => (
            <option key={v.name} value={v.name}>
              {v.name} · {v.lang}
            </option>
          ))}
        </select>
      </label>
      <button className="btn btn-ghost" onClick={() => previewVoice(getCharacter(characterId))}>
        Probar voz
      </button>
      {!voices.some((v) => v.lang.toLowerCase().replace('_', '-') === 'es-ar') && (
        <p className="hint">No encontramos una voz argentina en este dispositivo; se usa la mejor voz en español disponible.</p>
      )}
    </div>
  );
}

export function GameplayControls() {
  const s = useSettings();
  return (
    <div className="controls-group">
      <Segmented<AnimationLevel>
        label="Animaciones"
        value={s.animations}
        options={[
          ['completas', 'Completas'],
          ['reducidas', 'Reducidas'],
          ['minimas', 'Mínimas'],
        ]}
        onChange={(v) => s.set({ animations: v })}
      />
      <Segmented<BotSpeed>
        label="Ritmo de juego"
        value={s.botSpeed}
        options={[
          ['lenta', 'Tranquilo'],
          ['normal', 'Normal'],
          ['rapida', 'Rápido'],
        ]}
        onChange={(v) => s.set({ botSpeed: v })}
      />
      <Toggle label="Cartas en abanico" value={s.fanHand} onChange={(v) => s.set({ fanHand: v })} />
      <Toggle label="Confirmar con doble toque" value={s.doubleTap} onChange={(v) => s.set({ doubleTap: v })} hint="El primer toque levanta la carta y el segundo la juega. También podés arrastrarla." />
      <Toggle label="Mostrar mis tantos" value={s.showEnvido} onChange={(v) => s.set({ showEnvido: v })} hint="Muestra tu envido durante la primera baza." />
      <Toggle
        label="Jugar con el micrófono"
        value={s.microphone}
        onChange={(v) => s.set({ microphone: v })}
        hint={speechRecognitionSupported() ? 'Decí "truco", "quiero", "envido", "al mazo" o "tiro el ancho de espada". Aparece un botón de micrófono en la mesa.' : 'Tu navegador no permite reconocer la voz. Probá con Chrome, Edge o Safari.'}
      />
      <Toggle label="Lenguaje fuerte (+18)" value={s.puteadas} onChange={(v) => s.set({ puteadas: v })} hint="Los personajes a veces putean cuando pierden o ganan una mano. Desactivado por defecto." />
      <RealDeckToggle />
    </div>
  );
}

function RealDeckToggle() {
  const s = useSettings();
  const manifest = useRealDeckStore((st) => st.manifest);
  if (!manifest) return null;
  return (
    <Toggle
      label="Usar baraja real escaneada"
      value={s.realDeck}
      onChange={(v) => s.set({ realDeck: v })}
      hint={`${manifest.nombre ?? 'Baraja en /cartas'}${manifest.licencia ? ` · ${manifest.licencia}` : ''}`}
    />
  );
}
