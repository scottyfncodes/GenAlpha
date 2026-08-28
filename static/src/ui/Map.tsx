import { MapView } from './MapView';
import './map.css';

/**
 * The full map screen, opened by tapping the minimap. Same `MapView`
 * content the Cyberdeck's own Map app shows — this is just the version
 * with its own full-screen frame and a Close button, for the door that
 * isn't already inside another device's screen.
 */
export function Map({ onClose }: { onClose: () => void }) {
  return (
    <div className="map lang-b" role="dialog" aria-label="Map">
      <header className="map__head">
        <h2 className="map__title">Bellhaven</h2>
        <button className="map__close" onClick={onClose}>
          Done
        </button>
      </header>
      <div className="map__body">
        <MapView />
      </div>
    </div>
  );
}
