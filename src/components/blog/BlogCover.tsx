import Image from "next/image";
import type { BlogPost } from "@/lib/blog";
import {
  buildCoverScene,
  type CoverGradient,
  type CoverGroup,
  type CoverShape,
  type CoverVariant,
} from "@/lib/blog/cover-scene";
import { postTypeOf } from "@/lib/blog/showcase";
import styles from "./blog.module.css";

const GROUP_CLASS: Record<CoverGroup["role"], string | undefined> = {
  still: undefined,
  glow: styles.coverGlow,
  tilt: styles.coverTilt,
  orbit: styles.coverOrbit,
  drift: styles.coverDrift,
};

const GLOW_DELAY_CLASS = [
  styles.coverStep0,
  styles.coverStep1,
  styles.coverStep2,
  styles.coverStep3,
  styles.coverStep4,
  styles.coverStep5,
];

function paint(value: string, prefix: string) {
  return value.startsWith("url(#") ? `url(#${prefix}-${value.slice(5)}` : value;
}

function Gradient({ gradient, prefix }: { gradient: CoverGradient; prefix: string }) {
  const children = gradient.stops.map((stop) => (
    <stop key={stop.offset} offset={stop.offset} stopColor={stop.color} stopOpacity={stop.opacity} />
  ));
  const id = `${prefix}-${gradient.id}`;
  return gradient.kind === "radial" ? (
    <radialGradient id={id} cx={gradient.cx} cy={gradient.cy} r={gradient.r}>
      {children}
    </radialGradient>
  ) : (
    <linearGradient
      id={id}
      x1={gradient.x1}
      y1={gradient.y1}
      x2={gradient.x2}
      y2={gradient.y2}
      gradientUnits={gradient.userSpace ? "userSpaceOnUse" : undefined}
    >
      {children}
    </linearGradient>
  );
}

function Shape({ shape, prefix }: { shape: CoverShape; prefix: string }) {
  const common = {
    fill: paint(shape.fill, prefix),
    opacity: shape.opacity,
    stroke: shape.stroke,
    strokeWidth: shape.strokeWidth,
  };
  switch (shape.kind) {
    case "circle":
      return <circle cx={shape.cx} cy={shape.cy} r={shape.r} {...common} />;
    case "ellipse":
      return (
        <ellipse
          cx={shape.cx}
          cy={shape.cy}
          rx={shape.rx}
          ry={shape.ry}
          transform={shape.rotate ? `rotate(${shape.rotate} ${shape.cx} ${shape.cy})` : undefined}
          {...common}
        />
      );
    case "path":
      return <path d={shape.d} strokeLinecap="round" {...common} />;
  }
}

/**
 * A post's picture: the owner's reviewed screenshot when the post names one,
 * otherwise its own star scene, drawn here on the server as inline SVG. The
 * scene is decorative (the card's text carries the meaning), so it is hidden
 * from assistive technology; a screenshot carries real alt text. The frame's
 * `data-cover` lets CoverMotion play the one short move on first view.
 */
export function BlogCover({ post, variant }: { post: BlogPost; variant: CoverVariant }) {
  const frameClass = `${styles.coverFrame} ${variant === "featured" ? styles.coverFeatured : styles.coverCard}`;

  if (post.schemaVersion === 2 && post.cover) {
    return (
      <div className={frameClass}>
        <Image
          src={post.cover.src}
          width={post.cover.width}
          height={post.cover.height}
          alt={post.cover.alt}
          sizes={variant === "featured" ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"}
          className={styles.coverImage}
        />
      </div>
    );
  }

  const scene = buildCoverScene(post.slug, postTypeOf(post), variant);
  const prefix = `cover-${variant}-${post.slug}`;
  return (
    <div className={frameClass} data-cover="">
      <svg
        className={styles.coverArt}
        viewBox={`0 0 ${scene.width} ${scene.height}`}
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          {scene.gradients.map((gradient) => (
            <Gradient key={gradient.id} gradient={gradient} prefix={prefix} />
          ))}
        </defs>
        {scene.groups.map((group, index) => (
          <g
            key={index}
            className={
              [GROUP_CLASS[group.role], group.role === "glow" ? GLOW_DELAY_CLASS[group.delay ?? 0] : undefined]
                .filter(Boolean)
                .join(" ") || undefined
            }
          >
            {group.shapes.map((shape, shapeIndex) => (
              <Shape key={shapeIndex} shape={shape} prefix={prefix} />
            ))}
          </g>
        ))}
      </svg>
    </div>
  );
}
