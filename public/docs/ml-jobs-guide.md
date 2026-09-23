# M-26-14 Readiness Pack — ML Jobs Guide

This document describes every machine learning anomaly detection component in the M-26-14 Readiness
Pack: eight custom jobs with their eight datafeeds (Component A) and fifteen Kibana
`machine_learning` detection rules that bind either those custom jobs or Elastic Security module
jobs installed with the `m_26_14_` prefix (Component B).

---

## 1. Overview

Machine learning adds a second, behavior-based detection layer on top of the threshold-based
Appendix B detection rules. Where those rules fire when specific event patterns match known attack
signatures, the ML layer detects when compliance health itself degrades (silent collection
failures, hash coverage drops, retention drift, schema drift) and when entity behavior deviates
from established baselines in ways that Elastic Security's supplied models already capture well.

The ML component is split into two parts deliberately:

**Component A: custom jobs.** Eight anomaly detection jobs built specifically for M-26-14. Seven of
them form the readiness-health set: asset coverage, passive network device discovery, log
ingestion rate, detection rule activity, index-admin and retention activity, hash coverage ratio,
and schema drift. The eighth, `m_26_14-ml-catb-dns-entropy`, is a threat-detection job (groups
`m_26_14` and `threat-detection`) that scores DNS query entropy per client. None of the eight exist
as Elastic supplied jobs, so the pack ships them and the agency runs them.

**Component B: Kibana rules.** Fifteen `machine_learning` detection rules. Eight bind the pack's own
jobs (seven one-to-one wrappers plus the cross-element meta-rule). Seven bind Elastic Security ML
module jobs installed with the job ID prefix `m_26_14_`. The pack does not duplicate the module job
definitions, because forking them from the Elastic update stream would create maintenance overhead
for the agency. The wrapper rules carry the M-26-14 compliance metadata (MITRE tags, requirement
references, maturity level) and fire when the bound job's anomaly record score reaches the rule's
`anomaly_threshold`.

Together the 8 custom jobs and 15 Kibana rules satisfy the pack's Level 2 through Level 4 ML
detection coverage across the five logging elements and Appendix B.

---

## 2. Prerequisites

Before deploying any ML component, verify the following.

**Elasticsearch and Kibana license.** ML anomaly detection requires a Platinum or Enterprise
license. Machine Learning is not available on Basic or Gold tiers. Verify with:

```
GET /_license
```

The `type` field must be `platinum`, `enterprise`, or `trial` with ML features enabled.

**Elastic Security app.** Kibana's Security app must be installed and configured. Every rule in
Component B is a Security detection rule.

**ML node capacity.** The eight custom jobs plus the seven bound module jobs need ML node memory.
Installing a Security ML module creates every job in that module family, not only the job a wrapper
binds, so plan to delete the unbound jobs (see section 6, step 8).

**Baseline period.** ML anomaly detection needs history before scores mean anything. Plan a minimum
14-day warm-up after the datafeeds start before enabling the readiness-health rules. Two jobs
converge faster on 15-minute buckets, `m_26_14-ml-catb-dns-entropy` and
`m_26_14-ml-element1-new-network-device`, where 7 days is the practical minimum. The `rare`
detector in `m_26_14-ml-schema-drift` also needs roughly 7 days before new-key anomalies score
usefully.

**Elasticsearch audit logging (Element 4 job).** The `m_26_14-ml-element4-ilm-anomaly` datafeed
reads `logs-elasticsearch.audit-*` and filters to successful index-admin actions. Audit logging is
not enabled by default, and it must include success events:

```yaml
# elasticsearch.yml
xpack.security.audit.enabled: true
xpack.security.audit.logfile.events.include:
  - "access_granted"
  - "access_denied"
  - "authentication_success"
```

A failure-only audit policy produces zero documents for this datafeed. On Elastic Cloud Hosted,
enabling audit logging ships the audit stream to `logs-elasticsearch.audit-*` for you; on
self-managed clusters, ship it with the Elasticsearch integration so the ECS field
`elasticsearch.audit.action` is populated.

**Hash coverage rollup transform (Element 5 job).** The `m_26_14-ml-element5-hash-coverage`
datafeed reads the `m_26_14-hash-coverage` index, which is written by the continuous
`m_26_14-hash-coverage-rollup` transform. Install and start that transform before starting the
element5 datafeed.

**Schema observables (schema drift job).** The `m_26_14-ml-schema-drift` datafeed filters to
documents carrying `m_26_14.schema.field_count` and `event.ingested`. Both are stamped by the
`m_26_14-final` pipeline, which is bound as `index.final_pipeline` through the
`m_26_14-log-integrity-settings` component template. Only streams that run `m_26_14-final` are
visible to this job.

