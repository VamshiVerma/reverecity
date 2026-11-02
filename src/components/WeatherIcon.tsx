import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Moon, Sun, type LucideProps } from "lucide-react";

/** Picks an icon for a plain-language condition ("Overcast", "Light rain", "Clear"). */
export default function WeatherIcon({ conditions = "", night, ...props }: { conditions?: string; night?: boolean } & LucideProps) {
  const c = conditions.toLowerCase();
  const Icon = /thunder|storm/.test(c) ? CloudLightning
    : /snow|sleet|flurr/.test(c) ? CloudSnow
    : /drizzle/.test(c) ? CloudDrizzle
    : /rain|shower/.test(c) ? CloudRain
    : /fog|mist|haze/.test(c) ? CloudFog
    : /overcast|cloudy/.test(c) && !/partly/.test(c) ? Cloud
    : /partly|mostly/.test(c) ? CloudSun
    : night ? Moon : Sun;
  return <Icon strokeWidth={1.6} {...props} />;
}
