'use client';
import NewPurchaseRequestForm from '@/components/projects/NewPurchaseRequestForm';

export default function SoftwareDevelopmentNewPurchasePage() {
    return (
        <NewPurchaseRequestForm
            serviceName="software-development"
            serviceLabel="Software Development"
            backUrl="/manager-dashboard/service/software-development/purchase"
        />
    );
}