---

## 3. Component A: custom ML jobs

Eight anomaly detection jobs ship with the pack. Job definitions and datafeeds are in
`elasticsearch/ml_job/`, with datafeed filenames prefixed `datafeed-`. The EPR package carries all
sixteen files as the `m_26_14-ml` ML module (`kibana/ml_module/m_26_14-ml.json`).

| Job ID | Groups | Bucket span | Model memory | Detectors | Requirement | MITRE ATT&CK |
|---|---|---|---|---|---|---|
| `m_26_14-ml-element1-asset-coverage` | `m_26_14`, `readiness-health` | 1h | 128mb | `low_distinct_count(host.name)` by `m_26_14.coverage_source` | Element 1 inventory visibility, Appendix B §4 CDM/HWAM coverage | (none) |
| `m_26_14-ml-element1-new-network-device` | `m_26_14`, `asset-management`, `network-visibility` | 15m | 64mb | `rare` by `host.name` by `network.segment` | Appendix A HWAM passive discovery, Element 1 asset coverage | T1200, T1046 |
| `m_26_14-ml-element2-ingestion-rate` | `m_26_14`, `readiness-health` | 1h | 512mb | `low_count` and `low_non_zero_count` by `data_stream.dataset` | Element 2 collection coverage, §2 log centralization, §3 timestamp timeliness | (none) |
| `m_26_14-ml-element3-rule-silence` | `m_26_14`, `readiness-health` | 6h | 64mb | `low_count` by `m_26_14.category` | Element 3 collection operations, Appendix B §5(k) coverage verification | (none) |
| `m_26_14-ml-element4-ilm-anomaly` | `m_26_14`, `readiness-health` | 1h | 64mb | `high_count` by `elasticsearch.audit.action`; `rare` by action by `user.name` | Element 4 data retention §1, Element 5 two-gate retirement | T1485, T1070.004 |
| `m_26_14-ml-element5-hash-coverage` | `m_26_14`, `readiness-health` | 1h | 128mb | `low_mean(hash_ratio)` by `data_stream.dataset` | Element 5 log management, §3 hashing and integrity | T1565.001, T1070 |
| `m_26_14-ml-schema-drift` | `m_26_14`, `readiness-health`, `pipeline-health` | 1h | 256mb | `rare` by `m_26_14.schema.top_level_keys` by `data_stream.dataset`; `mean(m_26_14.schema.field_count)` by dataset | LRA 4.7 and 7.3, Appendix E.5.3, decision D-04 | (none) |
| `m_26_14-ml-catb-dns-entropy` | `m_26_14`, `threat-detection` | 15m | 256mb | `high_info_content(dns.question.name)` by `source.ip` | Appendix B §5(b) network/C2 and §5(g) IoC/DGA, Element 3 L4 | T1568.002, T1071.004 |

Six of the eight carry the `readiness-health` group. `m_26_14-ml-element1-new-network-device` does
not, but it is still part of the readiness-health set bound by the meta-rule (section 5.3), and
`m_26_14-ml-catb-dns-entropy` is the only job outside that set.

**Element 1, asset coverage (`m_26_14-ml-element1-asset-coverage`).** Detects a drop in the number
of distinct assets reporting per inventory source: `low_distinct_count(host.name)` partitioned by
`m_26_14.coverage_source`, a datafeed runtime field that resolves to `m_26_14.hwam_source` when
present and falls back to `data_stream.dataset`. The feed reads
`logs-m_26_14_asset.inventory-*` and `logs-m_26_14_osquery.hardware_inventory-*`. When a source
(osquery, for example) suddenly reports fewer distinct hosts than its learned baseline, the job
fires for that partition. Coverage percentages are owned by the coverage transform and dashboards;
this job owns the statistical drop signal.

**Element 1, new network device (`m_26_14-ml-element1-new-network-device`).** The passive
complement to the agent-based coverage job. `rare` over `host.name` partitioned by
`network.segment` on 15-minute buckets, reading the passive discovery stream
`logs-m_26_14_netobserved.devices-*`. Each device on the wire is normalized to a `host.name` of the
form `netdev-<mac>` by the `m_26_14-network-device-normalize` pipeline. The job surfaces unmanaged
OT and IoT hardware (PLCs, cameras, sensors) that never runs an agent and so is invisible to the
coverage job. The point-in-time signal for the same population is the new-terms rule
`m_26_14-appendixa-l-new-network-device` (file `m_26_14-appendixb-l-new-ot-device.ndjson`,
7-day history window), so the job has no dedicated ML wrapper rule of its own; it reaches alerting
through the meta-rule. See the OT/IoT network visibility guide for the wider design.

