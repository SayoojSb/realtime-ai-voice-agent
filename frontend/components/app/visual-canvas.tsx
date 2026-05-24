'use client';

import { AnimatePresence, motion } from 'motion/react';
import type { VisualView } from '@/hooks/useVisualTools';

// ─── Static data ────────────────────────────────────────────────────────────

const SERVICES = [
  {
    id: 'strategy',
    icon: '◆',
    title: 'AI Strategy',
    short: 'Roadmapping & prioritisation',
    detail:
      'We audit your operations and build a clear, prioritised AI roadmap tied to your business goals. Typical engagement: 2-week sprint.',
  },
  {
    id: 'automation',
    icon: '⚡',
    title: 'Workflow Automation',
    short: 'Eliminate repetitive work',
    detail:
      'We identify high-volume processes eating your team\'s time and replace them with intelligent automations — lead qual, doc processing, support triage.',
  },
  {
    id: 'products',
    icon: '⬡',
    title: 'Custom AI Products',
    short: 'Bespoke AI-powered tools',
    detail:
      'We design and build bespoke AI products — LLM integrations, RAG pipelines, voice agents, and multi-agent systems. From internal tools to customer-facing features.',
  },
  {
    id: 'integration',
    icon: '⟁',
    title: 'AI Integration',
    short: 'Plug AI into your stack',
    detail:
      'Already have a direction? We plug in and execute — cleanly, securely, at speed. Stack-agnostic across Python, Node, React, AWS, GCP, Azure.',
  },
];

const PROCESS_STEPS = [
  { label: 'Discovery', week: 'Week 1', desc: 'Learn your business, goals, and constraints' },
  { label: 'Strategy', week: 'Week 2', desc: 'Prioritised roadmap with clear ROI' },
  { label: 'Build', week: 'Weeks 3–8+', desc: 'Iterate fast, ship early, adjust' },
  { label: 'Deploy', week: 'Handover', desc: 'Document, train, and support' },
];

const LEAD_FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  company: 'Company',
  problem: 'Challenge',
  timeline: 'Timeline',
  budget: 'Budget',
};

// ─── Framer Motion presets ──────────────────────────────────────────────────

const FADE_UP = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.35, ease: [0.45, 0, 0.15, 1] as const },
};

const STAGGER_CONTAINER = {
  animate: { transition: { staggerChildren: 0.08 } },
};

const STAGGER_ITEM = {
  initial: { opacity: 0, y: 14, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.35, ease: [0.45, 0, 0.15, 1] as const },
};

// ─── Sub-views ──────────────────────────────────────────────────────────────

function ServicesSlide() {
  return (
    <motion.div className="mnvr-cv-services" {...STAGGER_CONTAINER}>
      <div className="mnvr-cv-section-label">OUR SERVICES</div>
      <div className="mnvr-cv-grid">
        {SERVICES.map((s, i) => (
          <motion.div
            key={s.id}
            className="mnvr-cv-card"
            {...STAGGER_ITEM}
            transition={{ ...STAGGER_ITEM.transition, delay: i * 0.08 }}
          >
            <span className="mnvr-cv-card-icon">{s.icon}</span>
            <div className="mnvr-cv-card-title">{s.title}</div>
            <div className="mnvr-cv-card-desc">{s.short}</div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function ServiceDetail({ serviceName }: { serviceName: string }) {
  const match = SERVICES.find(
    (s) => s.title.toLowerCase() === serviceName.toLowerCase()
  ) ?? SERVICES[0];

  return (
    <motion.div className="mnvr-cv-detail" {...FADE_UP}>
      <div className="mnvr-cv-section-label">SERVICE DETAIL</div>
      <div className="mnvr-cv-detail-card">
        <span className="mnvr-cv-detail-icon">{match.icon}</span>
        <h3 className="mnvr-cv-detail-title">{match.title}</h3>
        <p className="mnvr-cv-detail-text">{match.detail}</p>
      </div>
    </motion.div>
  );
}

function ProcessDiagram() {
  return (
    <motion.div className="mnvr-cv-process" {...STAGGER_CONTAINER}>
      <div className="mnvr-cv-section-label">OUR PROCESS</div>
      <div className="mnvr-cv-process-flow">
        {PROCESS_STEPS.map((step, i) => (
          <motion.div
            key={step.label}
            className="mnvr-cv-process-step"
            {...STAGGER_ITEM}
            transition={{ ...STAGGER_ITEM.transition, delay: i * 0.12 }}
          >
            <div className="mnvr-cv-step-num">{i + 1}</div>
            <div className="mnvr-cv-step-label">{step.label}</div>
            <div className="mnvr-cv-step-week">{step.week}</div>
            <div className="mnvr-cv-step-desc">{step.desc}</div>
            {i < PROCESS_STEPS.length - 1 && (
              <div className="mnvr-cv-step-connector" />
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function LeadFields({ fields }: { fields: Record<string, string> }) {
  const entries = Object.entries(fields);

  return (
    <motion.div className="mnvr-cv-lead" {...STAGGER_CONTAINER}>
      <div className="mnvr-cv-section-label">DISCOVERY NOTES</div>
      <div className="mnvr-cv-lead-list">
        {entries.length === 0 && (
          <div className="mnvr-cv-lead-empty">Listening for details…</div>
        )}
        {entries.map(([key, val], i) => (
          <motion.div
            key={key}
            className="mnvr-cv-lead-row"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: i * 0.06 }}
          >
            <span className="mnvr-cv-lead-key">{LEAD_FIELD_LABELS[key] ?? key}</span>
            <span className="mnvr-cv-lead-val">{val}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

interface VisualCanvasProps {
  activeView: VisualView;
  serviceDetailName: string;
  leadFields: Record<string, string>;
}

export function VisualCanvas({ activeView, serviceDetailName, leadFields }: VisualCanvasProps) {
  if (activeView === 'none') return null;

  return (
    <motion.div
      className="mnvr-cv"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: [0.45, 0, 0.15, 1] as const }}
    >
      <div className="mnvr-cv-inner">
        <AnimatePresence mode="wait">
          {activeView === 'services' && <ServicesSlide key="services" />}
          {activeView === 'service-detail' && (
            <ServiceDetail key={`detail-${serviceDetailName}`} serviceName={serviceDetailName} />
          )}
          {activeView === 'process' && <ProcessDiagram key="process" />}
          {activeView === 'lead-fields' && <LeadFields key="lead" fields={leadFields} />}
        </AnimatePresence>

        {/* Persistent lead fields badge when another view is active */}
        {activeView !== 'lead-fields' && Object.keys(leadFields).length > 0 && (
          <motion.div
            className="mnvr-cv-lead-badge"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
          >
            {Object.entries(leadFields).map(([k, v]) => (
              <div key={k} className="mnvr-cv-badge-row">
                <span className="mnvr-cv-badge-key">{LEAD_FIELD_LABELS[k] ?? k}</span>
                <span className="mnvr-cv-badge-val">{v}</span>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
