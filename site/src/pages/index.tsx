import type { ReactNode } from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';
import CodeBlock from '@theme/CodeBlock';

import styles from './index.module.css';

const adlExample = `{
  "adl": "0.1.0",
  "name": "Research Assistant",
  "description": "Helps find and analyze academic papers",
  "version": "1.0.0",
  "tools": [
    {
      "name": "search_papers",
      "description": "Search academic databases",
      "parameters": {
        "type": "object",
        "properties": {
          "query": { "type": "string" }
        }
      }
    }
  ],
  "permissions": {
    "network": {
      "allowed_hosts": ["arxiv.org", "scholar.google.com"]
    }
  }
}`;

function HeroSection() {
  const { siteConfig } = useDocusaurusContext();
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
            Draft Specification v0.1.0
          </div>
          <Heading as="h1" className={styles.heroTitle}>
            Agent Definition Language
          </Heading>
          <p className={styles.heroSubtitle}>
            {siteConfig.tagline}. Define capabilities, permissions, and security boundaries
            for AI agents in a portable, machine-readable format.
          </p>
          <div className={styles.heroCtas}>
            <Link
              className={clsx('button button--lg', styles.primaryButton)}
              to="/spec/introduction">
              Read the Spec
            </Link>
            <Link
              className={clsx('button button--lg', styles.secondaryButton)}
              to="/examples">
              View Examples
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

function QuickExample() {
  return (
    <section className={styles.quickExample}>
      <div className="container">
        <div className={styles.quickExampleContent}>
          <div className={styles.quickExampleText}>
            <Heading as="h2" className={styles.sectionTitle}>
              Like OpenAPI, but for AI Agents
            </Heading>
            <p className={styles.sectionDescription}>
              ADL provides a standardized way to describe AI agents, their capabilities,
              permissions, and security requirements. Enable discovery, interoperability,
              and secure deployment across any platform or runtime.
            </p>
            <ul className={styles.benefitsList}>
              <li>
                <span className={styles.checkIcon}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" fill="currentColor"/>
                  </svg>
                </span>
                Portable agent definitions work across providers
              </li>
              <li>
                <span className={styles.checkIcon}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" fill="currentColor"/>
                  </svg>
                </span>
                JSON Schema validation for tooling and automation
              </li>
              <li>
                <span className={styles.checkIcon}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" fill="currentColor"/>
                  </svg>
                </span>
                Security-first with deny-by-default permissions
              </li>
              <li>
                <span className={styles.checkIcon}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" fill="currentColor"/>
                  </svg>
                </span>
                Extensible profiles for domain-specific requirements
              </li>
            </ul>
            <Link
              className={clsx('button button--lg', styles.learnMoreButton)}
              to="/spec/introduction">
              Learn More
            </Link>
          </div>
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
            Ready to define your agents?
          </Heading>
          <p className={styles.ctaDescription}>
            Get started with ADL today. Read the specification, explore examples,
            or contribute to the standard.
          </p>
          <div className={styles.ctaButtons}>
            <Link
              className={clsx('button button--lg', styles.primaryButton)}
              to="/spec/introduction">
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
      title="Agent Definition Language"
      description="A vendor-neutral specification for describing AI agents">
      <HeroSection />
      <main>
        <HomepageFeatures />
        <QuickExample />
        <CompatibilitySection />
        <CtaSection />
      </main>
    </Layout>
  );
}
