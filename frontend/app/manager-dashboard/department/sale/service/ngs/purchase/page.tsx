'use client';
import PurchaseLanding from '@/components/projects/PurchaseLanding';
import { usePathname } from 'next/navigation';

export default function NGSPurchasePage() {
    const pathname = usePathname();
    const basePath = pathname.split('/').slice(0, 6).join('/');

    return (
        <PurchaseLanding 
            serviceName="ngs" 
            serviceLabel="NGS" 
            basePath={basePath}
        />
    );
}
