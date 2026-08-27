import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Fingerprint,
  ShieldCheck,
  Lock,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  ScanFace,
  Sparkles,
} from 'lucide-react';
import { Biometrics, BiometricStatus } from '../../services/biometrics';
import { Haptics } from '../../services/haptics';
import { MeridianStorage } from '../../services/storage';

interface BiometricLockModalProps {
  isOpen: boolean;
  onUnlockSuccess: () => void;
  moduleName?: string;
  reason?: string;
  isDismissable?: boolean;
  onCancel?: () => void;
}

export const BiometricLockModal: React.FC<BiometricLockModalProps> = ({
  isOpen,
  onUnlockSuccess,
  moduleName,
  reason = 'Authenticate to access private records',
  isDismissable = false,
  onCancel,
}) => {
  const [status, setStatus] = useState<BiometricStatus | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPinInput, setShowPinInput] = useState(false);
  const [pinDigits, setPinDigits] = useState<string>('');
  const [successAnim, setSuccessAnim] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setPinDigits('');
      setSuccessAnim(false);
      Biometrics.checkBiometricStatus().then((s) => {
        setStatus(s);
        // Automatically prompt biometric if available
        triggerBiometricAuth(s);
      });
    }
  }, [isOpen]);

  const triggerBiometricAuth = async (currentStatus?: BiometricStatus) => {
    setIsVerifying(true);
    setErrorMessage(null);
    Haptics.medium();

    const res = await Biometrics.authenticate(reason);
    setIsVerifying(false);

    if (res.success) {
      setSuccessAnim(true);
      setTimeout(() => {
        onUnlockSuccess();
      }, 400);
    } else {
      setErrorMessage(res.error || 'Authentication unverified. Please try again or enter PIN.');
    }
  };

  const handlePinKey = (digit: string) => {
    Haptics.light();
    if (pinDigits.length < 4) {
      const next = pinDigits + digit;
      setPinDigits(next);
      if (next.length === 4) {
        // Verify PIN
        setTimeout(() => {
          if (Biometrics.verifyPIN(next)) {
            setSuccessAnim(true);
            setTimeout(() => {
              onUnlockSuccess();
            }, 400);
          } else {
            setErrorMessage('Incorrect Security PIN. Please try again.');
            setPinDigits('');
          }
        }, 100);
      }
    }
  };

  const handleBackspace = () => {
    Haptics.light();
    setPinDigits((prev) => prev.slice(0, -1));
  };

  if (!isOpen) return null;

  const isFace = status?.biometryType === 'face';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-sm rounded-3xl border shadow-2xl p-6 flex flex-col items-center text-center space-y-5"
        style={{
          backgroundColor: 'var(--md-sys-color-surface-container)',
          borderColor: 'var(--md-sys-color-outline-variant)',
          color: 'var(--md-sys-color-on-surface)',
        }}
      >
        {/* Security Icon Shield */}
        <div className="relative">
          <div
            className={`w-20 h-20 rounded-3xl flex items-center justify-center transition-all shadow-lg ${
              successAnim
                ? 'bg-emerald-500 text-white scale-105'
                : 'bg-primary/15 text-primary border border-primary/30'
            }`}
          >
            {successAnim ? (
              <CheckCircle2 className="w-10 h-10 animate-in zoom-in-50 duration-200" />
            ) : isFace ? (
              <ScanFace className="w-10 h-10 animate-pulse" />
            ) : (
              <Fingerprint className="w-10 h-10 animate-pulse" />
            )}
          </div>
          <div className="absolute -bottom-1.5 -right-1.5 p-1.5 rounded-full bg-surface-container-high border border-outline-variant shadow-sm text-amber-400">
            <Lock className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Title & Description */}
        <div className="space-y-1">
          <h2 className="text-lg font-bold font-display text-on-surface">
            {successAnim ? 'Identity Verified' : moduleName ? `Unlock ${moduleName}` : 'Meridian Biometric Access'}
          </h2>
          <p className="text-xs text-on-surface-variant max-w-[260px] mx-auto">
            {successAnim
              ? 'Decrypted session active'
              : reason}
          </p>
        </div>

        {/* Error message */}
        {errorMessage && !successAnim && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2 max-w-full"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="text-left text-[11px] leading-tight">{errorMessage}</span>
          </motion.div>
        )}

        {/* PIN Input or Biometric Prompt */}
        {showPinInput ? (
          <div className="w-full space-y-4 pt-1">
            {/* PIN Dots */}
            <div className="flex justify-center gap-3">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-full border transition-all ${
                    pinDigits.length > idx
                      ? 'bg-primary border-primary scale-110'
                      : 'border-outline-variant bg-surface'
                  }`}
                />
              ))}
            </div>

            {/* Keypad Grid */}
            <div className="grid grid-cols-3 gap-2.5 w-full max-w-[220px] mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    if (k === 'C') {
                      Haptics.light();
                      setPinDigits('');
                    } else if (k === '⌫') {
                      handleBackspace();
                    } else {
                      handlePinKey(k);
                    }
                  }}
                  className="h-11 rounded-2xl border border-outline-variant bg-surface-container-high hover:bg-surface-container-highest active:scale-90 font-mono text-sm font-semibold text-on-surface transition-all flex items-center justify-center shadow-xs"
                >
                  {k}
                </button>
              ))}
            </div>

            {/* Switch back to Biometric */}
            <button
              type="button"
              onClick={() => {
                Haptics.selection();
                setShowPinInput(false);
                triggerBiometricAuth();
              }}
              className="text-xs text-primary font-semibold hover:underline flex items-center justify-center gap-1.5 mx-auto"
            >
              <Fingerprint className="w-3.5 h-3.5" />
              <span>Use Biometric Scan</span>
            </button>
          </div>
        ) : (
          <div className="w-full space-y-3 pt-2">
            <button
              type="button"
              onClick={() => triggerBiometricAuth()}
              disabled={isVerifying || successAnim}
              className="w-full py-3.5 px-4 rounded-2xl bg-primary text-on-primary font-bold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 m3-ripple"
            >
              {isFace ? <ScanFace className="w-5 h-5" /> : <Fingerprint className="w-5 h-5" />}
              <span>{isVerifying ? 'Scanning Biometrics...' : 'Scan Biometrics'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                Haptics.selection();
                setShowPinInput(true);
              }}
              className="w-full py-2.5 px-4 rounded-xl border border-outline-variant hover:bg-black/5 dark:hover:bg-white/5 text-on-surface-variant font-medium text-xs transition-all flex items-center justify-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Enter Security PIN</span>
            </button>
          </div>
        )}

        {/* Cancel Button if dismissable */}
        {isDismissable && onCancel && (
          <button
            type="button"
            onClick={() => {
              Haptics.light();
              onCancel();
            }}
            className="text-xs text-on-surface-variant hover:text-on-surface pt-1"
          >
            Cancel & Return
          </button>
        )}
      </motion.div>
    </div>
  );
};
