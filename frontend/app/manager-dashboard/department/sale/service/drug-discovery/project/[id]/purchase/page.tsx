'use client';
import PurchaseForm from '@/components/projects/PurchaseForm';
import { useParams, usePathname } from 'next/navigation';

export default function DrugDiscoveryProjectPurchasePage() {
    const params = useParams();
    const pathname = usePathname();
    const projectId = params.id as string;

    // Path: /manager-dashboard/department/sale/service/drug-discovery/project/[id]/purchase
    // BackUrl should be link to the main purchase list for this service
    const backUrl = pathname.split('/').slice(0, 7).join('/') + '/purchase';

    return (
        <PurchaseForm
            serviceName="drug-discovery"
            backUrl={backUrl}
        />
    );
}
