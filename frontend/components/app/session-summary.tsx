'use client';

import { motion } from 'motion/react';

interface SessionSummaryProps {
  elapsed: number;
  messageCount: number;
  onStartNew: () => void;
  className?: string;
  ref?: React.Ref<HTMLDivElement>;
}

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export const SessionSummary = ({
  elapsed,
  messageCount,
  onStartNew,
  className,
  ref,
}: SessionSummaryProps) => {
  const turns = Math.max(0, Math.ceil(messageCount / 2));

  return (
    <div ref={ref} className={`mnvr-summary-overlay ${className ?? ''}`}>
      <motion.div
        className="mnvr-summary-card"
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.45, 0, 0.15, 1], delay: 0.1 }}
      >
        {/* Header */}
        <div className="mnvr-summary-head">
          <span className="mnvr-summary-check">✓</span>
          <span>Session complete · {fmtTime(elapsed)}</span>
        </div>

        <h2>Your session has been captured.</h2>

        <div className="mnvr-summary-tag">
          A Maneuver consultant will review your conversation and follow up within one business day.
        </div>

        {/* Data grid */}
        <div className="mnvr-summary-grid">
          <div className="mnvr-summary-cell">
            <div className="mnvr-summary-cell-key">Session duration</div>
            <div className="mnvr-summary-cell-val">{fmtTime(elapsed)}</div>
          </div>
          <div className="mnvr-summary-cell">
            <div className="mnvr-summary-cell-key">Conversation turns</div>
            <div className="mnvr-summary-cell-val">
              {turns > 0 ? `${turns} exchange${turns !== 1 ? 's' : ''}` : 'Captured'}
            </div>
          </div>
          <div className="mnvr-summary-cell">
            <div className="mnvr-summary-cell-key">Lead status</div>
            <div className="mnvr-summary-cell-val" style={{ color: 'var(--bio-green)' }}>
              ● Captured · processing
            </div>
          </div>
          <div className="mnvr-summary-cell">
            <div className="mnvr-summary-cell-key">Follow-up</div>
            <div className="mnvr-summary-cell-val">Within 1 business day</div>
          </div>
        </div>

        {/* Next steps */}
        <div className="mnvr-summary-section-title">What happens next</div>
        <ul className="mnvr-summary-bullets">
          <li>Our AI extracts key details from your conversation automatically.</li>
          <li>A Maneuver consultant will reach out with a tailored automation plan.</li>
          <li>You can start a new session anytime to explore additional use cases.</li>
        </ul>

        {/* Actions */}
        <div className="mnvr-summary-actions">
          <button className="mnvr-btn-ghost" onClick={onStartNew}>
            Start new conversation
          </button>
          <div className="mnvr-email-sent-badge">
            <span style={{ color: 'var(--bio-green)' }}>✓</span>
            Follow-up email sent
          </div>
        </div>
      </motion.div>
    </div>
  );
};
