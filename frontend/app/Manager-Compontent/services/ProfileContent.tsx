import dynamic from 'next/dynamic';

const ProfileContent = dynamic(
  () => import('./ProfileContentInner'),
  { ssr: false }
);

export default ProfileContent;
