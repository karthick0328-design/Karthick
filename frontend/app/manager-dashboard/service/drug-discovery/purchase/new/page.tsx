'use client';
import NewPurchaseRequestForm from '@/components/projects/NewPurchaseRequestForm';

export default function DrugDiscoveryNewPurchasePage() {
    return (
        <NewPurchaseRequestForm
            serviceName="drug-discovery"
            serviceLabel="Drug Discovery"
            backUrl="/manager-dashboard/service/drug-discovery/purchase"
        />
    );
}
