import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * IT Security Breach Scenarios Game — Plain React (No UI libraries)
 * ✅ Works in Vite + React (fresh project)
 * ✅ No shadcn/ui, no Tailwind, no framer-motion, no lucide-react
 * ✅ Branching scenarios + scoring + risk + optional timer + facilitator hints
 * ✅ Save/Resume via localStorage + Export JSON
 */

const STORAGE_KEY = "itsec_scenarios_game_v1";

const SCORING = { maxScore: 100, maxRisk: 100, minRisk: 0 };

const SCENARIOS = [
  {
    id: "start",
    title: "Morning Alert Flood",
    category: "Triage",
    tags: ["core"],
    narrative:
      "It’s 8:07 AM. You open your inbox and see:\n\n• 27 ‘Failed Login’ alerts from the same user account\n• A helpdesk ticket: ‘I can’t log in’\n• An endpoint alert: ‘Suspicious PowerShell execution’ on a finance laptop\n\nYou must choose what to do first.",
    hint:
      "Facilitator: Look for steps that reduce impact quickly (containment), preserve evidence, and communicate clearly.",
    options: [
      {
        label: "Contain first: disable the affected user account and isolate the finance endpoint",
        consequence:
          "You quickly reduce potential blast radius and stop further activity while you investigate.",
        scoreDelta: 14,
        riskDelta: -10,
        nextId: "ps-alert",
        bestPractice:
          "Containment comes before deep analysis when active compromise is suspected. Coordinate with helpdesk so the user isn’t left stranded.",
      },
      {
        label: "Investigate the failed logins only—maybe it’s just password mistypes",
        consequence:
          "The PowerShell activity continues for another 20 minutes. If it was malicious, you lost valuable time.",
        scoreDelta: -8,
        riskDelta: +12,
        nextId: "ps-alert",
        bestPractice:
          "Multiple concurrent signals should trigger containment. Validate benign causes, but don’t ignore endpoint telemetry.",
      },
      {
        label: "Call the user immediately and walk them through password reset",
        consequence:
          "You help the user, but you haven’t addressed the endpoint alert. The attacker (if present) retains access.",
        scoreDelta: -4,
        riskDelta: +8,
        nextId: "ps-alert",
        bestPractice:
          "User support matters, but suspected compromise needs containment and investigation in parallel.",
      },
      {
        label: "Wait for more alerts before acting",
        consequence:
          "More alerts arrive—including a new suspicious process. Your response is now reactive instead of proactive.",
        scoreDelta: -12,
        riskDelta: +18,
        nextId: "ps-alert",
        bestPractice:
          "Delays can increase business impact. Use incident thresholds to trigger action.",
      },
    ],
  },
  {
    id: "ps-alert",
    title: "Suspicious PowerShell on Finance Laptop",
    category: "Endpoint",
    tags: ["core", "ransomware"],
    narrative:
      "EDR flags PowerShell spawning from a Word document in Downloads. The laptop is still online. You suspect initial access via phishing.\n\nWhat’s your next move?",
    hint:
      "Facilitator: Good answers include network isolation, evidence capture, and scoping (who else got the email?).",
    options: [
      {
        label: "Isolate the device from the network via EDR and start remote triage (process tree, hash, command line)",
        consequence:
          "You cut off command-and-control while capturing essential evidence to understand what ran.",
        scoreDelta: 16,
        riskDelta: -12,
        nextId: "phish-scope",
        bestPractice:
          "Network isolation reduces spread risk; collect key forensic artifacts before reimaging.",
      },
      {
        label: "Reboot the laptop to stop whatever is running",
        consequence:
          "You may disrupt the malware, but you also risk losing volatile evidence that helps identify root cause.",
        scoreDelta: -6,
        riskDelta: +6,
        nextId: "phish-scope",
        bestPractice:
          "Avoid unnecessary changes until evidence is captured. Use EDR containment first.",
      },
      {
        label: "Immediately reimage the laptop and move on",
        consequence:
          "You restore the device quickly, but you haven’t learned how it happened or whether other devices are affected.",
        scoreDelta: -10,
        riskDelta: +10,
        nextId: "phish-scope",
        bestPractice:
          "Eradication without scoping risks reinfection or missing broader compromise.",
      },
      {
        label: "Tell the user to keep working but avoid opening attachments",
        consequence:
          "If active compromise exists, the attacker continues to operate. Business impact could escalate.",
        scoreDelta: -14,
        riskDelta: +20,
        nextId: "phish-scope",
        bestPractice:
          "In suspected compromise, do not keep the system in production without containment.",
      },
    ],
  },
  {
    id: "phish-scope",
    title: "Phishing Email Scope",
    category: "Email",
    tags: ["core", "phishing"],
    narrative:
      "You find the Word document came from an email: ‘Updated Payment Instructions’.\n\nYou need to scope: who else received it and whether anyone clicked. What do you do?",
    hint:
      "Facilitator: Look for message trace, quarantine, search & purge, and user comms.",
    options: [
      {
        label: "Use Microsoft 365 message trace/content search to identify recipients and purge/quarantine the email across mailboxes",
        consequence:
          "You rapidly reduce further clicks and collect a list of potentially impacted users.",
        scoreDelta: 18,
        riskDelta: -14,
        nextId: "mfa-fatigue",
        bestPractice:
          "Search-and-purge plus recipient identification is core to phishing response.",
      },
      {
        label: "Send a company-wide email warning everyone (without scoping) to delete it",
        consequence:
          "Some users comply, but others miss it. You also lose precision about who received and interacted with the email.",
        scoreDelta: -2,
        riskDelta: +6,
        nextId: "mfa-fatigue",
        bestPractice:
          "Communicate—yes—but pair it with technical controls to remove the message and scope recipients.",
      },
      {
        label: "Ask finance to forward the email to you and then manually check a few inboxes",
        consequence:
          "Manual checks are slow and incomplete; the message remains in other mailboxes.",
        scoreDelta: -8,
        riskDelta: +10,
        nextId: "mfa-fatigue",
        bestPractice:
          "Prefer centralized tooling to scope and remove malicious emails at scale.",
      },
      {
        label: "Ignore email scope and focus only on the single endpoint",
        consequence:
          "You risk missing additional compromises from other recipients who clicked.",
        scoreDelta: -14,
        riskDelta: +18,
        nextId: "mfa-fatigue",
        bestPractice:
          "Phishing is rarely single-host. Always scope laterally.",
      },
    ],
  },
  {
    id: "mfa-fatigue",
    title: "MFA Push Fatigue",
    category: "Identity",
    tags: ["core", "identity"],
    narrative:
      "A manager reports repeated MFA push notifications overnight. The sign-in logs show attempts from unfamiliar locations.\n\nWhat’s the best response?",
    hint:
      "Facilitator: Strong actions: block sign-in, reset credentials, revoke sessions, and educate user on MFA fatigue.",
    options: [
      {
        label: "Block sign-in, reset password, revoke refresh tokens/sessions, and verify the user’s devices",
        consequence:
          "You stop the attacks and ensure existing sessions can’t be reused.",
        scoreDelta: 18,
        riskDelta: -14,
        nextId: "bec-wire",
        bestPractice:
          "Revoke sessions + credential reset reduces risk if a token/password was captured.",
      },
      {
        label: "Tell the user to just keep denying MFA prompts",
        consequence:
          "The user may eventually approve by mistake. The attacker keeps trying.",
        scoreDelta: -8,
        riskDelta: +14,
        nextId: "bec-wire",
        bestPractice:
          "MFA fatigue attacks exploit annoyance. Add technical controls and user guidance.",
      },
      {
        label: "Turn off MFA temporarily so the user can work",
        consequence:
          "You remove a critical control during active attack.",
        scoreDelta: -18,
        riskDelta: +24,
        nextId: "bec-wire",
        bestPractice:
          "Avoid weakening identity controls during incidents. Use alternative secure methods.",
      },
      {
        label: "Do nothing because the login attempts failed",
        consequence:
          "Failed attempts can still indicate credential compromise and might succeed later.",
        scoreDelta: -12,
        riskDelta: +16,
        nextId: "bec-wire",
        bestPractice:
          "Treat repeated attempts as an incident indicator and investigate.",
      },
    ],
  },
  {
    id: "bec-wire",
    title: "Business Email Compromise: Wire Change",
    category: "Fraud",
    tags: ["core", "bec"],
    narrative:
      "Accounts payable receives an email: ‘Vendor bank account changed—please wire to new details.’\n\nThe email looks legitimate but the tone is slightly off. What should your team do?",
    hint:
      "Facilitator: Out-of-band verification and payment holds are key. Don’t reply to the email thread.",
    options: [
      {
        label:
          "Place a payment hold and verify using a known-good phone number (out-of-band) before changing banking info",
        consequence:
          "You avoid a potential fraudulent transfer and follow strong verification controls.",
        scoreDelta: 18,
        riskDelta: -12,
        nextId: "lost-laptop",
        bestPractice:
          "Out-of-band verification prevents attackers from controlling the conversation.",
      },
      {
        label: "Reply to the email asking for confirmation and proceed if they respond",
        consequence:
          "If the mailbox/thread is compromised, the attacker will confirm and you may wire funds incorrectly.",
        scoreDelta: -10,
        riskDelta: +16,
        nextId: "lost-laptop",
        bestPractice:
          "Never verify sensitive changes within the same potentially compromised channel.",
      },
      {
        label: "Proceed because the sender address matches the vendor",
        consequence:
          "Sender addresses can be spoofed or compromised. High fraud risk.",
        scoreDelta: -16,
        riskDelta: +22,
        nextId: "lost-laptop",
        bestPractice:
          "Identity verification requires more than matching an address.",
      },
      {
        label: "Ask IT to check SPF/DKIM and then proceed",
        consequence:
          "Email authentication checks help, but they don’t guarantee the vendor isn’t compromised. You still need out-of-band verification.",
        scoreDelta: 2,
        riskDelta: +4,
        nextId: "lost-laptop",
        bestPractice:
          "Use SPF/DKIM/DMARC signals as inputs, not sole decision factors.",
      },
    ],
  },
  {
    id: "lost-laptop",
    title: "Lost Laptop in the Field",
    category: "Device",
    tags: ["core", "device"],
    narrative:
      "A field tech reports their laptop was left at a gas station. It may contain cached email and access to internal tools.\n\nWhat’s your best immediate action?",
    hint:
      "Facilitator: Remote lock/wipe, revoke sessions, disable device, file incident report.",
    options: [
      {
        label: "Mark device as lost in MDM, initiate remote lock/wipe, and revoke user sessions/tokens",
        consequence:
          "You reduce the chance of data exposure and block access from the lost device.",
        scoreDelta: 18,
        riskDelta: -16,
        nextId: "usb-drop",
        bestPractice:
          "MDM actions + session revocation address both device and identity risk.",
      },
      {
        label: "Wait 24 hours to see if it turns up",
        consequence:
          "You lose time during which an adversary could access data or impersonate the user.",
        scoreDelta: -14,
        riskDelta: +18,
        nextId: "usb-drop",
        bestPractice:
          "Lost devices should be treated as potential data exposure immediately.",
      },
      {
        label: "Change the user’s password only",
        consequence:
          "Helpful, but if tokens/sessions remain valid or device access is local, risk persists.",
        scoreDelta: -2,
        riskDelta: +8,
        nextId: "usb-drop",
        bestPractice:
          "Passwords are only one control—revoke sessions and use MDM actions too.",
      },
      {
        label: "Have the user call the gas station and handle it without IT",
        consequence:
          "Recovery might happen, but security controls are delayed and inconsistent.",
        scoreDelta: -10,
        riskDelta: +14,
        nextId: "usb-drop",
        bestPractice:
          "Parallelize recovery attempts with security controls.",
      },
    ],
  },
  {
    id: "usb-drop",
    title: "USB Drop Attack",
    category: "Physical",
    tags: ["core", "awareness"],
    narrative:
      "A receptionist finds a USB drive labeled ‘Payroll Q2’ in the parking lot and asks if they should plug it in to see who it belongs to.\n\nHow do you respond?",
    hint:
      "Facilitator: Policy + safe handling. Use approved process for unknown media.",
    options: [
      {
        label:
          "Tell them NOT to plug it in; collect it and process via an approved safe procedure (e.g., dedicated analysis machine/IT handling)",
        consequence:
          "You avoid potential malware execution and follow safe media handling.",
        scoreDelta: 16,
        riskDelta: -12,
        nextId: "vendor-remote",
        bestPractice:
          "Unknown media should never be inserted into production devices.",
      },
      {
        label: "Have them plug it into their PC but ‘don’t open anything’",
        consequence:
          "Merely inserting the device can trigger malicious behavior depending on system configuration.",
        scoreDelta: -16,
        riskDelta: +22,
        nextId: "vendor-remote",
        bestPractice:
          "Minimize exposure: do not insert unknown media into user workstations.",
      },
      {
        label: "Ignore it and throw it away",
        consequence:
          "You avoid direct risk, but you miss an opportunity to reinforce training and to check if targeted activity is occurring.",
        scoreDelta: 0,
        riskDelta: +2,
        nextId: "vendor-remote",
        bestPractice:
          "Use incidents as teachable moments; document and follow policy.",
      },
      {
        label: "Email a photo of the USB to the whole company asking who lost it",
        consequence:
          "You increase curiosity and the chance someone else plugs in a similar device later.",
        scoreDelta: -6,
        riskDelta: +10,
        nextId: "vendor-remote",
        bestPractice:
          "Avoid broadcast messages that could encourage risky behavior.",
      },
    ],
  },
  {
    id: "vendor-remote",
    title: "Vendor Requests Remote Access",
    category: "Third-Party",
    tags: ["core", "vendor"],
    narrative:
      "A vendor says they need immediate remote access to troubleshoot an urgent issue and asks you to install a remote tool that bypasses your standard process.\n\nWhat do you do?",
    hint:
      "Facilitator: Enforce vendor access policy, approvals, least privilege, time-bound access, logging.",
    options: [
      {
        label:
          "Require the standard approved remote access method (time-bound, least privilege, logged) and confirm the request via a known vendor contact",
        consequence:
          "You keep controls intact and reduce third-party risk while still enabling support.",
        scoreDelta: 18,
        riskDelta: -12,
        nextId: "ransom-note",
        bestPractice:
          "Third-party access is a common breach vector—use policy, approvals, and monitored access.",
      },
      {
        label: "Install the tool because the issue is urgent",
        consequence:
          "You introduce unmanaged remote access and increase the likelihood of compromise.",
        scoreDelta: -16,
        riskDelta: +22,
        nextId: "ransom-note",
        bestPractice:
          "Urgency is often used as pressure. Stick to approved secure access methods.",
      },
      {
        label: "Refuse any access and tell them to email instructions",
        consequence:
          "You reduce immediate risk but may delay operations. A better approach is secure, monitored access.",
        scoreDelta: 4,
        riskDelta: -2,
        nextId: "ransom-note",
        bestPractice:
          "Balance availability with security using controlled access and logging.",
      },
      {
        label: "Share your admin credentials so they can ‘do it faster’",
        consequence:
          "This is a severe violation and would likely lead to compromise and audit failure.",
        scoreDelta: -30,
        riskDelta: +35,
        nextId: "ransom-note",
        bestPractice:
          "Never share credentials. Use delegated, audited access.",
      },
    ],
  },
  {
    id: "ransom-note",
    title: "Ransomware Note Appears",
    category: "Ransomware",
    tags: ["core", "ransomware"],
    narrative:
      "A user reports files suddenly have strange extensions and a note appears demanding payment.\n\nWhat is the best immediate incident response step?",
    hint:
      "Facilitator: Contain spread; isolate systems; notify IR; preserve evidence; validate backups.",
    options: [
      {
        label:
          "Immediately isolate affected systems/network segments and activate the incident response plan (IR team, comms, legal/leadership as needed)",
        consequence:
          "Containment reduces spread and triggers coordinated response.",
        scoreDelta: 20,
        riskDelta: -16,
        nextId: "post-incident",
        bestPractice:
          "Stop the bleeding first. Coordinate response and preserve evidence.",
      },
      {
        label: "Pay the ransom quickly to get files back",
        consequence:
          "Payment doesn’t guarantee recovery and can invite further targeting.",
        scoreDelta: -18,
        riskDelta: +22,
        nextId: "post-incident",
        bestPractice:
          "Decisions about ransom involve leadership/legal; focus on containment and recovery options first.",
      },
      {
        label: "Start restoring from backup immediately without isolating",
        consequence:
          "Restores can be reinfected if the malware is still present.",
        scoreDelta: -10,
        riskDelta: +16,
        nextId: "post-incident",
        bestPractice:
          "Contain and eradicate before restoring.",
      },
      {
        label: "Tell users to keep working and ‘avoid opening files’",
        consequence:
          "Ransomware can spread quickly. Delaying containment increases damage.",
        scoreDelta: -20,
        riskDelta: +28,
        nextId: "post-incident",
        bestPractice:
          "Treat ransomware as a high-severity incident requiring immediate containment.",
      },
    ],
  },
  {
    id: "post-incident",
    title: "Post-Incident Actions",
    category: "Recovery",
    tags: ["core"],
    narrative:
      "The incident is contained. Now you need to reduce recurrence and improve readiness.\n\nWhich set of actions is most appropriate?",
    hint:
      "Facilitator: Lessons learned, patching, MFA hardening, EDR tuning, backups testing, user training.",
    options: [
      {
        label:
          "Run a lessons-learned review, complete root-cause analysis, patch/harden, tune detections, validate backups, and update training/playbooks",
        consequence:
          "You improve resilience and reduce the chance of repeat incidents.",
        scoreDelta: 18,
        riskDelta: -10,
        nextId: null,
        bestPractice:
          "Post-incident improvements are where long-term risk drops.",
      },
      {
        label: "Move on—there isn’t time for a retrospective",
        consequence:
          "You risk repeating the same incident pattern.",
        scoreDelta: -10,
        riskDelta: +12,
        nextId: null,
        bestPractice:
          "Retrospectives create measurable improvements and help justify investments.",
      },
      {
        label: "Only reimage the impacted laptop and call it done",
        consequence:
          "You treat symptoms but not causes; adversary techniques remain unaddressed.",
        scoreDelta: -8,
        riskDelta: +10,
        nextId: null,
        bestPractice:
          "Systemic fixes beat one-off remediations.",
      },
      {
        label: "Send a stern warning email to staff and rely on people being more careful",
        consequence:
          "Awareness helps, but technical controls and process improvements are needed to prevent recurrence.",
        scoreDelta: -2,
        riskDelta: +6,
        nextId: null,
        bestPractice:
          "Combine training with technical controls (MFA, EDR, email filtering, least privilege).",
      },
    ],
  },
];

