# Unknown-Device Triage — Automation Examples (ready-to-enable)

**Status:** DISABLED BY DEFAULT. Every snippet below is a *reversible* step that
the triage loop deliberately leaves human-gated. Enable individually, per agency
policy and AO sign-off. Nothing here runs automatically.

The closed loop ships as: **detect → classify → route → gate**. The classifier
(`m_26_14-asset-triage-classify`) tags each unknown device with a `disposition`,
a `recommended_action`, and an `auto_actionable` flag. `auto_actionable: true`
marks the two steps that are safe to automate because they are reversible —
**suppress** (decommissioned) and **draft-enroll** (new_uninventoried). The
destructive/security steps (IR isolate, allow-list, role/access changes, delete)
are never on this list.

This runbook shows *how* you would automate the reversible steps if you choose
to — and exactly where the human gate sits today.

---

## 0. Refresh the classification (the loop's heartbeat)

The classifier runs as a `_reindex` from the canonical store into the triage
ledger. Re-run on demand or on a schedule. This is read-only against
`m_26_14-assets` (never mutates it) and idempotent (`_id = asset.id`).

```console
POST _reindex
{
  "source": {
    "index": "m_26_14-assets",
    "query": { "term": { "asset.managed": false } }
  },
  "dest": {
    "index": "m_26_14-asset-triage",
    "pipeline": "m_26_14-asset-triage-classify"
  }
}
```

To also surface **compromised managed** assets (managed devices with correlated
high-severity alerts), widen the query:

```console
POST _reindex
{
  "source": {
    "index": "m_26_14-assets",
    "query": { "bool": { "should": [
      { "term": { "asset.managed": false } },
      { "exists": { "field": "host.name" } }
    ], "minimum_should_match": 1 } }
  },
  "dest": { "index": "m_26_14-asset-triage", "pipeline": "m_26_14-asset-triage-classify" }
}
```

Inspect the result before acting on it:

```console
GET m_26_14-asset-triage/_search
{
  "size": 50,
  "query": { "term": { "state": "proposed" } },
  "sort": [ { "m_26_14.triage.confidence": "desc" } ],
  "_source": ["asset.name","host.name","m_26_14.triage.disposition",
              "m_26_14.triage.recommended_action","m_26_14.triage.confidence",
              "m_26_14.triage.signals","m_26_14.triage.auto_actionable"]
}
```

---

## 1. Auto-suppress decommissioned devices  (`auto_actionable: true`)

**What it does:** moves a confirmed-retired device out of the *active* HWAM
view without deleting its record — reversible (flip `state` back). The device
stays fully auditable; it just stops counting against active posture.

**Gate today:** a human confirms the device is physically offline, then runs
this. To automate, schedule it — but only for `disposition: decommissioned`
**and** `confidence >= 0.85` (i.e. an explicit retired *status*, not just
staleness).

```console
POST m_26_14-asset-triage/_update_by_query
{
  "query": { "bool": { "filter": [
    { "term": { "m_26_14.triage.disposition": "decommissioned" } },
    { "range": { "m_26_14.triage.confidence": { "gte": 0.85 } } },
    { "term": { "state": "proposed" } }
  ] } },
  "script": {
    "source": "ctx._source.state = 'suppressed'; ctx._source.suppressed_at = params.now; ctx._source.suppressed_by = params.actor;",
    "params": { "now": "2026-06-29T00:00:00.000Z", "actor": "auto-suppress-policy" }
  }
}
```

> **Reverse it:** same `_update_by_query` with `state: 'routed'` and remove the
> `suppressed_*` fields. Nothing is destroyed.

Dashboards already filter active posture to `NOT state: suppressed` once you add
that clause to the HWAM Gaps panels.

---

## 2. Auto-draft an enrollment task  (`auto_actionable: true`)

**What it does:** for a strong-identity device classified `new_uninventoried`,
pre-creates the inventory row + a Fleet enrollment task so the operator only has
to *approve* it — it does **not** deploy an agent or grant anything.

**Gate today:** a human validates the device + owner, assigns
`asset.component` and criticality, then enrolls. To automate the *draft* (not
the enrollment), schedule this for `disposition: new_uninventoried` **and**
`confidence >= 0.85`.

```console
POST m_26_14-asset-enrollment-queue/_doc
{
  "@timestamp": "2026-06-29T00:00:00.000Z",
  "state": "draft",
  "asset": { "id": "<asset.id>", "name": "<asset.name>" },
  "host": { "name": "<host.name>" },
  "proposed": {
    "component": "REVIEW-REQUIRED",
    "criticality": "REVIEW-REQUIRED",
    "owner": "REVIEW-REQUIRED"
  },
  "source": "auto-draft-enroll-policy",
  "note": "Drafted from triage disposition new_uninventoried. Requires human approval before agent deployment."
}
```

The Fleet enrollment / agent install itself stays manual — that is the
irreversible boundary the loop will not cross automatically.

---

## 3. (Optional) Auto-open the routing Case

The `m_26_14-unknown-device-triage` workflow opens the Case manually per device.
To auto-open Cases for high-confidence rogue findings (so IR is paged without a
human first clicking), wire a Watcher or alerting rule on the ledger — but keep
**enforcement** (isolate/quarantine) gated inside the Case.

```console
PUT _watcher/watch/m_26_14-triage-rogue-autopage
{
  "trigger": { "schedule": { "interval": "5m" } },
  "input": { "search": { "request": {
    "indices": ["m_26_14-asset-triage"],
    "body": { "query": { "bool": { "filter": [
      { "term": { "m_26_14.triage.disposition": "rogue" } },
      { "term": { "state": "proposed" } }
    ] } } }
  } } },
  "condition": { "compare": { "ctx.payload.hits.total": { "gt": 0 } } },
  "actions": {
    "notify_ir": {
      "webhook": {
        "method": "POST",
        "url": "<YOUR-PAGER-OR-SLACK-WEBHOOK>",
        "body": "{{ctx.payload.hits.total}} rogue device(s) pending IR triage in m_26_14-asset-triage"
      }
    }
  }
}
```

> This *pages* on rogue findings. It still does not isolate anything — the
> quarantine decision lives in the Case, behind a human.

---

## Where the gate sits — summary

| Disposition | Reversible auto-step (this runbook) | Irreversible step — always human |
|-------------|-------------------------------------|----------------------------------|
| decommissioned | suppress from active view (§1) | delete record / release IP |
| new_uninventoried | draft enrollment row + task (§2) | deploy agent / grant access |
| rogue | auto-page IR (§3) | isolate VLAN / quarantine host |
| shadow_it | — | allow-list entry / removal (policy) |
| needs_review | — | identity determination |

Enable only what your policy allows. The default posture — classify + route,
gate all enforcement — ships ready to run with none of the above turned on.
