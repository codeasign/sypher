import React from 'react';
import Layout from '@theme/Layout';
import CourseDetail from '../../components/CourseDetail';
import courses from '@sypher/course-catalog/src/courses';

const course = courses.find((c) => c.slug === 'coding-bootcamp');

export default function CodingBootcamp() {
  return (
    <Layout title={course.title} description={course.description}>
      <CourseDetail course={course} docUrl="/docs/coding-bootcamp/" />
    </Layout>
  );
}