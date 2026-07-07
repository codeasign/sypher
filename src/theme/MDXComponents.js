import React from 'react';
import MDXComponents from '@theme-original/MDXComponents';
import YouTube      from '@site/src/components/YouTube';
import PdfEmbed     from '@site/src/components/PdfEmbed';
import Slideshow    from '@site/src/components/Slideshow';
import AsciiDiagram from '@site/src/components/AsciiDiagram';
import CourseCurriculum from '@site/src/components/CourseCurriculum';

export default {
  ...MDXComponents,
  YouTube,
  PdfEmbed,
  Slideshow,
  AsciiDiagram,
  CourseCurriculum,
};
