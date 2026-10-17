import { useState } from "react";
import { companyFallback, companyLogoUrl } from "../../company-logo.mjs";
import "./company-logo.css";

const sizes = { sm: 28, md: 40, lg: 64 } as const;

function LogoImage({
  src,
  fallback,
  size,
  loading,
}: {
  src: string;
  fallback: string;
  size: number;
  loading: "lazy" | "eager";
}) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <span className="company-logo-fallback">{fallback}</span>
  ) : (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading={loading}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}

/** Decorative identity beside an existing company name/ticker. */
export function CompanyLogo({
  ticker,
  logoUrl,
  demo = false,
  size = "md",
  loading = "lazy",
}: {
  ticker: string;
  logoUrl?: string | null;
  demo?: boolean;
  size?: keyof typeof sizes;
  loading?: "lazy" | "eager";
}) {
  const src = companyLogoUrl(ticker, logoUrl, demo);
  const fallback = companyFallback(ticker);
  return (
    <span className={`company-logo company-logo--${size}`} aria-hidden="true">
      {src ? (
        <LogoImage
          key={src}
          src={src}
          fallback={fallback}
          size={sizes[size]}
          loading={loading}
        />
      ) : (
        <span className="company-logo-fallback">{fallback}</span>
      )}
    </span>
  );
}
