import React, { useState, useEffect, useCallback, useRef } from 'react';
import CodeBlock from '@theme/CodeBlock';
import styles from './demo.module.css';

// ---------------------------------------------------------------------------
// Data — mirrors the real A2A discovery demo
// ---------------------------------------------------------------------------

const PASSPORT_YAML = `adl_spec: "0.2.0"
name: ADL Spec Explainer
description: >-
  An AI agent that explains ADL concepts, validates documents,
  shows examples, and compares agent description formats.
version: "0.1.0"

data_classification:
  sensitivity: public

model:
  provider: anthropic
  name: claude-sonnet-4-20250514
  capabilities:
    - function_calling

tools:
  - name: explain_concept
    description: Explain an ADL concept
    read_only: true
  - name: validate_document
    description: Validate an ADL document
    read_only: true
  - name: show_example
    description: Return an example ADL document
    read_only: true
  - name: get_spec_section
    description: Retrieve spec section info
    read_only: true
  - name: compare_formats
    description: Compare ADL with other formats
    read_only: true

permissions:
  network:
    allowed_hosts:
      - adl-spec.org

security:
  authentication:
    type: none`;

const DISCOVERY_DOC = {
  agents: [
    {
      id: 'https://localhost:3001/agents/adl-explainer',
      adl_document: 'https://localhost:3001/agents/adl-explainer',
      name: 'ADL Spec Explainer',
      version: '0.1.0',
      description: 'An AI agent that explains ADL concepts, validates documents, shows examples, and compares agent description formats.',
      status: 'active',
    },
  ],
};

const A2A_CARD = {
  name: 'ADL Spec Explainer',
  description: 'An AI agent that explains ADL concepts, validates documents, shows examples, and compares agent description formats.',
  version: '0.1.0',
  skills: [
    { id: 'explain_concept', name: 'explain_concept', description: 'Explain an ADL concept', tags: ['read-only'] },
    { id: 'validate_document', name: 'validate_document', description: 'Validate an ADL document', tags: ['read-only'] },
    { id: 'show_example', name: 'show_example', description: 'Return an example ADL document', tags: ['read-only'] },
    { id: 'get_spec_section', name: 'get_spec_section', description: 'Retrieve spec section info', tags: ['read-only'] },
    { id: 'compare_formats', name: 'compare_formats', description: 'Compare ADL with other formats', tags: ['read-only'] },
  ],
};

const TASKS = [
  {
    label: 'Explain the passport model',
    skill: 'explain_concept',
    input: { concept: 'passport model' },
    response: 'An ADL document is a passport \u2014 a portable, self-contained trust signal that travels with an agent. It declares identity, capabilities, permissions, and trust signals.',
  },
  {
    label: 'Validate a document',
    skill: 'validate_document',
    input: { document: 'adl_spec: "0.2.0"\nname: Test\n...' },
    response: 'Document is valid ADL. All required fields present, schema validation passed, 0 semantic errors.',
  },
  {
    label: 'Compare ADL with A2A',
    skill: 'compare_formats',
    input: { format: 'a2a' },
    response: 'ADL and A2A are complementary. ADL describes what an agent IS (identity, permissions, security), while A2A describes how agents COMMUNICATE.',
  },
];

// ---------------------------------------------------------------------------
// Step definitions
// ---------------------------------------------------------------------------

interface Step {
  id: string;
  phase: string;
  title: string;
  description: string;
  agent: 'discovery' | 'service' | 'both';
  data?: unknown;
  dataLabel?: string;
  dataLanguage?: string;
}

