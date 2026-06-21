'use client';
import NewPurchaseRequestForm from '@/components/projects/NewPurchaseRequestForm';

export default function BiochemistryNewPurchasePage() {
    return (
        <NewPurchaseRequestForm
            serviceName="biochemistry"
            serviceLabel="Biochemistry"
            backUrl="/manager-dashboard/service/biochemistry/purchase"
        />
    );
}
