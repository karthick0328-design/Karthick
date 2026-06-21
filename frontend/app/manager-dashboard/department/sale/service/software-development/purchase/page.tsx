'use client';
import PurchaseLanding from '@/components/projects/PurchaseLanding';
import { usePathname } from 'next/navigation';

export default function SoftwareDevelopmentPurchasePage() {
    const pathname = usePathname();
    const basePath = pathname.split('/').slice(0, 6).join('/');

    return (
        <PurchaseLanding 
            serviceName="software-development" 
            serviceLabel="Software Development" 
            basePath={basePath}
        />
    );
}
