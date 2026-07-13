import React from 'react';
import Layout from '@theme/Layout';
import CourseDetail from '../../components/CourseDetail';
import courses from '../../data/courses';

const course = courses.find((c) => c.slug === 'search-algorithms');

export default function SearchAlgorithms() {
  return (
    <Layout title={course.title} description={course.description}>
      <CourseDetail course={course} docUrl="/docs/search-algorithms/" />
    </Layout>
  );
}
