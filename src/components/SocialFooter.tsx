import { site } from "@/lib/site";

function SocialIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    Facebook: <path fill="currentColor" d="M14 22v-9h3l.5-4H14V7c0-1.2.4-2 2-2h2V1.5c-.8-.1-1.8-.3-3-.3-3 0-5 1.9-5 5.3V9H7v4h3v9z" />,
    YouTube: <><rect x="2" y="5" width="20" height="14" rx="4" fill="currentColor" /><path d="m10 9 6 3-6 3z" fill="#16302f" /></>,
    TikTok: <path fill="currentColor" d="M16 2h-4v13a3 3 0 1 1-3-3v-4a7 7 0 1 0 7 7V8a10 10 0 0 0 6 2V6a6 6 0 0 1-6-4z" />,
    Instagram: <g fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></g>,
    Threads: <path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M20 7c-1.2-3.2-3.9-5-8-5C6 2 3 6 3 12s3 10 9 10c5 0 9-3 9-7 0-3.5-3-5.5-7-5.5-3 0-5 1.4-5 3.5s1.5 3 3.5 3c3 0 4.5-2.2 4.5-5.5C17 7 15.2 5.5 12.5 5.5c-1.8 0-3.2.7-4 2" />,
  };

  return <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" focusable="false">{paths[name]}</svg>;
}

export function SocialFooter() {
  return (
    <footer className="mt-8 w-full border-t border-sage/15 pb-3 pt-6 text-center">
      <p className="font-serif text-[16px] text-paper">Ghé Khoảng Ngẫm mỗi ngày</p>
      <p className="mt-2 text-[12px] text-sage">{site.socialHandle} · Một khoảng nhỏ dành cho mình.</p>
      <nav aria-label="Mạng xã hội Khoảng Ngẫm" className="mt-4 flex flex-wrap justify-center gap-3">
        {site.socialLinks.map(({ name, href }) => (
          <a
            key={name}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            title={name}
            aria-label={`${name} ${site.socialHandle} (mở trong tab mới)`}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-sage/25 text-sage transition hover:border-gold hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            <SocialIcon name={name} />
          </a>
        ))}
      </nav>
    </footer>
  );
}
