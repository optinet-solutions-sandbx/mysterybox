import { brandPack } from "@/config/brand-pack";
import { formatUsd } from "@/domain/money";
import { getCatalog } from "@/services/catalog-source";
import { Faq } from "@/components/landing/faq";
import { Hero } from "@/components/landing/hero";
import { Keyhole } from "@/components/landing/keyhole";
import { Modes } from "@/components/landing/modes";
import { OddsProof } from "@/components/landing/odds-proof";
import { Ritual } from "@/components/landing/ritual";
import { TierShelf, type ShelfBox } from "@/components/landing/tier-shelf";
import { VaultMarquee } from "@/components/landing/vault-marquee";
import { Deferred } from "@/components/fx/deferred";

export default async function HomePage() {
  const { boxStats, getBox, findItem, listBoxes, listShowcaseItems, resolveEntries, topItemsIn } = await getCatalog();
  // Hero chips: the brand pack's showcase categories that have pieces (else every category that does).
  const withItems = (cs: typeof brandPack.categories) => cs.map((c) => ({ id: c.id, label: c.label, items: topItemsIn(c.id) })).filter((c) => c.items.length > 0);
  const picked = withItems(brandPack.categories.filter((c) => c.showcase));
  const showcase = picked.length > 0 ? picked : withItems(brandPack.categories);
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
  // Featured pieces fall back gracefully if the team edits the catalog.
  const proofBox = getBox("flap-room") ?? byPrice[Math.floor(byPrice.length / 2)];
  const ritualItem = findItem("hermes-kelly-28") ?? listShowcaseItems(1)[0];

  return (
    <>
      <Hero categories={showcase} />
      <VaultMarquee items={listShowcaseItems(24)} />
      {/* Heavy scenes mount as you approach them; placeholders reserve their height. */}
      <Deferred placeholderClassName="h-[340vh]">
        <Ritual
          item={ritualItem}
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
