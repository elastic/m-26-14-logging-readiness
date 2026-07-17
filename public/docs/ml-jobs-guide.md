# M-26-14 Compliance Pack — ML Jobs Guide

This document describes all machine learning anomaly detection components in the M-26-14 compliance
pack: seven custom compliance-health jobs (Component A) and fourteen Kibana detection rules that
reference either those custom jobs or Elastic Security prebuilt / Entity-Store ML jobs (Component B).

---

## 1. Overview

Machine learning adds a second, behavior-based detection layer on top of the threshold-based Appendix
B detection rules. Where those rules fire when specific event patterns match known attack signatures,
the ML layer detects when **compliance health itself degrades** — silent collection failures, hash
coverage drops, retention drift — and when **entity behavior deviates** from established baselines
in ways that prebuilt Elastic Security models already capture well.

The ML component is split into two parts deliberately:

**Component A — Custom compliance-health jobs.** Seven custom anomaly detection jobs built specifically
for M-26-14. They monitor the compliance control plane: asset coverage rates, log ingestion rates,
detection rule activity, ILM index-lifecycle events, hash coverage ratios, DNS entropy, and new/rare
devices appearing on a network segment. These do not exist as Elastic prebuilt jobs and must be
deployed and managed by the agency.

**Component B — Kibana rules referencing prebuilt / Entity-Store jobs.** Eight detection rules
that wrap Elastic Security's built-in ML behavioral models (rare authentication sources, high
authentication failure counts, rare processes, host-went-silent, unusual login activity, network
traffic to rare countries). Several now bind to the M-26-14 Entity-Store variants (`*_ea` job ids)
rather than the raw prebuilt jobs — see §5.2. The pack does **not** duplicate the base jobs — doing
so would fork them from the Elastic
update stream and create maintenance overhead for the agency. Instead, the Kibana rules carry the
M-26-14 compliance metadata (MITRE tags, requirement references, maturity level) and fire when the
prebuilt job's anomaly score exceeds the configured threshold.

Together, the 7 custom jobs + 14 Kibana rules satisfy M-26-14's Level 3 and Level 4 ML detection
requirements as described in §5(a)–(k) and Appendix B.

---

## 2. Prerequisites

Before deploying any ML component, verify the following:

**Elasticsearch/Kibana license.** ML anomaly detection requires a **Platinum or Enterprise license**.
Machine Learning is not available on Basic or Gold tiers. Verify with:

```
GET /_license
```

The `type` field must be `platinum`, `enterprise`, or `trial` with ML features enabled.

**Elastic Security app.** Kibana's Security app must be installed and configured. The seven
behavioral Kibana rules (Component B, prebuilt job wrappers) are deployed as Security detection
rules and require the Security app to be present.

**14-day baseline period.** ML anomaly detection jobs require a sufficient baseline to establish
normal behavioral bounds. Plan for a **minimum 14-day warm-up period** after the datafeeds start
before enabling the Kibana compliance-health alert rules. Anomaly scores during the first 7–14 days
will be unreliable and will generate false positives if rules are active. The DNS entropy job
(`m_26_14-ml-catb-dns-entropy`) uses 15-minute buckets and converges faster — a 7-day baseline is
the practical minimum for that job.

**Elasticsearch audit logging (Element 4 job).** The `m_26_14-ml-element4-ilm-anomaly` job monitors
Elasticsearch index-lifecycle management events. These events are emitted to the Elasticsearch
audit log, which is **not enabled by default**. Enable audit logging before starting the element4
datafeed:

```yaml
# elasticsearch.yml
xpack.security.audit.enabled: true
xpack.security.audit.logfile.events.include:
  - "ACCESS_GRANTED"
  - "ACCESS_DENIED"
  - "AUTHENTICATION_SUCCESS"
```

