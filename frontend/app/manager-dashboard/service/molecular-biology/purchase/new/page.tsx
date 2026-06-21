'use client';
import NewPurchaseRequestForm from '@/components/projects/NewPurchaseRequestForm';

export default function MolecularBiologyNewPurchasePage() {
    return (
        <NewPurchaseRequestForm
            serviceName="molecular-biology"
            serviceLabel="Molecular Biology"
            backUrl="/manager-dashboard/service/molecular-biology/purchase"
        />
    );
}
