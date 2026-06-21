'use client';

import dynamic from 'next/dynamic';

const DynamicProfileContentInner = dynamic(
  () => import('./ProfileContentInner'),
  { ssr: false }
);

export default function ProfileContent(props: any) {
  return <DynamicProfileContentInner {...props} />;
}
