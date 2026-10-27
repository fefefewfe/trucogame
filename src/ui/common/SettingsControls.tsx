import { useSettings, type AnimationLevel, type BotSpeed } from '../../store/settings';
import { hasSpanishSpeech } from '../../audio/voice';
import { sfx } from '../../audio/sfx';

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
        label="Voz del navegador"
        value={s.speech}
        onChange={(v) => s.set({ speech: v })}
        hint={hasSpanishSpeech() ? 'Lee las frases con la voz en español del sistema mientras no haya grabaciones.' : 'Tu navegador no tiene voz en español: las frases se muestran en globos.'}
      />
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
    </div>
  );
}
