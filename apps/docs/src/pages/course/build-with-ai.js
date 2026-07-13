import React from 'react';
import Layout from '@theme/Layout';
import CourseDetail from '../../components/CourseDetail';
import courses from '../../data/courses';

const course = courses.find((c) => c.slug === 'build-with-ai');

export default function BuildWithAI() {
  return (
    <Layout title={course.title} description={course.description}>
      <CourseDetail course={course} docUrl="/docs/build-with-ai/" />
    </Layout>
  );
}