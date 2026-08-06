# Elastic Security ML Module Jobs (prefix-installed prerequisites)

Seven pack detection rules bind **Elastic Security ML module jobs** rather than
pack-owned custom jobs. The job definitions and datafeeds are owned by Elastic
and installed from the Security ML modules — the pack intentionally ships
neither, because module setup creates both together and keeps them aligned
with the running stack version.

The pack targets **Elastic Stack 9.4+**, which ships the `_ea`
(Entity Analytics) generation of these jobs. Install each module with the job
ID prefix `m_26_14_` so the pack's copies are isolated from any existing SOC
deployment of the same modules and so M-26-14 dashboards and meta-monitoring
rules can find them by stable ID.

| Pack rule | Bound job ID | Module |
|---|---|---|
| `m_26_14-ml-cata-high-auth-failures` | `m_26_14_auth_high_count_logon_fails_ea` | `security_auth` |
| `m_26_14-ml-cata-rare-auth-ip` | `m_26_14_auth_rare_source_ip_for_a_user_ea` | `security_auth` |
| `m_26_14-ml-cata-ueba-login` | `m_26_14_suspicious_login_activity_ea` | `security_auth` |
| `m_26_14-ml-cath-host-silent` | `m_26_14_low_count_events_for_a_host_name_ea` | `security_host` |
| `m_26_14-ml-catb-rare-country` | `m_26_14_rare_destination_country` | `security_network` |
| `m_26_14-ml-cath-rare-process-linux` | `m_26_14_v3_rare_process_by_host_linux_ea` | `security_linux_v3` |
| `m_26_14-ml-cath-rare-process-windows` | `m_26_14_v3_rare_process_by_host_windows_ea` | `security_windows_v3` |

Note: `rare_destination_country` (module `security_network`) predates the `_ea`
naming and keeps its historical ID; the OS-scoped `v3_*_ea` process jobs replace
the single cross-OS job earlier pack revisions referenced.

## Install

For each module (`security_auth`, `security_host`, `security_network`,
`security_linux_v3`, `security_windows_v3`), in Kibana Dev Tools:

```
POST kbn:/internal/ml/modules/setup/security_auth
{
  "prefix": "m_26_14_",
  "indexPatternName": "logs-*",
  "startDatafeed": true
}
```

Or via the UI: **Machine Learning > Anomaly Detection > Jobs > Create job >
select the module's supplied configuration**, and set the job ID prefix to
`m_26_14_`. Module setup creates and starts the paired datafeeds automatically.

Machine-learning rules whose job is absent or not running produce **zero alerts
with no error** — verify all seven jobs are `opened` with running datafeeds
before enabling the wrapper rules.

## OOTB alternative

Each of these seven signals also exists as an Elastic prebuilt detection rule
bound to the unprefixed module job. Agencies already running those prebuilts
can keep them and skip the prefix install; the pack wrappers exist so alerts
carry M-26-14 tags/metadata for the compliance dashboards. Run one or the
other per signal, not both, to avoid duplicate alerts.
