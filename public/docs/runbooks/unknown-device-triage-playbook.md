# Unknown-Device Triage Playbook (M-26-14 Element 1)

**Audience:** SOC analyst / HWAM steward / ISSO.
**Scope:** what to do when a previously-unknown or unmanaged device appears on
the network. Turns a detection into a disposition and a gated next step.

This is the operational companion to the automated loop. The loop does the
detection and classification; **you** make the call and execute the gated step.

---

## The loop in one picture

```
 detect ─────────────► classify ──────────► route ──────────► act (gated)
 (rule / observed      (m_26_14-asset-       (Kibana Case      (human runs the
  ledger / network      triage-classify       per disposition,  next step; nothing
  discovery)            pipeline)             evidence pre-      enforces on its own)
                                              filled)
```

- **Detection** surfaces the device three ways: the first-seen rogue-device
  rule (`m_26_14-appendixb-e-rogue-device`), the observed ledger
  (`unexpected_observed` quadrant — on the wire, not in inventory), and
  network-discovery inventory rows (`asset.managed:false`).
- **Classification** is the `m_26_14-asset-triage-classify` pipeline. It folds in
  a **computed** rogue signal (correlated Security alerts, summarized per host by
  the `m_26_14-host-alert-summary` transform) and writes one disposition per
  device to the `m_26_14-asset-triage` ledger.
- **Routing** is the `m_26_14-unknown-device-triage` workflow — opens a
  disposition-specific Case.
- **Action** is yours. Every enforcement step is human-gated.

Refresh the classification and read the queue:

```console
POST _reindex
{ "source": { "index": "m_26_14-assets", "query": { "term": { "asset.managed": false } } },
  "dest": { "index": "m_26_14-asset-triage", "pipeline": "m_26_14-asset-triage-classify" } }

GET m_26_14-asset-triage/_search
{ "query": { "term": { "state": "proposed" } },
  "sort": [ { "m_26_14.triage.confidence": "desc" } ] }
```

---

## Decision tree

```
Device flagged (asset.managed:false, or unexpected_observed)
│
├─ Correlated high-severity Security alert on this host?  ──── YES ──► ROGUE
│        (m_26_14.triage.disposition = rogue)                         → escalate_ir
│
├─ Marked retired/inactive, or silent-then-stale (>45d)?  ──── YES ──► DECOMMISSIONED
│                                                                     → retire
│
├─ Strong identity (serial + enterprise vendor), no alerts? ─ YES ──► NEW-BUT-UNINVENTORIED
│                                                                     → enroll
│
├─ Consumer / BYOD vendor, no alerts?  ──────────────────────  YES ──► SHADOW-IT
│                                                                     → exception (policy)
│
└─ Signals ambiguous / conflicting  ───────────────────────────────► NEEDS-REVIEW
                                                                      → review (identify first)
```

The classifier evaluates these **in priority order** — a high-severity alert
makes a device `rogue` even if its vendor looks enterprise. The `signals[]`
array on the ledger doc shows exactly which rule fired.

---

## The four next-steps

Each disposition routes to one path. Reversible steps may be automated later
(see `unknown-device-automation-examples.md`); the irreversible ones never are.

### 1. ROGUE → escalate to IR  *(gated: isolate)*

A device with correlated high-severity detections. Treat as a potential intrusion.

1. **Confirm identity.** Cross-reference `host.name` / serial against
   `m_26_14-assets` and `logs-m_26_14_osquery.network_inventory-*`.
2. **Pull the firing rules** from the ledger `signals` (e.g.
   `rules:M-26-14 AppB-E: Rogue Device…`); open/link a HIGH IR Case.
3. **Contain** — isolate the switch port / VLAN. *Manual, gated.* The loop pages
   IR (optional Watcher) but never isolates on its own.
4. Preserve evidence (alert, network flow, device image) for the POA&M / AAR.

### 2. DECOMMISSIONED → retire  *(reversible: suppress)*

A device marked retired (or silent-then-stale) still showing on the network.

1. **Confirm physically offline** with the owning component.
2. After sign-off, **suppress** from active inventory — reversible, audit-safe
   (`state: suppressed` on the ledger). Record disposition.
3. If the host keeps emitting after suppression, re-open as `needs_review` (it
   isn't actually gone).

### 3. NEW-BUT-UNINVENTORIED → enroll  *(reversible: draft the enrollment)*

A real device with strong identity that simply isn't in HWAM yet.

1. **Validate** the device + owner; assign `asset.component` and criticality.
2. **Draft** the inventory row + Fleet enrollment task (may be auto-drafted).
3. **Enroll** — deploy Elastic Agent / commit the HWAM row. *Manual, gated* (agent
   deployment is the irreversible boundary).
4. On next classify pass the device flips to `inventoried` and leaves the queue.

### 4. SHADOW-IT → exception  *(gated: policy decision)*

An unmanaged consumer/BYOD device. This is a **policy** call, not a technical one.

1. **Contact the apparent owner**; confirm business justification.
2. Either add a **time-boxed allow-list** entry (with expiry + owner) **or**
   schedule **removal**. *Manual, gated.*
3. Document the decision as evidence; shadow-IT findings often become POA&M items.

### NEEDS-REVIEW → identify first

Signals conflict or identity is too thin to route.

1. Use the Threat Investigation agent + osquery hardware/network inventory to
   resolve identity (serial, MAC OUI, switch port, owner).
2. Once identity is established, re-run the classifier — the disposition sharpens.

---

## From unknown to known — the promotion path

A device leaves the triage queue only when it becomes **canonical** in
`m_26_14-assets`. Promotion is **operator-driven** (by design — the loop never
auto-merges an identity it isn't sure of):

- **enroll** path → you add the device to inventory; the entity-resolution
  transform mints its `asset.id`, the next classify pass marks it `inventoried`.
- IP-keyed observed-only entities (`observed-<ip>@<collector>`) are **not**
  auto-folded into a canonical asset yet — that spine IP-fold is Phase 2. Until
  then they stay `unexpected_observed` and are operator-resolved.

See the Asset Coverage dashboard guide for the entity-resolution / promotion
walkthrough.

---

## Where the human gate sits

| Disposition | You may automate (reversible) | Always human |
|-------------|-------------------------------|--------------|
| rogue | page IR | isolate / quarantine |
| decommissioned | suppress from active view | delete record / release IP |
| new_uninventoried | draft enrollment row | deploy agent / grant access |
| shadow_it | — | allow-list / removal (policy) |
| needs_review | — | identity determination |

Default posture: **classify + route, gate all enforcement.** Reversible
automation is opt-in per agency policy — see `unknown-device-automation-examples.md`.
