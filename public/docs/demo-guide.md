# M-26-14 Readiness Pack — Self-Directed Walkthrough

**Time:** ~15 minutes · **Live cluster:** [pubsec-m2614-63e0e0.kb.us-east4.gcp.elastic-cloud.com](https://pubsec-m2614-63e0e0.kb.us-east4.gcp.elastic-cloud.com) (read-only, no login needed)

This walkthrough takes you through the M-26-14 Elastic readiness pack deployed on a live cluster. Click any dashboard link to open it directly: the cluster signs you in as a read-only demo viewer, so there is nothing to log in to and nothing you can break. To explore from scratch, open the cluster link above and choose **Continue as demo viewer** on the login page. The data is synthetic but realistic: a 60-endpoint federal agency fleet at Maturity Level 2, actively working toward Level 3 attestation.

The pack answers five questions auditors actually ask. The first four come from the memo; the fifth, whether the logging pipeline itself can be shown to work, comes from CISA's Logging Reference Architecture (LRA, August 20, 2026), which turns readiness into measures an agency reports on.

The five questions are also the maturity ladder in walking order. Each section says which level the evidence on screen belongs to, so you can read the walkthrough as "where this agency stands, and what the pack already has in place for the next level."

| Section | Question | Level it evidences |
|---|---|---|
| 1 | [Do you know everything on your network?](#1-do-you-know-everything-on-your-network) | Level 1 inventory floor (70% visibility), Level 2 complete inventory reflected in logs |
| 2 | [Is every device healthy and authorized?](#2-is-every-device-healthy-and-authorized) | Level 2 posture and software inventory; drift is the Level 2 "kept current" test |
| 3 | [Are you watching for threats across all Appendix B categories?](#3-are-you-watching-for-threats-across-all-appendix-b-categories) | Level 2 full category coverage; Level 3 automated threat and anomaly detection |
| 4 | [Can you prove data is retained and hasn't been tampered with?](#4-can-you-prove-data-is-retained-and-hasnt-been-tampered-with) | Level 1 and 2 retrievable retention; Level 3 searchable window and regular hashing; Level 4 two-gate retirement and NTP-traceable time |
| 5 | [Can you prove the pipeline itself works?](#5-can-you-prove-the-pipeline-itself-works) | The LRA readiness measures every level reports on, and the Level 4 operational bar |
| 6 | [The full picture](#6-the-full-picture) | Where this agency stands today: Level 2 attested, Level 3 in reach |
| 7 | [From Level 2 to Level 3, and what Level 4 adds](#7-from-level-2-to-level-3-and-what-level-4-adds) | What Level 3 requires, what the pack already runs for it, and what Level 4 adds on top |
| 8 | [Questions you might have](#8-questions-you-might-have) | Common questions from the walk, answered against the live cluster |

---

## 1 — Do you know everything on your network?

**[Open: HWAM Asset Inventory Overview →](https://pubsec-m2614-63e0e0.kb.us-east4.gcp.elastic-cloud.com/app/dashboards#/view/m_26_14-hwam-overview?_g=(time:(from:now-90d,to:now)))**

![HWAM Asset Inventory Overview](/screenshots/m_26_14-hwam-overview.png)

The first thing you'll notice is the headline count: **60 total assets discovered**. But the more interesting number is the split: 55 managed, 5 not. Those 5 devices in the bottom-left table — the UNKNOWN-* entries — were found via network discovery. No Elastic Agent, no MDM enrollment, no OS telemetry. They just showed up.

Look at the three Element coverage KPIs across the top row:

- **Element 1 Covered: 55** — every managed device has a current hardware inventory record. 100%.
- **Element 2 Covered: 55** — software inventory is running on all of them.
- **Total Baseline Snapshots: 55** — a cryptographic configuration snapshot exists for every one of the 55 managed assets.

Click any row in the Unmanaged Assets table to open a Discover view filtered to that specific device. You'll see its manufacturer, last-seen timestamp, and the discovery source — but nothing else, because there's no agent to report back from.

> **Where this data comes from:** Every managed endpoint runs Elastic Agent with the Fleet osquery integration enabled. On a configurable schedule — every few hours by default — the agent executes a bundle of osquery queries defined in the `m_26_14_asset_inventory` Fleet pack: hardware identifiers (serial number, manufacturer, model), OS version, disk encryption state, and the list of installed software. The query results are streamed back to Elasticsearch in near-real time, processed through the `m_26_14-asset-normalize` pipeline to standardize field names, then through `m_26_14-asset-canonical-enrich` to compute compliance fields. The `m_26_14-asset-entity-resolution` continuous transform deduplicates reports across sources — a device seen by both osquery and Microsoft Intune gets merged into a single canonical record — and writes the result to `m_26_14-assets`.
>
> The 5 UNKNOWN-* devices took a different path: they were discovered via network scanning (ICMP/ARP probes and passive traffic analysis), which can detect devices on the network even when no agent is installed. Their records carry only what the network scan could observe — MAC address, vendor prefix, and approximate device class. No OS telemetry, no compliance posture.
>
> The baseline snapshots come from the `m_26_14-asset-baseline-snapshot` transform, which captured each device's record the first time it reported and stamped it with a `baseline_timestamp`. The `m_26_14-asset-baseline-hash` pipeline computed a SHA-256 fingerprint of each device's key compliance fields at that moment; that fingerprint is what drift detection compares against, and it is served to the live pipeline through the `m_26_14-asset-baseline-lookup` enrich policy. The loader documents the transform as run-once, so a certified value is never silently replaced by the drifted one.

---

## 2 — Is every device healthy and authorized?

**[Open: HWAM Coverage Gaps →](https://pubsec-m2614-63e0e0.kb.us-east4.gcp.elastic-cloud.com/app/dashboards#/view/m_26_14-hwam-gaps?_g=(time:(from:now-90d,to:now)))**

![HWAM Coverage Gaps](/screenshots/m_26_14-hwam-gaps.png)

Knowing devices exist is one requirement. Knowing they're compliant is another. This dashboard answers the posture question: encrypted? MDM-enrolled? Running authorized software?

Four gap tiles line the top row: **No Element 1 Coverage (5)**, **No Element 2 Coverage (5)**, **Unknown Encryption Status (5)**, and **No MDM Enrollment (4)** — devices missing a hardware inventory record, a software inventory, a confirmed disk-encryption state, or MDM enrollment. Click any tile to open a Discover view showing exactly which devices — names, OS versions, last-seen times. This is what you hand the ISO instead of a manual audit spreadsheet.

> **Where this data comes from:** Encryption status is reported by osquery's `disk_encryption` table query, which runs every few hours on each enrolled endpoint and returns the state of every mounted volume. MDM enrollment status comes separately from the Microsoft Intune integration, which pushes device compliance records directly to Elasticsearch without requiring a query agent on the device. The `m_26_14-asset-entity-resolution` transform merges both sources into a single posture record per device — if osquery can't confirm a device's encryption state and Intune has no record of MDM enrollment, the combined record reflects both gaps simultaneously. Both the Coverage Gaps and the Asset Inventory dashboard draw from the same `m_26_14-assets` index — [you can navigate between them using the links at the top of each dashboard](https://pubsec-m2614-63e0e0.kb.us-east4.gcp.elastic-cloud.com/app/dashboards#/view/m_26_14-hwam-overview).

---

### Software: what's installed that shouldn't be?

**[Open: SWAM Software Inventory →](https://pubsec-m2614-63e0e0.kb.us-east4.gcp.elastic-cloud.com/app/dashboards#/view/m_26_14-swam-software?_g=(time:(from:now-90d,to:now)))**

![SWAM Software Inventory](/screenshots/m_26_14-swam-software.png)

M-26-14 requires you to know what software is running across your fleet — not just that agents are installed, but whether any unauthorized titles have crept in.

The software catalog for this environment holds 37 titles, each with an authorized flag, an approver and an approval reference: 25 approved (CrowdStrike Falcon, Elastic Agent, Cisco AnyConnect, the browsers, Office 365, Teams, and so on) and 12 explicitly disallowed (uTorrent, TeamViewer, Adobe Flash Player among them). Scroll down to the unauthorized table and you'll find **two disallowed titles present on the fleet**: VLC media player and 7-Zip, on three endpoints each.

Click either unauthorized title to drill into which specific endpoints are affected. This is a live, continuously-updated view — not a point-in-time scan.

> **Where this data comes from:** The same Elastic Agent osquery integration that collects hardware inventory also executes osquery's `programs` and `apps` table queries on every enrolled endpoint — returning every installed application, version, publisher, and install date. On macOS this covers `.app` bundles; on Windows, MSI/EXE packages from the registry; on Linux, packages from apt/rpm/dnf. Those records flow through the `m_26_14-osquery-normalize` pipeline, which standardizes the schema and **reroutes them into a single, source-agnostic stream: `logs-m_26_14_asset.software_inventory-*`**. Software from any other collector — a customer CMDB or EDR feed via `m_26_14-asset-normalize` — lands in that same stream, so the SWAM picture is collector-independent rather than tied to osquery. As each record arrives, the stream's default pipeline `m_26_14-software-enrich` matches its `package.name` against the **`m_26_14-authorized-software` enrich policy** over the `m_26_14-authorized-software-catalog` index (37 entries, each carrying `authorized`, `approved_by` and `approval_ref`) and stamps `m_26_14.software.authorized`. The `m_26_14-asset-unauthorized-software` detection rule then fires on `authorized: false` and on titles the catalog has never seen (uncataloged is a finding too). The allowlist lives in the catalog, not the rule, so approving a new title is a catalog edit followed by an enrich-policy refresh (the hourly `M-26-14 Enrich Refresh` workflow does it), not a rule change. No scheduled batch scan, no manual comparison.

---

### Has anything changed since it was certified?

**[Open: Config Drift & Readiness Posture →](https://pubsec-m2614-63e0e0.kb.us-east4.gcp.elastic-cloud.com/app/dashboards#/view/m_26_14-asset-drift?_g=(time:(from:now-90d,to:now)))**

![Config Drift & Readiness Posture](/screenshots/m_26_14-asset-drift.png)

At enrollment, every managed device gets a baseline snapshot — a cryptographic fingerprint of its OS version, disk encryption status, and serial number. If any of those fields change on a live device, it gets flagged.

The **drifted assets** tile counts devices whose live fingerprint no longer matches the certified one. In the current dataset it reads four: `LAPTOP-001`, `WKSTN-003`, `WKSTN-013` and `WKSTN-015` each reported a newer OS version after the baseline was certified, the most common real-world drift (a routine update). Clicking the tile opens a Discover view of exactly which devices, each with its baseline timestamp; the "Compliance Status by Asset" table below shows the new OS version beside the unchanged encryption and MDM posture, so the one changed field is visible. A disabled disk encryption or a swapped serial would move the same tile. The `m_26_14-asset-encryption-disabled` rule has already fired five times on this fleet, once for each managed workstation reporting encryption off, which is the posture side of the same check.

Those could be routine OS updates, intentional policy changes, or something to investigate. The important thing is that the system catches them as they happen, not at a quarterly audit.

> **How this works:** At certification, the baseline-snapshot transform captures each device's `m_26_14.baseline_hash` — a SHA-256 fingerprint of its OS version, build, serial, and encryption status — into the frozen `m_26_14-asset-baselines` index. On every subsequent update, the `m_26_14-asset-canonical-enrich` pipeline recomputes the live fingerprint and looks up the certified one (via the `m_26_14-asset-baseline-lookup` enrich policy); when they differ it sets `m_26_14.drift_detected: true`. That field is what the dashboard tile counts, and it is recomputed on every entity-resolution checkpoint, so the count is stable rather than a one-shot stamp. The `m_26_14-asset-baseline-drift` and `m_26_14-asset-encryption-disabled` detection rules watch the same fields and raise a Kibana alert the moment a specific field drifts.

---

## 3 — Are you watching for threats across all Appendix B categories?

**[Open: Alert Coverage →](https://pubsec-m2614-63e0e0.kb.us-east4.gcp.elastic-cloud.com/app/dashboards#/view/m_26_14-alert-coverage?_g=(time:(from:now-30d,to:now)))**

![Alert Coverage (Appendix B)](/screenshots/m_26_14-alert-coverage.png)

M-26-14 Appendix B §5 defines 11 required logging activities (a–k) — identity/authentication, network addressing (DNS/DHCP/VPN), object & data events (mass file access), privilege changes, infrastructure changes (including OT), suspicious-activity monitoring (EDR), IOC hunting, anomaly hunting (off-hours/behavioral), incident-data scoping (exfiltration), attack-vector & lateral movement (APT chain), and automated alerting. You need active detection across all of them.

The bars here show active detection rules by Appendix B category alongside alert volume over the last 30 days. Click any bar to open Discover filtered to that category's rules and recent alerts.

Categories A, B, and H go further than static rules: they also have ML anomaly detection running continuously. The ML jobs learn what "normal" looks like in this environment and alert on genuine deviations — not just threshold crossings.

This isn't theoretical. The demo dataset stages a realistic intrusion chain, and the ML jobs caught every stage: a reconnaissance toolkit (masscan, nc, socat) appearing on a Linux host (rare-process anomaly, record scores 81 to 99), outbound flows to countries this fleet has never contacted (score 84), high-entropy DNS queries from a single workstation consistent with DGA or tunnelling (score 99), and a database host that stopped reporting (host-went-silent, score 99). Open **Machine Learning → Anomaly Explorer** and pick the `m_26_14` jobs to see them. The ML detection rules alert on anomalies from the moment they are enabled, so the alerts you'll find under **Security → Alerts** with rule names starting `M-26-14 ML` are the ones raised since this cluster was installed: the host-went-silent burst, rare source IP and anomalous auth-failure count for Category A, and the readiness-element jobs (ingestion-rate drop, hash-coverage drop, schema drift). Each is a real detection-engine alert with the anomaly record attached.

> **How this works:** Every alert passes through the `m_26_14-alert-category-pipeline` ingest pipeline, which tags it with its Appendix B category. The `m_26_14-alert-coverage-daily` transform rolls those counts into per-day summaries; `m_26_14-alert-coverage-latest` maintains the current view. Categories A, B, and H are reinforced by **machine-learning detection rules** — `m_26_14-ml-cata-high-auth-failures`, `-cata-rare-auth-ip`, and `-cata-ueba-login` for Category A; `-catb-dns-dga` and `-catb-rare-country` for Category B; `-cath-rare-process-linux`, `-cath-rare-process-windows`, and `-cath-host-silent` for Category H — that flag anomalies a static threshold would miss. Seven of these eight rules wrap **Elastic Security ML module jobs** installed with the `m_26_14_` job-id prefix (the same battle-tested detectors Elastic ships for SOC use, isolated under pack-owned IDs); `-catb-dns-dga` uses the pack's own DNS-entropy job. Seven further ML rules watch the platform itself (the five readiness-element jobs, schema drift, and a meta rule that fires on any element anomaly), which is how the Maturity Overview learns that readiness is degrading before an attestation breaks.

---

### How complete is the coverage picture?

**[Open: Appendix B Coverage Matrix →](https://pubsec-m2614-63e0e0.kb.us-east4.gcp.elastic-cloud.com/app/dashboards#/view/m_26_14-appendix-b-coverage?_g=(time:(from:now-30d,to:now)))**

![Appendix B Coverage Matrix](/screenshots/m_26_14-appendix-b-coverage.png)

The coverage matrix is what you bring to the auditor. Each row is an Appendix B category. Each column represents a compliance signal: data collection active, detection rules enabled, alerts fired in the last 30 days.

Green means all three. Yellow means partial. Red means a gap that needs to be addressed before attestation. Use this view to prioritize what to work on next — or to show the auditor what's already covered.

> **How this works:** If you need to document a gap formally, the `m_26_14-poam-drafting-agent` in Elastic Agent Builder can query this coverage data directly using the `m_26_14-readiness-posture-query` tool (one of four pack ES|QL tools, with `m_26_14-asset-inventory-search`, `m_26_14-classification-audit-query` and `m_26_14-retirement-audit-query`) and draft a Plan of Action & Milestones document. It reads the same data as this dashboard — no export needed. The `m_26_14-threat-investigation-agent` can triage specific alerts, and `m_26_14-aar-agent` generates after-action reports from alert history. Every agent conversation is itself logged: the `m_26_14-ai-audit` transform copies each Agent Builder trace into a governed audit store, which is what the LRA asks of AI used inside the logging platform (see section 5).

---

## 4 — Can you prove data is retained and hasn't been tampered with?

**[Open: Retention Readiness →](https://pubsec-m2614-63e0e0.kb.us-east4.gcp.elastic-cloud.com/app/dashboards#/view/m_26_14-retention-readiness?_g=(time:(from:now-30d,to:now)))**

![Retention Readiness](/screenshots/m_26_14-retention-readiness.png)

Appendix B of the memo sets the floor: six months searchable, twelve months retrievable. The LRA (section 5.3) makes clear that this floor binds at every maturity level; the Level 3 and Level 4 searchable windows (three and six months of hot-tier data) govern maturity reporting on top of it. This dashboard proves both, per data stream.

The bars show each stream's hot days (immediate query, no latency) against its full retention window. Everything past the hot window sits on the frozen tier as a searchable snapshot: still queryable in Discover, ES|QL and detection rules without a restore step, which is what makes the full window "searchable" in the LRA's sense (section 4.5), only slower. The ILM policies ship with the pack: `m_26_14-retention-l1` holds a full year hot-then-frozen as the Initial-level default; `m_26_14-logs-l3-hot-frozen` keeps 90 days hot before frozen; `m_26_14-logs-l4-hot-frozen` keeps 180. Because frozen is slower, the pack does not assert searchability. It measures it: the monthly retrieval drill in section 5 records query time per tier as evidence.

When an index reaches the end of its retention window, it can't be deleted automatically. The pack enforces a two-gate human approval chain, run as Kibana Workflows:

1. **M-26-14 Data Retirement — Gate 1 Detection** scans ILM daily and proposes frozen indices whose lifecycle age has reached the 365-day floor, writing a `pending_gate1` record and opening a Gate 1 Case. Nothing changes.
2. A first approver writes an `approved_gate1` record from the Case. **Gate 1 Approval Handler** writes `pending_gate2` and opens the Gate 2 Case. The index is still on its no-delete ILM policy.
3. A second, different approver checks that no legal hold covers the index and that the readiness SLM policy is healthy, then writes `approved_gate2`.
4. **Gate 2 Execution** applies the scope and legal-hold guards, switches the index to its delete-enabled ILM policy and records `scheduled_for_deletion`. ILM then takes a compliance snapshot (`wait_for_snapshot`) before it deletes; no workflow bypasses that step. **Legal Hold — Selective Copy** preserves anything a hold names into a no-delete retained index before the chain can touch it.

Every decision is a new record in `m_26_14-retirement-requests`, an append-only ledger where the newest record per index is its current state. The bottom row of this dashboard reads it: open requests, active legal holds, current state per index (the demo ledger carries a seeded storyline so every state is visible). The same four steps also ship as Elasticsearch Watchers for teams whose control plane is Watcher; on this cluster they are registered inactive, because the rule is one plane or the other, never both.

---

### Can you prove logs weren't modified after collection?

**[Open: Log Management →](https://pubsec-m2614-63e0e0.kb.us-east4.gcp.elastic-cloud.com/app/dashboards#/view/m_26_14-log-management?_g=(time:(from:now-30d,to:now)))**

![Log Management (Element 5)](/screenshots/m_26_14-log-management.png)

M-26-14 requires log integrity — evidence that log documents haven't been altered after collection. The pack handles this at ingest: the `m_26_14-log-integrity-hash` pipeline computes a SHA-256 of each log document the moment it arrives, writes it to `event.hash`, and flags the record with `event.integrity.hashed: true`. If anyone modifies the document later, the hash won't match.

The bars here show hash coverage by host. Click any bar to open Discover filtered to that host's integrity records — you'll see the raw hash values alongside the original log fields. Gaps in this chart are a compliance finding.

> **How this works:** The hash pipeline is the last stage of the `m_26_14-final` chain, bound as the final pipeline of every pack stream, so it runs after enrichment and policy enforcement and hashes the document as stored. The `m_26_14-ml-element5-hash-coverage` ML job monitors coverage across all reporting sources; if a source that normally hashes goes unexpectedly quiet it fires an anomaly alert rather than leaving a gap in this chart. Time is checked the same way: the `m_26_14-ntp-status` transform keeps each host's NTP state from the osquery pack, the skew stage of the final chain flags records whose event time disagrees with ingest time, and the `m_26_14-ntp-offset-exceeded` rule alerts on a host that drifts past the configured bound (LRA 6.3).

---

## 5 — Can you prove the pipeline itself works?

**[Open: Collection Coverage →](https://pubsec-m2614-63e0e0.kb.us-east4.gcp.elastic-cloud.com/app/dashboards#/view/m_26_14-14-03-collection-coverage?_g=(time:(from:now-7d,to:now)))**

The memo asks what you collect. The LRA asks how well, how fast, and whether you can show it. Section 3.5 of the LRA lists readiness measures an agency reports on (collection coverage, fidelity, ingest timeliness, validation, cost among them) and Appendix E describes how to validate them. This set of dashboards is the pack's answer, and it is where the Agency Logging Plan (due November 18, 2026) gets its numbers.

- **Collection Coverage** and **Collection Operations** ([open →](https://pubsec-m2614-63e0e0.kb.us-east4.gcp.elastic-cloud.com/app/dashboards#/view/m_26_14-14-04-collection-operations?_g=(time:(from:now-7d,to:now)))) show which sources are reporting against the nine LRA telemetry categories, per-field document counts for the network fields the LRA calls out (direction, byte counts, DNS answers, NAT addresses, zone), and whether each source is keeping up (the ingest-lag heatmap per dataset and hour, and p95 lag against the LRA category threshold, are on Collection Coverage).
- **Field Fidelity & Category Coverage** ([open →](https://pubsec-m2614-63e0e0.kb.us-east4.gcp.elastic-cloud.com/app/dashboards#/view/m_26_14-16-field-fidelity?_g=(time:(from:now-7d,to:now)))) scores every dataset hourly on the six common fields the LRA expects on every record (timestamp, action, identity, resource, outcome, provenance) and on the category contract that applies to it, and lists the fields below threshold. Presence, not correctness: a field that is populated with nonsense still scores.
- **Pipeline Health** ([open →](https://pubsec-m2614-63e0e0.kb.us-east4.gcp.elastic-cloud.com/app/dashboards#/view/m_26_14-pipeline-health?_g=(time:(from:now-7d,to:now)))) counts documents that failed an ingest pipeline (kept in the failure store, never dropped), documents indexed with ignored fields per dataset, and the daily mapping-conflict check that reports any field mapped with two types across pack streams, beside Logstash queue depth, back pressure and non-retryable output failures from the Logstash integration's metrics (on this cluster those come from a seeded collector host).
- **Preflight & Stack Health** ([open →](https://pubsec-m2614-63e0e0.kb.us-east4.gcp.elastic-cloud.com/app/dashboards#/view/m_26_14-14-07-preflight-stack-health?_g=(time:(from:now-7d,to:now)))) is the operator's view of the scoring pipeline: scoring runs in the time range, hosts observed by each transform, elements left unscored because an input was degraded, and an observed-hosts staleness table (the triage order is written on the dashboard).
- **HVA Differentiation** ([open →](https://pubsec-m2614-63e0e0.kb.us-east4.gcp.elastic-cloud.com/app/dashboards#/view/m_26_14-18-hva-differentiation?_g=(time:(from:now-7d,to:now)))) puts high-value assets beside the general fleet on fidelity, latency and detection density, which is the comparison the LRA's reviewer asks for (Appendix D.9). Ten assets on this fleet are rated high or extreme impact.
- **Cost and Operational Value** ([open →](https://pubsec-m2614-63e0e0.kb.us-east4.gcp.elastic-cloud.com/app/dashboards#/view/m_26_14-19-cost-value?_g=(time:(from:now-30d,to:now)))) reads the daily ops snapshot: data streams, bytes by tier, the pack's own footprint, and an estimated monthly cost once the agency enters its rates (they ship as zero, so this demo shows volume, not dollars).

Two of the readiness measures are demonstrations rather than dashboards, and both write their evidence to the `m_26_14-validation-ledger` index:

- **Canary.** Every fifteen minutes the **Canary Inject** workflow sends a known event through the normal ingest path; every hour **Canary Verify** records whether it arrived, parsed and produced an alert. The ledger on this cluster holds a running three-day window of verdicts with a handful of failures from the install window, and the Readiness Attestation dashboard shows the pass rate.
- **Retrieval drill.** Once a month the **Retrieval Drill** workflow runs three fixed investigative queries (an indicator lookup by address, one user's activity over the retention window, a process lookup by hash) with the time and tier recorded, then restores one backing index from the latest compliance snapshot under a temporary name, verifies its document count and hash coverage, and deletes the copy. The latest drill on this cluster (21 September) passed all three queries in under a tenth of a second each and restored 46,082 documents from the nightly compliance snapshot, every one carrying its integrity hash. The two earlier September runs recorded the restore as a failure: the workflow counted the copy before the asynchronous restore had created it, a defect fixed in this release, and those failed verdicts stay in the ledger as evidence of the fix.

> **How this works:** The measures are computed by continuous transforms (`m_26_14-field-fidelity`, `m_26_14-ingest-latency`, `m_26_14-hash-coverage-rollup`, `m_26_14-ntp-status`) and by scheduled workflows that write derived documents (`m_26_14-ops-metrics-snapshot`, `m_26_14-mapping-conflict-check`, `m_26_14-attack-coverage-snapshot`). Every derived document carries an `m_26_14.derived` stamp naming what produced it, by what method and at which version, and every record processed by the pack carries `m_26_14.provenance.transformations`, the ordered list of pipelines that touched it (LRA 4.2, 4.4). Thresholds live in the `m_26_14-config` index, so an agency tightens a contract by editing a document, not a pipeline. Three live Elastic Agents (a virtual fleet: two workstations and a server) are enrolled alongside the synthetic fleet so Fleet, osquery and the canary run on real collection paths.

---

## 6 — The full picture

**[Open: Maturity Overview →](https://pubsec-m2614-63e0e0.kb.us-east4.gcp.elastic-cloud.com/app/dashboards#/view/m_26_14-maturity-overview?_g=(time:(from:now-30d,to:now)))**

![Maturity Overview](/screenshots/m_26_14-maturity-overview.png)

The Maturity Overview rolls up everything you just walked through into a single executive view: current maturity level, element coverage percentages, and the gaps standing between this agency and its next attestation target.

This is what the ISSO opens every morning. The same pipeline that powers every dashboard you've explored — transforms, detection rules, ML jobs and workflows — feeds into this summary automatically.

Behind this view:

- **58 detection rules** — 20 Appendix B rules across the A–L category sets, 15 ML rules, and rules for asset drift, high-value assets, AI use, retirement gates and the pipeline itself. 56 are enabled here; the two that read the Kibana audit log (connector lifecycle, AI Assistant knowledge-base changes) stay off because Kibana audit logging is not switched on for this deployment
- **15 ML anomaly-detection jobs** — eight pack-owned jobs tracking readiness signals (asset-coverage drops, new-device discovery, ingestion-rate dips, rule silence, retention/ILM anomalies, hash-coverage gaps, DNS entropy, schema drift) plus seven `m_26_14_`-prefixed Elastic Security ML module jobs powering the behavioral detection rules for identity (Cat A), DNS/C2 (Cat B), and host behavior (Cat H)
- **18 transforms and 21 dashboards** — inventory, attestation, readiness measures and value
- **14 Kibana Workflows** — the two-gate retirement chain and legal hold, data classification intake, unknown-device triage, canary inject and verify, the retrieval drill, the ATT&CK coverage snapshot, the ops-metrics snapshot, enrich refresh, the mapping-conflict check and authorized production. Six Elasticsearch Watchers ship beside them: the four retirement and legal-hold watchers are registered inactive (Workflows is the demonstrated control plane), the two JIT privileged-access watchers are active
- **3 AI Agents** in Elastic Agent Builder — `m_26_14-poam-drafting-agent` for gap documentation, `m_26_14-threat-investigation-agent` for security triage, `m_26_14-aar-agent` for after-action reports — each wired to ES|QL readiness query tools, with every conversation copied to the `m_26_14-ai-audit` store

---

## 7 — From Level 2 to Level 3, and what Level 4 adds

The fleet you just walked through is attested at Level 2: every Appendix B category is collected, the inventory is reflected in the logging pipeline, and logs are retrievable for twelve months on the `m_26_14-retention-l1` policy. The Maturity Overview scores it that way from the thresholds in the `m_26_14-config` document, the same ones printed on the [Maturity Levels](/maturity/small/1) page of this site.

**Level 3 asks for four new things, and the pack already carries each of them; the agency's work is to turn them on for its own streams and let the scores prove it.**

- **Three months searchable.** Move the streams that carry Appendix B data from the Level 1 policy to `m_26_14-logs-l3-hot-frozen` (90 days hot, then frozen). The dataset-retention transform measures the realized searchable horizon per stream, so the Retention Readiness bars in section 4 change on their own; nothing is asserted.
- **Automated threat and anomaly detection.** Section 3 is the evidence: the Appendix B rules and the ML detection rules behind them are enabled on this cluster now. For a real agency the step is coverage, not installation: every category green on the Coverage Matrix, and the rule-silence ML job quiet.
- **Sensitive-data protection before storage.** The policy enforcement point runs inside `m_26_14-final` before the integrity hash: pattern-bank redaction, per-dataset minimization, sensitivity and sharing-class tags, restricted routing. It is on for pack-owned streams already; agency streams managed by Fleet pick it up through the `logs@custom` hook the pack ships, which is the one binding step an agency does by hand.
- **Regular hashing.** Section 4 again: the hash is computed on every document at ingest, the hash-coverage rollup measures it per stream, and the Element 5 ML job alerts when a stream's coverage drops.

**Level 4 is governance and context rather than more collection.** The pieces are installed and demonstrated here, with the ones that change data left inactive by design:

- **Six months searchable**: `m_26_14-logs-l4-hot-frozen` (180 days hot).
- **Just-in-time privileged access**: the two JIT watchers are the only active watchers on this cluster; grants expire and are revoked mechanically.
- **Two-gate retirement**: the four-step chain in section 4, human-approved twice, with legal hold as a mechanical block.
- **NTP-traceable timestamps**: the NTP attestation on every asset score and the offset rule in section 4.
- **A tested procedure for producing logs to CISA and the FBI**: the Authorized Production workflow makes each production a Case, a redaction profile and a manifest in the production ledger.
- **ML and AI in operations**: the readiness-health ML jobs and the three Agent Builder agents, every trace copied to the AI audit store.

Read the Maturity Overview last with that list in hand: the element scores tell you which of these the agency has evidence for today, and the gaps are the Plan of Action the POA&M agent can draft.

---

## 8 — Questions you might have

**What happens to the 5 unmanaged devices?**
They enter a live triage loop, not a manual queue. A continuous transform correlates each network-discovered device against the asset registry and recent Security alerts, an enrich step resolves its hardware vendor from the MAC address (OUI lookup), and a classification pipeline assigns a disposition: `new_uninventoried`, `shadow_it`, `rogue`, `decommissioned`, `needs_review`, or `inventoried` once resolved. Every disposition lands in the `m_26_14-asset-triage` ledger with a recommended action and the evidence that drove it, and opens a disposition-specific Kibana Case with the next step pre-filled; every enforcement step (isolate, enroll, allow-list, retire) stays human-gated. The `M-26-14 Unknown-Device Triage` workflow that writes the ledger runs on demand, so an operator triggers it after a discovery sweep rather than on a schedule; the read-only demo user can view the ledger but not run the workflow. M-26-14 requires documented disposition for anything network-discovered; the ledger is that documentation.

**What's the two-gate retirement workflow protecting against?**
It ensures no compliance log can be deleted by a single person or an automated process. Gate 1 is a first human review; it changes nothing on the index. Gate 2 is a second, different human's authorization, and only then does the index move to an ILM policy that has a delete phase. Even then ILM waits for a compliance snapshot newer than the delete-phase entry (`wait_for_snapshot`) before deleting, so the data still exists in the snapshot repository until that snapshot expires, a separate, independent retention control. A legal hold blocks the chain mechanically for whatever it names, including frozen indices ILM has renamed with a `partial-` prefix.

**What happens to a record the ingest pipeline cannot parse?**
It is kept, not dropped. Every pack data stream has its failure store enabled, so a rejected document lands in `logs-m_26_14*::failures` with the pipeline name, the failing step and the error; the Pipeline Health dashboard counts it and the `m_26_14-pipeline-failure-spike` rule alerts on a burst. One caution before opening that store in a demo: failure-store documents are stored as they arrived, before redaction and minimization ran, so they can carry values the live stream would have removed. Reading them needs the `m_26_14-failure-store-reader` role, which the read-only demo user does not hold.

**Is this real agency data?**
No — this is a synthetic fleet with realistic composition and posture spread. The pack deploys identically against real Elastic Agent data. The dashboards, rules, pipelines, and ML jobs are environment-agnostic; only the index patterns and configuration change.

**How do I generate a POA&M from the gaps I see here?**
Open [Agent Builder](https://pubsec-m2614-63e0e0.kb.us-east4.gcp.elastic-cloud.com/app/agent_builder/agents) and start a session with `m_26_14-poam-drafting-agent`. It can query the current compliance posture using ES|QL and draft a Plan of Action & Milestones document for any gap you've identified — no data export needed.
