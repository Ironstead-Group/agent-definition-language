import React, {useEffect, useRef, useState} from 'react';

const REPO = 'ironstead-group/agent-definition-language';
const CACHE_KEY = 'adl-github-stats';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface GitHubStats {
  stars: number;
  forks: number;
  version: string;
  fetchedAt: number;
}

function formatCount(n: number): string {
  if (n >= 1000) {
    return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return String(n);
}

function getCached(): GitHubStats | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data: GitHubStats = JSON.parse(raw);
    if (Date.now() - data.fetchedAt < CACHE_TTL) return data;
  } catch {}
  return null;
}

function setCache(stats: GitHubStats) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(stats));
  } catch {}
}

function GitHubRepoWidget({mobile, compact}: {mobile?: boolean; compact?: boolean}): React.ReactElement {
  const [stats, setStats] = useState<GitHubStats | null>(getCached);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (stats || fetchedRef.current) return;
    fetchedRef.current = true;

    const controller = new AbortController();

    Promise.all([
      fetch(`https://api.github.com/repos/${REPO}`, {signal: controller.signal}),
      fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {signal: controller.signal}).catch(() => null),
    ])
      .then(async ([repoRes, releaseRes]) => {
        if (!repoRes.ok) return;
        const repo = await repoRes.json();
        let version = '';
        if (releaseRes?.ok) {
          const release = await releaseRes.json();
          version = release.tag_name || '';
        }
        const data: GitHubStats = {
          stars: repo.stargazers_count ?? 1,
          forks: repo.forks_count ?? 1,
          version,
          fetchedAt: Date.now(),
        };
        setCache(data);
        setStats(data);
      })
      .catch(() => {});

    return () => controller.abort();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (mobile) {
    return null;
  }

  if (compact) {
    return (
      <a
        href={`https://github.com/${REPO}`}
        target="_blank"
        rel="noopener noreferrer"
        className="github-repo-widget github-repo-widget--compact"
      >
        <div className="github-repo-widget__icon">
          <svg viewBox="0 0 16 16" width="20" height="20" aria-hidden="true">
            <path
              fill="currentColor"
              d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
            />
          </svg>
        </div>
        {stats && (
          <ul className="github-repo-widget__facts">
            {stats.version && (
              <li className="github-repo-widget__fact">{stats.version}</li>
            )}
            <li className="github-repo-widget__fact">
              <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z"
                />
              </svg>
              {formatCount(stats.stars)}
            </li>
            <li className="github-repo-widget__fact">
              <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75v-.878a2.25 2.25 0 111.5 0v.878a2.25 2.25 0 01-2.25 2.25h-1.5v2.128a2.251 2.251 0 11-1.5 0V8.5h-1.5A2.25 2.25 0 013.5 6.25v-.878a2.25 2.25 0 111.5 0zM5 3.25a.75.75 0 10-1.5 0 .75.75 0 001.5 0zm6.75.75a.75.75 0 100-1.5.75.75 0 000 1.5zM8 12.75a.75.75 0 100-1.5.75.75 0 000 1.5z"
                />
              </svg>
              {formatCount(stats.forks)}
            </li>
          </ul>
        )}
      </a>
    );
  }

  return (
    <a
      href={`https://github.com/${REPO}`}
      target="_blank"
      rel="noopener noreferrer"
      className="github-repo-widget"
    >
      <div className="github-repo-widget__icon">
        <svg viewBox="0 0 16 16" width="20" height="20" aria-hidden="true">
          <path
            fill="currentColor"
            d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
          />
        </svg>
      </div>
      <div className="github-repo-widget__info">
        <span className="github-repo-widget__name">{REPO}</span>
        {stats && (
          <ul className="github-repo-widget__facts">
            {stats.version && (
              <li className="github-repo-widget__fact">{stats.version}</li>
            )}
            <li className="github-repo-widget__fact">
              <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z"
                />
              </svg>
              {formatCount(stats.stars)}
            </li>
            <li className="github-repo-widget__fact">
              <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75v-.878a2.25 2.25 0 111.5 0v.878a2.25 2.25 0 01-2.25 2.25h-1.5v2.128a2.251 2.251 0 11-1.5 0V8.5h-1.5A2.25 2.25 0 013.5 6.25v-.878a2.25 2.25 0 111.5 0zM5 3.25a.75.75 0 10-1.5 0 .75.75 0 001.5 0zm6.75.75a.75.75 0 100-1.5.75.75 0 000 1.5zM8 12.75a.75.75 0 100-1.5.75.75 0 000 1.5z"
                />
              </svg>
              {formatCount(stats.forks)}
            </li>
          </ul>
        )}
      </div>
    </a>
  );
}

export default React.memo(GitHubRepoWidget);
