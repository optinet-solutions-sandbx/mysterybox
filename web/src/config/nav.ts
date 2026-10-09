export const primaryNav = [
  { href: "/boxes", label: "Boxes" },
  { href: "/battles", label: "Battles" },
  { href: "/deals", label: "Deals" },
  { href: "/rewards", label: "Rewards" },
  { href: "/leaderboard", label: "Leaderboard" },
] as const;

export const footerNav = [
  {
    title: "Play",
    links: [
      { href: "/boxes", label: "All boxes" },
      { href: "/battles", label: "Battles" },
      { href: "/deals", label: "Deals" },
      { href: "/rewards", label: "Daily rewards" },
      { href: "/leaderboard", label: "Leaderboard" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/inventory", label: "Inventory" },
      { href: "/wallet", label: "Wallet" },
      { href: "/affiliates", label: "Refer a friend" },
      { href: "/account", label: "Settings" },
    ],
  },
  {
    title: "Trust",
    links: [
      { href: "/how-it-works", label: "How it works" },
      { href: "/provably-fair", label: "Provably fair" },
      { href: "/legal/odds-disclosure", label: "Odds disclosure" },
      { href: "/legal/responsible-play", label: "Responsible play" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/legal/terms", label: "Terms" },
      { href: "/legal/privacy", label: "Privacy" },
      { href: "/legal/shipping", label: "Shipping & returns" },
    ],
  },
] as const;
