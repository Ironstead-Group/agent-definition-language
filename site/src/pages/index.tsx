import type { ReactNode } from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {usePluginData} from '@docusaurus/useGlobalData';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';
import CodeBlock from '@theme/CodeBlock';

import styles from './index.module.css';

const adlExample = `{
  "adl_spec": "0.1.0",
  "name": "Claims Processing Agent",
  "version": "2.1.0",
  "lifecycle": {
    "status": "active",
    "sunset_date": "2027-06-01"
  },
  "permissions": {
    "network": {
      "allowed_hosts": ["claims-api.internal"]
    },
    "data_access": {
      "allowed_sources": ["claims-db"],
      "restricted_fields": ["ssn", "dob"]
    }
  },
  "profiles": [
    "urn:adl:profile:governance:1.0",
    "urn:adl:profile:financial:1.0"
  ]
}`;

function useLatestSpecVersion(): string {
  const data = usePluginData('docusaurus-plugin-content-docs', 'spec') as any;
  const versions = data?.versions ?? [];
  const latest = versions.find((v: any) => v.isLast);
  return latest?.label ?? latest?.name ?? '0.1.0';
}

function HeroSection() {
  const { siteConfig } = useDocusaurusContext();
  const latestVersion = useLatestSpecVersion();
  return (
    <header className={styles.hero}>
      <div className={styles.heroBackground}>
        <div className={styles.gridPattern}></div>
        <div className={styles.gradientOrb1}></div>
        <div className={styles.gradientOrb2}></div>
        <div className={styles.gradientOrb3}></div>
      </div>
      <div className={styles.heroContent}>
        <div className={styles.heroText}>
          <div className={styles.badge}>
            <span className={styles.badgeDot}></span>
            Community Specification v{latestVersion}
          </div>
          <Heading as="h1" className={styles.heroTitle}>
            {siteConfig.tagline}
          </Heading>
          <p className={styles.heroSubtitle}>
            The agent passport for identity, permissions, lifecycle, and compliance
            — in one auditable, machine-readable document.
          </p>
          <div className={styles.heroCtas}>
            <Link
              className={clsx('button button--lg', styles.primaryButton)}
              to="/spec">
              Read the Spec
            </Link>
            <Link
              className={clsx('button button--lg', styles.secondaryButton)}
              to="/profiles/governance/overview">
              Explore Governance
            </Link>
          </div>
        </div>
        <div className={styles.heroCode}>
          <div className={styles.codeWindow}>
            <div className={styles.codeWindowHeader}>
              <span className={styles.codeWindowDot}></span>
              <span className={styles.codeWindowDot}></span>
              <span className={styles.codeWindowDot}></span>
              <span className={styles.codeWindowTitle}>agent.adl.json</span>
            </div>
            <div className={styles.codeWindowBody}>
              <CodeBlock language="json" className={styles.codeBlock}>
                {adlExample}
              </CodeBlock>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function ValuePropSection() {
  return (
    <section className={styles.quickExample}>
      <div className="container">
        <div className={styles.quickExampleContent}>
          <div className={styles.quickExampleText}>
            <Heading as="h2" className={styles.sectionTitle}>
              The governance layer above MCP and A2A
            </Heading>
            <p className={styles.sectionDescription}>
              MCP describes how agents connect to tools. A2A describes how agents
              communicate. ADL describes <strong>who the agent is</strong> — identity,
              permissions, lifecycle, and compliance in one portable document.
            </p>
            <ul className={styles.benefitsList}>
              <li>
                <span className={styles.checkIcon}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" fill="currentColor"/>
                  </svg>
                </span>
                Deny-by-default permissions with auditable boundaries
              </li>
              <li>
                <span className={styles.checkIcon}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" fill="currentColor"/>
                  </svg>
                </span>
                Compliance mappings for NIST 800-53, SOC 2, ISO 27001, EU AI Act
              </li>
              <li>
                <span className={styles.checkIcon}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" fill="currentColor"/>
                  </svg>
                </span>
                Lifecycle management with sunset dates and successors
              </li>
              <li>
                <span className={styles.checkIcon}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" fill="currentColor"/>
                  </svg>
                </span>
                Generates A2A Agent Cards and MCP configurations
              </li>
            </ul>
            <Link
              className={clsx('button button--lg', styles.learnMoreButton)}
              to="/spec">
              Learn More
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function ComparisonSection() {
  return (
    <section className={styles.comparison}>
      <div className="container">
        <div className={styles.comparisonContent}>
          <Heading as="h2" className={styles.sectionTitle}>
            The Agent Bill of Materials
          </Heading>
          <p className={styles.sectionDescription}>
            You wouldn't deploy software without an SBOM. ADL is the ABOM for AI agents
            — a complete, verifiable record of what an agent is, what it can do, and
            who authorized it.
          </p>
          <div className={styles.comparisonTable}>
            <table>
              <thead>
                <tr>
                  <th>Concern</th>
                  <th>A2A Agent Cards</th>
                  <th>Agent Spec</th>
                  <th>AGNTCY</th>
                  <th>ADL</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Agent Identity</td>
                  <td className={styles.cellPartial}>Partial</td>
                  <td className={styles.cellNo}>—</td>
                  <td className={styles.cellYes}>DIDs + VCs</td>
                  <td className={styles.cellYes}>DIDs + attestation</td>
                </tr>
                <tr>
                  <td>Permissions Model</td>
                  <td className={styles.cellPartial}>Partial</td>
                  <td className={styles.cellNo}>—</td>
                  <td className={styles.cellPartial}>Partial</td>
                  <td className={styles.cellYes}>Deny-by-default</td>
                </tr>
                <tr>
                  <td>Governance & Compliance</td>
                  <td className={styles.cellNo}>—</td>
                  <td className={styles.cellNo}>—</td>
                  <td className={styles.cellPartial}>Partial</td>
                  <td className={styles.cellYes}>NIST, SOC 2, EU AI Act</td>
                </tr>
                <tr>
                  <td>Lifecycle Management</td>
                  <td className={styles.cellPartial}>Partial</td>
                  <td className={styles.cellNo}>—</td>
                  <td className={styles.cellPartial}>Partial</td>
                  <td className={styles.cellYes}>Status + sunset dates</td>
                </tr>
                <tr>
                  <td>Agent Relationships</td>
                  <td className={styles.cellPartial}>Partial</td>
                  <td className={styles.cellYes}>Flows</td>
                  <td className={styles.cellPartial}>Partial</td>
                  <td className={styles.cellYes}>Portfolio profile</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className={styles.comparisonFootnote}>
            A2A Agent Cards (Google/LF) · Agent Spec (Oracle) · AGNTCY (Cisco/Outshift)
          </p>
        </div>
      </div>
    </section>
  );
}

function CompatibilitySection() {
  return (
    <section className={styles.compatibility}>
      <div className="container">
        <div className={styles.compatibilityContent}>
          <Heading as="h2" className={styles.sectionTitle}>
            Built for Interoperability
          </Heading>
          <p className={styles.sectionDescription}>
            ADL integrates with existing standards and protocols, enabling seamless
            agent deployment across diverse ecosystems.
          </p>
          <div className={styles.compatibilityGrid}>
            <div className={styles.compatibilityCard}>
              <div className={styles.compatibilityIcon}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                  <line x1="9" y1="9" x2="9.01" y2="9"/>
                  <line x1="15" y1="9" x2="15.01" y2="9"/>
                </svg>
              </div>
              <h3>A2A Protocol</h3>
              <p>Generate Agent Cards for agent-to-agent communication</p>
            </div>
            <div className={styles.compatibilityCard}>
              <div className={styles.compatibilityIcon}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <h3>JSON Schema</h3>
              <p>Full schema validation for all ADL documents</p>
            </div>
            <div className={styles.compatibilityCard}>
              <div className={styles.compatibilityIcon}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10,9 9,9 8,9"/>
                </svg>
              </div>
              <h3>OpenAPI</h3>
              <p>Reference OpenAPI specs for tool definitions</p>
            </div>
            <div className={styles.compatibilityCard}>
              <div className={styles.compatibilityIcon}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <line x1="3" y1="9" x2="21" y2="9"/>
                  <line x1="9" y1="21" x2="9" y2="9"/>
                </svg>
              </div>
              <h3>MCP</h3>
              <p>Export Model Context Protocol configurations</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CtaSection() {
  return (
    <section className={styles.cta}>
      <div className="container">
        <div className={styles.ctaContent}>
          <Heading as="h2" className={styles.ctaTitle}>
            Ready to trust your agents?
          </Heading>
          <p className={styles.ctaDescription}>
            Define identity, permissions, and compliance for every agent in your
            organization. Read the specification or explore the governance profile.
          </p>
          <div className={styles.ctaButtons}>
            <Link
              className={clsx('button button--lg', styles.primaryButton)}
              to="/spec">
              Read the Specification
            </Link>
            <Link
              className={clsx('button button--lg', styles.ghostButton)}
              href="https://github.com/adl-spec/agent-definition-language">
              View on GitHub
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  return (
    <Layout
      title="The standard for trusted AI agents"
      description="Define identity, permissions, lifecycle, and compliance for AI agents in one auditable document.">
      <HeroSection />
      <main>
        <HomepageFeatures />
        <ValuePropSection />
        <ComparisonSection />
        <CompatibilitySection />
        <CtaSection />
      </main>
    </Layout>
  );
}