const STEPS: Step[] = [
  {
    id: 'discovery',
    phase: 'Discovery',
    title: 'Find agents on a domain',
    description: 'Any domain can publish an agent directory at a well-known URL. A client hits this endpoint to learn what agents are available \u2014 no prior knowledge needed, just the domain name.',
    agent: 'discovery',
    data: DISCOVERY_DOC,
    dataLabel: 'Discovery Response',
    dataLanguage: 'json',
  },
  {
    id: 'fetch',
    phase: 'Discovery',
    title: 'Read the agent\u2019s passport',
    description: 'Every ADL agent carries a passport \u2014 a structured document that says who it is, what it can do, and what it\u2019s allowed to access. Think of it like a travel passport: machine-readable identity and credentials in a standard format.',
    agent: 'service',
    data: PASSPORT_YAML,
    dataLabel: 'ADL Passport',
    dataLanguage: 'yaml',
  },
  {
    id: 'validate',
    phase: 'Validate',
    title: 'Verify the passport is legitimate',
    description: 'Before trusting anything in the passport, the discovery agent validates it against the ADL schema. This catches malformed documents, missing required fields, and constraint violations \u2014 the same way border control checks that a passport isn\u2019t expired or forged.',
    agent: 'discovery',
    data: { valid: true, errors: 0, version: '0.2.0' },
    dataLabel: 'Validation Result',
    dataLanguage: 'json',
  },
  {
    id: 'convert',
    phase: 'Validate',
    title: 'Translate to A2A format',
    description: 'ADL passports are interoperable. Here, the passport is converted into an A2A Agent Card \u2014 Google\u2019s format for agent-to-agent communication. Tools become skills, auth details carry over. The agent can now participate in the A2A ecosystem without maintaining a separate description.',
    agent: 'discovery',
    data: A2A_CARD,
    dataLabel: 'A2A Agent Card',
    dataLanguage: 'json',
  },
  {
    id: 'trust',
    phase: 'Trust',
    title: 'Decide whether to trust this agent',
    description: 'The passport carries trust signals: how sensitive is the data it handles? Does it require authentication? Are its tools read-only (no side effects) or can they modify things? The discovery agent reads these signals and makes a trust decision before sending any requests.',
    agent: 'discovery',
    data: {
      sensitivity: 'public',
      authentication: 'none',
      all_tools_read_only: true,
      verdict: 'TRUSTED \u2014 safe to communicate',
    },
    dataLabel: 'Trust Evaluation',
    dataLanguage: 'json',
  },
  ...TASKS.map((task, i) => ({
    id: `task-${i}`,
    phase: 'Communicate',
    title: `Invoke: ${task.label}`,
    description: `Now that trust is established, the discovery agent calls the "${task.skill}" skill it learned about from the passport. The request and response follow the A2A task protocol.`,
    agent: 'both' as const,
    data: {
      request: { id: `task-${i + 1}`, skill: task.skill, input: task.input },
      response: { status: 'completed', output: task.response },
    },
    dataLabel: 'A2A Task',
    dataLanguage: 'json',
  })),
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function AgentNode({ name, type, active }: { name: string; type: 'discovery' | 'service'; active: boolean }) {
  return (
    <div className={`${styles.agentNode} ${active ? styles.agentActive : ''} ${styles[type]}`}>
      <div className={styles.agentIcon}>
        {type === 'discovery' ? '\uD83D\uDD0D' : '\uD83E\uDD16'}
      </div>
      <div className={styles.agentLabel}>{name}</div>
    </div>
  );
}

function ConnectionLine({ active, direction }: { active: boolean; direction: 'left' | 'right' | 'both' }) {
  return (
    <div className={`${styles.connection} ${active ? styles.connectionActive : ''}`}>
      <div className={`${styles.connectionLine} ${active ? styles.lineAnimating : ''}`} />
      {active && (
        <div className={`${styles.packet} ${styles[`packet${direction.charAt(0).toUpperCase() + direction.slice(1)}`]}`} />
      )}
    </div>
  );
}

function PhaseIndicator({ phases, currentPhase }: { phases: string[]; currentPhase: string }) {
  return (
    <div className={styles.phases}>
      {phases.map((phase) => (
        <div
          key={phase}
          className={`${styles.phase} ${phase === currentPhase ? styles.phaseCurrent : ''} ${phases.indexOf(phase) < phases.indexOf(currentPhase) ? styles.phaseDone : ''}`}
        >
          <div className={styles.phaseDot} />
          <span>{phase}</span>
        </div>
      ))}
    </div>
  );
}

function StepDetail({ step }: { step: Step }) {
  const dataStr = typeof step.data === 'string'
    ? step.data
    : JSON.stringify(step.data, null, 2);

  return (
    <div className={styles.stepDetail}>
      <div className={styles.stepHeader}>
        <span className={styles.stepPhase}>{step.phase}</span>
        <h3 className={styles.stepTitle}>{step.title}</h3>
        <p className={styles.stepDescription}>{step.description}</p>
      </div>
      {step.data && (
        <div className={styles.stepData}>
          <div className={styles.dataLabel}>{step.dataLabel}</div>
          <CodeBlock language={step.dataLanguage}>{dataStr}</CodeBlock>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component (no Layout wrapper — the MDX page provides that)
// ---------------------------------------------------------------------------

export default function Demo() {
  const [currentStep, setCurrentStep] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const step = currentStep >= 0 && currentStep < STEPS.length ? STEPS[currentStep] : null;
  const phases = [...new Set(STEPS.map((s) => s.phase))];
  const currentPhase = step?.phase ?? '';

  const advance = useCallback(() => {
    setCurrentStep((prev) => {
      if (prev >= STEPS.length - 1) {
        setIsPlaying(false);
        return prev;
      }
      return prev + 1;
    });
  }, []);

  const play = useCallback(() => {
    setIsPlaying(true);
    if (currentStep < 0 || currentStep >= STEPS.length - 1) {
      setCurrentStep(0);
    } else {
      advance();
    }
  }, [currentStep, advance]);

  const reset = useCallback(() => {
    setIsPlaying(false);
    setCurrentStep(-1);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
    if (isPlaying && currentStep < STEPS.length - 1) {
      timerRef.current = setTimeout(advance, 2500);
      return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }
    if (currentStep >= STEPS.length - 1) {
      setIsPlaying(false);
    }
  }, [isPlaying, currentStep, advance]);

  const discoveryActive = step?.agent === 'discovery' || step?.agent === 'both';
  const serviceActive = step?.agent === 'service' || step?.agent === 'both';
  const connectionDirection = step?.agent === 'discovery' ? 'right'
    : step?.agent === 'service' ? 'left'
    : step?.agent === 'both' ? 'both'
    : 'right';

  return (
    <div className={styles.container}>
      <p className={styles.subtitle}>
        Step through the flow below to see how one agent discovers another,
        reads its passport, evaluates trust, and starts communicating — without
        any prior configuration or hardcoded integrations.
      </p>

      <PhaseIndicator phases={phases} currentPhase={currentPhase} />

      <div className={styles.visualization}>
        <AgentNode name="Discovery Agent" type="discovery" active={discoveryActive} />
        <ConnectionLine active={!!step} direction={connectionDirection} />
        <AgentNode name="Service Agent" type="service" active={serviceActive} />
      </div>

      <div className={styles.controls}>
        {!isPlaying ? (
          <button className={styles.playButton} onClick={play}>
            {currentStep < 0 ? 'Run Demo' : currentStep >= STEPS.length - 1 ? 'Replay' : 'Resume'}
          </button>
        ) : (
          <button className={styles.pauseButton} onClick={() => setIsPlaying(false)}>
            Pause
          </button>
        )}
        <button
          className={styles.stepButton}
          onClick={advance}
          disabled={currentStep >= STEPS.length - 1}
        >
          Step
        </button>
        <button className={styles.resetButton} onClick={reset}>
          Reset
        </button>
        <span className={styles.counter}>
          {currentStep >= 0 ? `${currentStep + 1} / ${STEPS.length}` : `${STEPS.length} steps`}
        </span>
      </div>

      <div className={styles.detail}>
        {step ? (
          <StepDetail step={step} />
        ) : (
          <div className={styles.placeholder}>
            <p>Click <strong>Run Demo</strong> to start the discovery flow, or <strong>Step</strong> to advance one step at a time.</p>
            <p>This simulates the real <a href="https://github.com/Ironstead-Group/agent-definition-language/tree/main/packages/adl-agent/examples/a2a-discovery">A2A discovery demo</a> that runs locally with <code>bun run examples/a2a-discovery/run-demo.ts</code></p>
          </div>
        )}
      </div>

      <div className={styles.timeline}>
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            className={`${styles.timelineStep} ${i === currentStep ? styles.timelineCurrent : ''} ${i < currentStep ? styles.timelineDone : ''}`}
            onClick={() => { setIsPlaying(false); setCurrentStep(i); }}
            title={s.title}
          >
            <span className={styles.timelineDot} />
            <span className={styles.timelineLabel}>{s.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
