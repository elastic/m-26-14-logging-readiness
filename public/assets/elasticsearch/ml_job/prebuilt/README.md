# Datafeeds for Prebuilt Elastic ML Jobs

The datafeeds in this directory target **prebuilt anomaly detection jobs that
ship with Elastic** (Security and platform ML modules) — the job definitions
themselves are *not* part of this compliance pack and are intentionally not
duplicated here:

| Datafeed | Prebuilt job | Module |
|---|---|---|
| `datafeed-auth_high_count_logon_fails_for_a_user.json` | `auth_high_count_logon_fails_for_a_user` | Security: Authentication |
| `datafeed-auth_rare_source_ip_for_a_user.json` | `auth_rare_source_ip_for_a_user` | Security: Authentication |
| `datafeed-network_traffic_to_rare_country.json` | `network_traffic_to_rare_country` | Security: Network |
| `datafeed-rare_process_by_host_linux_ecs.json` | `rare_process_by_host_linux_ecs` | Security: Linux |
| `datafeed-rare_process_by_host_windows_ecs.json` | `rare_process_by_host_windows_ecs` | Security: Windows |
| `datafeed-suspicious_login_activity.json` | `suspicious_login_activity` | Security: Authentication |
| `datafeed-v3_rare_process_by_host.json` | `v3_rare_process_by_host` | Security: Host |

## Why these are separated from the pack's own ML assets

The parent `ml_job/` directory contains the seven **custom** M-26-14 anomaly
detection jobs (`m_26_14-ml-*`) and their paired datafeeds. Those are first-class
compliance pack assets: the pack owns both the job definition and the datafeed.

For prebuilt jobs, the job definition is owned by Elastic and installed from
the ML module UI (or via the setup API) — only the *datafeed configuration*
(index patterns, query scope) is pack-specific. Shipping a bare datafeed as a
standalone "asset" was misleading: it cannot be deployed unless the matching
prebuilt job has already been created on the cluster.

## Deployment

1. Install the prebuilt jobs first — in Kibana: **Machine Learning →
   Anomaly Detection → Jobs → Create job → use a supplied configuration**, or
   via `POST kbn:/internal/ml/modules/setup/<module_id>`.
2. Then create these datafeeds: `scripts/deploy.py --only ml --prebuilt-datafeeds`
   (datafeed creation is skipped when the matching job is absent).
3. Start them with `--start-ml` or from the ML jobs list in Kibana.
