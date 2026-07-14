import React from 'react';
import Layout from '@theme/Layout';
import CourseDetail from '../../components/CourseDetail';
import courses from '@sypher/course-catalog/src/courses';

const course = courses.find((c) => c.slug === 'git-github-actions');

export default function GitGithubActions() {
  return (
    <Layout title={course.title} description={course.description}>
      <CourseDetail course={course} docUrl="/docs/git-github-actions/" />
    </Layout>
  );
}