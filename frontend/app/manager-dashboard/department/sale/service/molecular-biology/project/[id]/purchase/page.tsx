'use client';
import PurchaseForm from '@/components/projects/PurchaseForm';
import { useParams, usePathname } from 'next/navigation';

export default function MolecularBiologyProjectPurchasePage() {
    const params = useParams();
    const pathname = usePathname();
    
    const backUrl = pathname.split('/').slice(0, 7).join('/') + '/purchase';

    return (
        <PurchaseForm
            serviceName="molecular-biology"
            backUrl={backUrl}
        />
    );
}