**Element 2, ingestion rate (`m_26_14-ml-element2-ingestion-rate`).** Two detectors over
`logs-*`: `low_count` per `data_stream.dataset` catches partial volume degradation, and
`low_non_zero_count` per dataset catches total dataset silence. A drop for a previously active data
stream indicates a collection failure: Elastic Agent offline, integration misconfiguration, or a
source system outage. The 512mb model memory limit is sized for 20 to 50 active datasets; tune it
upward beyond that, because each partition holds independent model state. Datasets that have never
reported cannot form a partition and are the Appendix B-K coverage-gap rule's responsibility, not
this job's.

**Element 3, rule silence (`m_26_14-ml-element3-rule-silence`).** A 6-hour bucket span detects
Appendix B categories that have gone silent, meaning no alerts in the bucket window despite the
category having been active historically. This is the ML complement to the threshold-based
category K coverage-gap rule: the ML job catches gradual degradation rather than binary silence,
and the model learns weekly seasonality so weekends do not read as outages. The datafeed reads
`.alerts-security.*` filtered to the `M-26-14` rule tag, excludes the `readiness-health`, `meta`
and `Appendix-B-K` tags so the model does not see itself, and derives the partition field
`m_26_14.category` at query time (section 4). A category whose rules have never alerted cannot form
a partition and is invisible to this model; day-zero absence is owned by the Appendix B-K rule and
the coverage dashboard.

**Element 4, ILM anomaly (`m_26_14-ml-element4-ilm-anomaly`).** Monitors Elasticsearch audit events
for destructive or retention-affecting admin actions. The datafeed filters
`elasticsearch.audit.action` to `indices:admin/delete`, `indices:admin/settings/update`,
`indices:admin/forcemerge` and `indices:admin/close`. Detector 1 (`high_count` partitioned by
action) fires on volume spikes such as a bulk purge. Detector 2 (`rare` by action per `user.name`)
fires when a principal performs an index-admin action that is rare for that account, which is
targeted retirement abuse that evades volume thresholds. `elasticsearch.audit.indices` rides as an
influencer, so every anomaly names the affected index. MITRE T1485 (Data Destruction) and
T1070.004 (File Deletion) apply when adversaries tamper with retained evidence.

**Element 5, hash coverage (`m_26_14-ml-element5-hash-coverage`).** Models the true hash-coverage
ratio per data stream. The continuous `m_26_14-hash-coverage-rollup` transform reads `logs-*`,
buckets hourly per `data_stream.dataset`, counts total documents and documents where
`event.integrity.hashed` is true, and writes `hash_ratio` into the `m_26_14-hash-coverage` index.
The job then runs `low_mean(hash_ratio)` partitioned by dataset. This replaces an earlier
hashed-documents-only `low_count()` design that filtered the feed to hashed documents and therefore
went blind exactly when hashing stopped: no data meant no anomaly. A dataset whose coverage
collapses now shows up as `hash_ratio` falling toward 0 instead of vanishing. A dataset that has
never been hashed has a baseline ratio of 0 and will not produce an anomaly; never-onboarded
streams are surfaced by the hash-coverage dashboard. MITRE T1565.001 (Stored Data Manipulation) and
T1070 (Indicator Removal) apply.

**Schema drift (`m_26_14-ml-schema-drift`).** Decision D-04, LRA sections 4.7 and 7.3. The
`m_26_14-final` pipeline stamps every pack-stream document with `m_26_14.schema.top_level_keys`
(the sorted list of top-level field names) and `m_26_14.schema.field_count`. Detector 0 (`rare` by
the key set, partitioned per dataset) catches a field family appearing: a source upgrade, a parser
change, a misrouted stream. The datafeed carries no runtime mapping for this: the ML field extractor
joins a multi-valued keyword into one comma-separated value, so each distinct key set arrives as a
single by-field value (for example `@timestamp,event,host,m_26_14,user`). Detector 1 (`mean` of `field_count` per dataset) catches fields
disappearing, which is the context-discarding normalization the LRA's avoid-list names, and sudden
ballooning. Hard mapping conflicts belong to the daily field-caps workflow, and outright parse
failures land in the failure store and its rule. This job covers the silent middle: documents that
still index but no longer look like they did. 1-hour buckets, 256mb model memory sized for 20 to 50
datasets. Its wrapper rule is `m_26_14-ml-schema-drift` with `anomaly_threshold` 40, which is lower
than the readiness-health default because a never-seen key set scores in the 40s for the first
buckets after warm-up and rises as history accumulates, while a sustained `field_count` drop scores
90 or above as a mean shift within one bucket.

