import { formatUsd } from "@/domain/money";
import { boxStats, getBox, getItem, listBoxes, listShowcaseItems, resolveEntries, topItemsIn } from "@/services/catalog";
import { Faq } from "@/components/landing/faq";
import { Hero } from "@/components/landing/hero";
import { Keyhole } from "@/components/landing/keyhole";
import { Modes } from "@/components/landing/modes";
import { OddsProof } from "@/components/landing/odds-proof";
import { Ritual } from "@/components/landing/ritual";
import { TierShelf, type ShelfBox } from "@/components/landing/tier-shelf";
import { VaultMarquee } from "@/components/landing/vault-marquee";
import { Deferred } from "@/components/fx/deferred";

const showcase = [
  { id: "bags", label: "Bags", items: topItemsIn("bags") },
  { id: "watches", label: "Watches", items: topItemsIn("watches") },
  { id: "jewelry", label: "Jewelry", items: topItemsIn("jewelry") },
  { id: "beauty", label: "Beauty", items: topItemsIn("beauty") },
];

export default function HomePage() {
  const byPrice = [...listBoxes()].sort((a, b) => a.price - b.price);
  const shelf: ShelfBox[] = byPrice.map((b) => {
    const { top } = boxStats(b);
    return {
      slug: b.slug,
      name: b.name,
      tagline: b.tagline,
      price: b.price,
      material: b.material,
      top: { brand: top.item.brand, name: top.item.name, value: top.item.value },
    };
  });
  const proofBox = getBox("flap-room")!;

  return (
    <>
      <Hero categories={showcase} />
      <VaultMarquee items={listShowcaseItems(24)} />
      {/* Heavy scenes mount as you approach them; placeholders reserve their height. */}
      <Deferred placeholderClassName="h-[340vh]">
        <Ritual
          item={getItem("hermes-kelly-28")}
          priceRange={`${formatUsd(byPrice[0].price)} – ${formatUsd(byPrice[byPrice.length - 1].price)}`}
        />
      </Deferred>
      <Deferred placeholderClassName="h-[1190px]">
        <TierShelf boxes={shelf} />
      </Deferred>
      <Deferred placeholderClassName="h-[1195px] lg:h-[710px]">
        <OddsProof
          boxName={proofBox.name}
          boxSlug={proofBox.slug}
          entries={resolveEntries(proofBox)}
          rtp={boxStats(proofBox).rtp}
        />
      </Deferred>
      <Modes />
      <Faq limit={4} />
      <Deferred placeholderClassName="h-[300vh]">
        <Keyhole />
      </Deferred>
    </>
  );
}
