'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { useAuth } from '@/contexts/AuthContext';
import { listJobPosts, listJobPostsByCreator } from '@/data/jobPosts';
import DashboardLayout from '@/components/DashboardLayout';
import RequireNavAccess from '@/components/RequireNavAccess';
import JobApplicantsView from '@/components/JobApplicantsView';
import { ApplicantsIcon } from '@/components/NavIcons';
import styles from './applicants.module.css';

type ApplicantsTab = 'applied' | 'shortlisted';

interface JobOption {
  id: string;
  title: string;
}

function ApplicantsContent(): React.JSX.Element {
  const { supabase, user, companyName, role } = useAuth();
  const [activeTab, setActiveTab] = useState<ApplicantsTab>('applied');
  const [selectedJobId, setSelectedJobId] = useState<string>('');

  const isExternalPoster = role === 'external_job_poster';
  const swrKey =
    isExternalPoster && supabase && user
      ? (['applicantsJobs', 'byCreator', user.id] as const)
      : !isExternalPoster && supabase && companyName
      ? (['applicantsJobs', 'byCompany', companyName] as const)
      : null;

  const { data: jobPosts = [] } = useSWR<JobOption[]>(swrKey, () =>
    isExternalPoster ? listJobPostsByCreator(supabase, user!.id) : listJobPosts(supabase, companyName)
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <ApplicantsIcon />
        </div>
        <div>
          <h1 className={styles.heading}>Applicants</h1>
          <p className={styles.subtitle}>Candidates who applied to your job posts.</p>
        </div>
      </div>

      {jobPosts.length > 0 && (
        <div className={styles.jobFilter}>
          <select
            className={styles.jobFilterSelect}
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
          >
            <option value="">All jobs</option>
            {jobPosts.map((post) => (
              <option key={post.id} value={post.id}>
                {post.title}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className={styles.tabs}>
        <button
          type="button"
          className={activeTab === 'applied' ? `${styles.tab} ${styles.tabActive}` : styles.tab}
          onClick={() => setActiveTab('applied')}
        >
          Applied
        </button>
        <button
          type="button"
          className={activeTab === 'shortlisted' ? `${styles.tab} ${styles.tabActive}` : styles.tab}
          onClick={() => setActiveTab('shortlisted')}
        >
          Shortlisted
        </button>
      </div>

      <JobApplicantsView status={activeTab} jobId={selectedJobId || null} />
    </div>
  );
}

export default function ApplicantsPage(): React.JSX.Element {
  return (
    <DashboardLayout title="Applicants" description="Candidates who applied to your job posts.">
      <RequireNavAccess itemKey="applicants">
        <ApplicantsContent />
      </RequireNavAccess>
    </DashboardLayout>
  );
}
