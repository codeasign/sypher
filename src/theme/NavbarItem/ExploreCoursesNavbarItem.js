import React from 'react';
import Link from '@docusaurus/Link';

export default function ExploreCoursesNavbarItem() {
  return (
    <Link
      to="/#courses"
      className="navbar__link explore-courses-link"
    >
      Explore Courses
    </Link>
  );
}