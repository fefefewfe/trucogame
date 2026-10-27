import { useState } from 'react';
import { useProfile } from '../../store/profile';
import { AudioControls, GameplayControls } from '../common/SettingsControls';
import { ScreenHeader } from '../common/ProfileChip';
import { sfx } from '../../audio/sfx';
import { useNav } from '../../store/nav';

export function SettingsScreen() {
  const profile = useProfile();
  const nav = useNav();
  const [name, setName] = useState(profile.name);
  const [confirmReset, setConfirmReset] = useState(false);
  const installable = typeof window !== 'undefined' && 'serviceWorker' in navigator;
  return (
    <div className="screen settings-screen">
      <ScreenHeader title="Configuración" subtitle="Se guarda automáticamente en este dispositivo" />
      <div className="settings-grid">
        <section className="panel">
          <h2>Sonido</h2>
          <AudioControls />
          <button className="btn btn-ghost" onClick={() => sfx.call('truco')}>
            Probar sonido
          </button>
        </section>
        <section className="panel">
          <h2>Juego</h2>
          <GameplayControls />
        </section>
        <section className="panel">
          <h2>Jugador</h2>
          <label className="text-field">
            <span>Nombre</span>
            <input value={name} maxLength={18} onChange={(e) => setName(e.target.value)} onBlur={() => profile.setName(name)} />
          </label>
          <p className="field-help">El personaje que te representa en la mesa se elige en Personajes.</p>
          <button className="btn btn-ghost" onClick={() => nav.go('personajes')}>
            Elegir personaje
          </button>
          <h2 className="mt">Instalar</h2>
          <p className="field-help">
            {installable
              ? 'Podés instalar el juego como aplicación desde el menú del navegador ("Instalar aplicación" o "Agregar a pantalla de inicio"). Funciona sin conexión contra la computadora.'
              : 'Tu navegador no permite instalar aplicaciones web.'}
          </p>
          <h2 className="mt">Datos</h2>
          {confirmReset ? (
            <div className="row">
              <span className="warn">Se borra todo tu progreso.</span>
              <button className="btn btn-ghost" onClick={() => setConfirmReset(false)}>
                Cancelar
              </button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  localStorage.removeItem('truco-profile-v1');
                  localStorage.removeItem('truco-tournament-v1');
                  window.location.reload();
                }}
              >
                Borrar
              </button>
            </div>
          ) : (
            <button className="btn btn-danger" onClick={() => setConfirmReset(true)}>
              Reiniciar progreso
            </button>
          )}
        </section>
      </div>
    </div>
  );
}
