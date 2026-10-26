import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode, Html5QrcodeScannerState, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { AppLayout } from '../../components/layout/AppLayout';
import { equipmentService, type Equipment } from '../../services/api';
import { getAppBaseUrls } from '../../config/publicUrl';
import { getApiErrorMessage } from '../../utils/apiError';
import { parseEquipmentQr } from '../../utils/qrCode';
import { cameraErrorMessage, findBySerialNumber } from '../../utils/scanner';

const READER_ID = 'qr-reader';

type CameraState = 'starting' | 'scanning' | 'failed';

export const ScanPage: React.FC = () => {
  const navigate = useNavigate();
  const [camera, setCamera] = useState<CameraState>('starting');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [serial, setSerial] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const equipmentsCache = useRef<Equipment[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const scanner = new Html5Qrcode(READER_ID, { verbose: false, formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE] });

    const onDecoded = (text: string) => {
      const id = parseEquipmentQr(text, getAppBaseUrls());
      if (id) {
        navigate(`/equipments/${id}`);
        return;
      }
      // Le même code est relu plusieurs fois par seconde : on reste sur le scanner avec un seul message
      setNotice(`Code non reconnu : ce n'est pas un QR code d'équipement de cette application (« ${text.slice(0, 60)} »).`);
    };

    const started = scanner
      .start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 240, height: 240 } }, onDecoded, undefined)
      .then(() => {
        // Le composant a été démonté pendant le démarrage (rendu double en développement) : on referme aussitôt
        if (cancelled) return scanner.stop().then(() => scanner.clear());
        setCamera('scanning');
      })
      .catch((err) => {
        console.error('Erreur de démarrage de la caméra:', err);
        if (cancelled) return;
        setCameraError(cameraErrorMessage(err, window.isSecureContext));
        setCamera('failed');
      });

    return () => {
      cancelled = true;
      started
        .then(() => {
          if (scanner.getState() === Html5QrcodeScannerState.SCANNING) return scanner.stop().then(() => scanner.clear());
        })
        .catch(() => undefined);
    };
  }, [navigate]);

  const searchBySerial = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!serial.trim()) return;
    setSearching(true);
    setSearchError(null);
    try {
      if (!equipmentsCache.current) {
        const res = await equipmentService.getAll();
        equipmentsCache.current = res.data.data || [];
      }
      const found = findBySerialNumber(equipmentsCache.current!, serial);
      if (found) navigate(`/equipments/${found.id}`);
      else setSearchError(`Aucun équipement avec le numéro de série « ${serial.trim()} ».`);
    } catch (err) {
      console.error('Erreur de recherche par numéro de série:', err);
      setSearchError(getApiErrorMessage(err, 'Recherche impossible pour le moment.'));
    } finally {
      setSearching(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-xl mx-auto flex flex-col gap-4">
        <div>
          <h1 className="font-headline-md text-headline-md text-on-surface font-semibold">Scanner un équipement</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Placez le QR code de l'étiquette devant la caméra pour ouvrir la fiche complète de l'équipement.
          </p>
        </div>

        <div className="bg-[#1A1A1A] border border-[#262626] rounded-xl p-4 flex flex-col gap-3">
          {/* Le lecteur écrit sa vidéo dans cet élément ; il reste dans la page même si la caméra échoue */}
          <div id={READER_ID} className={camera === 'failed' ? 'hidden' : 'w-full overflow-hidden rounded-lg bg-black min-h-[16rem]'} />

          {camera === 'starting' && (
            <p className="text-sm text-on-surface-variant flex items-center gap-2" aria-live="polite">
              <span className="material-symbols-outlined animate-spin text-lg text-primary">sync</span>
              Démarrage de la caméra...
            </p>
          )}

          {camera === 'failed' && cameraError && (
            <div role="alert" className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-sm flex items-start gap-2">
              <span className="material-symbols-outlined text-base mt-0.5">videocam_off</span>
              <span>{cameraError}</span>
            </div>
          )}

          {notice && (
            <div role="status" className="bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg p-3 text-sm flex items-start gap-2">
              <span className="material-symbols-outlined text-base mt-0.5">warning</span>
              <span className="break-words min-w-0">{notice}</span>
            </div>
          )}
        </div>

        <form onSubmit={searchBySerial} className="bg-[#1A1A1A] border border-[#262626] rounded-xl p-4 flex flex-col gap-2">
          <label htmlFor="scan-serial" className="text-sm font-medium text-on-surface">
            Ou saisir le numéro de série
          </label>
          <div className="flex gap-2">
            <input
              id="scan-serial"
              type="text"
              value={serial}
              onChange={(e) => setSerial(e.target.value)}
              placeholder="Ex. SN-88392-XXT"
              className="flex-1 min-w-0 bg-[#0D0D0D] border border-[#333333] text-on-surface text-sm font-mono rounded py-2 px-3 focus:outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={searching || !serial.trim()}
              className="px-4 py-2 bg-primary text-on-primary font-medium rounded-lg text-sm disabled:opacity-50 cursor-pointer"
            >
              {searching ? 'Recherche...' : 'Rechercher'}
            </button>
          </div>
          {searchError && (
            <p role="alert" className="text-sm text-red-400">
              {searchError}
            </p>
          )}
        </form>
      </div>
    </AppLayout>
  );
};
