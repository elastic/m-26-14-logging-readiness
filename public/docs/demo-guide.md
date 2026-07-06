# M-26-14 Compliance Pack — Self-Directed Walkthrough

**Time:** ~15 minutes · **Live cluster:** [m-26-14-7ae75d.kb.us-east-1.aws.found.io](https://m-26-14-7ae75d.kb.us-east-1.aws.found.io) (read-only)

This walkthrough takes you through the M-26-14 Elastic compliance pack deployed on a live cluster. Click any dashboard link to open it directly — you're in a read-only session, so feel free to explore. The data is synthetic but realistic: a 60-endpoint federal agency fleet actively working toward Level 2 attestation.

The pack answers four questions auditors actually ask.

---

## 1 — Do you know everything on your network?

**[Open: HWAM Asset Inventory Overview →](https://m-26-14-7ae75d.kb.us-east-1.aws.found.io/app/dashboards#/view/m_26_14-hwam-overview?_g=(time:(from:now-90d,to:now)))**

![HWAM Asset Inventory Overview](/screenshots/08-hwam-overview.png)

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
> The baseline snapshots come from `m_26_14-asset-baseline-snapshot`, a one-time transform that ran at initial deployment. The `m_26_14-asset-baseline-hash` pipeline computed a SHA-256 fingerprint of each device's key compliance fields at that point in time — that fingerprint is what drift detection compares against.

---

## 2 — Is every device healthy and authorized?

**[Open: HWAM Coverage Gaps →](https://m-26-14-7ae75d.kb.us-east-1.aws.found.io/app/dashboards#/view/m_26_14-hwam-gaps?_g=(time:(from:now-90d,to:now)))**

![HWAM Coverage Gaps](/screenshots/09-hwam-gaps.png)

Knowing devices exist is one requirement. Knowing they're compliant is another. This dashboard answers the posture question: encrypted? MDM-enrolled? Running authorized software?

Four gap tiles line the top row: **No Element 1 Coverage (5)**, **No Element 2 Coverage (5)**, **Unknown Encryption Status (5)**, and **No MDM Enrollment (3)** — devices missing a hardware inventory record, a software inventory, a confirmed disk-encryption state, or MDM enrollment. Click any tile to open a Discover view showing exactly which devices — names, OS versions, last-seen times. This is what you hand the ISO instead of a manual audit spreadsheet.

> **Where this data comes from:** Encryption status is reported by osquery's `disk_encryption` table query, which runs every few hours on each enrolled endpoint and returns the state of every mounted volume. MDM enrollment status comes separately from the Microsoft Intune integration, which pushes device compliance records directly to Elasticsearch without requiring a query agent on the device. The `m_26_14-asset-entity-resolution` transform merges both sources into a single posture record per device — if osquery can't confirm a device's encryption state and Intune has no record of MDM enrollment, the combined record reflects both gaps simultaneously. Both the Coverage Gaps and the Asset Inventory dashboard draw from the same `m_26_14-assets` index — [you can navigate between them using the links at the top of each dashboard](https://m-26-14-7ae75d.kb.us-east-1.aws.found.io/app/dashboards#/view/m_26_14-hwam-overview).

---

### Software: what's installed that shouldn't be?

**[Open: SWAM Software Inventory →](https://m-26-14-7ae75d.kb.us-east-1.aws.found.io/app/dashboards#/view/m_26_14-swam-software?_g=(time:(from:now-90d,to:now)))**

![SWAM Software Inventory](/screenshots/11-swam-software.png)

M-26-14 requires you to know what software is running across your fleet — not just that agents are installed, but whether any unauthorized titles have crept in.

The approved software list for this environment has six titles: CrowdStrike Falcon, Elastic Agent, Cisco AnyConnect, Google Chrome, Microsoft Office 365, and Microsoft Teams. Scroll down to the unauthorized table and you'll find **two titles that aren't on that list**: VLC media player and 7-Zip, appearing on three endpoints each.

Click either unauthorized title to drill into which specific endpoints are affected. This is a live, continuously-updated view — not a point-in-time scan.

> **Where this data comes from:** The same Elastic Agent osquery integration that collects hardware inventory also executes osquery's `programs` and `apps` table queries on every enrolled endpoint — returning every installed application, version, publisher, and install date. On macOS, this covers `.app` bundles; on Windows, installed MSI/EXE packages from the registry; on Linux, packages from apt/rpm/dnf. Results stream back to Elasticsearch through the `m_26_14-osquery-normalize` pipeline, which standardizes the field schema and writes to `logs-m_26_14_osquery.software-*`. The authorized software list — the six approved titles — is embedded in the `m_26_14-ws7-r3-unauth-software` detection rule, which evaluates every new software record against that allowlist in real time. No scheduled batch scan, no manual comparison.

---

### Has anything changed since it was certified?

**[Open: Config Drift & Compliance Posture →](https://m-26-14-7ae75d.kb.us-east-1.aws.found.io/app/dashboards#/view/m_26_14-asset-drift?_g=(time:(from:now-90d,to:now)))**

![Config Drift & Compliance Posture](/screenshots/12-asset-drift.png)

At enrollment, every managed device gets a baseline snapshot — a cryptographic fingerprint of its OS version, disk encryption status, and serial number. If any of those fields change on a live device, it gets flagged.

You'll see a set of **drifted assets** flagged on this dashboard — 8 in the current dataset, a mix of workstations, laptops, and servers. Click the metric tile and the Discover view shows exactly which ones, each with its baseline timestamp and what changed.

These could be routine OS updates, intentional policy changes, or something to investigate. The important thing is the system caught them — not a quarterly audit.

> **How this works:** At certification, the baseline-snapshot transform captures each device's `m_26_14.baseline_hash` — a SHA-256 fingerprint of its OS version, build, serial, and encryption status — into the frozen `m_26_14-asset-baselines` index. On every subsequent update, the `m_26_14-asset-canonical-enrich` pipeline recomputes the live fingerprint and looks up the certified one (via the `m_26_14-asset-baseline-lookup` enrich policy); when they differ it sets `m_26_14.drift_detected: true`. That field is what the dashboard tile counts, and it is recomputed on every entity-resolution checkpoint, so the count is stable rather than a one-shot stamp. The `m_26_14-ws7-r1-os-version-changed` and `m_26_14-ws7-r2-encryption-disabled` detection rules watch the same fields and raise a Kibana alert the moment a specific field drifts.

---

## 3 — Are you watching for threats across all Appendix B categories?

**[Open: Alert Coverage →](https://m-26-14-7ae75d.kb.us-east-1.aws.found.io/app/dashboards#/view/m_26_14-alert-coverage?_g=(time:(from:now-30d,to:now)))**

![Alert Coverage (Appendix B)](/screenshots/03-alert-coverage.png)

M-26-14 Appendix B defines 11 required event categories — authentication, DNS, mass file access, privilege escalation, OT/infrastructure changes, EDR telemetry, IOC monitoring, off-hours execution, exfiltration, APT chain indicators, and coverage gaps themselves. You need active detection across all of them.

The bars here show active detection rules by Appendix B category alongside alert volume over the last 30 days. Click any bar to open Discover filtered to that category's rules and recent alerts.

Categories A, B, and H go further than static rules: they also have ML anomaly detection running continuously. The ML jobs learn what "normal" looks like in this environment and alert on genuine deviations — not just threshold crossings.

> **How this works:** Every alert passes through the `m_26_14-alert-category-pipeline` ingest pipeline, which tags it with its Appendix B category. The `m_26_14-alert-coverage-daily` transform rolls those counts into per-day summaries; `m_26_14-alert-coverage-latest` maintains the current view. Categories A, B, and H are reinforced by **machine-learning detection rules** — `m_26_14-ml-cata-high-auth-failures`, `-cata-rare-auth-ip`, and `-cata-ueba-login` for Category A; `-catb-dns-dga` and `-catb-rare-country` for Category B; `-cath-rare-process-linux` and `-cath-rare-process-windows` for Category H — that flag anomalies a static threshold would miss. (These ML *rules* are separate from the maturity ML anomaly-detection *jobs* covered on the Maturity Overview.)

---

### How complete is the coverage picture?

**[Open: Appendix B Coverage Matrix →](https://m-26-14-7ae75d.kb.us-east-1.aws.found.io/app/dashboards#/view/m_26_14-appendix-b-coverage?_g=(time:(from:now-30d,to:now)))**

![Appendix B Coverage Matrix](/screenshots/06-appendix-b-coverage.png)

The coverage matrix is what you bring to the auditor. Each row is an Appendix B category. Each column represents a compliance signal: data collection active, detection rules enabled, alerts fired in the last 30 days.

Green means all three. Yellow means partial. Red means a gap that needs to be addressed before attestation. Use this view to prioritize what to work on next — or to show the auditor what's already covered.

> **How this works:** If you need to document a gap formally, the `m_26_14-poam-drafting-agent` in Elastic Agent Builder can query this coverage data directly using the `m_26_14-compliance-posture-esql-tool` and draft a Plan of Action & Milestones document. It reads the same data as this dashboard — no export needed. The `m_26_14-threat-investigation-agent` can triage specific alerts, and `m_26_14-aar-agent` generates after-action reports from alert history.

---

## 4 — Can you prove data is retained and hasn't been tampered with?

**[Open: Retention Compliance →](https://m-26-14-7ae75d.kb.us-east-1.aws.found.io/app/dashboards#/view/m_26_14-retention-compliance?_g=(time:(from:now-30d,to:now)))**

![Retention Compliance](/screenshots/04-retention-compliance.png)

THIRF requires at least six months of log retention. Level 3 requires three months to be immediately searchable — not just archived, actually queryable without a restore operation. This dashboard proves both, per data stream.

The bars show each index's searchable days (hot tier — immediate query, no latency) versus its full retention window including frozen tier. The ILM policies ship pre-configured with the pack: `m_26_14-logs-l3-hot-frozen` keeps 90 days on hot then transitions to frozen for a 1-year total window; `m_26_14-logs-l4-hot-frozen` keeps 180 days hot then transitions to frozen for a 1-year total.

When an index reaches the end of its retention window, it can't be deleted automatically. The pack enforces a two-gate human approval workflow:

1. The `m_26_14-gate1-detect-frozen-aged` watcher identifies aged frozen indices and creates a pending retirement request.
2. A Kibana Workflow (`m_26_14-data-retirement-gate1-detect`) surfaces it for ISSO review. Gate 1 approval unlocks the next step.
3. The `m_26_14-gate1-approval-advance` watcher verifies that an SLM snapshot exists before allowing deletion.
4. A second Kibana Workflow (`m_26_14-data-retirement-gate2-execute`) and watcher (`m_26_14-gate2-execute-deletion`) complete the deletion only after both humans have approved.

Every retirement action is recorded in `m_26_14-retirement-requests` — a complete, auditable trail.

---

### Can you prove logs weren't modified after collection?

**[Open: Log Management →](https://m-26-14-7ae75d.kb.us-east-1.aws.found.io/app/dashboards#/view/m_26_14-log-management?_g=(time:(from:now-30d,to:now)))**

![Log Management (Element 5)](/screenshots/05-log-management.png)

M-26-14 requires log integrity — evidence that log documents haven't been altered after collection. The pack handles this at ingest: the `m_26_14-log-integrity-hash` pipeline computes a SHA-256 of each log document the moment it arrives, writes it to `event.hash`, and flags the record with `event.integrity.hashed: true`. If anyone modifies the document later, the hash won't match.

The bars here show hash coverage by host. Click any bar to open Discover filtered to that host's integrity records — you'll see the raw hash values alongside the original log fields. Gaps in this chart are a compliance finding.

> **How this works:** The hash pipeline runs before any enrichment, capturing the raw document state. The `m_26_14-ml-e5-hash-drop` ML job monitors coverage across all reporting hosts — if a source that normally hashes goes unexpectedly silent, it fires an anomaly alert rather than leaving a quiet gap in this chart.

---

## The full picture

**[Open: Maturity Overview →](https://m-26-14-7ae75d.kb.us-east-1.aws.found.io/app/dashboards#/view/m_26_14-maturity-overview?_g=(time:(from:now-30d,to:now)))**

![Maturity Overview](/screenshots/01-maturity-overview.png)

The Maturity Overview rolls up everything you just walked through into a single executive view: current maturity level, element coverage percentages, and the gaps standing between this agency and its next attestation target.

This is what the ISSO opens every morning. The same pipeline that powers every dashboard you've explored — transforms, detection rules, ML jobs, and watchers — feeds into this summary automatically.

Behind this view:

- **6 ML anomaly-detection jobs** tracking maturity signals — asset-coverage drops, ingestion-rate dips, rule silence, retention/ILM anomalies, hash-coverage gaps, and DNS entropy — plus machine-learning detection rules reinforcing identity (Cat A), DNS/C2 (Cat B), and off-hours execution (Cat H)
- **6 ES Watchers** enforcing the two-gate data retirement workflow, JIT privileged access expiry, and selective legal-hold copy
- **3 AI Agents** in Elastic Agent Builder — `m_26_14-poam-drafting-agent` for gap documentation, `m_26_14-threat-investigation-agent` for security triage, `m_26_14-aar-agent` for after-action reports — each wired to ES|QL compliance query tools

---

## Questions you might have

**What happens to the 5 unmanaged devices?**
In a real deployment, each UNKNOWN-* device gets investigated: authorized IoT hardware, rogue equipment, or a decommissioned machine still on the network. M-26-14 requires documented disposition for anything network-discovered. The entity resolution transform surfaces them automatically — you don't have to go looking.

**What's the two-gate retirement workflow protecting against?**
It ensures no compliance log can be deleted by a single person or an automated process. Gate 1 requires ISSO review and a confirmed snapshot. Gate 2 requires a second human approval. The snapshot requirement means even if someone approves deletion, the data still exists in the snapshot repository until the snapshot itself expires — a separate, independent retention control.

**Is this real agency data?**
No — this is a synthetic fleet with realistic composition and posture spread. The pack deploys identically against real Elastic Agent data. The dashboards, rules, pipelines, and ML jobs are environment-agnostic; only the index patterns and configuration change.

**How do I generate a POA&M from the gaps I see here?**
Open [Agent Builder](https://m-26-14-7ae75d.kb.us-east-1.aws.found.io/app/agent_builder/agents) and start a session with `m_26_14-poam-drafting-agent`. It can query the current compliance posture using ES|QL and draft a Plan of Action & Milestones document for any gap you've identified — no data export needed.