**DNS entropy, DGA detection (`m_26_14-ml-catb-dns-entropy`).** A 15-minute bucket span detects
unusually high information content (`high_info_content`) in DNS query names, consistent with Domain
Generation Algorithm activity used by C2 frameworks. Partitioned by `source.ip`, the querying
client, and not by `host.name`: on sensor-based sources such as Zeek or Packetbeat, `host.name`
identifies the sensor that observed the traffic, so partitioning by it would blend every client
into one baseline and attribute anomalies to the wrong entity. `host.name` is retained as an
influencer only. The datafeed reads `logs-zeek.dns*` and `logs-network_traffic.dns*` and normalizes
Zeek's trailing-dot FQDN format before computing entropy. Satisfies Appendix B §5(b) (network and
C2) and §5(g) (IoC and DGA).

---

## 4. Datafeed notes

All eight datafeeds are in `elasticsearch/ml_job/` with filenames prefixed `datafeed-`. Every
datafeed excludes documents tagged `m_26_14.canary: true` so synthetic canary traffic never enters
a model.

**Element 5, transform-backed ratio feed.** The element5 datafeed reads the `m_26_14-hash-coverage`
rollup index with `match_all` rather than raw logs. The `m_26_14-hash-coverage-rollup` transform
must be installed and running for the feed to see data. After backdated demo seeding, run
`_stop`, `_reset`, `_start` on the transform so its continuous checkpoint does not skip historical
documents. `low_mean(hash_ratio)` dropping below the learned baseline triggers an anomaly at the
wrapper's threshold of 75, indicating that the hashing pipeline was bypassed or is failing for that
data stream.

**Element 2 and schema drift, arrival clock.** Both jobs use `event.ingested` as the `time_field`
instead of `@timestamp`. `event.ingested` is the arrival clock stamped by the `m_26_14-final`
pipeline (with `override: false`, so a backfilled ingest time is honored), and Fleet-managed
integrations stamp it through the Fleet final pipeline. Modeling arrival time means backfilled or
replayed historical data cannot mask a live collection outage or smear a drift window.
Elasticsearch requires a datafeed's time field to be a real, aggregatable date mapping on every
index the feed reads, so it cannot be a runtime field; both datafeeds therefore filter on
`exists: event.ingested`. The schema-drift feed additionally filters on
`exists: m_26_14.schema.field_count`, which restricts it to streams running `m_26_14-final`.

**Element 3, category derived at datafeed time.** The element3 datafeed derives
`m_26_14.category` with a runtime mapping that reads `kibana.alert.rule.tags` and maps an
`Appendix-B-<letter>` tag to `Cat-<letter>`. An array-valued field cannot be a partition field, but
a runtime scalar derived from one can, so no ingest-pipeline enrichment on `.alerts-security.*` is
required. Alerts with no `Appendix-B-*` tag emit no category and are excluded from the model. The
`m_26_14-alert-category-pipeline` ships with the pack and remains available as an optional
denormalization for dashboards and other consumers; the element3 job does not depend on it.

**DNS entropy, trailing-dot normalization.** Zeek writes DNS query names with a trailing dot per
the RFC 1035 FQDN convention (`google.com.`, for example). The catb-dns-entropy datafeed applies a
Painless `script_fields` step to strip the trailing dot before entropy is computed. Without the
normalization the extra character inflates entropy for every query equally, masking the relative
difference between benign and DGA-generated domains.

**Delayed data checks.** Every datafeed enables `delayed_data_check_config`. The check window
matches the job's bucket span except for element5, where a 2-hour window covers the rollup
transform's 120-second sync delay and 5-minute run frequency on top of a 1-hour bucket.

---

## 5. Component B: Kibana ML alert rules

Fifteen `machine_learning` detection rules surface ML anomaly signals. All rule files are in
`kibana/rule/`. Every rule ships disabled except `m_26_14-ml-cath-host-silent`, so plan to enable
each one explicitly after its job has a baseline.

### 5.1 Readiness-health rules (custom job wrappers)

Seven rules each bind exactly one custom job. Enable them after the applicable baseline period
(14 days, or 7 days for the DNS entropy and schema-drift jobs).

