import { textureUrl } from "@/config/brand-pack";

/**
 * Preloads the marble texture for pages whose largest paint is marble (the home hero, the box
 * stage). React hoists these links into <head>, so the browser fetches the texture with its first
 * requests instead of after a script runs. One link per mode, chosen by the system colour scheme
 * (a visitor who picked the other mode with the toggle gets it from the stylesheet as before).
 */
export function MarblePreload() {
  const dark = textureUrl("dark");
  const light = textureUrl("light");
  if (dark && dark === light) return <link rel="preload" as="image" href={dark} fetchPriority="high" />;
  return (
    <>
      {dark && <link rel="preload" as="image" href={dark} media="(prefers-color-scheme: dark)" fetchPriority="high" />}
      {light && <link rel="preload" as="image" href={light} media="(prefers-color-scheme: light)" fetchPriority="high" />}
    </>
  );
}