**m_26_14-alert-category-pipeline ingest pipeline (Element 3 job).** The
`m_26_14-ml-element3-rule-silence` job reads a `m_26_14.category` field that is denormalized onto alert
documents. This field is written by the `m_26_14-alert-category-pipeline` ingest pipeline, which must
be deployed and set as the default pipeline on the `.kibana-event-log-*` or alerts index before
the element3 job will receive populated data. See [Known Limitations](#7-known-limitations-and-open-items)
for current status.

---

## 3. Component A: Custom ML Jobs

Seven custom anomaly detection jobs monitor M-26-14 compliance health. All job definition files are
in `public/assets/elasticsearch/ml_job/`.

| Job ID | Job File | Bucket Span | Model Memory | M-26-14 Requirement | MITRE ATT&CK |
|---|---|---|---|---|---|
| `m_26_14-ml-element1-asset-coverage` | `m_26_14-anomaly-element1.json` | 1h | 128mb | Element 1 §4 HWAM/SWAM Coverage | — |
| `m_26_14-ml-element1-new-network-device` | `m_26_14-ml-element1-new-network-device.json` | 15m | 64mb | Element 1 / Appendix A HWAM (passive) | T1200 |
| `m_26_14-ml-element2-ingestion-rate` | `m_26_14-anomaly-element2.json` | 1h | 512mb | Element 2 Log Centralization | — |
| `m_26_14-ml-element3-rule-silence` | `m_26_14-anomaly-element3.json` | 6h | 64mb | Element 3 §5(k) Detection Coverage | — |
| `m_26_14-ml-element4-ilm-anomaly` | `m_26_14-anomaly-element4.json` | 1h | 64mb | Element 4/5 Retention | T1485, T1070.004 |
| `m_26_14-ml-element5-hash-coverage` | `m_26_14-ml-element5-hash-coverage.json` | 1h | 128mb | Element 5 §3 Hashing/Integrity | T1565.001, T1070 |
| `m_26_14-ml-catb-dns-entropy` | `m_26_14-anomaly-catb-dns-entropy.json` | 15m | 256mb | Appendix B §5(b)(g) Network/DGA | T1568.002, T1071.004 |

**Element 1 — Asset Coverage (`m_26_14-ml-element1-asset-coverage`).** Detects declining asset
coverage ratios from the HWAM/SWAM tracking indices. A sustained drop in the fraction of expected
assets reporting to Fleet or the CDM integration signals either agent decommissioning without
proper retirement or a collection failure. Fires when coverage falls below historical norms for the
1-hour bucket.

**Element 1 — New Network Device (`m_26_14-ml-element1-new-network-device`).** Passive HWAM
complement to the agent-based asset-coverage job. Uses a `rare(host.name)` detector partitioned by
`network.segment` over 15-minute buckets against the passive network-discovery data stream
(`logs-m_26_14_netobserved.devices-*`). It flags a device that is new to, or rarely seen on, a
segment — catching unmanaged OT/IoT hardware that never runs an osquery agent and so is invisible to
the coverage job. Satisfies Element 1 / Appendix A HWAM for the unmanaged-device case (MITRE T1200,
Hardware Additions). Surfaced by the `AppA-L` new-terms detection rule rather than an ML-anomaly
wrapper, so no separate compliance-health rule is needed.

**Element 2 — Ingestion Rate (`m_26_14-ml-element2-ingestion-rate`).** Monitors log ingestion
document counts per data stream per hour. A sudden drop in ingestion rate for a data stream that
was previously active indicates a collection failure: Elastic Agent offline, integration
misconfiguration, or a source system outage. 512mb model memory reflects the per-partition
cardinality of monitoring multiple data streams simultaneously.

**Element 3 — Rule Silence (`m_26_14-ml-element3-rule-silence`).** Uses a 6-hour bucket span to
detect Appendix B detection categories that have gone silent — no alerts generated in the bucket
window despite the category having historically been active. This is the ML complement to the
threshold-based category K coverage-gap rule; the ML job catches gradual degradation rather than
binary silence. Requires the `m_26_14.category` field on alert documents (see Prerequisites).

**Element 4 — ILM Anomaly (`m_26_14-ml-element4-ilm-anomaly`).** Monitors Elasticsearch ILM
rollover and transition events for anomalous patterns: indices rolling over faster than expected
(potential log injection), indices skipping expected lifecycle phases (retention tampering), or
unexpected index deletions. MITRE T1485 (Data Destruction) and T1070.004 (File Deletion) apply
when adversaries attempt to tamper with retained evidence. Requires Elasticsearch audit logging.

**Element 5 — Hash Coverage (`m_26_14-ml-element5-hash-coverage`).** Counts documents carrying
`event.integrity.hashed: true` (written by the `m_26_14-log-integrity-hash` ingest pipeline) per data
stream per hour using `low_count()`. A sudden count drop to zero for any partition signals that the
pipeline was bypassed, removed, or is failing — breaking the integrity chain required by Element 5
§3. The datafeed pre-filters to `event.integrity.hashed: true` documents only, so zero-count
anomalies fire precisely when hashing stops for a stream. MITRE T1565.001 (Stored Data Manipulation)
and T1070 (Indicator Removal) apply.

**DNS Entropy — DGA Detection (`m_26_14-ml-catb-dns-entropy`).** Uses a 15-minute bucket span to
detect domains with unusually high Shannon entropy in DNS query names, consistent with
Domain Generation Algorithm (DGA) activity used by C2 frameworks. Sourced from Zeek DNS logs
(`logs-zeek.dns-*`). The datafeed normalizes Zeek's trailing-dot FQDN format (e.g.,
`malicious.example.com.`) before computing entropy to avoid false positives from the trailing dot
inflating entropy scores. Satisfies Appendix B §5(b) (network/C2) and §5(g) (IoC/DGA detection).

