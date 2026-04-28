interface FooterProps {
  email?: string;
  socialUrl?: string;
  socialTitle?: string;
  siteTitle: string;
}

export default function Footer({
  email,
  socialUrl,
  socialTitle,
  siteTitle,
}: FooterProps) {
  return (
    <footer className="px-6 py-8 text-xs opacity-50 flex flex-wrap gap-x-6 gap-y-1">
      <span>&copy; {new Date().getFullYear()} {siteTitle}</span>
      {email && <a href={`mailto:${email}`}>{email}</a>}
      {socialUrl && (
        <a href={socialUrl} target="_blank" rel="noopener noreferrer">
          {socialTitle || "Social"}
        </a>
      )}
    </footer>
  );
}
