import type { ReactNode } from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  description: ReactNode;
  icon: ReactNode;
};

// SVG Icons for a clean, professional look
const icons = {
  governance: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <path d="M9 12l2 2 4-4"/>
    </svg>
  ),
  identity: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2"/>
      <circle cx="9" cy="11" r="2"/>
      <path d="M15 8h2"/>
      <path d="M15 12h2"/>
      <path d="M7 16h10"/>
    </svg>
  ),
  lifecycle: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
    </svg>
  ),
  interoperable: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="6" height="6" rx="1"/>
      <rect x="16" y="6" width="6" height="6" rx="1"/>
      <rect x="9" y="12" width="6" height="6" rx="1"/>
      <path d="M6.5 12v1.5a1 1 0 001 1H9"/>
      <path d="M17.5 12v1.5a1 1 0 01-1 1H15"/>
    </svg>
  ),
  extensibleProfiles: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M3 9h18"/>
      <path d="M9 21V9"/>
    </svg>
  ),
  vendorNeutral: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M2 12h20"/>
      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
    </svg>
  ),
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Governance & Compliance',
    icon: icons.governance,
    description: (
      <>
        Map agents to NIST 800-53, SOC 2, ISO 27001, and EU AI Act controls.
        Built-in compliance profiles for enterprise governance requirements.
      </>
    ),
  },
  {
    title: 'Agent Identity',
    icon: icons.identity,
    description: (
      <>
        Cryptographic identity with W3C DIDs, attestation support, and
        deny-by-default permission boundaries for every agent.
      </>
    ),
  },
  {
    title: 'Lifecycle Management',
    icon: icons.lifecycle,
    description: (
      <>
        Track agents from draft to retirement with sunset dates, successor
        agents, and auditable status transitions.
      </>
    ),
  },
  {
    title: 'Interoperable',
    icon: icons.interoperable,
    description: (
      <>
        Generate A2A Agent Cards, MCP configurations, and integrate with
        OpenAPI specifications. The definition layer for the agent ecosystem.
      </>
    ),
  },
  {
    title: 'Extensible Profiles',
    icon: icons.extensibleProfiles,
    description: (
      <>
        Domain-specific profiles for governance, portfolio management,
        and more. Extend ADL without modifying the core spec.
      </>
    ),
  },
  {
    title: 'Vendor-Neutral',
    icon: icons.vendorNeutral,
    description: (
      <>
        Portable agent definitions work across providers and runtimes.
        Structured for submission to Linux Foundation, IETF, and ISO/IEC.
      </>
    ),
  },
];

function Feature({ title, description, icon }: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className={styles.featureCard}>
        <div className={styles.featureIcon}>{icon}</div>
        <Heading as="h3" className={styles.featureTitle}>{title}</Heading>
        <p className={styles.featureDescription}>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className={styles.featuresHeader}>
          <Heading as="h2" className={styles.featuresTitle}>Trust, verify, deploy</Heading>
          <p className={styles.featuresSubtitle}>
            Everything a CISO needs to say yes to AI agents
          </p>
        </div>
        <div className={clsx('row', styles.featuresGrid)}>
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
