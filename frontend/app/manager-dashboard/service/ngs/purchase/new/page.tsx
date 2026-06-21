'use client';
import NewPurchaseRequestForm from '@/components/projects/NewPurchaseRequestForm';

export default function NGSNewPurchasePage() {
    return (
        <NewPurchaseRequestForm
            serviceName="ngs"
            serviceLabel="NGS"
            backUrl="/manager-dashboard/service/ngs/purchase"
        />
    );
}
