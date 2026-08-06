import { useState, useCallback } from 'react';
import { FaFacebook, FaTwitter, FaLink } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

interface ShareButtonsProps {
  url: string;
  title: string;
}

export default function ShareButtons({ url, title }: ShareButtonsProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const shareToFacebook = useCallback(() => {
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=400');
  }, [url]);

  const shareToTwitter = useCallback(() => {
    const shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=400');
  }, [url, title]);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = url;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [url]);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={shareToFacebook}
        aria-label={t('common.shareToFacebook')}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-gray-300 transition-colors hover:bg-blue-600 hover:text-white"
      >
        <FaFacebook className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={shareToTwitter}
        aria-label={t('common.shareToTwitter')}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-gray-300 transition-colors hover:bg-sky-500 hover:text-white"
      >
        <FaTwitter className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={copyLink}
        aria-label={t('common.copyLink')}
        className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
      >
        <FaLink className="h-4 w-4" />
        {copied && (
          <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-green-600 px-2 py-1 text-xs font-medium text-white">
            {t('common.copied')}
          </span>
        )}
      </button>
    </div>
  );
}