| Rule ID | Bound job | Threshold | Severity | Risk score | Rule interval / lookback | Level tag |
|---|---|---|---|---|---|---|
| `m_26_14-ml-e1-coverage-drop` | `m_26_14-ml-element1-asset-coverage` | 75 | high | 73 | 1h / `now-6h` | L3 |
| `m_26_14-ml-e2-ingestion-drop` | `m_26_14-ml-element2-ingestion-rate` | 75 | high | 73 | 30m / `now-6h` | L2 |
| `m_26_14-ml-e3-rule-silence` | `m_26_14-ml-element3-rule-silence` | 75 | medium | 47 | 6h / `now-12h` | L2 |
| `m_26_14-ml-e4-retention-anomaly` | `m_26_14-ml-element4-ilm-anomaly` | 85 | high | 73 | 1h / `now-6h` | L3 |
| `m_26_14-ml-e5-hash-drop` | `m_26_14-ml-element5-hash-coverage` | 75 | high | 73 | 1h / `now-6h` | L3 |
| `m_26_14-ml-schema-drift` | `m_26_14-ml-schema-drift` | 40 | medium | 47 | 1h / `now-6h` | L2 (D-04) |
| `m_26_14-ml-catb-dns-dga` | `m_26_14-ml-catb-dns-entropy` | 75 | high | 73 | 15m / `now-2h` | L4 |

`m_26_14-ml-element1-new-network-device` has no one-to-one wrapper. Its point-in-time alerting is
the new-terms rule `m_26_14-appendixa-l-new-network-device`, and its anomaly records reach alerting
through the meta-rule in section 5.3.

**Threshold guidance.** These thresholds are the defaults calibrated for production use after
baseline. During the first 30 days, consider raising the 75s to 85 or 90 to reduce alert fatigue
while operators tune exception lists. Lower thresholds (65 to 70) suit high-sensitivity
environments such as HVA systems after a 30-day stable baseline. The element4 threshold is set
higher (85) because ILM and index-admin activity has natural variability, and rollover timing is
not perfectly regular, so a lower threshold would produce excessive alerts from routine lifecycle
work. The schema-drift threshold is set lower (40) for the reason given in section 3.

### 5.2 Behavioral rules (Entity-Store and Security module job wrappers)

Seven behavioral wrapper rules bind Elastic Security ML module jobs installed with the job ID
prefix `m_26_14_`. The pack targets Stack 9.4 and later, which ships the `_ea` (Entity Analytics)
generation of these jobs; `rare_destination_country` predates the `_ea` naming and keeps its
historical ID. Installing with the prefix keeps the pack's copies isolated from any existing SOC
deployment of the same modules and lets the dashboards and the meta-monitoring rules find them by
stable ID. See section 6 for the installation sequence, and
`elasticsearch/ml_job/prebuilt/README.md` for the full rule-to-job-to-module table and the data
prerequisites.

| Rule ID | Bound job (prefix-installed) | Module | Threshold | Severity / risk | Appendix B category |
|---|---|---|---|---|---|
| `m_26_14-ml-cata-rare-auth-ip` | `m_26_14_auth_rare_source_ip_for_a_user_ea` | `security_auth` | 25 | low / 21 | A, identity |
| `m_26_14-ml-cata-high-auth-failures` | `m_26_14_auth_high_count_logon_fails_ea` | `security_auth` | 40 | low / 21 | A and D, identity |
| `m_26_14-ml-cata-ueba-login` | `m_26_14_suspicious_login_activity_ea` | `security_auth` | 22 | low / 21 | A and H, identity (UEBA) |
| `m_26_14-ml-cath-host-silent` | `m_26_14_low_count_events_for_a_host_name_ea` | `security_host` | 75 | low / 21 | H, anomalous activity |
| `m_26_14-ml-cath-rare-process-windows` | `m_26_14_v3_rare_process_by_host_windows_ea` | `security_windows_v3` | 75 | low / 21 | H, anomalous activity |
| `m_26_14-ml-cath-rare-process-linux` | `m_26_14_v3_rare_process_by_host_linux_ea` | `security_linux_v3` | 75 | low / 21 | H, anomalous activity |
| `m_26_14-ml-catb-rare-country` | `m_26_14_rare_destination_country` | `security_network` | 75 | low / 21 | B, network and C2 |

All seven ship `severity: low` and `risk_score: 21`, matching the Elastic prebuilt detection rules
that bind the unprefixed versions of the same jobs. Agencies already running those out-of-the-box
prebuilts should run one or the other per signal, not both, to avoid duplicate alerts.

**Job lineage.** Elastic Security ML job IDs have evolved across generations: the original `*_ecs`
jobs were superseded by `v3_*` jobs at 8.4, which were in turn superseded by the `_ea` Entity
Analytics generation shipped by the 9.4 and later security modules. Each wrapper rule binds exactly
one job from the current generation. A multi-job ML rule requires every listed job to exist, so the
old dual-ID fallback pattern (`v3_rare_process_by_host` plus `*_ecs`) silently broke on stacks that
ship only one generation, and it has been removed.

