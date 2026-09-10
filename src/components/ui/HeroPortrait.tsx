export function HeroPortrait() {
  return (
    <figure className="hero-portrait-blend">
        <img
          src="/images/profile/oj-hero-1000.webp"
          srcSet="/images/profile/oj-hero-600.webp 600w, /images/profile/oj-hero-1000.webp 1000w"
          sizes="(max-width: 767px) 90vw, 45vw"
          alt="OJ Florendo Rayatchi wearing glasses and a cream top"
          width={1000}
          height={1250}
          decoding="async"
          fetchPriority="high"
        />
    </figure>
  );
}
