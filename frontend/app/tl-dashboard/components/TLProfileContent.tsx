'use client';

import dynamic from 'next/dynamic';

const DynamicTLProfileContentInner = dynamic(
  () => import('./TLProfileContentInner'),
  { ssr: false }
);

export default function TLProfileContent(props: any) {
  return <DynamicTLProfileContentInner {...props} />;
}
