'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Camera, Loader2, X } from 'lucide-react';
import { Button } from '@/components/portal/ui/button';
import { initials } from '@/lib/utils';

const OUTPUT_SIZE = 256;

type Props = {
  initialPath: string | null;
  fullName: string;
  email: string;
};

function centerSquare(width: number, height: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 80 }, 1, width, height),
    width,
    height,
  );
}

async function blobFromCrop(
  image: HTMLImageElement,
  crop: PixelCrop,
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE,
  );
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
      'image/png',
      0.92,
    );
  });
}

export function AvatarPicker({ initialPath, fullName, email }: Props) {
  const router = useRouter();
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop | undefined>(undefined);
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [renderUrl, setRenderUrl] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function resolve() {
      if (!initialPath) {
        setRenderUrl(null);
        return;
      }
      if (/^https?:\/\//i.test(initialPath)) {
        setRenderUrl(initialPath);
        return;
      }
      try {
        const res = await fetch(`/api/portal/avatar/url?path=${encodeURIComponent(initialPath)}`);
        if (!res.ok) return;
        const json = (await res.json()) as { url: string | null };
        if (!cancelled) setRenderUrl(json.url ?? null);
      } catch {
        // non-fatal
      }
    }
    void resolve();
    return () => {
      cancelled = true;
    };
  }, [initialPath]);

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (!f) return;
    setStatus(null);
    setPickedFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  }

  function cancel() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPickedFile(null);
    setPreviewUrl(null);
    setCrop(undefined);
    setCompletedCrop(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  async function confirm() {
    if (!imgRef.current || !completedCrop) {
      setStatus({ ok: false, msg: 'Adjust the crop area first.' });
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const blob = await blobFromCrop(imgRef.current, completedCrop);
      const fd = new FormData();
      fd.append('file', new File([blob], 'avatar.png', { type: 'image/png' }));
      const res = await fetch('/api/portal/avatar', { method: 'POST', body: fd });
      const json = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? 'Upload failed');
      if (json.url) setRenderUrl(json.url);
      cancel();
      setStatus({ ok: true, msg: 'Avatar updated.' });
      router.refresh();
    } catch (err) {
      setStatus({ ok: false, msg: err instanceof Error ? err.message : 'Upload failed' });
    } finally {
      setBusy(false);
    }
  }

  const display = renderUrl;

  return (
    <div className="space-y-4" data-testid="avatar-picker">
      <div className="flex items-center gap-4">
        {display ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={display}
            alt={fullName || email}
            className="w-16 h-16 rounded-full border border-[#27272a] object-cover"
            data-testid="avatar-preview"
          />
        ) : (
          <div className="w-16 h-16 rounded-full border border-[#27272a] bg-[#18181b] flex items-center justify-center text-sm font-medium text-[#a1a1aa]">
            {initials(fullName || email)}
          </div>
        )}
        <div className="flex-1 min-w-0 space-y-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            data-testid="avatar-pick"
          >
            <Camera className="w-3.5 h-3.5 mr-1" />
            Change avatar
          </Button>
          <p className="text-[11px] text-[#52525b]">PNG, JPEG, or WebP. 5 MB max.</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={onPickFile}
            data-testid="avatar-file-input"
          />
        </div>
      </div>

      {previewUrl ? (
        <div
          className="rounded-xl border border-[#27272a] bg-[#0f0f12] p-4 space-y-3"
          data-testid="avatar-crop-modal"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-[#fafafa]">Adjust your crop</h3>
            <button
              type="button"
              className="text-[#71717a] hover:text-[#fafafa]"
              onClick={cancel}
              aria-label="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="bg-[#09090b] rounded-lg overflow-hidden flex justify-center">
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={1}
              circularCrop
              keepSelection
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={previewUrl}
                alt="To be cropped"
                className="max-h-[400px] object-contain"
                onLoad={(e) => {
                  const target = e.currentTarget;
                  setCrop(centerSquare(target.width, target.height));
                }}
              />
            </ReactCrop>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span
              role="status"
              aria-live="polite"
              className="text-xs text-[#71717a]"
            >
              {pickedFile ? `${pickedFile.name} · ${Math.round(pickedFile.size / 1024)} KB` : ''}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={cancel}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={confirm}
                disabled={busy}
                data-testid="avatar-crop-confirm"
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save avatar'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {status ? (
        <p
          className={`text-xs ${status.ok ? 'text-[#10b981]' : 'text-[#f43f5e]'}`}
          role="status"
          aria-live="polite"
        >
          {status.msg}
        </p>
      ) : null}
    </div>
  );
}
