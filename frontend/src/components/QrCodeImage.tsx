import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QrCodeImageProps {
  /** Texte encodé : ici l'adresse de la fiche publique de l'équipement */
  value: string;
  /** Côté de l'image affichée, en pixels */
  size?: number;
  alt: string;
  className?: string;
  /** Reçoit l'image PNG (data URL) dès qu'elle est prête, pour un éventuel téléchargement */
  onReady?: (dataUrl: string) => void;
}

// QR généré dans le navigateur : aucune donnée n'est envoyée à un service tiers.
// Toujours noir sur blanc avec marge : c'est ce qui se lit le mieux, y compris imprimé ou sur un thème sombre.
export const QrCodeImage: React.FC<QrCodeImageProps> = ({ value, size = 160, alt, className, onReady }) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, { width: size * 2, margin: 2, errorCorrectionLevel: 'M' })
      .then((url) => {
        if (cancelled) return;
        setDataUrl(url);
        setFailed(false);
        onReady?.(url);
      })
      .catch((err) => {
        console.error('Erreur de génération du code QR:', err);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [value, size, onReady]);

  if (failed) return <p className="text-xs text-red-400">Code QR indisponible</p>;
  if (!dataUrl) return <div style={{ width: size, height: size }} className={`bg-white/5 animate-pulse rounded ${className ?? ''}`} />;
  return <img src={dataUrl} alt={alt} width={size} height={size} className={`bg-white rounded ${className ?? ''}`} />;
};