// -------------------- helpers --------------------
const scenarioMap = new Map(SCENARIOS.map((s) => [s.id, s]));

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function nowISO() {
  return new Date().toISOString();
}

function downloadJSON(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function computeGrade(score, risk) {
  if (score >= 80 && risk <= 25) return { label: "Excellent", color: "#059669" };
  if (score >= 65 && risk <= 40) return { label: "Strong", color: "#16a34a" };
  if (score >= 50 && risk <= 55) return { label: "Good", color: "#ca8a04" };
  if (score >= 35 && risk <= 70) return { label: "Needs Work", color: "#ea580c" };
  return { label: "High Risk", color: "#dc2626" };
}

function uniq(arr) {
  return Array.from(new Set(arr));
}

function getAllTags() {
  const tags = [];
  for (const s of SCENARIOS) (s.tags || []).forEach((t) => tags.push(t));
  return uniq(tags).sort();
}

function filterScenarioGraph(startId, allowedTags) {
  const allowed = new Set(allowedTags);
  const visited = new Set();
  const queue = [startId];
  const nodes = new Map();

  while (queue.length) {
    const id = queue.shift();
    if (visited.has(id)) continue;
    visited.add(id);

    const node = scenarioMap.get(id);
    if (!node) continue;

    const tags = node.tags || [];
    const ok = tags.some((t) => allowed.has(t)) || id === startId;
    if (ok) nodes.set(id, node);

    for (const opt of node.options || []) {
      if (opt.nextId) queue.push(opt.nextId);
    }
  }

  return nodes;
}

function useInterval(callback, delay) {
  const savedCallback = useRef();
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;
    const id = setInterval(() => savedCallback.current?.(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

// -------------------- tiny styling helpers --------------------
const styles = {
  page: { fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial", background: "#f8fafc", minHeight: "100vh", padding: 16 },
  container: { maxWidth: 980, margin: "0 auto" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" },
  logo: { width: 44, height: 44, borderRadius: 16, background: "#0f172a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" },
  h1: { margin: 0, fontSize: 20 },
  sub: { fontSize: 13, color: "#475569", marginTop: 2 },
  row: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
  card: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, boxShadow: "0 1px 2px rgba(15,23,42,.06)" },
  cardHeader: { padding: 16, borderBottom: "1px solid #eef2f7" },
  cardBody: { padding: 16 },
  btn: { padding: "10px 12px", borderRadius: 14, border: "1px solid #0f172a", background: "#0f172a", color: "#fff", fontWeight: 900, cursor: "pointer" },
  btnOutline: { padding: "10px 12px", borderRadius: 14, border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a", fontWeight: 900, cursor: "pointer" },
  disabled: { opacity: 0.55, cursor: "not-allowed" },
  pill: { display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 999, border: "1px solid #e2e8f0", background: "#fff", fontSize: 13 },
  tabBar: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 },
  tab: { padding: "10px 12px", borderRadius: 14, border: "1px solid #cbd5e1", background: "#fff", fontWeight: 900, cursor: "pointer" },
  tabActive: { background: "#0f172a", color: "#fff", borderColor: "#0f172a" },
  input: { width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #cbd5e1" },
  select: { width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #cbd5e1", background: "#fff" },
};

function Pill({ label, value, tone }) {
  const bg = tone === "good" ? "#f0fdf4" : tone === "warn" ? "#fffbeb" : tone === "bad" ? "#fff1f2" : "#fff";
  const border = tone === "good" ? "#bbf7d0" : tone === "warn" ? "#fde68a" : tone === "bad" ? "#fecaca" : "#e2e8f0";
  return (
    <span style={{ ...styles.pill, background: bg, borderColor: border }}>
      <span style={{ color: "#475569" }}>{label}</span>
      <span style={{ fontWeight: 900 }}>{value}</span>
    </span>
  );
}

function Card({ title, subtitle, actions, children }) {
  return (
    <div style={styles.card}>
      {(title || subtitle || actions) && (
        <div style={styles.cardHeader}>
          <div style={{ display: "flex", gap: 12, justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" }}>
            <div>
              {title ? <div style={{ fontWeight: 900 }}>{title}</div> : null}
              {subtitle ? <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{subtitle}</div> : null}
            </div>
            {actions ? <div style={styles.row}>{actions}</div> : null}
          </div>
        </div>
      )}
      <div style={styles.cardBody}>{children}</div>
    </div>
  );
}

function Button({ outline, disabled, onClick, children }) {
  const base = outline ? styles.btnOutline : styles.btn;
  return (
    <button
      type="button"
      style={{ ...base, ...(disabled ? styles.disabled : null) }}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
    >
      {children}
    </button>
  );
}

export default function App() {
  const allTags = useMemo(() => getAllTags(), []);

  const [mode, setMode] = useState("player");
  const [track, setTrack] = useState("core");
  const [timed, setTimed] = useState(false);
  const [secondsPerQuestion, setSecondsPerQuestion] = useState(45);

  const [playerName, setPlayerName] = useState("");
  const [orgName, setOrgName] = useState("");

  const [started, setStarted] = useState(false);
  const [currentId, setCurrentId] = useState("start");
  const [score, setScore] = useState(50);
  const [risk, setRisk] = useState(50);
  const [history, setHistory] = useState([]);
  const [questionIndex, setQuestionIndex] = useState(1);
  const [timeLeft, setTimeLeft] = useState(secondsPerQuestion);
  const [showConsequence, setShowConsequence] = useState(null);
  const [resumeAvailable, setResumeAvailable] = useState(false);

  const grade = useMemo(() => computeGrade(score, risk), [score, risk]);

  const filteredGraph = useMemo(() => filterScenarioGraph("start", track ? [track] : ["core"]), [track]);
  const current = filteredGraph.get(currentId) || scenarioMap.get(currentId);
  const totalQuestionsEstimate = useMemo(() => filteredGraph.size, [filteredGraph]);

  useEffect(() => {
    if (!started) return;
    setTimeLeft(secondsPerQuestion);
  }, [currentId, secondsPerQuestion, started]);

  useInterval(
    () => {
      if (!started || !timed) return;
      if (showConsequence) return;

      setTimeLeft((t) => {
        if (t <= 1) {
          // Auto pick worst-ish option if time runs out
          const opts = current?.options || [];
          if (opts.length) {
            const worst = [...opts].sort((a, b) => {
              const aPenalty = (a.riskDelta ?? 0) * 2 - (a.scoreDelta ?? 0);
              const bPenalty = (b.riskDelta ?? 0) * 2 - (b.scoreDelta ?? 0);
              return bPenalty - aPenalty;
            })[0];
            chooseOption(worst, { auto: true });
          }
          return secondsPerQuestion;
        }
        return t - 1;
      });
    },
    timed ? 1000 : null
  );

  useEffect(() => {
    const saved = loadSaved();
    if (saved?.started && saved?.currentId) setResumeAvailable(true);
  }, []);

  useEffect(() => {
    saveState({
      savedAt: nowISO(),
      started,
      currentId,
      score,
      risk,
      history,
      questionIndex,
      settings: { mode, track, timed, secondsPerQuestion, playerName, orgName },
    });
  }, [started, currentId, score, risk, history, questionIndex, mode, track, timed, secondsPerQuestion, playerName, orgName]);

  function resetAll() {
    setStarted(false);
    setCurrentId("start");
    setScore(50);
    setRisk(50);
    setHistory([]);
    setQuestionIndex(1);
    setTimeLeft(secondsPerQuestion);
    setShowConsequence(null);
  }

  function resume() {
    const saved = loadSaved();
    if (!saved) return;

    setMode(saved.settings?.mode ?? "player");
    setTrack(saved.settings?.track ?? "core");
    setTimed(saved.settings?.timed ?? false);
    setSecondsPerQuestion(saved.settings?.secondsPerQuestion ?? 45);
    setPlayerName(saved.settings?.playerName ?? "");
    setOrgName(saved.settings?.orgName ?? "");

    setStarted(saved.started ?? false);
    setCurrentId(saved.currentId ?? "start");
    setScore(saved.score ?? 50);
    setRisk(saved.risk ?? 50);
    setHistory(saved.history ?? []);
    setQuestionIndex(saved.questionIndex ?? 1);
    setShowConsequence(null);
    setResumeAvailable(false);
  }

  function startGame() {
    resetAll();
    setStarted(true);
  }

  function chooseOption(option, meta = {}) {
    if (!option || !current) return;

    const newScore = clamp(score + (option.scoreDelta ?? 0), 0, SCORING.maxScore);
    const newRisk = clamp(risk + (option.riskDelta ?? 0), SCORING.minRisk, SCORING.maxRisk);

    const event = {
      ts: nowISO(),
      nodeId: current.id,
      title: current.title,
      category: current.category,
      choice: option.label,
      consequence: option.consequence,
      bestPractice: option.bestPractice,
      scoreDelta: option.scoreDelta ?? 0,
      riskDelta: option.riskDelta ?? 0,
      scoreAfter: newScore,
      riskAfter: newRisk,
      autoSelected: !!meta.auto,
      timeLeft: timed ? timeLeft : null,
    };

    setScore(newScore);
    setRisk(newRisk);
    setHistory((h) => [...h, event]);

    setShowConsequence({ option, event, node: current, end: option.nextId == null });
  }

  function nextAfterConsequence() {
    if (!showConsequence) return;
    const nextId = showConsequence.option?.nextId;
    setShowConsequence(null);

    if (nextId) {
      setCurrentId(nextId);
      setQuestionIndex((i) => i + 1);
    } else {
      setStarted(false);
    }
  }

  const progress = useMemo(() => {
    const denom = Math.max(1, totalQuestionsEstimate - 1);
    return clamp(Math.round(((questionIndex - 1) / denom) * 100), 0, 100);
  }, [questionIndex, totalQuestionsEstimate]);

  const toneForRisk = risk <= 25 ? "good" : risk <= 50 ? "warn" : "bad";
  const toneForScore = score >= 75 ? "good" : score >= 50 ? "warn" : "bad";

  const summary = useMemo(() => {
    const byCategory = {};
    for (const e of history) {
      const k = e.category || "Other";
      if (!byCategory[k]) byCategory[k] = { count: 0, scoreDelta: 0, riskDelta: 0 };
      byCategory[k].count += 1;
      byCategory[k].scoreDelta += e.scoreDelta;
      byCategory[k].riskDelta += e.riskDelta;
    }
    const categories = Object.entries(byCategory)
      .map(([k, v]) => ({ category: k, ...v }))
      .sort((a, b) => b.count - a.count);

    const strengths = history
      .filter((e) => e.scoreDelta >= 14 && e.riskDelta <= -8)
      .slice(-5)
      .map((e) => `✅ ${e.title}: ${e.choice}`);

    const gaps = history
      .filter((e) => e.scoreDelta <= -10 || e.riskDelta >= 16)
      .slice(-5)
      .map((e) => `⚠️ ${e.title}: ${e.choice}`);

    return { categories, strengths, gaps };
  }, [history]);

  function exportResults() {
    const payload = {
      exportedAt: nowISO(),
      player: { name: playerName || null, org: orgName || null },
      settings: { mode, track, timed, secondsPerQuestion },
      final: { score, risk, grade: grade.label },
      history,
      notes:
        "This export is for training review. It intentionally contains no exploit instructions, only response best practices.",
    };
    const safeName = (playerName || "player")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    downloadJSON(`it-security-scenarios-${safeName || "player"}-${Date.now()}.json`, payload);
  }

  const [tab, setTab] = useState("play");

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={styles.logo}>🛡️</div>
            <div>
              <h1 style={styles.h1}>IT Security Breach Scenarios</h1>
              <div style={styles.sub}>Choose responses. Manage risk. Learn best practices.</div>
            </div>
          </div>

          <div style={styles.row}>
            <Pill label="Score" value={`${score}/100`} tone={toneForScore} />
            <Pill label="Risk" value={`${risk}/100`} tone={toneForRisk} />
            {timed && started ? <Pill label="Time" value={`${timeLeft}s`} tone={timeLeft <= 10 ? "bad" : "warn"} /> : null}
            <span style={{ padding: "6px 10px", borderRadius: 999, background: grade.color, color: "#fff", fontSize: 12, fontWeight: 900 }}>
              {grade.label}
            </span>
          </div>
        </div>

        <div style={{ height: 12 }} />

        {/* Main */}
        <Card
          title="Progress"
          subtitle={started ? `Scenario ${questionIndex} of ~${totalQuestionsEstimate}` : "Set options, then start or resume."}
          actions={
            <>
              <Button outline onClick={resetAll}>🔄 Reset</Button>
              <Button outline onClick={exportResults} disabled={history.length === 0}>⬇️ Export</Button>
            </>
          }
        >
          <progress value={started ? progress : 0} max={100} style={{ width: "100%", height: 10 }} />

          <div style={{ height: 12 }} />

          {/* Tabs */}
          <div style={styles.tabBar}>
            <button type="button" onClick={() => setTab("play")} style={{ ...styles.tab, ...(tab === "play" ? styles.tabActive : null) }}>
              Play
            </button>
            <button type="button" onClick={() => setTab("settings")} style={{ ...styles.tab, ...(tab === "settings" ? styles.tabActive : null) }}>
              Settings
            </button>
            <button type="button" onClick={() => setTab("review")} style={{ ...styles.tab, ...(tab === "review" ? styles.tabActive : null) }}>
              Review
            </button>
          </div>

          {/* PLAY TAB */}
          {tab === "play" ? (
            <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
              {!started && !showConsequence ? (
                <Card title="Ready to run a scenario?" subtitle="Start a new run, or resume your last saved session.">
                  <div style={{ display: "grid", gap: 10 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 6 }}>Player name (optional)</div>
                        <input style={styles.input} value={playerName} onChange={(e) => setPlayerName(e.target.value)} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 6 }}>Org/Branch (optional)</div>
                        <input style={styles.input} value={orgName} onChange={(e) => setOrgName(e.target.value)} />
                      </div>
                    </div>

                    <div style={styles.row}>
                      <Button onClick={startGame}>▶️ Start New</Button>
                      <Button outline onClick={resume} disabled={!resumeAvailable}>⤵️ Resume Saved</Button>
                    </div>

                    <div style={{ fontSize: 13, color: "#64748b" }}>
                      Tip: Use Export to save results as JSON.
                    </div>
                  </div>
                </Card>
              ) : null}

              {started && current ? (
                <Card title={current.title} subtitle={`${current.category || "Scenario"} • Track: ${track}`}>
                  <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.4 }}>{current.narrative}</div>

                  {mode === "facilitator" && current.hint ? (
                    <div style={{ marginTop: 12, padding: 12, borderRadius: 14, background: "#eff6ff", border: "1px solid #bfdbfe" }}>
                      <div style={{ fontWeight: 900, marginBottom: 6 }}>ℹ️ Facilitator Hint</div>
                      <div style={{ whiteSpace: "pre-wrap" }}>{current.hint}</div>
                    </div>
                  ) : null}

                  <div style={{ height: 12 }} />

                  {!showConsequence ? (
                    <div style={{ display: "grid", gap: 10 }}>
                      {(current.options || []).map((opt, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => chooseOption(opt)}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            padding: 12,
                            borderRadius: 14,
                            border: "1px solid #cbd5e1",
                            background: "#fff",
                            cursor: "pointer",
                            lineHeight: 1.3,
                          }}
                        >
                          <div style={{ fontWeight: 900 }}>{opt.label}</div>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </Card>
              ) : null}

              {showConsequence ? (
                <Card title={showConsequence.end ? "End of Run" : "Outcome"} subtitle={showConsequence.option?.label}>
                  <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.4 }}>{showConsequence.event?.consequence}</div>

                  <div style={{ height: 10 }} />
                  <div style={styles.row}>
                    <Pill
                      label="Score Δ"
                      value={`${showConsequence.event?.scoreDelta ?? 0}`}
                      tone={(showConsequence.event?.scoreDelta ?? 0) >= 0 ? "good" : "bad"}
                    />
                    <Pill
                      label="Risk Δ"
                      value={`${showConsequence.event?.riskDelta ?? 0}`}
                      tone={(showConsequence.event?.riskDelta ?? 0) <= 0 ? "good" : "bad"}
                    />
                  </div>

                  {showConsequence.event?.bestPractice ? (
                    <div style={{ marginTop: 12, padding: 12, borderRadius: 14, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                      <div style={{ fontWeight: 900, marginBottom: 6 }}>✅ Best Practice</div>
                      <div style={{ whiteSpace: "pre-wrap" }}>{showConsequence.event.bestPractice}</div>
                    </div>
                  ) : null}

                  <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Button onClick={nextAfterConsequence}>{showConsequence.end ? "Finish" : "Next"}</Button>
                    <Button outline onClick={resetAll}>Restart</Button>
                  </div>
                </Card>
              ) : null}
            </div>
          ) : null}

          {/* SETTINGS TAB */}
          {tab === "settings" ? (
            <div style={{ marginTop: 12, display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
              <Card title="Game Options" subtitle="Adjust how the scenario run behaves.">
                <div style={{ display: "grid", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 6 }}>Mode</div>
                    <select value={mode} onChange={(e) => setMode(e.target.value)} style={styles.select}>
                      <option value="player">Player</option>
                      <option value="facilitator">Facilitator</option>
                    </select>
                  </div>

                  <div>
                    <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 6 }}>Track</div>
                    <select value={track} onChange={(e) => setTrack(e.target.value)} style={styles.select}>
                      {allTags.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <div style={{ fontSize: 13, color: "#64748b", marginTop: 6 }}>
                      Tip: add tags to scenarios to create more tracks.
                    </div>
                  </div>

                  <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <input type="checkbox" checked={timed} onChange={(e) => setTimed(e.target.checked)} />
                    <span style={{ fontWeight: 900 }}>Timed mode</span>
                  </label>

                  <div>
                    <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 6 }}>Seconds per question</div>
                    <input
                      type="number"
                      min={10}
                      max={300}
                      value={secondsPerQuestion}
                      onChange={(e) => setSecondsPerQuestion(Number(e.target.value || 45))}
                      style={styles.input}
                    />
                  </div>
                </div>
              </Card>

              <Card title="Player Info" subtitle="Optional, used in export filename.">
                <div style={{ display: "grid", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 6 }}>Player name</div>
                    <input style={styles.input} value={playerName} onChange={(e) => setPlayerName(e.target.value)} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 6 }}>Org/Branch</div>
                    <input style={styles.input} value={orgName} onChange={(e) => setOrgName(e.target.value)} />
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Button outline onClick={resetAll}>Reset Run</Button>
                    <Button
                      outline
                      onClick={() => {
                        localStorage.removeItem(STORAGE_KEY);
                        setResumeAvailable(false);
                      }}
                    >
                      Clear Saved Session
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          ) : null}

          {/* REVIEW TAB */}
          {tab === "review" ? (
            <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
              <Card title="Summary" subtitle="Highlights from this run.">
                {history.length === 0 ? (
                  <div style={{ color: "#64748b" }}>No history yet. Play a run to generate a review.</div>
                ) : (
                  <div style={{ display: "grid", gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 900, marginBottom: 6 }}>Strengths</div>
                      {(summary.strengths.length ? summary.strengths : ["(none yet)"]).map((s, i) => (
                        <div key={i} style={{ fontSize: 13, marginBottom: 4 }}>
                          {s}
                        </div>
                      ))}
                    </div>

                    <div>
                      <div style={{ fontWeight: 900, marginBottom: 6 }}>Gaps / Risky choices</div>
                      {(summary.gaps.length ? summary.gaps : ["(none yet)"]).map((s, i) => (
                        <div key={i} style={{ fontSize: 13, marginBottom: 4 }}>
                          {s}
                        </div>
                      ))}
                    </div>

                    <div>
                      <div style={{ fontWeight: 900, marginBottom: 6 }}>By Category</div>
                      <div style={{ display: "grid", gap: 6 }}>
                        {summary.categories.map((c) => (
                          <div key={c.category} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13 }}>
                            <span>{c.category} (x{c.count})</span>
                            <span>
                              ScoreΔ {c.scoreDelta} • RiskΔ {c.riskDelta}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={styles.row}>
                      <Button outline onClick={exportResults}>⬇️ Export JSON</Button>
                    </div>
                  </div>
                )}
              </Card>

              <Card title="Raw History" subtitle="For facilitator review.">
                {history.length === 0 ? (
                  <div style={{ color: "#64748b" }}>No history yet.</div>
                ) : (
                  <pre style={{ margin: 0, padding: 12, borderRadius: 14, border: "1px solid #e2e8f0", background: "#fff", overflowX: "auto", fontSize: 12 }}>
                    {JSON.stringify(history, null, 2)}
                  </pre>
                )}
              </Card>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
