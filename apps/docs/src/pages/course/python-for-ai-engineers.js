import React from 'react';
import Layout from '@theme/Layout';
import CourseDetail from '../../components/CourseDetail';
import courses from '../../data/courses';

const course = courses.find((c) => c.slug === 'python-for-ai-engineers');

export default function PythonForAIEngineers() {
  return (
    <Layout title={course.title} description={course.description}>
      <CourseDetail course={course} docUrl={course.slug === 'python-for-ai-engineers' ? '/docs/python-for-ai-engineers/' : `/${course.slug}/`} />
    </Layout>
  );
}