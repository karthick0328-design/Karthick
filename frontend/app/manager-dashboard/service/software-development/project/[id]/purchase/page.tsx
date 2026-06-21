'use client';
import PurchaseForm from '@/components/projects/PurchaseForm';
import { useParams } from 'next/navigation';

export default function SoftwareDevelopmentPurchasePage() {
    const params = useParams();
    const projectId = params.id as string;

    return (
        <PurchaseForm
            serviceName="software-development"
            backUrl={`/manager-dashboard/service/software-development/purchase`}
        />
    );
}