---

## 4. Datafeed Notes

All seven datafeeds are in `public/assets/elasticsearch/ml_job/` with filenames prefixed
`datafeed-`. The `datafeed-m_26_14-ml-element1-new-network-device` datafeed reads
`logs-m_26_14_netobserved.devices-*` with no aggregation (plain `rare` detector).

**Element 5 — simple term query, no aggregation.** The element5 datafeed uses a plain
`{"term": {"event.integrity.hashed": true}}` query to pre-filter documents to only those that have
been processed by the `m_26_14-log-integrity-hash` pipeline. The `low_count()` detector then models
the expected count of hashed documents per `data_stream.dataset` per hour. This approach is
computationally cheap (no Painless aggregation, no Transform dependency) and scales to any number of
data streams. A drop to zero hashed documents in any partition triggers an anomaly at score ≥75,
indicating the pipeline was bypassed or is failing for that data stream.

**Element 3 field dependency.** The element3 datafeed queries the `m_26_14.category` field on alert
documents. This field must be populated by the `m_26_14-alert-category-pipeline` ingest pipeline
before the datafeed will return useful data. If the field is absent, the job will model a flat zero
and produce no useful anomaly scores.

**DNS entropy trailing-dot normalization.** Zeek writes DNS query names with a trailing dot per
RFC 1035 FQDN convention (e.g., `google.com.`). The catb-dns-entropy datafeed applies a Painless
normalization step to strip the trailing dot before computing Shannon entropy. Without this
normalization, the extra character inflates entropy for all queries equally, masking the relative
difference between benign and DGA-generated domains.

---

## 5. Component B: Kibana ML Alert Rules

Fourteen Kibana detection rules surface ML anomaly signals. All rule files are in
`public/assets/kibana/rule/`.

### 5.1 Compliance Health Rules (custom job wrappers)

Six rules reference the custom M-26-14 jobs from Component A. Enable these after the 14-day
baseline period (7 days for catb-dns-entropy).

| Rule ID | Kibana File | References Job | Anomaly Score Threshold | Severity |
|---|---|---|---|---|
| `m_26_14-ml-e1-coverage-drop` | `m_26_14-ml-e1-coverage-drop.ndjson` | `m_26_14-ml-element1-asset-coverage` | 75 | High |
| `m_26_14-ml-e2-ingestion-drop` | `m_26_14-ml-e2-ingestion-drop.ndjson` | `m_26_14-ml-element2-ingestion-rate` | 75 | High |
| `m_26_14-ml-e3-rule-silence` | `m_26_14-ml-e3-rule-silence.ndjson` | `m_26_14-ml-element3-rule-silence` | 75 | Medium |
| `m_26_14-ml-e4-retention-anomaly` | `m_26_14-ml-e4-retention-anomaly.ndjson` | `m_26_14-ml-element4-ilm-anomaly` | 85 | High |
| `m_26_14-ml-e5-hash-drop` | `m_26_14-ml-e5-hash-drop.ndjson` | `m_26_14-ml-element5-hash-coverage` | 75 | High |
| `m_26_14-ml-catb-dns-dga` | `m_26_14-ml-catb-dns-dga.ndjson` | `m_26_14-ml-catb-dns-entropy` | 75 | High |