### 5.3 Cross-element meta-rule

`m_26_14-ml-readiness-degradation` (file `m_26_14-ml-readiness-degradation.ndjson`, rule version 2)
binds exactly the seven readiness-health jobs:

- `m_26_14-ml-element1-asset-coverage`
- `m_26_14-ml-element1-new-network-device`
- `m_26_14-ml-element2-ingestion-rate`
- `m_26_14-ml-element3-rule-silence`
- `m_26_14-ml-element4-ilm-anomaly`
- `m_26_14-ml-element5-hash-coverage`
- `m_26_14-ml-schema-drift`

It does not bind `m_26_14-ml-catb-dns-entropy`, which has its own wrapper
`m_26_14-ml-catb-dns-dga`.

A Kibana `machine_learning` rule evaluates each bound job independently, so the meta-rule fires
when any one of the seven produces an anomaly record whose score is 75 or higher. There is no
coincidence condition: it does not require two jobs to be anomalous at once. It runs every hour
over a `now-8h` lookback and ships `severity: medium`, `risk_score: 47`. Treat it as a single
roll-up subscription for the ISSO and CISO dashboards: one rule to enable that covers every
readiness-health signal, rather than a statement that several controls degraded together.

Because a multi-job ML rule requires every listed job to exist, the meta-rule produces no alerts
until all seven jobs are created. Create them through the `m_26_14-ml` module (section 6) before
enabling it.

---

## 6. Deployment steps

Deploy in this sequence. The Kibana rules cannot bind jobs that do not yet exist.

1. **Verify a Platinum or higher license.**
   ```
   GET /_license
   ```
   Confirm `type` is `platinum`, `enterprise`, or an active `trial`.

2. **Create the eight custom jobs and their datafeeds.**

   The EPR package ships all eight jobs and eight datafeeds as the `m_26_14-ml` ML module. Fleet
   install registers the module as a supplied configuration; no job or datafeed exists until module
   setup runs, and the bootstrap loader does not run it. In Kibana Dev Tools:
   ```
   POST kbn:/internal/ml/modules/setup/m_26_14-ml
   {
     "startDatafeed": true
   }
   ```
   (Headers: `kbn-xsrf: true` and `x-elastic-internal-origin: Kibana`.) The UI path is
   **Machine Learning > Anomaly Detection > Jobs > Create job > supplied configurations**.

   To deploy without the package, PUT each file in `elasticsearch/ml_job/` directly:
   ```
   PUT /_ml/anomaly_detectors/{job_id}
   PUT /_ml/datafeeds/{datafeed_id}
   ```
   Order does not matter between jobs, but each datafeed requires its job to exist first.

   Jobs:
   - `m_26_14-ml-element1-asset-coverage`
   - `m_26_14-ml-element1-new-network-device`
   - `m_26_14-ml-element2-ingestion-rate`
   - `m_26_14-ml-element3-rule-silence`
   - `m_26_14-ml-element4-ilm-anomaly`
   - `m_26_14-ml-element5-hash-coverage`
   - `m_26_14-ml-schema-drift`
   - `m_26_14-ml-catb-dns-entropy`

3. **Confirm the data dependencies are in place.** Before starting datafeeds, verify that the
   `m_26_14-hash-coverage-rollup` transform is running (element5), that audit logging with success
   events is on and `logs-elasticsearch.audit-*` is populated (element4), and that `m_26_14-final`
   is bound on the streams you expect schema drift and ingestion-rate coverage over.

4. **Open the eight jobs** if module setup did not already open them.
   ```
   POST /_ml/anomaly_detectors/{job_id}/_open
   ```

5. **Start the eight datafeeds.**
   ```
   POST /_ml/datafeeds/datafeed-{job_id}/_start
   ```
   Each datafeed ID is the job ID prefixed with `datafeed-`.

6. **Let baselines build.**
   - `m_26_14-ml-catb-dns-entropy` and `m_26_14-ml-element1-new-network-device`: minimum 7 days.
     15-minute buckets accumulate history faster than hourly jobs.
   - `m_26_14-ml-schema-drift`: the `mean` detector scores within a bucket, but the `rare` detector
     needs roughly 7 days.
   - All other jobs: minimum 14 days before anomaly scores are reliable.
   - Monitor job status in **Kibana > Machine Learning > Anomaly Detection**.

