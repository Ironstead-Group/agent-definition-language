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
  vendorNeutral: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M2 12h20"/>
      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
    </svg>
  ),
  machineReadable: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16,18 22,12 16,6"/>
      <polyline points="8,6 2,12 8,18"/>
    </svg>
  ),
  securityFirst: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <path d="M9 12l2 2 4-4"/>
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
  standardsReady: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14,2 14,8 20,8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10,9 9,9 8,9"/>
    </svg>
  ),
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Vendor-Neutral',
    icon: icons.vendorNeutral,
    description: (
      <>
        Describe agents without binding to a specific provider or runtime.
        ADL documents are portable across platforms and ecosystems.
      </>
    ),
  },
  {
    title: 'Machine-Readable',
    icon: icons.machineReadable,
    description: (
      <>
        Enable tooling for validation, code generation, and orchestration.
        ADL documents are validated against JSON Schema.
      </>
    ),
  },
  {
    title: 'Security-First',
    icon: icons.securityFirst,
    description: (
      <>
        Permission boundaries, authentication, and security constraints are
        first-class concepts with deny-by-default permissions.
      </>
    ),
  },
  {
    title: 'Interoperable',
    icon: icons.interoperable,
    description: (
      <>
        Generate A2A Agent Cards, MCP configurations, and integrate with
        OpenAPI specifications. Built to work with existing standards.
      </>
    ),
  },
  {
    title: 'Extensible Profiles',
    icon: icons.extensibleProfiles,
    description: (
      <>
        Domain-specific profiles for governance, healthcare, financial services,
        and more. Extend ADL without modifying the core spec.
      </>
    ),
  },
  {
    title: 'Standards-Ready',
    icon: icons.standardsReady,
    description: (
      <>
        Structured for submission to standards bodies including Linux Foundation,
        IETF, and ISO/IEC. Built for long-term stability.
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
          <Heading as="h2" className={styles.featuresTitle}>Why ADL?</Heading>
          <p className={styles.featuresSubtitle}>
            A standard format for the next generation of AI agents
          </p>
        </div>
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