**Threshold guidance.** The anomaly score thresholds above are the defaults calibrated for
production use after baseline. During the first 30 days of operation, consider raising thresholds
to 85–90 to reduce alert fatigue while operators tune exception lists. Lower thresholds (65–70) are
appropriate for high-sensitivity environments (HVA systems) after a 30-day stable baseline.

The element4 threshold is set higher (85) than the others because ILM events have natural
variability — rollover timing is not perfectly regular — and a lower threshold would produce
excessive alerts from routine lifecycle activity.

### 5.2 Behavioral Rules (Entity-Store + prebuilt job wrappers)

Eight rules reference Elastic Security prebuilt / Entity-Store ML jobs. The auth, UEBA, and
host-silent rules bind to the M-26-14 **Entity-Store** variants (`*_ea` job ids), which the pack's
Entity-Store enablement (Host + Auth telemetry) provisions; the rare-process and rare-country rules
still reference the raw prebuilt jobs, installed via the Kibana Security app. See
[Deployment Steps](#6-deployment-steps).

| Rule ID | Kibana File | Job(s) Referenced | Appendix B Category | Maturity Level |
|---|---|---|---|---|
| `m_26_14-ml-cata-rare-auth-ip` | `m_26_14-ml-cata-rare-auth-ip.ndjson` | `m_26_14_auth_rare_source_ip_for_a_user_ea` | A — Identity | L4 |
| `m_26_14-ml-cata-high-auth-failures` | `m_26_14-ml-cata-high-auth-failures.ndjson` | `m_26_14_auth_high_count_logon_fails_ea` | A — Identity | L4 |
| `m_26_14-ml-cata-ueba-login` | `m_26_14-ml-cata-ueba-login.ndjson` | `m_26_14_suspicious_login_activity_ea` | A — Identity (UEBA) | L4 |
| `m_26_14-ml-cath-host-silent` | `m_26_14-ml-cath-host-silent.ndjson` | `m_26_14_low_count_events_for_a_host_name_ea` | H — Anomalous activity | L4 |
| `m_26_14-ml-cath-rare-process-windows` | `m_26_14-ml-cath-rare-process-windows.ndjson` | `v3_rare_process_by_host`, `rare_process_by_host_windows_ecs` | H — Anomalous activity | L4 |
| `m_26_14-ml-cath-rare-process-linux` | `m_26_14-ml-cath-rare-process-linux.ndjson` | `v3_rare_process_by_host`, `rare_process_by_host_linux_ecs` | H — Anomalous activity | L4 |
| `m_26_14-ml-catb-rare-country` | `m_26_14-ml-catb-rare-country.ndjson` | `network_traffic_to_rare_country` | B — Network/C2 | L4 |
| `m_26_14-ml-compliance-degradation` | `m_26_14-ml-compliance-degradation.ndjson` | All 6 compliance-health jobs (meta-rule) | Meta — All elements | L2 |

**Compliance degradation meta-rule.** The `m_26_14-ml-compliance-degradation` rule is a meta-rule
that fires when any of the six custom compliance-health jobs produces an anomaly score above its
respective threshold simultaneously with at least one other job. It acts as a roll-up signal for
the ISSO/CISO dashboard — a single alert that says "multiple compliance controls are degrading at
once," which warrants immediate investigation rather than routine triage.

**`v3_rare_process_by_host` availability.** The `v3_rare_process_by_host` job is available in
Elastic Security starting from version 8.4. If the deployment is running an earlier version, the
rules will fall back to `rare_process_by_host_windows_ecs` and `rare_process_by_host_linux_ecs`.
Both job IDs are included in the rule definitions to support both versions.

---

## 6. Deployment Steps

Deploy in the following sequence. Steps must be completed in order — the Kibana rules cannot
reference jobs that have not yet been created.

1. **Verify Platinum+ license.**
   ```
   GET /_license
   ```
   Confirm `type` is `platinum`, `enterprise`, or active `trial`.

2. **Deploy 7 custom job definitions.**
   For each job file in `public/assets/elasticsearch/ml_job/`:
   ```
   PUT /_ml/anomaly_detectors/{job_id}
   ```
   Where `{job_id}` is the value of the `job_id` field in the JSON. Order does not matter for job
   creation.

   Jobs:
   - `m_26_14-ml-element1-asset-coverage` — from `m_26_14-ml-element1-asset-coverage.json`
   - `m_26_14-ml-element1-new-network-device` — from `m_26_14-ml-element1-new-network-device.json`
   - `m_26_14-ml-element2-ingestion-rate` — from `m_26_14-ml-element2-ingestion-rate.json`
   - `m_26_14-ml-element3-rule-silence` — from `m_26_14-ml-element3-rule-silence.json`
   - `m_26_14-ml-element4-ilm-anomaly` — from `m_26_14-ml-element4-ilm-anomaly.json`
   - `m_26_14-ml-element5-hash-coverage` — from `m_26_14-ml-element5-hash-coverage.json`
   - `m_26_14-ml-catb-dns-entropy` — from `m_26_14-ml-catb-dns-entropy.json`

3. **Deploy 7 datafeeds.**
   For each datafeed file prefixed `datafeed-` in the same directory:
   ```
   PUT /_ml/datafeeds/{datafeed_id}
   ```
   Where `{datafeed_id}` is the `datafeed_id` field in the JSON (e.g.,
   `datafeed-m_26_14-ml-element1-asset-coverage`).

4. **Open all 7 jobs.**
   ```
   POST /_ml/anomaly_detectors/m_26_14-ml-element1-asset-coverage/_open
   POST /_ml/anomaly_detectors/m_26_14-ml-element1-new-network-device/_open
   POST /_ml/anomaly_detectors/m_26_14-ml-element2-ingestion-rate/_open
   POST /_ml/anomaly_detectors/m_26_14-ml-element3-rule-silence/_open
   POST /_ml/anomaly_detectors/m_26_14-ml-element4-ilm-anomaly/_open
   POST /_ml/anomaly_detectors/m_26_14-ml-element5-hash-coverage/_open
   POST /_ml/anomaly_detectors/m_26_14-ml-catb-dns-entropy/_open
   ```

5. **Start all 7 datafeeds.**
   ```
   POST /_ml/datafeeds/datafeed-m_26_14-ml-element1-asset-coverage/_start
   POST /_ml/datafeeds/datafeed-m_26_14-ml-element1-new-network-device/_start
   POST /_ml/datafeeds/datafeed-m_26_14-ml-element2-ingestion-rate/_start
   POST /_ml/datafeeds/datafeed-m_26_14-ml-element3-rule-silence/_start
   POST /_ml/datafeeds/datafeed-m_26_14-ml-element4-ilm-anomaly/_start
   POST /_ml/datafeeds/datafeed-m_26_14-ml-element5-hash-coverage/_start
   POST /_ml/datafeeds/datafeed-m_26_14-ml-catb-dns-entropy/_start
   ```

6. **Let baselines build.**
   - DNS entropy (`m_26_14-ml-catb-dns-entropy`) and new-network-device
     (`m_26_14-ml-element1-new-network-device`) jobs: minimum **7 days** (15-minute buckets
     accumulate sufficient history faster than hourly jobs).
   - All other jobs: minimum **14 days** before anomaly scores are reliable.
   - Do not enable the compliance-health Kibana rules (step 7) until the applicable baseline
     period has elapsed. Monitor job status via Kibana > Machine Learning > Anomaly Detection.

7. **Enable the 6 compliance-health Kibana rules.**
   Import via Kibana > Security > Rules > Import:
   - `m_26_14-ml-e1-coverage-drop.ndjson`
   - `m_26_14-ml-e2-ingestion-drop.ndjson`
   - `m_26_14-ml-e3-rule-silence.ndjson`
   - `m_26_14-ml-e4-retention-anomaly.ndjson`
   - `m_26_14-ml-e5-hash-drop.ndjson`
   - `m_26_14-ml-catb-dns-dga.ndjson`

   Enable each rule after import. Rules are imported in disabled state by default.

8. **Provision the behavioral-rule ML jobs (two job families).**

   The eight behavioral rules in §5.2 draw on two separate job families. Deploy both — they are
   provisioned by different mechanisms.

   **8a — Entity-Store `_ea` jobs (auth, UEBA, host-silent — 4 rules).**
   The rare-auth-IP, high-auth-failures, UEBA-login, and host-silent rules bind to M-26-14
   **Entity-Store** job ids:
   - `m_26_14_auth_rare_source_ip_for_a_user_ea`
   - `m_26_14_auth_high_count_logon_fails_ea`
   - `m_26_14_suspicious_login_activity_ea`
   - `m_26_14_low_count_events_for_a_host_name_ea`

   These are **not** installed from the Kibana "Install prebuilt jobs" flow. The pack's Entity-Store
   enablement (Host + Auth telemetry) clones the Elastic Security authentication and host detectors
   against the M-26-14 Entity-Store indices and opens each job with its own datafeed. Run that
   enablement before enabling the four rules — until the `_ea` jobs exist and have built a baseline,
   these rules cannot reference a live job.

   **8b — Raw Elastic Security prebuilt jobs (rare-process, rare-country — 3 rules).**
   The rare-process (Windows/Linux) and rare-country rules reference stock Elastic Security prebuilt
   jobs whose definitions are owned by Elastic and not shipped in this pack:
   - `v3_rare_process_by_host` (with `rare_process_by_host_windows_ecs` /
     `rare_process_by_host_linux_ecs` as pre-8.4 fallbacks)
   - `network_traffic_to_rare_country`

   Install by either route:
   - **UI:** Kibana > Security > Machine Learning > **Install prebuilt jobs**, then open and start
     the rare-process and rare-country jobs.
   - **Scripted:** install the prebuilt job definitions via the ML module setup API
     (`POST kbn:/internal/ml/modules/setup/<module_id>`), then create the pack-specific datafeeds
     from `public/assets/elasticsearch/ml_job/prebuilt/`. Only the rare-process and rare-country
     datafeeds in that folder are needed for the current rules — the `auth_*` and
     `suspicious_login_activity` datafeeds there are **legacy**, from before the auth/UEBA rules
     moved to the `_ea` jobs in 8a, and are not required.

   These jobs need endpoint process-event and network-flow data respectively; the corresponding
   rules stay in partial failure until those sources are connected.

   **Meta-rule.** `m_26_14-ml-compliance-degradation` references only the six custom compliance-health
   jobs from step 2 — no additional job deployment is required for it.

   Allow a minimum 14-day baseline period before proceeding to step 9.

9. **Enable the 8 behavioral Kibana rules.**
   Import and enable:
   - `m_26_14-ml-cata-rare-auth-ip.ndjson`
   - `m_26_14-ml-cata-high-auth-failures.ndjson`
   - `m_26_14-ml-cata-ueba-login.ndjson`
   - `m_26_14-ml-cath-host-silent.ndjson`
   - `m_26_14-ml-cath-rare-process-windows.ndjson`
   - `m_26_14-ml-cath-rare-process-linux.ndjson`
   - `m_26_14-ml-catb-rare-country.ndjson`
   - `m_26_14-ml-compliance-degradation.ndjson`

---

## 7. Known Limitations and Open Items

**Element 3 — ingest pipeline prerequisite not yet built.** The `m_26_14-ml-element3-rule-silence`
job depends on `m_26_14.category` being present on alert documents, written by the
`m_26_14-alert-category-pipeline` ingest pipeline. This pipeline has not yet been built (future work,
tracked separately). Until it is deployed, the element3 job will run but will not produce useful
anomaly scores. The element3 Kibana rule should not be enabled until the pipeline is in production.

**Element 5 — hash pipeline must be applied to target data streams.** The element5 ML job counts
`event.integrity.hashed: true` documents, so the `m_26_14-log-integrity-hash` ingest pipeline must be
set as `final_pipeline` on every data stream you want to monitor. The pack deploys the
`m_26_14-log-integrity-settings` component template and the `m_26_14-logs-data-streams` index template
(which covers `logs-m_26_14.*`). For other data streams (e.g. `logs-elasticsearch.audit-*`), apply
the pipeline setting manually:
```
PUT /logs-elasticsearch.audit-default/_settings
{"index": {"final_pipeline": "m_26_14-log-integrity-hash"}}
```
Existing documents can be re-hashed by running `_update_by_query` with the pipeline parameter
on the backing index. New documents are hashed automatically once the setting is in place.

**Element 4 — audit logging not enabled by default.** Elasticsearch audit logging must be
explicitly enabled. Many production deployments have it disabled due to the log volume it generates.
Agencies should review the audit log volume impact before enabling and ensure the audit log index
is covered by an appropriate ILM policy (the `m_26_14-logs-l4-no-delete.json` policy is appropriate
for audit logs at Level 4).

**Behavioral rules — prebuilt job name changes between Elastic versions.** Elastic Security
prebuilt ML job IDs can change between major versions. The `v3_rare_process_by_host` job was
introduced in version 8.4 and supersedes `rare_process_by_host_windows_ecs` /
`rare_process_by_host_linux_ecs`. When upgrading Elastic Stack versions, verify that prebuilt job
IDs referenced in the behavioral Kibana rules still match the installed job IDs. If a referenced
job ID no longer exists after an upgrade, the rule will fail to run.

**`check_window` must equal `bucket_span`.** The Kibana ML rule configuration requires that the
`check_window` parameter (the lookback window the rule uses when polling for new anomaly records)
equals the job's `bucket_span`. If these values differ, the rule will either miss anomaly records
(check_window too short) or produce duplicate alerts (check_window too long). All six compliance-
health rules are pre-configured with matching `check_window` and `bucket_span` values; do not
modify these independently.

---

## 8. M-26-14 Requirement Mapping

| M-26-14 Requirement | ML Jobs / Rules | Maturity Level |
|---|---|---|
| Element 1 §4 HWAM/SWAM Coverage | `m_26_14-ml-element1-asset-coverage`, `m_26_14-ml-e1-coverage-drop` | L2+ |
| Element 1 / Appendix A HWAM (unmanaged devices) | `m_26_14-ml-element1-new-network-device`, `AppA-L` new-terms rule | L3+ |
| Element 2 Log Centralization | `m_26_14-ml-element2-ingestion-rate`, `m_26_14-ml-e2-ingestion-drop` | L2+ |
| Element 3 L4 ML Detection (§5(a)–(k)) | `m_26_14-ml-element3-rule-silence`, `m_26_14-ml-catb-dns-entropy`, all 8 behavioral rules | L4 |
| Element 4 §1 Retention | `m_26_14-ml-element4-ilm-anomaly`, `m_26_14-ml-e4-retention-anomaly` | L3+ |
| Element 5 §3 Hashing/Integrity | `m_26_14-ml-element5-hash-coverage`, `m_26_14-ml-e5-hash-drop` | L3+ |
| Appendix B §5(b) Network/C2 | `m_26_14-ml-catb-dns-entropy`, `m_26_14-ml-catb-dns-dga`, `m_26_14-ml-catb-rare-country` | L4 |
| Appendix B §5(g) IoC/DGA | `m_26_14-ml-catb-dns-entropy`, `m_26_14-ml-catb-dns-dga` | L4 |
| Appendix B §5(a) Identity | `m_26_14-ml-cata-rare-auth-ip`, `m_26_14-ml-cata-high-auth-failures`, `m_26_14-ml-cata-ueba-login` | L4 |
| Appendix B §5(h) Endpoint — Anomalous activity | `m_26_14-ml-cath-rare-process-windows`, `m_26_14-ml-cath-rare-process-linux`, `m_26_14-ml-cath-host-silent` | L4 |
| Cross-element compliance degradation | `m_26_14-ml-compliance-degradation` (meta-rule) | L2 |