7. **Enable the seven readiness-health rules.** Rules arrive with the EPR package, or import them
   from `kibana/rule/` via **Kibana > Security > Rules > Import**:
   - `m_26_14-ml-e1-coverage-drop.ndjson`
   - `m_26_14-ml-e2-ingestion-drop.ndjson`
   - `m_26_14-ml-e3-rule-silence.ndjson`
   - `m_26_14-ml-e4-retention-anomaly.ndjson`
   - `m_26_14-ml-e5-hash-drop.ndjson`
   - `m_26_14-ml-schema-drift.ndjson`
   - `m_26_14-ml-catb-dns-dga.ndjson`

   Enable each rule after import. Rules ship disabled.

8. **Install the Elastic Security ML modules with the `m_26_14_` prefix.**

   For each of `security_auth`, `security_host`, `security_network`, `security_linux_v3` and
   `security_windows_v3`:
   ```
   POST kbn:/internal/ml/modules/setup/security_auth
   {
     "prefix": "m_26_14_",
     "indexPatternName": "logs-*",
     "startDatafeed": true
   }
   ```
   The jobs the wrapper rules need from each module:
   - `security_auth`: `m_26_14_auth_rare_source_ip_for_a_user_ea`,
     `m_26_14_auth_high_count_logon_fails_ea`, `m_26_14_suspicious_login_activity_ea`
   - `security_host`: `m_26_14_low_count_events_for_a_host_name_ea`
   - `security_network`: `m_26_14_rare_destination_country`
   - `security_windows_v3`: `m_26_14_v3_rare_process_by_host_windows_ea`
   - `security_linux_v3`: `m_26_14_v3_rare_process_by_host_linux_ea`

   Module setup creates each job and its datafeed together and starts them, so no separate datafeed
   assets are needed. It also installs every job in each module family, roughly 40 jobs across the
   five modules, not only the seven the wrappers bind. Stop and close, or delete, the unbound jobs
   to free ML node memory. On a small ML tier (around 2 GB) the full set does not fit: surplus jobs
   sit in `opening` and other jobs fail with `no ML nodes with sufficient capacity`, so delete the
   unbound jobs before opening the pack's own eight.

   A datafeed starts only once every detector and influencer field is mapped in at least one index
   matching its pattern. `m_26_14_rare_destination_country` lists
   `destination.as.organization.name` as an influencer, so on a cluster whose flow data carries
   GeoIP country but no ASN enrichment the start fails with
   `cannot retrieve field [destination.as.organization.name] because it has no mappings`, even
   though the detector itself only needs `destination.geo.country_name`. Any ECS flow source with
   ASN enrichment satisfies it. The two `v3_rare_process_by_host_*_ea` jobs need endpoint
   process-start events with Linux or Windows OS metadata. The corresponding wrapper rules produce
   zero alerts with no error until those sources are connected and the jobs have baselines.

   Allow a minimum 14-day baseline before step 9.

9. **Enable the seven behavioral rules and the meta-rule.**
   - `m_26_14-ml-cata-rare-auth-ip.ndjson`
   - `m_26_14-ml-cata-high-auth-failures.ndjson`
   - `m_26_14-ml-cata-ueba-login.ndjson`
   - `m_26_14-ml-cath-host-silent.ndjson`
   - `m_26_14-ml-cath-rare-process-windows.ndjson`
   - `m_26_14-ml-cath-rare-process-linux.ndjson`
   - `m_26_14-ml-catb-rare-country.ndjson`
   - `m_26_14-ml-readiness-degradation.ndjson`

   `m_26_14-ml-cath-host-silent` is the one ML rule that ships enabled; the rest need enabling
   after import.

---

## 7. Known limitations and open items

**Element 3 category derivation no longer needs an ingest pipeline.** Earlier revisions of this
guide listed the `m_26_14-alert-category-pipeline` as an unbuilt prerequisite for
`m_26_14-ml-element3-rule-silence`. That is obsolete. The pipeline ships with the pack, and the
element3 datafeed derives `m_26_14.category` itself at query time from `Appendix-B-<letter>` rule
tags. The remaining limitation is different: a category whose rules have never alerted cannot form
a partition, so the job stays quiet on a fresh cluster until multi-day alert history accumulates
per category. Day-zero per-category absence is owned by the Appendix B-K rule and the coverage
dashboard.

**Element 5 depends on the rollup transform, and the hash pipeline binding decides which streams
are covered.** The job models `hash_ratio` from the `m_26_14-hash-coverage-rollup` transform, which
reads `logs-*` and counts documents where `event.integrity.hashed` is true. That flag is set by the
`m_26_14-log-integrity-hash` pipeline, which is chained from `m_26_14-final` and bound as
`index.final_pipeline` through the `m_26_14-log-integrity-settings` component template. For streams
outside that template's coverage, apply the setting yourself:
```
PUT /logs-elasticsearch.audit-default/_settings
{"index": {"final_pipeline": "m_26_14-log-integrity-hash"}}
```
Existing documents can be re-hashed with `_update_by_query` and the pipeline parameter on the
backing index. New documents are hashed once the setting is in place. A dataset that has never been
hashed sits at a baseline ratio of 0 and will not anomaly; the hash-coverage dashboard is where
never-onboarded streams show up.

