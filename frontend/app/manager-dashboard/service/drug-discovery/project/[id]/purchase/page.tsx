'use client';
import PurchaseForm from '@/components/projects/PurchaseForm';
import { useParams } from 'next/navigation';

export default function DrugDiscoveryPurchasePage() {
    const params = useParams();
    const projectId = params.id as string;

    return (
        <PurchaseForm
            serviceName="drug-discovery"
            backUrl={`/manager-dashboard/service/drug-discovery/purchase`}
        />
    );
}
