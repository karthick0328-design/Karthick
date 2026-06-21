'use client';
import NewPurchaseRequestForm from '@/components/projects/NewPurchaseRequestForm';

export default function MicrobiologyNewPurchasePage() {
    return (
        <NewPurchaseRequestForm
            serviceName="microbiology"
            serviceLabel="Microbiology"
            backUrl="/manager-dashboard/service/microbiology/purchase"
        />
    );
}