**Element 4 audit logging is not enabled by default.** Elasticsearch audit logging must be turned
on explicitly, and many production deployments leave it off because of the volume it generates.
Review that volume before enabling, and make sure the audit index is covered by an appropriate ILM
policy (`m_26_14-logs-l4-no-delete` is the right one at Level 4). On Elastic Cloud Hosted, the
audit stream `logs-elasticsearch.audit-*` is shipped for you once audit logging is on. A
failure-only audit configuration leaves this datafeed empty.

**Schema drift covers only streams running `m_26_14-final`.** `m_26_14.schema.top_level_keys` and
`m_26_14.schema.field_count` are stamped by that pipeline, so agency-wide drift coverage requires
binding a final pipeline to the other streams as well. That is a documented cluster-level option,
not a default.

**Module job IDs change between Elastic versions.** Elastic Security ML job IDs have changed across
generations (`*_ecs`, then `v3_*` at 8.4, then `_ea` in the 9.4 and later modules). The wrappers
bind the `_ea` generation through the `m_26_14_` prefix install. When upgrading the stack, verify
that the job IDs the behavioral rules bind still match the installed job IDs. An ML rule whose job
is missing or not running produces zero alerts with no error, and a multi-job rule requires every
listed job to exist.

**Rule lookback is wider than bucket span.** Earlier revisions of this guide claimed that a
`check_window` parameter on each rule must equal the job's `bucket_span`. No rule in `kibana/rule/`
carries a `check_window` field. What the rules do carry is an `interval` and a `from` lookback that
is several buckets wide: the element1 wrapper runs hourly over `now-6h` against a 1-hour bucket,
the DNS wrapper every 15 minutes over `now-2h` against a 15-minute bucket, and the meta-rule hourly
over `now-8h`. Treat those values as the shipped defaults and change them only with a reason.
Delayed-data tolerance is configured on the datafeed (`delayed_data_check_config`), not on the
rule, and the shipped windows are listed in section 4.

---

## 8. M-26-14 requirement mapping

| Requirement | ML jobs and rules | Maturity level |
|---|---|---|
| Element 1 §4 HWAM/SWAM coverage | `m_26_14-ml-element1-asset-coverage`, `m_26_14-ml-e1-coverage-drop` | L2+ |
| Element 1 / Appendix A HWAM, unmanaged devices | `m_26_14-ml-element1-new-network-device`, `m_26_14-appendixa-l-new-network-device` | L2+ |
| Element 2 log centralization | `m_26_14-ml-element2-ingestion-rate`, `m_26_14-ml-e2-ingestion-drop` | L2+ |
| Element 2 parser failure and schema drift (D-04, LRA 4.7/7.3) | `m_26_14-ml-schema-drift` job and wrapper rule | L2+ |
| Element 3 L4 ML detection §5(a) to §5(k) | `m_26_14-ml-element3-rule-silence`, `m_26_14-ml-catb-dns-entropy`, all seven behavioral rules | L4 |
| Element 4 §1 retention | `m_26_14-ml-element4-ilm-anomaly`, `m_26_14-ml-e4-retention-anomaly` | L3+ |
| Element 5 §3 hashing and integrity | `m_26_14-ml-element5-hash-coverage`, `m_26_14-ml-e5-hash-drop` | L3+ |
| Appendix B §5(b) network and C2 | `m_26_14-ml-catb-dns-entropy`, `m_26_14-ml-catb-dns-dga`, `m_26_14-ml-catb-rare-country` | L4 |
| Appendix B §5(g) IoC and DGA | `m_26_14-ml-catb-dns-entropy`, `m_26_14-ml-catb-dns-dga` | L4 |
| Appendix B §5(a) identity | `m_26_14-ml-cata-rare-auth-ip`, `m_26_14-ml-cata-high-auth-failures`, `m_26_14-ml-cata-ueba-login` | L4 |
| Appendix B §5(h) endpoint, anomalous activity | `m_26_14-ml-cath-rare-process-windows`, `m_26_14-ml-cath-rare-process-linux`, `m_26_14-ml-cath-host-silent` | L4 |
| Cross-element readiness degradation | `m_26_14-ml-readiness-degradation` (meta-rule, seven bound jobs) | L2 |
