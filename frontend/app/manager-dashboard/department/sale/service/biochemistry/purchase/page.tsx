'use client';
import PurchaseLanding from '@/components/projects/PurchaseLanding';
import { usePathname } from 'next/navigation';

export default function BiochemistryPurchasePage() {
    const pathname = usePathname();
    const basePath = pathname.split('/').slice(0, 6).join('/');

    return (
        <PurchaseLanding 
            serviceName="biochemistry" 
            serviceLabel="Biochemistry" 
            basePath={basePath}
        />
    );
}
