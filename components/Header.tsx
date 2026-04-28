import Link from "next/link";
import Image from "next/image";

interface HeaderProps {
  title: string;
  subtitle1?: string;
  subtitle2?: string;
  enableDarkMode?: boolean;
  email?: string;
  socialUrl?: string;
  socialTitle?: string;
}

export default function Header({
  title,
  email,
  socialUrl,
}: HeaderProps) {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between"
      style={{ padding: 48 }}
    >
      {/* Left — brand */}
      <Link href="/" className="no-underline">
        <span className="text-2xl sm:text-3xl font-light tracking-[0.08em] lowercase text-white">
          {title.toLowerCase()}
        </span>
      </Link>

      {/* Right — icon links */}
      <nav className="flex items-center gap-6">
        {email && (
          <a
            href={`mailto:${email}`}
            className="opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Email"
          >
            <Image
              src="/assets/icons/email.png"
              alt="Email"
              width={22}
              height={22}
              className="invert-0"
              unoptimized
            />
          </a>
        )}
        {socialUrl && (
          <a
            href={socialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Instagram"
          >
            <Image
              src="/assets/icons/instagram.png"
              alt="Instagram"
              width={22}
              height={22}
              className="invert-0"
              unoptimized
            />
          </a>
        )}
      </nav>
    </header>
  );
}
