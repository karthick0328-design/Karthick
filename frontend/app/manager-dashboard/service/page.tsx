'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ServiceRootPage() {
    const router = useRouter();
    useEffect(() => {
        router.push('/manager-dashboard');
    }, [router]);
    return null;
}
