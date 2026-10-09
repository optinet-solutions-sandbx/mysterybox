"use client";

import { useState } from "react";
import { brand } from "@/config/brand";
import { useSession, useSessionHydrated } from "@/store/session";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

/**
 * Entry age confirmation. Placeholder for real age/identity verification (KYC) and
 * geo-restriction, which counsel must specify — see docs/07-compliance-ux.md.
 */
export function AgeGate() {
  const hydrated = useSessionHydrated();
  const confirmed = useSession((s) => s.ageConfirmed);
  const confirmAge = useSession((s) => s.confirmAge);
  const [declined, setDeclined] = useState(false);

  return (
    <Modal open={hydrated && !confirmed} onClose={() => {}} dismissible={false} labelledBy="age-title">
      <h2 id="age-title" className="font-display text-3xl">
        Are you {brand.minimumAge} or older?
      </h2>
      {declined ? (
        <p className="mt-3 text-sm text-muted">
          Sorry, you need to be {brand.minimumAge} or older to use {brand.name}.
        </p>
      ) : (
        <>
          <p className="mt-3 text-sm text-muted">
            {brand.name} sells mystery boxes with published odds. You must be {brand.minimumAge}+ (or the age of
            majority where you live) and located in a supported state.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => setDeclined(true)}>
              No
            </Button>
            <Button onClick={confirmAge}>Yes, I am</Button>
          </div>
        </>
      )}
    </Modal>
  );
}
