'use client';
import PurchaseLanding from '@/components/projects/PurchaseLanding';
import { usePathname } from 'next/navigation';

export default function MolecularBiologyPurchasePage() {
    const pathname = usePathname();
    const basePath = pathname.split('/').slice(0, 6).join('/');

    return (
        <PurchaseLanding 
            serviceName="molecular-biology" 
            serviceLabel="Molecular Biology" 
            basePath={basePath}
        />
    );
}
